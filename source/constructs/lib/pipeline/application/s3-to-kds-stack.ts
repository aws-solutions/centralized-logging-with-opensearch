/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { Construct, IConstruct } from "constructs";
import {
  Aws,
  CfnResource,
  Duration,
  Stack,
  CfnParameter,
  CfnOutput,
  CfnCondition,
  Fn,
  aws_iam as iam,
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_ec2 as ec2,
  aws_sqs as sqs,
  aws_kms as kms,
  aws_s3_notifications as s3n,
  aws_autoscaling as asg,
} from "aws-cdk-lib";

const { VERSION } = process.env;

/**
 * cfn-nag suppression rule interface
 */
interface CfnNagSuppressRule {
  readonly id: string;
  readonly reason: string;
}

export function addCfnNagSuppressRules(
  resource: CfnResource,
  rules: CfnNagSuppressRule[]
) {
  resource.addMetadata("cfn_nag", {
    rules_to_suppress: rules,
  });
}

export class S3toKDSStack extends Stack {
  private addToParamGroups(label: string, ...param: string[]) {
    this.paramGroups.push({
      Label: { default: label },
      Parameters: param,
    });
  }

  private addToParamLabels(label: string, param: string) {
    this.paramLabels[param] = {
      default: label,
    };
  }

  private paramGroups: any[] = [];
  private paramLabels: any = {};

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.templateOptions.description = `(SO8025-app-ingestion-s3) - Log Hub - S3 to KDS Pipeline Template - Version ${VERSION}`;
    this.templateOptions.metadata = {
      "AWS::CloudFormation::Interface": {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    const kinesisStreamNameParam = new CfnParameter(
      this,
      "kinesisStreamNameParam",
      {
        type: "String",
        description: "The Kinesis Data Stream Name.",
        allowedPattern: ".+",
      }
    );
    this.addToParamLabels(
      "KinesisStreamNameParam",
      kinesisStreamNameParam.logicalId
    );

    const failedLogBucketParam = new CfnParameter(
      this,
      "failedLogBucketParam",
      {
        type: "String",
        description: "The s3 bucket will store the agent config file.",
        default: "failed-log-bucket",
        allowedPattern: ".+",
      }
    );
    this.addToParamLabels(
      "FailedLogBucketParam",
      failedLogBucketParam.logicalId
    );

    const logAgentVpcIdParam = new CfnParameter(this, "logAgentVpcIdParam", {
      type: "AWS::EC2::VPC::Id",
      description: "Select the VPC where Log Hub deployed.",
      default: "",
    });
    this.addToParamLabels("LogAgentVpcIdParam", logAgentVpcIdParam.logicalId);

    const logAgentSubnetIdsParam = new CfnParameter(
      this,
      "logAgentSubnetIdsParam",
      {
        type: "List<AWS::EC2::Subnet::Id>",
        description: "Select the Public Subnet of Log Hub Default VPC.",
      }
    );
    this.addToParamLabels(
      "LogAgentSubnetIdsParam",
      logAgentSubnetIdsParam.logicalId
    );

    const sourceLogBucketParam = new CfnParameter(
      this,
      "sourceLogBucketParam",
      {
        type: "String",
        description: "The s3 bucket to store raw logs.",
        default: "raw-log-bucket",
        allowedPattern: ".+",
      }
    );
    this.addToParamLabels(
      "SourceLogBucketParam",
      sourceLogBucketParam.logicalId
    );

    const sourceLogBucketPrefixParam = new CfnParameter(
      this,
      "sourceLogBucketPrefixParam",
      {
        type: "String",
        default: "",
        description: "The prefix of the s3 bucket to store raw logs.",
      }
    );
    this.addToParamLabels(
      "SourceLogBucketPrefixParam",
      sourceLogBucketPrefixParam.logicalId
    );

    const kdsRoleARN = new CfnParameter(this, "kdsRoleARN", {
      description:
        `the Cross Account Role which is in the log agent cloudformation output. If the source is in the current account, please leave it blank.`,
      type: "String",
    });
    this.addToParamLabels("Log Source Account Assume Role", kdsRoleARN.logicalId);

    const agentSourceIdParam = new CfnParameter(this, "agentSourceIdParam", {
      type: "String",
      default: "",
      description: "The source id of Agent's config file.",
    });
    this.addToParamLabels("AgentSourceIdParam", agentSourceIdParam.logicalId);

    const defaultCmkArnParam = new CfnParameter(this, "defaultCmkArnParam", {
      type: "String",
      description: "The KMS-CMK Arn for encryption.",
      allowedPattern: ".+",
    });
    this.addToParamLabels("DefaultCmkArnParam", defaultCmkArnParam.logicalId);

    this.addToParamGroups(
      "Pipeline Config",
      agentSourceIdParam.logicalId,
      kinesisStreamNameParam.logicalId,
      failedLogBucketParam.logicalId,
      sourceLogBucketParam.logicalId,
      sourceLogBucketPrefixParam.logicalId,
      kdsRoleARN.logicalId,
      defaultCmkArnParam.logicalId
    );
    this.addToParamGroups(
      "Network Config",
      logAgentVpcIdParam.logicalId,
      logAgentSubnetIdsParam.logicalId
    );

    const defaultKMSCmk = kms.Key.fromKeyArn(
      this,
      "SqsCMK",
      defaultCmkArnParam.valueAsString
    );

    // Setup SQS and DLQ
    const logEventDLQ = new sqs.Queue(this, "LogEventDLQ", {
      visibilityTimeout: Duration.minutes(15),
      retentionPeriod: Duration.days(7),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });

    const cfnLogEventDLQ = logEventDLQ.node.defaultChild as sqs.CfnQueue;
    cfnLogEventDLQ.overrideLogicalId("LogEventDLQ");

    const logEventQueue = new sqs.Queue(this, "LogEventQueue", {
      visibilityTimeout: Duration.seconds(910),
      retentionPeriod: Duration.days(14),
      deadLetterQueue: {
        queue: logEventDLQ,
        maxReceiveCount: 30,
      },
      encryption: sqs.QueueEncryption.KMS,
      dataKeyReuse: Duration.minutes(5),
      encryptionMasterKey: defaultKMSCmk,
    });

    new CfnOutput(this, "AppLogPipelineSQSName", {
      description: "App Log Pipeline S3 as Source SQS Name",
      value: logEventQueue.queueName,
    }).overrideLogicalId("AppLogPipelineSQSName");

    // Add the S3 event on the log bucket with the target is sqs queue
    const sourceLogBucket = s3.Bucket.fromBucketName(
      this,
      "SourceLogBucket",
      sourceLogBucketParam.valueAsString
    );

    // Add the S3 event on the log bucket with the target is sqs queue
    sourceLogBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(logEventQueue),
      {
        prefix: sourceLogBucketPrefixParam.valueAsString,
      }
    );

    logEventQueue.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["sqs:*"],
        effect: iam.Effect.DENY,
        resources: [],
        conditions: {
          ["Bool"]: {
            "aws:SecureTransport": "false",
          },
        },
        principals: [new iam.AnyPrincipal()],
      })
    )

    const logAgentVpc = ec2.Vpc.fromVpcAttributes(this, "LogAgentVpc", {
      vpcId: logAgentVpcIdParam.valueAsString,
      availabilityZones: Fn.getAzs(),
      publicSubnetIds: logAgentSubnetIdsParam.valueAsList,
    });

    // Create Security Group for the Instance
    const logAgentSG = new ec2.SecurityGroup(this, "logAgent-sg", {
      description: "Security Group for Log Hub EC2 instances",
      vpc: logAgentVpc,
      allowAllOutbound: true,
    });
    // For dev only
    // logAgentSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow ssh access');
    const cfnSG = logAgentSG.node.defaultChild as ec2.CfnSecurityGroup;
    addCfnNagSuppressRules(cfnSG, [
      {
        id: "W5",
        reason: "Open egress rule is required to access public network",
      },
      {
        id: "W40",
        reason: "Open egress rule is required to access public network",
      },
    ]);

    const logAgentRole = new iam.Role(this, "LogAgentRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
    });

    const logAgentPolicy = new iam.Policy(this, "LogAgentPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          actions: [
            "cloudwatch:PutMetricData",
            "ec2:DescribeVolumes",
            "ec2:DescribeTags",
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents",
            "logs:DescribeLogStreams",
            "logs:DescribeLogGroups",
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:${Aws.PARTITION}:kinesis:${Aws.REGION}:${Aws.ACCOUNT_ID}:stream/${kinesisStreamNameParam.valueAsString}`,
          ],
          actions: ["kinesis:PutRecord", "kinesis:PutRecords"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:${Aws.PARTITION}:s3:::${sourceLogBucketParam.valueAsString}`,
            `arn:${Aws.PARTITION}:s3:::${sourceLogBucketParam.valueAsString}/*`,
            `arn:${Aws.PARTITION}:s3:::${failedLogBucketParam.valueAsString}`,
            `arn:${Aws.PARTITION}:s3:::${failedLogBucketParam.valueAsString}/*`,
          ],
          actions: [
            "s3:Get*",
            "s3:List*",
            "s3-object-lambda:Get*",
            "s3-object-lambda:List*",
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [defaultCmkArnParam.valueAsString],
          actions: [
            "kms:Decrypt",
            "kms:Encrypt",
            "kms:ReEncrypt*",
            "kms:GenerateDataKey*",
            "kms:DescribeKey",
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [logEventQueue.queueArn],
          actions: ["*"],
        })
      ],
    });
    logAgentRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );

    // Handle cross-account
    const isCrossAccount = new CfnCondition(this, "IsCrossAccount", {
      expression: Fn.conditionNot(Fn.conditionEquals(kdsRoleARN.valueAsString, ""))
    });
    logAgentRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "sts:AssumeRole",
        ],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*`,
          Fn.conditionIf(isCrossAccount.logicalId, `${kdsRoleARN.valueAsString}`, Aws.NO_VALUE).toString(),
        ],
      })
    )

    const cfnLogAgentPolicy = logAgentPolicy.node.defaultChild as iam.CfnPolicy;
    addCfnNagSuppressRules(cfnLogAgentPolicy, [
      {
        id: "W12",
        reason: "Publish log streams requires any resources",
      },
    ]);

    logAgentRole.attachInlinePolicy(logAgentPolicy);

    const agentUserData = ec2.UserData.custom("#!/bin/bash -xe");
    agentUserData.addCommands(
      "exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1",
      "set -xe",
      "yum update -y",
      "cd /home/ec2-user/",

      // Download the fluentd config
      `sudo aws s3 cp --region ${Aws.REGION} s3://${failedLogBucketParam.valueAsString}/app_log_config/${agentSourceIdParam.valueAsString}/td-agent.conf /etc/td-agent/td-agent.conf`,
      `sudo sed -i 's/LOGHUB_CONFIG_KDS_NAME/${kinesisStreamNameParam.valueAsString}/g' /etc/td-agent/td-agent.conf`,
      `sudo sed -i 's/LOGHUB_CONFIG_KDS_REGION/${Aws.REGION}/g' /etc/td-agent/td-agent.conf`,
      `sudo sed -i 's/LOGHUB_CONFIG_SQS_NAME/${logEventQueue.queueName}/g' /etc/td-agent/td-agent.conf`,

      // Update the systemd config
      "cat << EOF | sudo tee /usr/lib/systemd/system/td-agent.service",
      "[Unit]",
      "Description=Fluentd",
      "Requires=network-online.target",
      "After=network-online.target",
      "",
      "[Service]",
      "LimitNOFILE=65536",
      "Environment=LD_PRELOAD=/opt/td-agent/lib/libjemalloc.so",
      "Environment=GEM_HOME=/opt/td-agent/lib/ruby/gems/2.7.0/",
      "Environment=GEM_PATH=/opt/td-agent/lib/ruby/gems/2.7.0/",
      "Environment=FLUENT_CONF=/etc/td-agent/td-agent.conf",
      "Environment=FLUENT_PLUGIN=/etc/td-agent/plugin",
      "Environment=FLUENT_SOCKET=/var/run/td-agent/td-agent.sock",
      "Environment=TD_AGENT_LOG_FILE=/var/log/td-agent/td-agent.log",
      "Environment=TD_AGENT_OPTIONS=",
      "EnvironmentFile=-/etc/sysconfig/td-agent",
      "PIDFile=/var/run/td-agent/td-agent.pid",
      "RuntimeDirectory=td-agent",
      "Type=simple",
      "ExecStart=/opt/td-agent/bin/fluentd --log /var/log/td-agent/td-agent.log",
      "Restart=always",
      "",
      "[Install]",
      "WantedBy=multi-user.target",
      "",
      "EOF",
      "sudo systemctl daemon-reload",

      // add treasure data repository to yum
      'echo "rpm import start!"',
      "sudo rpm --import https://packages.treasuredata.com/GPG-KEY-td-agent",
      'echo "create td.repo"',
      "cat << EOF | sudo tee /etc/yum.repos.d/td.repo",
      "[treasuredata]",
      "name=TreasureData",
      "baseurl=http://packages.treasuredata.com/4/amazon/2/\\$basearch",
      "gpgcheck=1",
      "gpgkey=https://packages.treasuredata.com/GPG-KEY-td-agent",
      "EOF",

      // Create the script to install the fluentd
      'echo "for((i=1;i<=3;i++));" >> start-installation.sh',
      'echo "do" >> start-installation.sh',
      'echo "    sudo -k" >> start-installation.sh',
      'echo "    sudo yum check-update" >> start-installation.sh',
      'echo "    sudo yes | yum install -y td-agent" >> start-installation.sh',
      'echo "    sudo /usr/sbin/td-agent-gem sources -a http://gems.ruby-china.com/" >> start-installation.sh',
      'echo "    sudo /usr/sbin/td-agent-gem install fluent-plugin-s3" >> start-installation.sh',
      'echo "    sudo /usr/sbin/td-agent-gem install fluent-plugin-kinesis" >> start-installation.sh',
      'echo "    sudo systemctl restart td-agent" >> start-installation.sh',
      'echo "    eval \\$(systemctl show td-agent.service --property ActiveState)" >> start-installation.sh',
      "echo \"    if [[ \\$ActiveState != 'active' ]]; then\" >> start-installation.sh",
      "echo \"        echo 'FluentD installed failed! Sleep 3s and retry'\" >> start-installation.sh",
      'echo "        sleep 3s" >> start-installation.sh',
      'echo "    else " >> start-installation.sh',
      "echo \"        echo 'Successfully installed FluentD!'\" >> start-installation.sh",
      'echo "        break" >> start-installation.sh',
      'echo "    fi" >> start-installation.sh',
      'echo "done" >> start-installation.sh',
      'echo "eval \\$(systemctl show td-agent.service --property ActiveState)" >> start-installation.sh',
      "echo \"if [[ \\$ActiveState = 'active' ]]; then\" >> start-installation.sh",
      "echo \"    echo 'Successfully launched FluentD!'\" >> start-installation.sh",
      'echo "else" >> start-installation.sh',
      "echo \"    echo 'FluentD status check failed, shutdown the instance...'\" >> start-installation.sh",
      'echo "    shutdown" >> start-installation.sh', // shutdown will terminate the instance as asg will automatically replace the stopped one
      'echo "fi" >> start-installation.sh',

      "chmod +x start-installation.sh",

      // Run the script
      "./start-installation.sh"
    );

    const instanceType = new ec2.InstanceType("t3.large");

    const amznLinux = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    });

    const workerAsg = new asg.AutoScalingGroup(this, "FluentdASG", {
      autoScalingGroupName: `${Aws.STACK_NAME}-Fluentd-ASG`,
      vpc: logAgentVpc,
      instanceType: instanceType,
      machineImage: amznLinux,
      userData: agentUserData,
      maxCapacity: 1,
      minCapacity: 1,
      desiredCapacity: 1,
      securityGroup: logAgentSG,
      // keyName: 'ubuntu-key',  // dev only
      associatePublicIpAddress: true,
      cooldown: Duration.minutes(2),
      role: logAgentRole,
      signals: asg.Signals.waitForMinCapacity(),
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: asg.BlockDeviceVolume.ebs(8, {
            encrypted: true,
          }),
        },
      ],
    });
    workerAsg.applyCloudFormationInit(ec2.CloudFormationInit.fromElements());

    new CfnOutput(this, "LogAgentASGARN", {
      description: "logAgent ASG ARN",
      value: workerAsg.autoScalingGroupArn,
    }).overrideLogicalId("LogAgentASGARN");
  }
}