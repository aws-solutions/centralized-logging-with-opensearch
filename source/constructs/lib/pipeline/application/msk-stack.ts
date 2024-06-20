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

import { Construct } from "constructs";
import { Duration, aws_lambda as lambda, aws_ec2 as ec2 } from "aws-cdk-lib";

import { ManagedKafkaEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

import { AppLogProcessor } from "./app-log-processor";

export interface MSKStackProps {
  /**
   * Default VPC for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly vpc: ec2.IVpc;

  /**
   * Default Security Group for OpenSearch REST API Handler
   *
   * @default - None.
   */
  readonly securityGroup: ec2.ISecurityGroup;

  /**
   * OpenSearch Endpoint Url
   *
   * @default - None.
   */
  readonly endpoint: string;

  /**
   * OpenSearch or Elasticsearch
   *
   * @default - OpenSearch.
   */
  readonly engineType: string;
  /**
 * OpenSearch Domain Name
 *
 * @default - None.
 */
  readonly domainName: string;
  /**
* Wheather to create Sample Dashboard
*
* @default - Yes.
*/
  readonly createDashboard?: string;

  /**
   * Index Prefix
   */
  readonly indexPrefix: string;

  /**
   * S3 bucket name for failed logs
   */
  readonly backupBucketName: string;

  /**
   * MSK Cluster Arn
   */
  readonly mskClusterArn: string;

  /**
   * MSK Topic Name
   */
  readonly topic: string;

  /**
   * Stack Prefix
   */
  readonly stackPrefix: string;

  readonly logType: string;
  /**
  * A list of plugins
  *
  * @default - None.
  */
  readonly plugins?: string;

  /**
   * Log proceersor lambda reserve concurrency
   *
   * @default - 0.
   */
  readonly logProcessorConcurrency: number;

  readonly warmAge?: string;
  readonly coldAge?: string;
  readonly retainAge?: string;
  readonly rolloverSize?: string;
  readonly indexSuffix?: string;
  readonly refreshInterval?: string;
  readonly codec?: string;
  readonly shardNumbers?: string;
  readonly replicaNumbers?: string;
  readonly solutionId: string;
  readonly indexTemplateGzipBase64: string;
}

export class MSKStack extends Construct {
  readonly logProcessorRoleArn: string;
  readonly logProcessorLogGroupName: string;

  constructor(scope: Construct, id: string, props: MSKStackProps) {
    super(scope, id);

    const logProcessor = new AppLogProcessor(this, 'LogProcessor', {
      vpc: props.vpc,
      securityGroup: props.securityGroup,
      endpoint: props.endpoint,
      indexPrefix: props.indexPrefix,
      engineType: props.engineType,
      domainName: props.domainName,
      createDashboard: props.createDashboard,
      backupBucketName: props.backupBucketName,
      source: "MSK",
      subCategory: "FLB",
      shardNumbers: props.shardNumbers,
      replicaNumbers: props.replicaNumbers,
      warmAge: props.warmAge,
      coldAge: props.coldAge,
      retainAge: props.retainAge,
      rolloverSize: props.rolloverSize,
      indexSuffix: props.indexSuffix,
      codec: props.codec,
      refreshInterval: props.refreshInterval,
      solutionId: props.solutionId,
      logType: props.logType,
      stackPrefix: props.stackPrefix,
      enableConfigJsonParam: false,
      indexTemplateGzipBase64: props.indexTemplateGzipBase64,
      logProcessorConcurrency: props.logProcessorConcurrency
    });


    // The Kafka topic you want to subscribe to
    // Currently, this can only be hardcoded, will replace the value in build scripts
    // The topic must exist before adding that as source.
    const topic = "test";

    const mskSource = new ManagedKafkaEventSource({
      clusterArn: props.mskClusterArn,
      topic: topic,
      batchSize: 10000,
      maxBatchingWindow: Duration.seconds(3),
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    });

    logProcessor.logProcessorFn.addEventSource(mskSource);

    this.logProcessorRoleArn = logProcessor.logProcessorFn.role!.roleArn;
    this.logProcessorLogGroupName =
      logProcessor.logProcessorFn.logGroup.logGroupName;
  }
}
