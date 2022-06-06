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

import { CfnParameter, CfnCondition, Stack, StackProps, Construct, Fn, Duration, Aws } from '@aws-cdk/core';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as opensearch from '@aws-cdk/aws-opensearchservice';
import * as sns from '@aws-cdk/aws-sns';
import * as kms from '@aws-cdk/aws-kms';
import * as iam from '@aws-cdk/aws-iam';
import { Rule, RuleTargetInput, EventField } from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';

const { VERSION } = process.env;

//function to create alarm base on conditions
function createOpenSearchAlarm(stack: Stack,
    domain: opensearch.IDomain,
    nameOfMetric: string,
    nameOfAlarm: string,
    evaluationPeriods: number,
    threshold: number,
    statistics: string,
    periodInSeconds: number,
    comparisonOperator: cloudwatch.ComparisonOperator,
    topic: sns.Topic) {
    const metric = domain.metric(`${nameOfMetric}`).with({
        statistic: statistics,
        period: Duration.seconds(periodInSeconds)
    });
    const alarm = metric.createAlarm(
        stack,
        `${nameOfAlarm}`,
        {
            evaluationPeriods: evaluationPeriods,
            threshold: threshold,
            comparisonOperator: comparisonOperator,
        }
    );
    const alarmRule = new Rule(stack, `${nameOfMetric}AlarmRule`, {
        description: `${nameOfMetric} Alarm Rule`,
        eventPattern: {
            source: ["aws.cloudwatch"],
            detailType: [`CloudWatch Alarm State Change`],
            detail: {
                state: {
                    "value": ["ALARM", "OK"]
                }
            },
            resources: [`${alarm.alarmArn}`]
        }
    });
    alarmRule.addTarget(new targets.SnsTopic(topic, {
        message: RuleTargetInput.fromObject({
            region: EventField.fromPath('$.region'),
            alarmName: EventField.fromPath('$.detail.alarmName'),
            domainName: EventField.fromPath('$.detail.configuration.metrics[0].metricStat.metric.dimensions.DomainName'),
            description: `${nameOfMetric} alarm status changed from ${EventField.fromPath('$.detail.previousState.value')} to ${EventField.fromPath('$.detail.state.value')}`,
            reason: EventField.fromPath('$.detail.state.reason')
        })
    }));
}

//function to create subscription
function createSubscription(stack: Stack,
    name: string,
    protocol: sns.SubscriptionProtocol,
    endpoint: string,
    region: string,
    topic: sns.Topic) {
    new sns.Subscription(stack, `${name}Subscription`, {
        protocol: protocol,
        endpoint: endpoint,
        region: region,
        topic: topic
    });
}

export class AlarmForOpenSearchStack extends Stack {
    private paramGroups: any[] = [];
    private paramLabels: any = {};
    private openSearchEndPoint = "";
    private openSearchArn = "";

    private addToParamGroups(label: string, ...param: string[]) {
        this.paramGroups.push({
            Label: { default: label },
            Parameters: param
        });
    };

    private addToParamLabels(label: string, param: string) {
        this.paramLabels[param] = {
            default: label
        };
    };

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        this.templateOptions.description = `(SO8025-alarm) - Log hub alarm-for-opensearch-stack Template. Template version ${VERSION}`;

        this.templateOptions.metadata = {
            'AWS::CloudFormation::Interface': {
                ParameterGroups: this.paramGroups,
                ParameterLabels: this.paramLabels,
            }
        }

        //OpenSearch info

        const endpoint = new CfnParameter(this, 'endpoint', {
            description: 'The endpoint of the OpenSearch domain. e.g. vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com',
            default: '',
            type: 'String'
        })
        this.addToParamLabels('Endpoint', endpoint.logicalId)

        const domainName = new CfnParameter(this, 'domainName', {
            description: 'The name of the OpenSearch domain',
            default: '',
            type: 'String'
        })
        this.addToParamLabels('DomainName', domainName.logicalId)

        //Flags

        const clusterStatusRed = new CfnParameter(this, 'clusterStatusRed', {
            description: 'Whether to enable alarm when at least one primary shard and its replicas are not allocated to a node',
            default: 'Yes',
            allowedValues: [
                "Yes",
                "No"
            ],
            type: 'String'
        })
        this.addToParamLabels('ClusterStatusRed', clusterStatusRed.logicalId)

