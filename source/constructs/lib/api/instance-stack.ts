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
  installLogAgentDocumentForLinux: CfnDocument;
  installLogAgentDocumentForWindows: CfnDocument;
  agentStatusCheckDocument: CfnDocument;

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

    this.installLogAgentDocumentForLinux = new CfnDocument(
      this,
      'LinuxFluent-BitDocumentInstallation',
      {
        content: {
          schemaVersion: '2.2',
          description:
            'Install Fluent-Bit in Linux OS and the AWS output plugins via AWS Systems Manager',
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
            "FluentBitSource": {
              "default": "AWS",
              "description": "(Required) The source of FluentBit",
              "type": "String",
              "allowedValues": ["AWS", "Community"]
            }
          },
          mainSteps: [
            {
              action: 'aws:downloadContent',
              name: 'downloadFluentBit',
              "precondition": {
                "StringEquals": [
                  "{{FluentBitSource}}",
                  "AWS"
                ]
              },
              inputs: {
                sourceType: 'S3',
                sourceInfo: `{\"path\":\"https://${s3Address}/clo/${process.env.VERSION}/aws-for-fluent-bit/fluent-bit{{ARCHITECTURE}}.tar.gz\"}`,
                destinationPath: '/opt',
              },
            },
            {
              action: 'aws:runShellScript',
              name: 'installFluentBit',
              "precondition": {
                "StringEquals": [
                  "{{FluentBitSource}}",
                  "AWS"
                ]
              },
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
              name: 'installCommunityFluentBit',
              "precondition": {
                "StringEquals": [
                  "{{FluentBitSource}}",
                  "Community"
                ]
              },
              inputs: {
                runCommand: [
                  "set -x",
                  'export FLUENT_BIT_RELEASE_VERSION=3.0.4',
                  'curl https://raw.githubusercontent.com/fluent/fluent-bit/master/install.sh | sh',
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

    this.installLogAgentDocumentForWindows = new CfnDocument(
      this,
      'WindowsFluent-BitDocumentInstallation',
      {
        content: {
          "schemaVersion": "2.2",
          "description": "Deploy and install PowerShell modules.",
          "parameters": {
            "workingDirectory": {
              "type": "String",
              "default": "",
              "description": "(Optional) The path to the working directory on your instance.",
              "maxChars": 4096
            },
            "source": {
              "type": "String",
              "description": "The URL or local path on the instance to the application .zip file."
            },
            "sourceHash": {
              "type": "String",
              "default": "",
              "description": "(Optional) The SHA256 hash of the zip file."
            },
            "commands": {
              "type": "StringList",
              "default": [],
              "description": "(Optional) Specify PowerShell commands to run on your instance.",
              "displayType": "textarea"
            },
            "executionTimeout": {
              "type": "String",
              "default": "3600",
              "description": "(Optional) The time in seconds for a command to be completed before it is considered to have failed. Default is 3600 (1 hour). Maximum is 172800 (48 hours).",
              "allowedPattern": "([1-9][0-9]{0,4})|(1[0-6][0-9]{4})|(17[0-1][0-9]{3})|(172[0-7][0-9]{2})|(172800)"
            }
          },
          "mainSteps": [
            {
              "action": "aws:runPowerShellScript",
              "name": "createDownloadFolder",
              "precondition": {
                "StringEquals": [
                  "platformType",
                  "Windows"
                ]
              },
              "inputs": {
                "runCommand": [
                  "try {",
                  "  $sku = (Get-CimInstance -ClassName Win32_OperatingSystem).OperatingSystemSKU",
                  "  if ($sku -eq 143 -or $sku -eq 144) {",
                  "    Write-Host \"This document is not supported on Windows 2016 Nano Server.\"",
                  "    exit 40",
                  "  }",
                  "  $ssmAgentService = Get-ItemProperty 'HKLM:SYSTEM\\\\CurrentControlSet\\\\Services\\\\AmazonSSMAgent\\\\'",
                  "  if ($ssmAgentService -and [System.Version]$ssmAgentService.Version -ge [System.Version]'3.0.1031.0') {",
                  "     exit 0",
                  "  }",
                  "  $DataFolder = \"Application Data\"",
                  "  if ( ![string]::IsNullOrEmpty($env:ProgramData) ) {",
                  "    $DataFolder = $env:ProgramData",
                  "  } elseif ( ![string]::IsNullOrEmpty($env:AllUsersProfile) ) {",
                  "    $DataFolder = \"$env:AllUsersProfile\\Application Data\"",
                  "  }",
                  "  $TempFolder = \"/\"",
                  "  if ( $env:Temp -ne $null ) {",
                  "    $TempFolder = $env:Temp",
                  "  }",
                  "  $DataFolder = Join-Path $DataFolder 'Amazon\\SSM'",
                  "  $DownloadFolder = Join-Path $TempFolder 'Amazon\\SSM'",
                  "  if ( !( Test-Path -LiteralPath $DataFolder )) {",
                  "    $none = New-Item -ItemType directory -Path $DataFolder",
                  "  }",
                  "  $DataACL = Get-Acl $DataFolder",
                  "  if ( Test-Path -LiteralPath $DownloadFolder ) {",
                  "    $DownloadACL = Get-Acl $DownloadFolder",
                  "    $ACLDiff = Compare-Object ($DownloadACL.AccessToString) ($DataACL.AccessToString)",
                  "    if ( $ACLDiff.count -eq 0 ) {",
                  "      exit 0",
                  "    }",
                  "    Remove-Item $DownloadFolder -Recurse -Force",
                  "  }",
                  "  $none = New-Item -ItemType directory -Path $DownloadFolder",
                  "  Set-Acl $DownloadFolder -aclobject $DataACL",
                  "  $DownloadACL = Get-Acl $DownloadFolder",
                  "  $ACLDiff = Compare-Object ($DownloadACL.AccessToString) ($DataACL.AccessToString)",
                  "  if ( $ACLDiff.count -ne 0 ) {",
                  "    Write-Error \"Failed to create download folder\" -ErrorAction Continue",
                  "    exit 41",
                  "  }",
                  "} catch {",
                  "  Write-Host  \"Failed to create download folder\"",
                  "  Write-Error  $Error[0]  -ErrorAction Continue",
                  "  exit 42",
                  "}"
                ]
              }
            },
            {
              "action": "aws:psModule",
              "name": "installModule",
              "inputs": {
                "id": "0.aws:psModule",
                "runCommand": "{{ commands }}",
                "source": "{{ source }}",
                "sourceHash": "{{ sourceHash }}",
                "workingDirectory": "{{ workingDirectory }}",
                "timeoutSeconds": "{{ executionTimeout }}"
              }
            }
          ]
        },
        documentFormat: 'JSON',
        documentType: 'Command',
      }
    );

    this.agentStatusCheckDocument = new CfnDocument(
      this,
      'FluentBit-StatusCheckDocument',
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
            "winCommandLine": {
              "default": "",
              "description": "(Required) Specify the command line to be executed. The following formats of commands can be run: 'pythonMainFile.py argument1 argument2', 'ansible-playbook -i \"localhost,\" -c local example.yml'",
              "type": "String"
            },
            "linuxCommandLine": {
              "default": "",
              "description": "(Required) Specify the command line to be executed. The following formats of commands can be run: 'pythonMainFile.py argument1 argument2', 'ansible-playbook -i \"localhost,\" -c local example.yml'",
              "type": "String"
            }
          },
          "mainSteps": [
            {
              "inputs": {
                "timeoutSeconds": "{{ executionTimeout }}",
                "runCommand": [
                  "",
                  "$directory = Convert-Path .",
                  "$env:PATH += \";$directory\"",
                  " {{ winCommandLine }}",
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
                "timeoutSeconds": "{{ executionTimeout }}",
                "runCommand": [
                  "",
                  "directory=$(pwd)",
                  "export PATH=$PATH:$directory",
                  " {{ linuxCommandLine }} ",
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
        logFormat: "JSON",
        applicationLogLevel: "INFO",
        systemLogLevel: "WARN",
        environment: {
          SUB_ACCOUNT_LINK_TABLE_NAME: props.subAccountLinkTable.tableName,
          SOLUTION_VERSION: process.env.VERSION || 'v1.0.0',
          SOLUTION_ID: props.solutionId,
          LINUX_AGENT_INSTALLATION_DOCUMENT: this.installLogAgentDocumentForLinux.ref,
          WINDOWS_AGENT_INSTALLATION_DOCUMENT: this.installLogAgentDocumentForWindows.ref,
          AGENT_STATUS_CHECK_DOCUMENT: this.agentStatusCheckDocument.ref,
          FLB_DOWNLOAD_S3_ADDR: `https://${s3Address}/clo/${process.env.VERSION}/`,
        },
        description: `${Aws.STACK_NAME} - Instance Agent Status Query Resolver`,
      }
    );
    instanceHandler.node.addDependency(this.installLogAgentDocumentForLinux);
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
