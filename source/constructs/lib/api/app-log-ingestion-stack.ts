/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import * as path from 'path';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import {
  NagSuppressions,
} from 'cdk-nag';
import {
  Aws,
  Fn,
  Duration,
  CfnCondition,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_ecs as ecs,
  aws_sqs as sqs,
  aws_lambda_event_sources as eventsources,
} from 'aws-cdk-lib';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { CfnDocument } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

import { AppIngestionFlowStack } from '../api/app-log-ingestion-flow';

import { Ec2IamInstanceProfileStack } from '../api/ec2-iam-instance-profile';
import { SharedPythonLayer } from '../layer/layer';
import { addCfnNagSuppressRules } from '../main-stack';
import { MicroBatchStack } from '../microbatch/main/services/amazon-services-stack';

export interface AppLogIngestionStackProps {
  /**
   * Default Appsync GraphQL API for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;

  /**
   * Step Functions State Machine ARN for CloudFormation deployment Flow
   *
   * @default - None.
   */
  readonly cfnFlowSMArn: string;

  /**
   * Default VPC ID for Log Agent
   *
   * @default - None.
   */
  readonly defaultVPC: string;

  /**
   * Default Subnets ID for Log Agent
   *
   * @default - None.
   */
  readonly defaultPublicSubnets: string[];

  /**
   * Default KMS-CMK Arn
   *
   * @default - None.
   */
  readonly cmkKeyArn: string;
  readonly logConfTable: ddb.Table;
  readonly appPipelineTable: ddb.Table;
  readonly appLogIngestionTable: ddb.Table;
  readonly instanceIngestionDetailTable: ddb.Table;
  readonly logSourceTable: ddb.Table;
  readonly instanceTable: ddb.Table;
  readonly configFileBucket: s3.Bucket;

  readonly subAccountLinkTable: ddb.Table;
  readonly centralAssumeRolePolicy: iam.ManagedPolicy;
  readonly ecsCluster: ecs.Cluster;

  readonly Ec2IamInstanceProfile: Ec2IamInstanceProfileStack;