        const clusterStatusYellow = new CfnParameter(this, 'clusterStatusYellow', {
            description: 'Whether to enable alarm when at least one replica shard is not allocated to a node',
            default: 'Yes',
            allowedValues: [
                "Yes",
                "No"
            ],
            type: 'String'
        })
        this.addToParamLabels('ClusterStatusYellow', clusterStatusYellow.logicalId)

        const freeStorageSpace = new CfnParameter(this, 'freeStorageSpace', {
            description: 'Whether to enable alarm when a node in your cluster is down to the free storage space you typed in GiB, we recommend setting it to 25% of the storage space for each node. 0 means the alarm is disabled',
            default: 10,
            type: 'Number'
        })
        this.addToParamLabels('FreeStorageSpace', freeStorageSpace.logicalId)

        const clusterIndexWritesBlocked = new CfnParameter(this, 'clusterIndexWritesBlocked', {
            description: 'Whether to enable alarm when your cluster is blocking write requests',
            default: 'Yes',
            allowedValues: [
                "Yes",
                "No"
            ],
            type: 'String'
        })
        this.addToParamLabels('ClusterIndexWritesBlocked', clusterIndexWritesBlocked.logicalId)

        const unreachableNodeNumber = new CfnParameter(this, 'unreachableNodeNumber', {
            description: 'Nodes minimum is < x for 1 day, 1 consecutive time. 0 means the alarm is disabled',
            default: 3,
            type: 'Number'
        })
        this.addToParamLabels('UnreachableNodeNumber', unreachableNodeNumber.logicalId)

        const automatedSnapshotFailure = new CfnParameter(this, 'automatedSnapshotFailure', {
            description: 'Whether to enable alarm when automated snapshot failed. AutomatedSnapshotFailure maximum is >= 1 for 1 minute, 1 consecutive time',
            default: 'Yes',
            allowedValues: [
                "Yes",
                "No"
            ],
            type: 'String'
        })
        this.addToParamLabels('AutomatedSnapshotFailure', automatedSnapshotFailure.logicalId)

        const cpuUtilization = new CfnParameter(this, 'cpuUtilization', {
            description: 'Whether to enable alarm when sustained high usage of CPU occurred. CPUUtilization or WarmCPUUtilization maximum is >= 80% for 15 minutes, 3 consecutive times',
            default: 'Yes',
            allowedValues: [
                "Yes",
                "No"
            ],
            type: 'String'
        })
        this.addToParamLabels('CPUUtilization', cpuUtilization.logicalId)

        const jvmMemoryPressure = new CfnParameter(this, 'jvmMemoryPressure', {
            description: 'Whether to enable alarm when JVM RAM usage peak occurred. JVMMemoryPressure or WarmJVMMemoryPressure maximum is >= 80% for 5 minutes, 3 consecutive times',
            default: 'Yes',
            allowedValues: [
                "Yes",
                "No"
            ],
            type: 'String'
        })
        this.addToParamLabels('JVMMemoryPressure', jvmMemoryPressure.logicalId)

        const masterCPUUtilization = new CfnParameter(this, 'masterCPUUtilization', {
            description: 'Whether to enable alarm when sustained high usage of CPU occurred in master nodes. MasterCPUUtilization maximum is >= 50% for 15 minutes, 3 consecutive times',
            default: 'Yes',
            allowedValues: [
                "Yes",
                "No"
            ],
            type: 'String'
        })
        this.addToParamLabels('MasterCPUUtilization', masterCPUUtilization.logicalId)

        const masterJVMMemoryPressure = new CfnParameter(this, 'masterJVMMemoryPressure', {
            description: 'Whether to enable alarm when JVM RAM usage peak occurred in master nodes. MasterJVMMemoryPressure maximum is >= 80% for 15 minutes, 1 consecutive time',
            default: 'Yes',
            allowedValues: [
                "Yes",
                "No"
            ],
            type: 'String'
        })
        this.addToParamLabels('MasterJVMMemoryPressure', masterJVMMemoryPressure.logicalId)

