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

import * as path from 'path';
import {
  StackProps,
  aws_sqs as sqs,
  aws_iam as iam,
  aws_s3 as s3,
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_s3_notifications as s3n,
  custom_resources as cr,
  aws_lambda as lambda,
  Aws,
  Aspects,
  IAspect,
  Duration,
  CustomResource,
  CfnResource,
  CfnCondition,
  Fn,
  RemovalPolicy,
} from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct, IConstruct } from 'constructs';
import {
  AddCfnNagSuppressRules,
  SolutionStack,
} from '../common/solution-stack';

const GB = 1024;
const DOCKER_IMAGE_VERSION = '20230606';
const { VERSION } = process.env;
export interface S3SourceStackProps extends StackProps {
  readonly tag?: string;
  readonly solutionId?: string;
  readonly solutionDesc?: string;
}

export class S3SourceStack extends SolutionStack {
  public sourceBucketArnParam = this.newParam('SourceBucketArn', {
    type: 'String',
    allowedPattern: '^arn:aws.*$',
  });

  public destinationQueueArnParam = this.newParam('DestinationQueueArn', {
    type: 'String',
    allowedPattern: '^arn:aws.*$',
  });

  public processorRoleArnParam = this.newParam('ProcessorRoleArn', {
    type: 'String',
    allowedPattern: '^arn:aws.*$',
  });

  public prefixParam = this.newParam('SourceBucketKeyPrefix', {
    type: 'String',
    default: '',
  });

  public suffixParam = this.newParam('SourceBucketKeySuffix', {
    type: 'String',
    default: '',
  });

  public ecsClusterNameParam = this.newParam(`ECSClusterName`, {
    type: 'String',
    description:
      'ECS Cluster Name to run ECS task (Please make sure the cluster exists)',
    default: '',
  });

  public ecsVpcIdParam = this.newParam('ECSVpcId', {
    type: 'String',
    description: 'VPC ID to run ECS task, e.g. vpc-bef13dc7',
    default: '',
  });

  public ecsSubnetsParam = this.newParam('ECSSubnets', {
    description:
      'Subnet IDs to run ECS task. Please provide two private subnets at least delimited by comma, e.g. subnet-97bfc4cd,subnet-7ad7de32',
    type: 'CommaDelimitedList',
    default: '',
  });

  public shouldAttachPolicyParam = this.newParam('ShouldAttachPolicy', {
    type: 'String',
    default: 'True',
    allowedValues: ['True', 'False'],
  });