  readonly solutionId: string;
  readonly stackPrefix: string;
  readonly cwlAccessRole: iam.Role;
  readonly fluentBitLogGroupName: string;
  readonly flbConfUploadingEventQueue: sqs.Queue;
  readonly microBatchStack: MicroBatchStack;
}
export class AppLogIngestionStack extends Construct {
  constructor(scope: Construct, id: string, props: AppLogIngestionStackProps) {
    super(scope, id);

    const isCNRegion = new CfnCondition(this, 'isCNRegion', {
      expression: Fn.conditionEquals(Aws.PARTITION, 'aws-cn'),
    });
    const flb_s3_addr = Fn.conditionIf(
      isCNRegion.logicalId,
      'aws-solutions-assets.s3.cn-north-1.amazonaws.com.cn',
      'aws-gcr-solutions-assets.s3.amazonaws.com'
    ).toString();

    const FluentBitVersion = "v1.9.10";

    const downloadLogConfigDocument = new CfnDocument(
      this,
      'Fluent-BitConfigDownloading',
      {
        content: {
          schemaVersion: '2.2',
          description:
            'Download Fluent-Bit config file and reboot the Fluent-Bit',
          parameters: {
            INSTANCEID: {
              type: 'String',
              default: '',
              description: '(Required) Instance Id',
            },
          },
          mainSteps: [
            {
              action: 'aws:runShellScript',
              name: 'stopFluentBit',
              inputs: {
                runCommand: ['sudo service fluent-bit stop'],
              },
            },
            {
              action: "aws:runShellScript",
              name: "updateFluentBitVersion",
              inputs: {
                runCommand: [
                  `ARCHITECTURE=''; if [ \"$(uname -m)\" = \"aarch64\" ]; then ARCHITECTURE='-arm64'; fi; [ -e /opt/fluent-bit/bin/fluent-bit ] && [ -z \"$(/opt/fluent-bit/bin/fluent-bit -V | grep '${FluentBitVersion}')\" ] && curl -o /opt/fluent-bit$ARCHITECTURE.tar.gz https://${flb_s3_addr}/clo/${process.env.VERSION}/aws-for-fluent-bit/fluent-bit$ARCHITECTURE.tar.gz && tar xzvf /opt/fluent-bit$ARCHITECTURE.tar.gz -C /opt/ --exclude=fluent-bit/etc; echo 0`
                ]
              },
            },
            {
              action: 'aws:downloadContent',
              name: 'downloadFluentBitParserConfig',
              inputs: {
                sourceType: 'S3',
                sourceInfo: `{\"path\":\"https://${props.configFileBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/applog_parsers.conf\"}`,
                destinationPath: '/opt/fluent-bit/etc',
              },
            },
            {
              action: 'aws:downloadContent',
              name: 'downloadFluentBitConfig',
              inputs: {
                sourceType: 'S3',
                sourceInfo: `{\"path\":\"https://${props.configFileBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/fluent-bit.conf\"}`,
                destinationPath: '/opt/fluent-bit/etc',
              },
            },
            {
              action: 'aws:runShellScript',
              name: 'startFluentBit',
              inputs: {
                runCommand: [
                  'sudo systemctl enable fluent-bit.service',
                  'sudo service fluent-bit start',
                ],
              },
            },
          ],
        },
        documentFormat: 'JSON',
        documentType: 'Command',
      }
    );
    const downloadLogConfigDocumentForWindows = new CfnDocument(
      this,
      "Fluent-BitConfigDownloadingForWindows",
      {
        content: {
          "schemaVersion": "2.2",
          "description": "Execute scripts stored in a remote location. The following remote locations are currently supported: GitHub (public and private) and Amazon S3 (S3). The following script types are currently supported: #! support on Linux and file associations on Windows.",
          "parameters": {
            "executionTimeout": {
              "default": "3600",
              "description": "(Optional) The time in seconds for a command to complete before it is considered to have failed. Default is 3600 (1 hour). Maximum is 28800 (8 hours).",
              "type": "String",
              "allowedPattern": "([1-9][0-9]{0,3})|(1[0-9]{1,4})|(2[0-7][0-9]{1,3})|(28[0-7][0-9]{1,2})|(28800)"
            },
            "workingDirectory": {
              "default": "",
              "description": "(Optional) The path where the content will be downloaded and executed from on your instance.",
              "maxChars": 4096,
              "type": "String"
            },
            "INSTANCEID": {
              "type": 'String',
              "default": '',
              "description": '(Required) Instance Id',
            },
            "commandLine": {
              "default": "ReStart-Service fluent-bit",
              "description": "(Required) Specify the command line to be executed. The following formats of commands can be run: 'pythonMainFile.py argument1 argument2', 'ansible-playbook -i \"localhost,\" -c local example.yml'",
              "type": "String"
            }
          },
          "mainSteps": [
            {
              "inputs": {
                "sourceInfo": `{\"path\":\"https://${props.configFileBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/applog_parsers.conf\"}`,
                "sourceType": "S3",
                "destinationPath": "C:/fluent-bit/etc"
              },
              "name": "downloadFluentBitParserConfig",
              "action": "aws:downloadContent"
            },
            {
              "inputs": {
                "sourceInfo": `{\"path\":\"https://${props.configFileBucket.bucketRegionalDomainName}/app_log_config/{{INSTANCEID}}/fluent-bit.conf\"}`,
                "sourceType": "S3",
                "destinationPath": "C:/fluent-bit/etc"
              },
              "name": "downloadFluentBitConfig",
              "action": "aws:downloadContent"
            },
            {
              "inputs": {
                "workingDirectory": "{{ workingDirectory }}",
                "timeoutSeconds": "{{ executionTimeout }}",
                "runCommand": [
                  "",
                  "$directory = Convert-Path .",
                  "$env:PATH += \";$directory\"",
                  " {{ commandLine }}",
                  "if ($?) {",
                  "    exit $LASTEXITCODE",
                  "} else {",
                  "    exit 255",
                  "}",
                  ""
                ]
              },
              "name": "runPowerShellScript",
              "action": "aws:runPowerShellScript",
              "precondition": {
                "StringEquals": [
                  "platformType",
                  "Windows"
                ]
              }
            },
            {
              "inputs": {
                "workingDirectory": "{{ workingDirectory }}",
                "timeoutSeconds": "{{ executionTimeout }}",
                "runCommand": [
                  "",
                  "directory=$(pwd)",
                  "export PATH=$PATH:$directory",
                  " {{ commandLine }} ",
                  ""
                ]
              },
              "name": "runShellScript",
              "action": "aws:runShellScript",
              "precondition": {
                "StringEquals": [
                  "platformType",
                  "Linux"
                ]
              }
            }
          ]
        },
        documentFormat: "JSON",
        documentType: "Command",
        updateMethod: "NewVersion",
      }
    );

    // Create a lambda layer with required python packages.
    const appLogIngestionLayer = new lambda.LayerVersion(
      this,
      'AppLogIngestionLayer',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, '../../lambda/api/app_log_ingestion'),
          {
            bundling: {
              image: lambda.Runtime.PYTHON_3_11.bundlingImage,
              platform: "linux/amd64",
              command: [
                'bash',
                '-c',
                'pip install -r requirements.txt -t /asset-output/python && cp . -r /asset-output/python/',
              ],
            },
          }
        ),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
        //compatibleArchitectures: [lambda.Architecture.X86_64, lambda.Architecture.ARM_64],
        description: 'Default Lambda layer for AppLog Ingestion',
      }
    );

    const appLogIngestionModificationEventHandler = new lambda.Function(
      this,
      'AppLogIngestionEC2ModificationHandler',
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, '../../lambda/api/app_log_ingestion')
        ),
        layers: [SharedPythonLayer.getInstance(this), appLogIngestionLayer],
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'ingestion_modification_event_lambda_function.lambda_handler',
        timeout: Duration.minutes(15),
        memorySize: 1024,
        environment: {
          APP_LOG_INGESTION_TABLE_NAME: props.appLogIngestionTable.tableName,
          INSTANCE_TABLE_NAME: props.instanceTable.tableName,
          SSM_LOG_CONFIG_DOCUMENT_NAME: downloadLogConfigDocument.ref,
          SSM_WINDOWS_LOG_CONFIG_DOCUMENT_NAME: downloadLogConfigDocumentForWindows.ref,
          CONFIG_FILE_S3_BUCKET_NAME: props.configFileBucket.bucketName,
          APP_PIPELINE_TABLE_NAME: props.appPipelineTable.tableName,
          INSTANCE_INGESTION_DETAIL_TABLE_NAME: props.instanceIngestionDetailTable.tableName,
          APP_LOG_CONFIG_TABLE_NAME: props.logConfTable.tableName,
          LOG_SOURCE_TABLE_NAME: props.logSourceTable.tableName,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
          SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
          SOLUTION_ID: props.solutionId,
          FLUENT_BIT_LOG_GROUP_NAME: props.fluentBitLogGroupName,
          FLUENT_BIT_IMAGE:
            'public.ecr.aws/aws-observability/aws-for-fluent-bit:2.31.12',
          FLUENT_BIT_EKS_CLUSTER_NAME_SPACE: 'logging',
          FLUENT_BIT_MEM_BUF_LIMIT: '30M',
          EC2_IAM_INSTANCE_PROFILE_ARN:
            props.Ec2IamInstanceProfile.cfnEc2IamInstanceProfile.attrArn,
          CWL_MONITOR_ROLE_ARN: props.cwlAccessRole.roleArn,
          DEFAULT_OPEN_EXTRA_METADATA_FLAG: 'true',
          LOG_AGENT_VPC_ID: props.defaultVPC,
          LOG_AGENT_SUBNETS_IDS: Fn.join(',', props.defaultPublicSubnets),
          DEFAULT_CMK_ARN: props.cmkKeyArn,
          ECS_CLUSTER_NAME: props.ecsCluster.clusterName,
          FLB_S3_ADDR: flb_s3_addr,
        },
        description: `${Aws.STACK_NAME} - Async AppLogIngestion Resolver for instance ingestion adding and deleting instances event`,
      }
    );

    appLogIngestionModificationEventHandler.addEventSource(
      new DynamoEventSource(props.instanceTable, {
        batchSize: 1,
        retryAttempts: 5,
        startingPosition: lambda.StartingPosition.LATEST,
        filters: [
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual('INSERT'),
          }),
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual('REMOVE'),
          }),
        ],
      })
    );

    props.appLogIngestionTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );
    props.instanceIngestionDetailTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );

    props.appPipelineTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );
    props.logConfTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );

    props.configFileBucket.grantReadWrite(
      appLogIngestionModificationEventHandler
    );

    props.logSourceTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );

    props.subAccountLinkTable.grantReadData(
      appLogIngestionModificationEventHandler
    );

    props.instanceTable.grantReadWriteData(
      appLogIngestionModificationEventHandler
    );

    props.instanceTable.grantStreamRead(
      appLogIngestionModificationEventHandler
    );

    appLogIngestionModificationEventHandler.node.addDependency(
      downloadLogConfigDocument
    );

    const ssmPolicy = new iam.Policy(this, 'ssmPolicy', {
      statements: [
        new iam.PolicyStatement({
          actions: [
            'ssm:DescribeInstanceInformation',
            'ssm:ListCommandInvocations',
            'ssm:GetCommandInvocation',
          ],
          effect: iam.Effect.ALLOW,
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          sid: 'EC2SSMPolicy',
          effect: iam.Effect.ALLOW,
          actions: ['ssm:SendCommand', 'ssm:GetParameters', 'ssm:GetParameter'],
          resources: [
            `arn:${Aws.PARTITION}:ec2:*:${Aws.ACCOUNT_ID}:instance/*`,
            `arn:${Aws.PARTITION}:ssm:*:${Aws.ACCOUNT_ID}:parameter/*`,
            `arn:${Aws.PARTITION}:ssm:*:${Aws.ACCOUNT_ID}:document/AWS-RunShellScript`,
            `arn:${Aws.PARTITION}:ssm:*:${Aws.ACCOUNT_ID}:document/*FluentBitDocumentInstallation*`,
            `arn:${Aws.PARTITION}:ssm:*:${Aws.ACCOUNT_ID}:document/*FluentBitConfigDownloading*`,
          ],
        }),
      ],
    });
    addCfnNagSuppressRules(ssmPolicy.node.defaultChild as iam.CfnPolicy, [
      {
        id: 'F4',
        reason: 'These actions can only support all resources',
      },
    ]);

    const sourceCommonPolicy = new iam.Policy(this, 'SourceCommonPolicy', {
      statements: [
        // Attach Policy to Role
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['iam:UpdateAssumeRolePolicy'],
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/${props.stackPrefix}-EKS-LogAgent-Role-*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*buffer-access*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*BufferAccessRole*`,
          ],
        }),
        // Attach Policy to Role
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'iam:GetRole',
            'iam:AttachRolePolicy',
            'iam:ListAttachedRolePolicies',
          ],
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/${props.stackPrefix}-EKS-LogAgent-Role-*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*buffer-access*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*BufferAccessRole*`,
          ],
        }),

        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'iam:GetRole',
            'iam:ListAttachedRolePolicies',
          ],
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:instance-profile/*`,
            props.Ec2IamInstanceProfile.Ec2IamInstanceProfileRole.roleArn,
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'iam:AttachRolePolicy',
          ],
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*`,
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:instance-profile/*`,
          ],
          conditions: {
            StringEquals: {
              "iam:PolicyARN": props.Ec2IamInstanceProfile.Ec2IamInstanceProfilePolicy.managedPolicyArn
            }
          }
        }),

        // Attach Policy to Role
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['iam:AddRoleToInstanceProfile', 'iam:GetInstanceProfile'],
          resources: [
            `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:instance-profile/*`,
          ],
        }),

        // PassRole For Ec2IamInstanceProfileRole
        new iam.PolicyStatement({
          sid: 'PassRoleForEc2IamInstanceProfileRole',
          effect: iam.Effect.ALLOW,
          actions: ['iam:PassRole'],
          resources: [
            props.Ec2IamInstanceProfile.Ec2IamInstanceProfileRole.roleArn,
            props.Ec2IamInstanceProfile.cfnEc2IamInstanceProfile.attrArn,
          ],
        }),

        // Grant elb permissions to source lambda
        new iam.PolicyStatement({
          actions: [
            'elasticloadbalancing:CreateLoadBalancer',
            'elasticloadbalancing:DeleteLoadBalancer',
            'elasticloadbalancing:DescribeLoadBalancers',
            'elasticloadbalancing:DescribeLoadBalancerAttributes',
            'elasticloadbalancing:AddTags',
            'elasticloadbalancing:RemoveTags',
          ],
          effect: iam.Effect.ALLOW,
          resources: ['*'],
        }),

        // Grant EC2 role
        new iam.PolicyStatement({
          actions: [
            'ec2:DescribeInstances',
            'ec2:DescribeIamInstanceProfileAssociations',
            'ec2:AssociateIamInstanceProfile',
          ],
          effect: iam.Effect.ALLOW,
          resources: ['*'],
        }),
      ],
    });

    appLogIngestionModificationEventHandler.role!.attachInlinePolicy(
      sourceCommonPolicy
    );

    appLogIngestionModificationEventHandler.role!.attachInlinePolicy(ssmPolicy);

    props.centralAssumeRolePolicy.attachToRole(
      appLogIngestionModificationEventHandler.role!
    );

    // Create a Step Functions to orchestrate pipeline flow
    const appIngestionFlow = new AppIngestionFlowStack(this, 'PipelineFlowSM', {
      logSourceTableArn: props.logSourceTable.tableArn,
      ingestionTableArn: props.appLogIngestionTable.tableArn,
      cfnFlowSMArn: props.cfnFlowSMArn,
      microBatchStack: props.microBatchStack,
    });

    // Create a lambda to handle all appLogIngestion related APIs.
    const appLogIngestionHandler = new lambda.Function(
      this,
      'AppLogIngestionHandler',
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, '../../lambda/api/app_log_ingestion')
        ),
        layers: [SharedPythonLayer.getInstance(this), appLogIngestionLayer],
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'lambda_function.lambda_handler',
        timeout: Duration.seconds(120),
        memorySize: 1024,
        environment: {
          SSM_LOG_CONFIG_DOCUMENT_NAME: downloadLogConfigDocument.ref,
          SSM_WINDOWS_LOG_CONFIG_DOCUMENT_NAME: downloadLogConfigDocumentForWindows.ref,
          CONFIG_FILE_S3_BUCKET_NAME: props.configFileBucket.bucketName,
          CWL_MONITOR_ROLE_ARN: props.cwlAccessRole.roleArn,
          DEFAULT_OPEN_EXTRA_METADATA_FLAG: 'true',
          FLUENT_BIT_EKS_CLUSTER_NAME_SPACE: 'logging',
          FLUENT_BIT_MEM_BUF_LIMIT: '30M',
          INSTANCE_TABLE_NAME: props.instanceTable.tableName,
          APP_LOG_INGESTION_TABLE_NAME: props.appLogIngestionTable.tableName,
          APP_PIPELINE_TABLE_NAME: props.appPipelineTable.tableName,
          APP_LOG_CONFIG_TABLE_NAME: props.logConfTable.tableName,
          LOG_SOURCE_TABLE_NAME: props.logSourceTable.tableName,
          INSTANCE_INGESTION_DETAIL_TABLE_NAME: props.instanceIngestionDetailTable.tableName,
          STATE_MACHINE_ARN: appIngestionFlow.stateMachineArn,
          EC2_IAM_INSTANCE_PROFILE_ARN:
            props.Ec2IamInstanceProfile.cfnEc2IamInstanceProfile.attrArn,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
          LOG_AGENT_VPC_ID: props.defaultVPC,
          LOG_AGENT_SUBNETS_IDS: Fn.join(',', props.defaultPublicSubnets),
          DEFAULT_CMK_ARN: props.cmkKeyArn,
          ECS_CLUSTER_NAME: props.ecsCluster.clusterName,
          SOLUTION_VERSION: process.env.VERSION || 'v2.0.0',
          SOLUTION_ID: props.solutionId,
          STACK_PREFIX: props.stackPrefix,
          FLUENT_BIT_LOG_GROUP_NAME: props.fluentBitLogGroupName,
          FLUENT_BIT_IMAGE:
            'public.ecr.aws/aws-observability/aws-for-fluent-bit:2.31.12',
          FLB_S3_ADDR: flb_s3_addr,
        },
        description: `${Aws.STACK_NAME} - AppLogIngestion APIs Resolver`,
      }
    );
    appLogIngestionHandler.node.addDependency(downloadLogConfigDocument);

    // Grant permissions to the appLogIngestion lambda
    props.appLogIngestionTable.grantReadWriteData(appLogIngestionHandler);
    props.appPipelineTable.grantReadWriteData(appLogIngestionHandler);
    props.logConfTable.grantReadWriteData(appLogIngestionHandler);
    props.instanceTable.grantReadWriteData(appLogIngestionHandler);
    props.configFileBucket.grantReadWrite(appLogIngestionHandler);
    props.logSourceTable.grantReadWriteData(appLogIngestionHandler);
    props.subAccountLinkTable.grantReadData(appLogIngestionHandler);
    props.instanceIngestionDetailTable.grantReadWriteData(appLogIngestionHandler);

    appLogIngestionHandler.role!.attachInlinePolicy(sourceCommonPolicy);

    //Grant step function for deleting stack
    appLogIngestionHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [appIngestionFlow.stateMachineArn],
        actions: ['states:StartExecution'],
      })
    );
    // Grant eks permissions to the app ingestion lambda
    appLogIngestionHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['eks:DescribeCluster'],
      })
    );

    appLogIngestionHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/*-EKS-LogAgent-Role-*`,
        ],
        actions: ['iam:PutRolePolicy'],
      })
    );
    // Grant es permissions to the app ingestion lambda
    appLogIngestionHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['es:DescribeElasticsearchDomain', 'es:DescribeDomain'],
      })
    );
    appLogIngestionHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:GetBucketNotification",
        ],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:s3:::*`,
        ],
      })
    );
    appLogIngestionHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:${Aws.PARTITION}:ssm:${Aws.REGION}:${Aws.ACCOUNT_ID}:parameter/${props.stackPrefix}/FLB/*`,
        ],
      })
    );
    NagSuppressions.addResourceSuppressions(appLogIngestionHandler, [
      {
        id: "AwsSolutions-IAM5",
        reason: "The managed policy needs to use any resources.",
      },
    ]);

    props.centralAssumeRolePolicy.attachToRole(appLogIngestionHandler.role!);

    // Add appLogIngestion lambda as a Datasource
    const appLogIngestionLambdaDS = props.graphqlApi.addLambdaDataSource(
      'AppLogIngestionLambdaDS',
      appLogIngestionHandler,
      {
        description: 'Lambda Resolver Datasource',
      }
    );

    // Set resolver for releted appLogIngestion API methods
    appLogIngestionLambdaDS.createResolver('listAppLogIngestions', {
      typeName: 'Query',
      fieldName: 'listAppLogIngestions',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/app_log_ingestion/ListAppLogIngestionsResp.vtl'
        )
      ),
    });
    appLogIngestionLambdaDS.createResolver(
      'getK8sDeploymentContentWithSidecar',
      {
        typeName: 'Query',
        fieldName: 'getK8sDeploymentContentWithSidecar',
        requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
        responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
      }
    );

    appLogIngestionLambdaDS.createResolver(
      'getK8sDeploymentContentWithDaemonSet',
      {
        typeName: 'Query',
        fieldName: 'getK8sDeploymentContentWithDaemonSet',
        requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
        responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
      }
    );

    appLogIngestionLambdaDS.createResolver('getAppLogIngestion', {
      typeName: 'Query',
      fieldName: 'getAppLogIngestion',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/app_log_ingestion/GetAppLogIngestionResp.vtl'
        )
      ),
    });

    appLogIngestionLambdaDS.createResolver('createAppLogIngestion', {
      typeName: 'Mutation',
      fieldName: 'createAppLogIngestion',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/app_log_ingestion/CreateAppLogIngestion.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    appLogIngestionLambdaDS.createResolver('deleteAppLogIngestion', {
      typeName: 'Mutation',
      fieldName: 'deleteAppLogIngestion',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    appLogIngestionLambdaDS.createResolver('listInstanceIngestionDetails', {
      typeName: 'Query',
      fieldName: 'listInstanceIngestionDetails',
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    const ec2IngestionDistributionEventHandler = new lambda.Function(
      this,
      'EC2IngestionDistributionEventHandler',
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, '../../lambda/api/app_log_ingestion')
        ),
        layers: [SharedPythonLayer.getInstance(this), appLogIngestionLayer],
        runtime: lambda.Runtime.PYTHON_3_11,
        handler:
          'ec2_ingestion_distribution_event_lambda_function.lambda_handler',
        timeout: Duration.minutes(15),
        memorySize: 1024,
        environment: {
          SSM_LOG_CONFIG_DOCUMENT_NAME: downloadLogConfigDocument.ref,
          SSM_WINDOWS_LOG_CONFIG_DOCUMENT_NAME: downloadLogConfigDocumentForWindows.ref,
          INSTANCE_INGESTION_DETAIL_TABLE_NAME: props.instanceIngestionDetailTable.tableName,
          INSTANCE_TABLE_NAME: props.instanceTable.tableName,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
          SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
          SOLUTION_ID: props.solutionId,
          FLB_S3_ADDR: props.configFileBucket.bucketRegionalDomainName
        },
        description: `${Aws.STACK_NAME} - Async AppLogIngestion Resolver for instance ingestion distribution event`,
      }
    );

    ec2IngestionDistributionEventHandler.addEventSource(
      new eventsources.SqsEventSource(props.flbConfUploadingEventQueue, {
        batchSize: 1,
      })
    );

    ec2IngestionDistributionEventHandler.role!.attachInlinePolicy(
      sourceCommonPolicy
    );
    ec2IngestionDistributionEventHandler.role!.attachInlinePolicy(ssmPolicy);

    props.configFileBucket.grantReadWrite(ec2IngestionDistributionEventHandler);

    props.subAccountLinkTable.grantReadData(
      ec2IngestionDistributionEventHandler
    );

    props.instanceIngestionDetailTable.grantReadWriteData(
      ec2IngestionDistributionEventHandler
    );
    props.instanceTable.grantReadWriteData(
      ec2IngestionDistributionEventHandler
    )
    ec2IngestionDistributionEventHandler.node.addDependency(
      downloadLogConfigDocument
    );

    props.centralAssumeRolePolicy.attachToRole(
      ec2IngestionDistributionEventHandler.role!
    );

    // Create a lambda to handle ASG config generation and return
    const asgConfigGenerateFn = new lambda.Function(
      this,
      'ASGConfigGenerateFn',
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, '../../lambda/api/app_log_ingestion')
        ),
        layers: [SharedPythonLayer.getInstance(this)],
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'auto_scaling_group_config_lambda_function.lambda_handler',
        timeout: Duration.seconds(60),
        memorySize: 1024,
        environment: {
          CONFIG_FILE_S3_BUCKET_NAME: props.configFileBucket.bucketName,
          APP_PIPELINE_TABLE_NAME: props.appPipelineTable.tableName,
          APP_LOG_CONFIG_TABLE_NAME: props.logConfTable.tableName,
          APP_LOG_INGESTION_TABLE_NAME: props.appLogIngestionTable.tableName,
          LOG_SOURCE_TABLE_NAME: props.logSourceTable.tableName,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
          SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
          SOLUTION_ID: props.solutionId,
        },
        description: `${Aws.STACK_NAME} - EC2 Auto-Scaling Group Config APIs Resolver`,
      }
    );

    props.appPipelineTable.grantReadWriteData(asgConfigGenerateFn);
    props.logConfTable.grantReadWriteData(asgConfigGenerateFn);
    props.appLogIngestionTable.grantReadWriteData(asgConfigGenerateFn);
    props.logSourceTable.grantReadWriteData(asgConfigGenerateFn);
    props.subAccountLinkTable.grantReadData(asgConfigGenerateFn);

    props.centralAssumeRolePolicy.attachToRole(asgConfigGenerateFn.role!);

    const subscribeMemberAcctSNSHandler = new lambda.Function(
      this,
      'SubscribeMemberAcctSNSHandler',
      {
        code: lambda.AssetCode.fromAsset(
          path.join(
            __dirname,
            '../../lambda/api/app_log_ingestion/member_account'
          )
        ),
        layers: [SharedPythonLayer.getInstance(this)],
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'lambda_function.lambda_handler',
        timeout: Duration.seconds(120),
        memorySize: 512,
        environment: {
          FLUENT_BIT_CONF_UPLOADING_EVENT_QUEUE_ARN:
            props.flbConfUploadingEventQueue.queueArn,
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
          SOLUTION_VERSION: process.env.VERSION || 'v2.0.0',
          SOLUTION_ID: props.solutionId,
          STACK_PREFIX: props.stackPrefix,
        },
        description: `${Aws.STACK_NAME} - Using the SQS in CLO account to subscribe the SNS in Member Account`,
      }
    );
    props.subAccountLinkTable.grantReadWriteData(subscribeMemberAcctSNSHandler);
    subscribeMemberAcctSNSHandler.addEventSource(
      new DynamoEventSource(props.subAccountLinkTable, {
        batchSize: 1,
        retryAttempts: 30,
        startingPosition: lambda.StartingPosition.LATEST,
        filters: [
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual('INSERT'),
          }),
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual('MODIFY'),
          }),
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual('REMOVE'),
          }),
        ],
      })
    );

    props.centralAssumeRolePolicy.attachToRole(
      subscribeMemberAcctSNSHandler.role!
    );


    // Add ASG Ingestion lambda as a Datasource
    const asgConfigGeneratorDS = props.graphqlApi.addLambdaDataSource(
      'ASGConfigGeneratorDS',
      asgConfigGenerateFn,
      {
        description: 'Lambda Resolver Datasource',
      }
    );

    asgConfigGeneratorDS.createResolver('getAutoScalingGroupConf', {
      typeName: 'Query',
      fieldName: 'getAutoScalingGroupConf',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/app_log_ingestion/GetASGConf.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
