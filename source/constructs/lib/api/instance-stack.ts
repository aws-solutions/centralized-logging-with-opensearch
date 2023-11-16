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
  Aws,
  CfnCondition,
  Fn,
  Duration,
  aws_dynamodb as ddb,
  aws_iam as iam,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { CfnDocument } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { SharedPythonLayer } from '../layer/layer';

export interface InstanceStackProps {
  /**
   * Default Appsync GraphQL API for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;
  readonly subAccountLinkTable: ddb.Table;
  readonly centralAssumeRolePolicy: iam.ManagedPolicy;

  readonly solutionId: string;
}
export class InstanceStack extends Construct {
  installLogAgentDocument: CfnDocument;

  constructor(scope: Construct, id: string, props: InstanceStackProps) {
    super(scope, id);

    // Download agent from CN if deployed in CN
    const isCN = new CfnCondition(this, 'isCN', {
      expression: Fn.conditionEquals(Aws.PARTITION, 'aws-cn'),
    });
    const s3Address = Fn.conditionIf(
      isCN.logicalId,
      'aws-solutions-assets.s3.cn-north-1.amazonaws.com.cn',
      'aws-gcr-solutions-assets.s3.amazonaws.com'
    ).toString();

    this.installLogAgentDocument = new CfnDocument(
      this,
      'Fluent-BitDocumentInstallation',
      {
        content: {
          schemaVersion: '2.2',
          description:
            'Install Fluent-Bit and the AWS output plugins via AWS Systems Manager',
          parameters: {
            ARCHITECTURE: {
              type: 'String',
              default: '',
              description: '(Required) Machine Architecture',
            },
            SYSTEMDPATH: {
              type: 'String',
              default: '/usr/lib',
              description: '(Required) systemd path for current OS',
            },
          },
          mainSteps: [
            {
              action: 'aws:downloadContent',
              name: 'downloadFluentBit',
              inputs: {
                sourceType: 'S3',
                sourceInfo: `{\"path\":\"https://${s3Address}/clo/${process.env.VERSION}/aws-for-fluent-bit/fluent-bit{{ARCHITECTURE}}.tar.gz\"}`,
                destinationPath: '/opt',
              },
            },
            {
              action: 'aws:runShellScript',
              name: 'installFluentBit',
              inputs: {
                runCommand: [
                  'cd /opt',
                  'FLUENT_BIT_CONFIG=$(ls /opt/fluent-bit/etc/fluent-bit.conf | wc -l)',
                  'if [ ${FLUENT_BIT_CONFIG} = 1 ];  then tar zxvf fluent-bit{{ARCHITECTURE}}.tar.gz --exclude=fluent-bit/etc/fluent-bit.conf --exclude=fluent-bit/etc/parsers.conf ; else sudo tar zxvf fluent-bit{{ARCHITECTURE}}.tar.gz;  fi',
                ],
              },
            },
            {
              action: 'aws:runShellScript',
              name: 'startFluentBit',
              inputs: {
                runCommand: [
                  'cat << EOF | sudo tee {{SYSTEMDPATH}}/systemd/system/fluent-bit.service',
                  '[Unit]',
                  'Description=Fluent Bit',
                  'Requires=network.target',
                  'After=network.target',
                  '',
                  '[Service]',
                  'Type=simple',
                  'ExecStart=/opt/fluent-bit/bin/fluent-bit -c /opt/fluent-bit/etc/fluent-bit.conf',
                  'Type=simple',
                  'Restart=always',
                  '',
                  '[Install]',
                  'WantedBy=multi-user.target',
                  '',
                  'EOF',
                  'sudo systemctl daemon-reload',
                  'sudo service fluent-bit restart',
                ],
              },
            },
          ],
        },
        documentFormat: 'JSON',
        documentType: 'Command',
      }
    );

    // Create a lambda to query instance app log agent status.
    const instanceHandler = new lambda.Function(
      this,
      'InstanceAgentStatusHandler',
      {
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, '../../lambda/api/log_agent_status')
        ),
        layers: [SharedPythonLayer.getInstance(this)],
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'lambda_function.lambda_handler',
        timeout: Duration.minutes(5),
        memorySize: 1024,
        environment: {
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
          SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
          SOLUTION_ID: props.solutionId,
          AGENT_INSTALLATION_DOCUMENT: this.installLogAgentDocument.ref,
        },
        description: `${Aws.STACK_NAME} - Instance Agent Status Query Resolver`,
      }
    );
    instanceHandler.node.addDependency(this.installLogAgentDocument);
    props.subAccountLinkTable.grantReadData(instanceHandler);

    // Grant SSM Policy to the InstanceMeta lambda
    const agentStatusSsmPolicy = new iam.PolicyStatement({
      actions: [
        'ssm:DescribeInstanceInformation',
        'ssm:SendCommand',
        'ec2:DescribeInstances',
        'ec2:DescribeTags',
        'ssm:GetCommandInvocation',
        'ssm:ListCommandInvocations',
        'ssm:DescribeInstanceProperties',
      ],
      effect: iam.Effect.ALLOW,
      resources: ['*'],
    });
    instanceHandler.addToRolePolicy(agentStatusSsmPolicy);
    props.centralAssumeRolePolicy.attachToRole(instanceHandler.role!);

    // Add Instance lambda as a Datasource
    const instanceDS = props.graphqlApi.addLambdaDataSource(
      'instanceDS',
      instanceHandler,
      {
        description: 'Lambda Resolver Datasource',
      }
    );

    instanceDS.createResolver('getInstanceAgentStatus', {
      typeName: 'Query',
      fieldName: 'getInstanceAgentStatus',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/instance_status/GetInstanceAgentStatus.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/instance_status/GetInstanceAgentStatusResp.vtl'
        )
      ),
    });

    instanceDS.createResolver('requestInstallLogAgent', {
      typeName: 'Mutation',
      fieldName: 'requestInstallLogAgent',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/instance_status/RequestInstallLogAgent.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    instanceDS.createResolver('listInstances', {
      typeName: 'Query',
      fieldName: 'listInstances',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(
          __dirname,
          '../../graphql/vtl/instance_status/ListInstances.vtl'
        )
      ),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });
  }
}