        const kmsKeyError = new CfnParameter(this, 'kmsKeyError', {
            description: 'Whether to enable alarm when KMS encryption key is disabled. KMSKeyError is >= 1 for 1 minute, 1 consecutive time',
            default: 'Yes',
            allowedValues: [
                "Yes",
                "No"
            ],
            type: 'String'
        })
        this.addToParamLabels('KMSKeyError', kmsKeyError.logicalId)

        const kmsKeyInaccessible = new CfnParameter(this, 'kmsKeyInaccessible', {
            description: 'Whether to enable alarm when KMS encryption key has been deleted or has revoked its grants to OpenSearch Service. KMSKeyInaccessible is >= 1 for 1 minute, 1 consecutive time',
            default: 'Yes',
            allowedValues: [
                "Yes",
                "No"
            ],
            type: 'String'
        })
        this.addToParamLabels('KMSKeyInaccessible', kmsKeyInaccessible.logicalId)

        const email = new CfnParameter(this, 'email', {
            description: 'The notification email address. Alarms will be sent to this email address via SNS',
            default: '',
            type: 'String'
        })
        this.addToParamLabels('Email', email.logicalId)

        this.addToParamGroups('OpenSearch Information', endpoint.logicalId, domainName.logicalId)
        this.addToParamGroups('SNS Information', email.logicalId)
        this.addToParamGroups('Alarm Options',
            clusterStatusRed.logicalId,
            clusterStatusYellow.logicalId,
            freeStorageSpace.logicalId,
            clusterIndexWritesBlocked.logicalId,
            unreachableNodeNumber.logicalId,
            automatedSnapshotFailure.logicalId,
            cpuUtilization.logicalId,
            jvmMemoryPressure.logicalId,
            masterCPUUtilization.logicalId,
            masterJVMMemoryPressure.logicalId,
            kmsKeyError.logicalId,
            kmsKeyInaccessible.logicalId
        )

        this.openSearchEndPoint = endpoint.valueAsString;
        this.openSearchArn = `arn:${Aws.PARTITION}:es:${Aws.REGION}:${Aws.ACCOUNT_ID}:domain/${domainName.valueAsString}`;

        const domain = opensearch.Domain.fromDomainAttributes(this, 'ImportedDomain', {
            domainArn: this.openSearchArn,
            domainEndpoint: this.openSearchEndPoint,
        });

        const snsKey = new kms.Key(this, 'KmsMasterKey', {
            enableKeyRotation: true,
            trustAccountIdentities: true,
            policy: new iam.PolicyDocument({
                assignSids: true,
                statements: [
                    new iam.PolicyStatement({
                        actions: [
                            "kms:GenerateDataKey*",
                            "kms:Decrypt",
                            "kms:Encrypt",
                        ],
                        resources: ["*"],
                        effect: iam.Effect.ALLOW,
                        principals: [
                            new iam.ServicePrincipal("sns.amazonaws.com"),
                            new iam.ServicePrincipal("cloudwatch.amazonaws.com"),
                            new iam.ServicePrincipal("events.amazonaws.com")
                        ],
                    }),
                    new iam.PolicyStatement({
                        actions: [
                            "kms:Create*",
                            "kms:Describe*",
                            "kms:Enable*",
                            "kms:List*",
                            "kms:Put*",
                            "kms:Update*",
                            "kms:Revoke*",
                            "kms:Disable*",
                            "kms:Get*",
                            "kms:Delete*",
                            "kms:ScheduleKeyDeletion",
                            "kms:CancelKeyDeletion",
                            "kms:GenerateDataKey",
                            "kms:TagResource",
                            "kms:UntagResource"
                        ],
                        resources: ["*"],
                        effect: iam.Effect.ALLOW,
                        principals: [
                            new iam.AccountRootPrincipal
                        ],
                    })
                ],
            }),
        });

        //Create SNS topic
        const topic = new sns.Topic(this, `AlarmTopic`, {
            displayName: `AWS cloudwatch alarm topic`,
            masterKey: snsKey,
            fifo: false
        });

        createSubscription(this,
            "Email",
            sns.SubscriptionProtocol.EMAIL,
            email.valueAsString,
            Aws.REGION,
            topic
        );

