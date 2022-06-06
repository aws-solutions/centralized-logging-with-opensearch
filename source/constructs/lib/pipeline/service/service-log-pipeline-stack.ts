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


import { CfnParameter, Construct, Fn, Stack, StackProps } from '@aws-cdk/core';
import { SecurityGroup, Vpc } from "@aws-cdk/aws-ec2";
import { S3toOpenSearchStack, S3toOpenSearchStackProps } from "./s3-to-opensearch-stack";
import { CWtoOpenSearchStack, CWtoOpenSearchStackProps } from "./cw-to-opensearch-stack";
import { CWtoFirehosetoS3Props, CWtoFirehosetoS3Stack } from "./cw-to-firehose-to-s3-stack";
import { OpenSearchInitProps, OpenSearchInitStack } from "../common/opensearch-init-stack";


const { VERSION } = process.env;

export interface PipelineStackProps extends StackProps {
    logType: string
}

export class ServiceLogPipelineStack extends Stack {
    private paramGroups: any[] = [];
    private paramLabels: any = {};

    private addToParamGroups(label: string, ...param: string[]) {
        const result = this.paramGroups.findIndex(param => {
            return param.Label.default == label;
        });
        if (result === -1) {
            this.paramGroups.push({
                Label: { default: label },
                Parameters: param
            });
        }
        else {
            this.paramGroups[result].Parameters.push(...param)
        }
    };

    private addToParamLabels(label: string, param: string) {
        this.paramLabels[param] = {
            default: label
        }
    }