  constructor(scope: Construct, id: string, props: S3SourceStackProps) {
    super(scope, id, props);

    // If in China Region, disable install latest aws-sdk
    const isCN = new CfnCondition(this, "isCN", {
      expression: Fn.conditionEquals(Aws.PARTITION, "aws-cn"),
    });
    const isInstallLatestAwsSdk = Fn.conditionIf(
      isCN.logicalId,
      "false",
      "true"
    ).toString();

    Aspects.of(this).add(
      new InjectCustomerResourceConfig(isInstallLatestAwsSdk)
    );

    let solutionDesc =
      props.solutionDesc || 'Centralized Logging with OpenSearch';
    let solutionId = props.solutionId || 'SO8025';
    const stackPrefix = 'CL';

    this.setDescription(
      `(${solutionId}-${props.tag}) - ${solutionDesc} - S3 Source Ingestion Stack Template - Version ${VERSION}`
    );

    const srcBucket = s3.Bucket.fromBucketArn(
      this,
      'SrcBucket',
      this.sourceBucketArnParam.valueAsString
    );

    const destQueue = sqs.Queue.fromQueueArn(
      this,
      'DestQueue',
      this.destinationQueueArnParam.valueAsString
    );

    const processorRole = iam.Role.fromRoleArn(
      this,
      'ProcessorRole',
      this.processorRoleArnParam.valueAsString
    );

    const shouldAttachPolicy = new CfnCondition(this, 'AttachPolicyCondition', {
      expression: Fn.conditionEquals(this.shouldAttachPolicyParam, 'True'),
    });

    const policy = new iam.CfnPolicy(this, 'AllowReadBucketPolicy', {
      policyName: `${Aws.STACK_NAME}-AllowReadBucketPolicy`,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['s3:GetObject*', 's3:GetBucket*', 's3:List*'],
            Resource: [srcBucket.bucketArn, srcBucket.bucketArn + '/*'],
          },
        ],
      },
      roles: [processorRole.roleName],
    });

    srcBucket.addObjectCreatedNotification(new s3n.SqsDestination(destQueue), {
      prefix: this.prefixParam.valueAsString,
      suffix: this.suffixParam.valueAsString,
    });

    const sqsAllowS3ToPutEvent = new CustomResource(
      this,
      'SqsAllowS3ToPutEventCR',
      {
        serviceToken: new SqsAllowS3ToPutEvent(
          this,
          'SqsAllowS3ToPutEvent',
          destQueue.queueArn
        ).provider.serviceToken,
        resourceType: 'Custom::SqsAllowS3ToPutEvent',
        properties: {
          bucketArn: srcBucket.bucketArn,
          queueArn: destQueue.queueArn,
        },
      }
    );

    const isOneTimeMode = new CfnCondition(this, 'IsOneTimeMode', {
      expression: Fn.conditionAnd(
        Fn.conditionNot(Fn.conditionEquals(this.ecsClusterNameParam, '')),
        Fn.conditionNot(Fn.conditionEquals(this.ecsVpcIdParam, ''))
      ),
    });

    const isOnGoingMode = new CfnCondition(this, 'IsOnGoingMode', {
      expression: Fn.conditionOr(
        Fn.conditionEquals(this.ecsClusterNameParam, ''),
        Fn.conditionEquals(this.ecsVpcIdParam, '')
      ),
    });

    Aspects.of(this).add(
      new AddS3BucketNotificationsDependencyAndCondition(
        sqsAllowS3ToPutEvent,
        isOnGoingMode
      )
    );
    this.enable({ construct: sqsAllowS3ToPutEvent, if: isOnGoingMode });

    const vpc = ec2.Vpc.fromVpcAttributes(this, 'EC2Vpc', {
      vpcId: this.ecsVpcIdParam.valueAsString,
      availabilityZones: Fn.getAzs(),
      privateSubnetIds: this.ecsSubnetsParam.valueAsList,
    });

    const ecsCluster = ecs.Cluster.fromClusterAttributes(
      this,
      `${stackPrefix}Cluster`,
      {
        clusterName: this.ecsClusterNameParam.valueAsString,
        vpc: vpc,
        securityGroups: [],
      }
    );

    const ecsTaskSG = new ec2.SecurityGroup(this, 'ECSTaskSG', {
      vpc,
      allowAllOutbound: true,
      description: 'security group for ECS Task',
    });

    Aspects.of(ecsTaskSG).add(
      new AddCfnNagSuppressRules([
        {
          id: 'W5',
          reason: 'This security group is needs to access public s3 api',
        },
      ])
    );

    const taskRole = new iam.Role(this, 'ECSTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Add the role to
    taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [`*`],
      })
    );

    taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          's3:GetObject*',
          's3:GetBucket*',
          's3:List*',
          's3:PutObject*',
        ],
        resources: [srcBucket.bucketArn, srcBucket.arnForObjects('*')],
      })
    );
    taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'sqs:SendMessage',
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl',
        ],
        resources: [destQueue.queueArn],
      })
    );
    taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'kms:Decrypt',
          'kms:Encrypt',
          'kms:ReEncrypt*',
          'kms:GenerateDataKey*',
          'kms:DescribeKey',
        ],
        resources: ['*'],
      })
    );

    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      `ServiceTaskDef`,
      {
        cpu: 1 * GB,
        memoryLimitMiB: 2 * GB,
        taskRole: taskRole,
      }
    );
    taskDefinition.applyRemovalPolicy(RemovalPolicy.RETAIN);
    taskDefinition.addContainer('TheContainer', {
      image: ecs.ContainerImage.fromRegistry(
        `public.ecr.aws/aws-gcr-solutions/centralized-logging-with-opensearch/s3-list-objects:${DOCKER_IMAGE_VERSION}`
      ),
      memoryLimitMiB: 2 * GB,
      environment: {
        AWS_REGION: Aws.REGION,
        BUCKET_NAME: srcBucket.bucketName,
        KEY_PREFIX: this.prefixParam.valueAsString,
        KEY_SUFFIX: this.suffixParam.valueAsString,
        QUEUE_URL: destQueue.queueUrl,
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: id,
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    const onCreateOrUpdate = {
      service: 'ECS',
      action: 'runTask',
      parameters: {
        cluster: ecsCluster.clusterArn,
        taskDefinition: taskDefinition.taskDefinitionArn,
        launchType: 'FARGATE',
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: this.ecsSubnetsParam.valueAsList,
            assignPublicIp: 'ENABLED',
            securityGroups: [ecsTaskSG.securityGroupId],
          },
        },
        propagateTags: 'TASK_DEFINITION',
      },
      physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
    };

    const runECSTask = new cr.AwsCustomResource(this, 'RunECSTask', {
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['ecs:RunTask'],
          effect: iam.Effect.ALLOW,
          resources: [taskDefinition.taskDefinitionArn + '*'],
        }),
        new iam.PolicyStatement({
          actions: ['iam:PassRole'],
          effect: iam.Effect.ALLOW,
          resources: [
            taskDefinition.executionRole!.roleArn,
            taskDefinition.taskRole.roleArn,
          ],
        }),
      ]),
      timeout: Duration.minutes(15),
      onUpdate: onCreateOrUpdate,
      onCreate: onCreateOrUpdate,
    });

    for (const each of [
      vpc,
      ecsCluster,
      ecsTaskSG,
      taskRole,
      taskDefinition,
      runECSTask,
    ]) {
      this.enable({ construct: each, if: isOneTimeMode });
    }

    for (const each of [policy, sqsAllowS3ToPutEvent]) {
      this.enable({ construct: each, if: shouldAttachPolicy });
    }
  }

  protected enable(param: { construct: IConstruct; if: CfnCondition }) {
    Aspects.of(param.construct).add(new InjectCondition(param.if));
  }
}