        // Create alarm for ClusterStatus.red metrics
        // Flag to determine whether flag is enabled or not
        const ClusterStatusRedNotEnabled = new CfnCondition(this, 'clusterStatusRedNotEnabled', {
            expression: Fn.conditionEquals('No', clusterStatusRed.valueAsString),
        });
        // Configuration value that is a different string based on flag
        Fn.conditionIf(ClusterStatusRedNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "ClusterStatus.red", "ClusterStatus.red",
                1, //evaluationPeriods
                1, //threshold
                "average", //statistics
                60, //periodInSeconds
                cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                topic
            )
        );

        // Create alarm for ClusterStatus.yellow metrics
        // Flag to determine whether flag is enabled or not
        const ClusterStatusYellowNotEnabled = new CfnCondition(this, 'clusterStatusYellowNotEnabled', {
            expression: Fn.conditionEquals('No', clusterStatusYellow.valueAsString),
        });
        // Configuration value that is a different string based on flag
        Fn.conditionIf(ClusterStatusYellowNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "ClusterStatus.yellow", "ClusterStatus.yellow",
                1, //evaluationPeriods
                1, //threshold
                "average", //statistics
                60, //periodInSeconds
                cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                topic
            )
        );

        // Create alarm for FreeStorageSpace metrics
        // Flag to determine whether flag is enabled or not
        const FreeStorageSpaceNotEnabled = new CfnCondition(this, 'freeStorageSpaceNotEnabled', {
            expression: Fn.conditionEquals(0, freeStorageSpace.valueAsNumber),
        });
        // Configuration value that is a different string based on flag
        Fn.conditionIf(FreeStorageSpaceNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "FreeStorageSpace", "FreeStorageSpace",
                1, //evaluationPeriods
                freeStorageSpace.valueAsNumber, //threshold
                "minimum", //statistics
                60, //periodInSeconds
                cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
                topic
            )
        );

        // Create alarm for ClusterIndexWritesBlocked metrics
        // Flag to determine whether flag is enabled or not
        const ClusterIndexWritesBlockedNotEnabled = new CfnCondition(this, 'clusterIndexWritesBlockedNotEnabled', {
            expression: Fn.conditionEquals('No', clusterIndexWritesBlocked.valueAsString),
        });
        // Configuration value that is a different string based on flag
        Fn.conditionIf(ClusterIndexWritesBlockedNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "ClusterIndexWritesBlocked", "ClusterIndexWritesBlocked",
                1, //evaluationPeriods
                1, //threshold
                "average", //statistics
                300, //periodInSeconds
                cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                topic
            )
        );

        // Create alarm for Nodes metrics
        // Flag to determine whether flag is enabled or not
        const NodesNotEnabled = new CfnCondition(this, 'nodesNotEnabled', {
            expression: Fn.conditionEquals(0, unreachableNodeNumber.valueAsNumber),
        });
        // Configuration value that is a different string based on flag
        Fn.conditionIf(NodesNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "Nodes", "Nodes",
                1, //evaluationPeriods
                unreachableNodeNumber.valueAsNumber, //threshold
                "minimum", //statistics
                86400, //periodInSeconds
                cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
                topic
            )
        );

        // Create alarm for AutomatedSnapshotFailure metrics
        // Flag to determine whether flag is enabled or not
        const AutomatedSnapshotFailureNotEnabled = new CfnCondition(this, 'automatedSnapshotFailureNotEnabled', {
            expression: Fn.conditionEquals('No', automatedSnapshotFailure.valueAsString),
        });
        // Configuration value that is a different string based on flag
        Fn.conditionIf(AutomatedSnapshotFailureNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "AutomatedSnapshotFailure", "AutomatedSnapshotFailure",
                1, //evaluationPeriods
                1, //threshold
                "maximum", //statistics
                60, //periodInSeconds
                cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                topic
            )
        );

        // Create alarm for CPUUtilization or WarmCPUUtilization metrics
        // Flag to determine whether flag is enabled or not
        const CPUUtilizationNotEnabled = new CfnCondition(this, 'cpuUtilizationNotEnabled', {
            expression: Fn.conditionEquals('No', cpuUtilization.valueAsString),
        });
        // Configuration value that is a different string based on flag
        Fn.conditionIf(CPUUtilizationNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "CPUUtilization", "CPUUtilization",
                3, //evaluationPeriods
                80, //threshold
                "average", //statistics
                300, //periodInSeconds
                cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                topic
            )
        );
        Fn.conditionIf(CPUUtilizationNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "WarmCPUUtilization", "WarmCPUUtilization",
                3, //evaluationPeriods
                80, //threshold
                "average", //statistics
                900, //periodInSeconds
                cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                topic
            )
        );

        // Create alarm for JVMMemoryPressure or WarmJVMMemoryPressure metrics
        // Flag to determine whether flag is enabled or not
        const JVMMemoryPressureNotEnabled = new CfnCondition(this, 'jvmMemoryPressureNotEnabled', {
            expression: Fn.conditionEquals('No', jvmMemoryPressure.valueAsString),
        });
        // Configuration value that is a different string based on flag
        Fn.conditionIf(JVMMemoryPressureNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "JVMMemoryPressure", "JVMMemoryPressure",
                3, //evaluationPeriods
                80, //threshold
                "average", //statistics
                300, //periodInSeconds
                cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                topic
            )
        );
        Fn.conditionIf(JVMMemoryPressureNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "WarmJVMMemoryPressure", "WarmJVMMemoryPressure",
                3, //evaluationPeriods
                80, //threshold
                "average", //statistics
                300, //periodInSeconds
                cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                topic
            )
        );

        // Create alarm for MasterCPUUtilization metrics
        // Flag to determine whether flag is enabled or not
        const MasterCPUUtilizationNotEnabled = new CfnCondition(this, 'masterCPUUtilizationNotEnabled', {
            expression: Fn.conditionEquals('No', masterCPUUtilization.valueAsString),
        });
        // Configuration value that is a different string based on flag
        Fn.conditionIf(MasterCPUUtilizationNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "MasterCPUUtilization", "MasterCPUUtilization",
                3, //evaluationPeriods
                50, //threshold
                "average", //statistics
                900, //periodInSeconds
                cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                topic
            )
        );

        // Create alarm for MasterJVMMemoryPressure metrics
        // Flag to determine whether flag is enabled or not
        const MasterJVMMemoryPressureNotEnabled = new CfnCondition(this, 'masterJVMMemoryPressureNotEnabled', {
            expression: Fn.conditionEquals('No', kmsKeyError.valueAsString),
        });
        // Configuration value that is a different string based on flag
        Fn.conditionIf(MasterJVMMemoryPressureNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "MasterJVMMemoryPressure", "MasterJVMMemoryPressure",
                1, //evaluationPeriods
                80, //threshold
                "average", //statistics
                900, //periodInSeconds
                cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                topic
            )
        );

        // Create alarm for KMSKeyError metrics
        // Flag to determine whether flag is enabled or not
        const KMSKeyErrorNotEnabled = new CfnCondition(this, 'kmsKeyErrorNotEnabled', {
            expression: Fn.conditionEquals('No', kmsKeyError.valueAsString),
        });
        // Configuration value that is a different string based on flag
        Fn.conditionIf(KMSKeyErrorNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "KMSKeyError", "KMSKeyError",
                1, //evaluationPeriods
                1, //threshold
                "average", //statistics
                60, //periodInSeconds
                cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                topic
            )
        );

        // Create alarm for KMSKeyInaccessible metrics
        // Flag to determine whether flag is enabled or not
        const KMSKeyInaccessibleNotEnabled = new CfnCondition(this, 'kmsKeyInaccessibleNotEnabled', {
            expression: Fn.conditionEquals('No', kmsKeyInaccessible.valueAsString),
        });
        // Configuration value that is a different string based on flag
        Fn.conditionIf(KMSKeyInaccessibleNotEnabled.logicalId, '',
            createOpenSearchAlarm(this, domain, "KMSKeyInaccessible", "KMSKeyInaccessible",
                1, //evaluationPeriods
                1, //threshold
                "average", //statistics
                60, //periodInSeconds
                cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                topic
            )
        );

    }
}