    constructor(scope: Construct, id: string, props: PipelineStackProps) {
        super(scope, id, props);

        this.templateOptions.description = `(SO8025-${props.logType.toLowerCase()}) - Log Hub - ${props.logType} Log Analysis Pipeline Template - Version ${VERSION}`;

        this.templateOptions.metadata = {
            'AWS::CloudFormation::Interface': {
                ParameterGroups: this.paramGroups,
                ParameterLabels: this.paramLabels,
            }
        }

        const engineType = new CfnParameter(this, 'engineType', {
            description: 'The engine type of the OpenSearch. Select OpenSearch or Elasticsearch.',
            type: 'String',
            default: 'OpenSearch',
            allowedValues: ['OpenSearch', 'Elasticsearch'],
        })
        this.addToParamLabels('Engine Type', engineType.logicalId)

        const endpoint = new CfnParameter(this, 'endpoint', {
            description: 'The OpenSearch endpoint URL. e.g. vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com',
            default: '',
            type: 'String',
        })
        this.addToParamLabels('OpenSearch Endpoint', endpoint.logicalId)

        const domainName = new CfnParameter(this, 'domainName', {
            description: 'The domain name of the Amazon OpenSearch cluster.',
            default: '',
            type: 'String'
        })
        this.addToParamLabels('OpenSearch Domain Name', domainName.logicalId)

        const vpcId = new CfnParameter(this, 'vpcId', {
            description: 'Select a VPC which has access to the OpenSearch domain. The log processing Lambda will be resides in the selected VPC.',
            default: '',
            type: 'AWS::EC2::VPC::Id'
        })
        this.addToParamLabels('VPC ID', vpcId.logicalId)

        const subnetIds = new CfnParameter(this, 'subnetIds', {
            description: 'Select at least two subnets which has access to the OpenSearch domain and Amazon S3 service.',
            type: 'List<AWS::EC2::Subnet::Id>'
        })
        this.addToParamLabels('Subnet IDs', subnetIds.logicalId)

        const securityGroupId = new CfnParameter(this, 'securityGroupId', {
            description: 'Select a Security Group which will be associated to the log processing Lambda. Please make sure the Security Group has access to the OpenSearch domain.',
            default: '',
            type: 'AWS::EC2::SecurityGroup::Id'
        })
        this.addToParamLabels('Security Group ID', securityGroupId.logicalId)

        const backupBucketName = new CfnParameter(this, 'backupBucketName', {
            description: 'The S3 backup bucket name to store the failed ingestion logs.',
            type: 'String',
            allowedPattern: '.+',
            constraintDescription: 'Failed ingestion log S3 Bucket must not be empty'
        })
        this.addToParamLabels('S3 Backup Bucket', backupBucketName.logicalId)

        const indexPrefix = new CfnParameter(this, 'indexPrefix', {
            description: `The common prefix of OpenSearch index for the log. The index name will be <Index Prefix>-${props.logType.toLowerCase()}-<YYYY-MM-DD>.`,
            default: '',
            type: 'String',
        })
        this.addToParamLabels('Index Prefix', indexPrefix.logicalId)

        const createDashboard = new CfnParameter(this, 'createDashboard', {
            description: 'Whether to create a sample OpenSearch dashboard.',
            type: 'String',
            default: 'Yes',
            allowedValues: ['Yes', 'No']
        })
        this.addToParamLabels('Create Sample Dashboard', createDashboard.logicalId)

        const daysToWarm = new CfnParameter(this, 'daysToWarm', {
            description: 'The number of days required to move the index into warm storage, this is only effecitve when the value is >0 and warm storage is enabled in OpenSearch',
            default: 0,
            type: 'Number'
        })
        this.addToParamLabels('Days to Warm Storage', daysToWarm.logicalId)

        const daysToCold = new CfnParameter(this, 'daysToCold', {
            description: 'The number of days required to move the index into cold storage, this is only effecitve when the value is >0 and cold storage is enabled in OpenSearch',
            default: 0,
            type: 'Number'
        })
        this.addToParamLabels('Days to Cold Storage', daysToCold.logicalId)

        const daysToRetain = new CfnParameter(this, 'daysToRetain', {
            description: 'The total number of days to retain the index, if value is 0, the index will not be deleted',
            default: 0,
            type: 'Number'
        })
        this.addToParamLabels('Days to Retain', daysToRetain.logicalId)

        const shardNumbers = new CfnParameter(this, 'shardNumbers', {
            description: 'Number of shards to distribute the index evenly across all data nodes, keep the size of each shard between 10–50 GiB',
            default: 5,
            type: 'Number'
        })
        this.addToParamLabels('Number Of Shards', shardNumbers.logicalId)

        const replicaNumbers = new CfnParameter(this, 'replicaNumbers', {
            description: 'Number of replicas for OpenSearch Index. Each replica is a full copy of an index.',
            default: 1,
            type: 'Number'
        })
        this.addToParamLabels('Number of Replicas', replicaNumbers.logicalId)

        let pluginList = ""
        let plugins: CfnParameter | undefined = undefined

        if (['ELB', 'CloudFront'].includes(props.logType)) {
            plugins = new CfnParameter(this, 'plugins', {
                description: 'List of plugins delimited by comma, leave blank if no available plugins to use.',
                default: '',
                type: 'String'
            })
            this.addToParamLabels('Plugins', plugins.logicalId)
            pluginList = plugins.valueAsString
        }


        // Get the VPC where OpenSearch deploy
        const processVpc = Vpc.fromVpcAttributes(this, 'ProcessVpc', {
            vpcId: vpcId.valueAsString,
            availabilityZones: Fn.getAzs(),
            privateSubnetIds: subnetIds.valueAsList,
        });

        const processSg = SecurityGroup.fromSecurityGroupId(this, "ProcessSG", securityGroupId.valueAsString);

        if (['S3', 'CloudTrail', 'ELB', 'CloudFront', 'WAF', 'RDS'].includes(props.logType)) {
            const logBucketName = new CfnParameter(this, 'logBucketName', {
                description: `The S3 bucket name which stores the ${props.logType} logs.`,
                type: 'String',
                allowedPattern: '.+',
                constraintDescription: 'Log S3 Bucket must not be empty'
            })
            this.addToParamLabels('Log Bucket Name', logBucketName.logicalId)

            const logBucketPrefix = new CfnParameter(this, 'logBucketPrefix', {
                description: `The S3 bucket path prefix which stores the ${props.logType} logs.`,
                default: '',
                type: 'String'
            })
            this.addToParamLabels('Log Bucket Prefix', logBucketPrefix.logicalId)

            const defaultCmkArnParam = new CfnParameter(this, 'defaultCmkArnParam', {
                type: 'String',
                description: 'The KMS-CMK Arn for encryption. Leave empty to create a new KMS CMK.',
            });
            this.addToParamLabels('DefaultCmkArnParam', defaultCmkArnParam.logicalId)

            this.addToParamGroups('Advanced Options', defaultCmkArnParam.logicalId)
            this.addToParamGroups('Source Information', logBucketName.logicalId, logBucketPrefix.logicalId)

            const baseProps = {
                vpc: processVpc,
                securityGroup: processSg,
                endpoint: endpoint.valueAsString,
                logType: props.logType,
                indexPrefix: indexPrefix.valueAsString,
                engineType: engineType.valueAsString,
            }


            // Create S3 to OpenSearch Stack for service log pipeline
            const pipelineProps: S3toOpenSearchStackProps = {
                ...baseProps,
                defaultCmkArn: defaultCmkArnParam.valueAsString,
                logBucketName: logBucketName.valueAsString,
                logBucketPrefix: logBucketPrefix.valueAsString,
                backupBucketName: backupBucketName.valueAsString,
                plugins: pluginList,
            }

            const pipelineStack = new S3toOpenSearchStack(this, `LogPipeline`, pipelineProps)

            // Create S3 to OpenSearch Stack
            const osProps: OpenSearchInitProps = {
                ...baseProps,
                domainName: domainName.valueAsString,
                createDashboard: createDashboard.valueAsString,
                logProcessorRoleArn: pipelineStack.logProcessorRoleArn,
                shardNumbers: shardNumbers.valueAsString,
                replicaNumbers: replicaNumbers.valueAsString,
                daysToWarm: daysToWarm.valueAsString,
                daysToCold: daysToCold.valueAsString,
                daysToRetain: daysToRetain.valueAsString,
            }

            new OpenSearchInitStack(this, 'InitStack', osProps)

            if (['RDS'].includes(props.logType)) {
                const logGroupNames = new CfnParameter(this, 'logGroupNames', {
                    description: 'The names of the CloudWatch Log groups, separated by comma',
                    type: 'String',
                    allowedPattern: '.+',
                    constraintDescription: 'CloudWatch Log Group Names must not be empty'
                })
                this.addToParamLabels('Log Group Names', logGroupNames.logicalId)

                this.addToParamGroups('Source Information', logGroupNames.logicalId)

                // Start CloudWatch Log to Firehose to S3
                const cwtoFirehosetoS3StackProps: CWtoFirehosetoS3Props = {
                    logType: props.logType,
                    logGroupNames: logGroupNames.valueAsString,
                    logBucketName: logBucketName.valueAsString,
                    logBucketPrefix: logBucketPrefix.valueAsString,
                }
                new CWtoFirehosetoS3Stack(this, `CWtoFirehosetoS3Stack`, cwtoFirehosetoS3StackProps)
            }
        } else if (['Lambda'].includes(props.logType)) {
            const logGroupNames = new CfnParameter(this, 'logGroupNames', {
                description: 'The names of the CloudWatch Log groups, separated by comma',
                type: 'String',
                allowedPattern: '.+',
                constraintDescription: 'CloudWatch Log Group Names can not be empty'
            })
            this.addToParamLabels('Log Group Names', logGroupNames.logicalId)

            const kdsShardNumber = new CfnParameter(this, 'kdsShardNumber', {
                description: 'The shard number of Kinesis Data Streams which will subscribe to the RDS Log groups.',
                default: '1',
                type: 'Number',
            })
            this.addToParamLabels('KDS Shard Number', kdsShardNumber.logicalId)

            const kdsRetentionHours = new CfnParameter(this, 'kdsRetentionHours', {
                description: 'The retention hours of Kinesis Data Streams.',
                default: '48',
                type: 'Number',
            })
            this.addToParamLabels('KDS Retention Hours', kdsRetentionHours.logicalId)

            this.addToParamGroups('Source Information', logGroupNames.logicalId, kdsShardNumber.logicalId, kdsRetentionHours.logicalId)

            // Start CloudWatch Log to OpenSearch Stack
            const cwltoKinesistoOpenSearchStackProps: CWtoOpenSearchStackProps = {
                vpcId: vpcId.valueAsString,
                subnetIds: subnetIds.valueAsList,
                securityGroupId: securityGroupId.valueAsString,
                endpoint: endpoint.valueAsString,
                domainName: domainName.valueAsString,
                logType: props.logType!,
                failedLogBucket: backupBucketName.valueAsString,
                createDashboard: createDashboard.valueAsString,
                indexPrefix: indexPrefix.valueAsString,
                engineType: engineType.valueAsString,
                kdsShardNumber: kdsShardNumber.valueAsNumber,
                kdsRetentionHours: kdsRetentionHours.valueAsNumber,
                logGroupNames: logGroupNames.valueAsString,
            }

            new CWtoOpenSearchStack(this, 'CWtoOpenSearchStack', cwltoKinesistoOpenSearchStackProps)
        }

        this.addToParamGroups('Destination Information', engineType.logicalId, domainName.logicalId, endpoint.logicalId, indexPrefix.logicalId, createDashboard.logicalId)
        this.addToParamGroups('Network Information', vpcId.logicalId, subnetIds.logicalId, securityGroupId.logicalId)
        this.addToParamGroups('Backup Settings', backupBucketName.logicalId)

        // Before General Available, plugin is only applicable to limited types
        let advancedOptions = [shardNumbers.logicalId, replicaNumbers.logicalId, daysToWarm.logicalId, daysToCold.logicalId, daysToRetain.logicalId]
        if (plugins != undefined) {
            advancedOptions.push(plugins.logicalId)
        }
        this.addToParamGroups('Advanced Options', ...advancedOptions)


    }

}