class InjectCondition implements IAspect {
  public constructor(private condition: CfnCondition) {}

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      node.cfnOptions.condition = this.condition;
    }
  }
}

class AddS3BucketNotificationsDependencyAndCondition implements IAspect {
  public constructor(
    private deps: IConstruct,
    private condition: CfnCondition
  ) {}

  public visit(node: IConstruct): void {
    if (
      node instanceof CfnResource &&
      node.cfnResourceType === 'Custom::S3BucketNotifications'
    ) {
      node.cfnOptions.condition = this.condition;
      node.addDependency(this.deps.node.defaultChild as CfnResource);
    }
  }
}

class SqsAllowS3ToPutEvent extends Construct {
  public readonly provider: cr.Provider;

  constructor(scope: Construct, id: string, queueArn: string) {
    super(scope, id);

    this.provider = new cr.Provider(this, 'SqsAllowS3ToPutEventProvider', {
      onEventHandler: new lambda.Function(this, 'SqsAllowS3ToPutEventOnEvent', {
        code: lambda.Code.fromAsset(
          path.join(
            __dirname,
            '../../../lambda/pipeline/common/custom-resource'
          )
        ),
        runtime: lambda.Runtime.PYTHON_3_9,
        timeout: Duration.seconds(60),
        logRetention: logs.RetentionDays.ONE_MONTH,
        handler: 'sqs_allow_s3_to_put_event.on_event',
        initialPolicy: [
          new iam.PolicyStatement({
            resources: [queueArn],
            actions: [
              'sqs:GetQueueAttributes',
              'sqs:SetQueueAttributes',
              'sqs:GetQueueUrl',
            ],
          }),
        ],
      }),
    });
  }
}

class InjectCustomerResourceConfig implements IAspect {
  public constructor(private isInstallLatestAwsSdk: string) { }

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource && node.cfnResourceType === "Custom::AWS") {
      node.addPropertyOverride(
        "InstallLatestAwsSdk",
        this.isInstallLatestAwsSdk
      );
    }
  }
}
