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

import {
  Duration,
  aws_stepfunctions as sfn,
  aws_stepfunctions_tasks as tasks,
  aws_iam as iam,
  aws_s3 as s3,
} from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { InitAthenaStack } from '../athena/init-athena-stack';
import { InitDynamoDBStack } from '../dynamodb/init-dynamodb-stack';
import { InitIAMStack } from '../iam/init-iam-stack';
import { InitLambdaStack } from '../lambda/init-lambda-stack';
import { InitSNSStack } from '../sns/init-sns-stack';
import { InitSQSStack } from '../sqs/init-sqs-stack';

export interface InitStepFunctionLogArchiveProps {
  readonly solutionId: string;
  readonly mainTaskId: string;
  readonly stagingBucket: s3.Bucket;
  readonly microBatchLambdaStack: InitLambdaStack;
  readonly microBatchDDBStack: InitDynamoDBStack;
  readonly microBatchAthenaStack: InitAthenaStack;
  readonly microBatchSNSStack: InitSNSStack;
  readonly microBatchIAMStack: InitIAMStack;
  readonly microBatchSQSStack: InitSQSStack;
}

export class InitStepFunctionLogArchiveStack extends Construct {
  readonly LogArchive: sfn.StateMachine;
  readonly LogArchiveRole: iam.Role;
  readonly LogArchiveStartExecutionRole: iam.Role;

  constructor(
    scope: Construct,
    id: string,
    props: InitStepFunctionLogArchiveProps
  ) {
    super(scope, id);

    let stagingBucket = props.stagingBucket;
    let microBatchLambdaStack = props.microBatchLambdaStack;
    let microBatchDDBStack = props.microBatchDDBStack;
    let microBatchAthenaStack = props.microBatchAthenaStack;
    let microBatchSNSStack = props.microBatchSNSStack;
    let microBatchIAMStack = props.microBatchIAMStack;
    let microBatchSQSStack = props.microBatchSQSStack;
    let mainTaskId = props.mainTaskId;

    const LogArchiveLambdaInvokePolicy = new iam.Policy(
      this,
      'LogArchiveLambdaInvokePolicy',
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['lambda:InvokeFunction'],
            resources: [
              `${microBatchLambdaStack.S3ObjectScanningStack.S3ObjectScanning.functionArn}`,
              `${microBatchLambdaStack.S3ObjectScanningStack.S3ObjectScanning.functionArn}:*`,
              `${microBatchLambdaStack.ETLHelperStack.ETLHelper.functionArn}`,
              `${microBatchLambdaStack.ETLHelperStack.ETLHelper.functionArn}:*`,
              `${microBatchLambdaStack.SendTemplateEmailStack.SendTemplateEmail.functionArn}`,
              `${microBatchLambdaStack.SendTemplateEmailStack.SendTemplateEmail.functionArn}:*`,
            ],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnLogArchiveLambdaInvokePolicy = LogArchiveLambdaInvokePolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnLogArchiveLambdaInvokePolicy.overrideLogicalId(
      'LogArchiveLambdaInvokePolicy'
    );

    const LogArchiveRWDDBPolicy = new iam.Policy(
      this,
      'LogArchiveRWDDBPolicy',
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem'],
            resources: [`${microBatchDDBStack.ETLLogTable.tableArn}`],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnLogArchiveRWDDBPolicy = LogArchiveRWDDBPolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnLogArchiveRWDDBPolicy.overrideLogicalId('LogArchiveRWDDBPolicy');

    const LogArchiveRWSNSPolicy = new iam.Policy(
      this,
      'LogArchiveRWSNSPolicy',
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['SNS:Publish'],
            resources: [
              `${microBatchSNSStack.SNSReceiveStatesFailedTopic.topicArn}`,
            ],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnLogArchiveRWSNSPolicy = LogArchiveRWSNSPolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnLogArchiveRWSNSPolicy.overrideLogicalId('LogArchiveRWSNSPolicy');

    // Create a Role for StepFunction:LogArchive
    this.LogArchiveRole = new iam.Role(this, 'LogArchiveRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
    });

    this.LogArchiveRole.addManagedPolicy(
      microBatchIAMStack.KMSPublicAccessPolicy
    );
    this.LogArchiveRole.attachInlinePolicy(LogArchiveLambdaInvokePolicy);
    this.LogArchiveRole.attachInlinePolicy(LogArchiveRWDDBPolicy);
    this.LogArchiveRole.attachInlinePolicy(LogArchiveRWSNSPolicy);

    // Override the logical ID
    const cfnLogArchiveRole = this.LogArchiveRole.node
      .defaultChild as iam.CfnRole;
    cfnLogArchiveRole.overrideLogicalId('LogArchiveRole');

    const jobFailed = new sfn.Fail(this, 'Job Failed');

    const putStepFunctionTaskToDynamoDB = new tasks.DynamoPutItem(
      this,
      'Put task info of Step Function to DynamoDB',
      {
        table: microBatchDDBStack.ETLLogTable,
        item: {
          executionName: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.Execution.Name')
          ),
          taskId: tasks.DynamoAttributeValue.fromString(mainTaskId),
          API: tasks.DynamoAttributeValue.fromString(
            'Step Functions: StartExecution'
          ),
          data: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('States.JsonToString($$.Execution.Input)')
          ),
          pipelineId: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$.metadata.pipelineId')
          ),
          startTime: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.Execution.StartTime')
          ),
          stateMachineName: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.StateMachine.Name')
          ),
          stateName: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.State.Name')
          ),
          pipelineIndexKey: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt(
              `States.Format('{}:{}:{}', $.metadata.pipelineId, $.metadata.scheduleType, '${mainTaskId}')`
            )
          ),
          status: tasks.DynamoAttributeValue.fromString('Running'),
        },
        resultPath: sfn.JsonPath.DISCARD,
      }
    );

    putStepFunctionTaskToDynamoDB.addRetry({
      interval: Duration.seconds(10),
      maxAttempts: 5,
      maxDelay: Duration.seconds(120),
      backoffRate: 2,
      jitterStrategy: sfn.JitterType.FULL,
    });

    const updateStepFunctionTaskToFailed = new tasks.DynamoUpdateItem(
      this,
      'Update task status of Step Function to Failed',
      {
        table: microBatchDDBStack.ETLLogTable,
        key: {
          executionName: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.Execution.Name')
          ),
          taskId: tasks.DynamoAttributeValue.fromString(mainTaskId),
        },
        updateExpression: 'SET #status = :status, #endTime = :endTime',
        expressionAttributeNames: {
          '#status': 'status',
          '#endTime': 'endTime',
        },
        expressionAttributeValues: {
          ':status': tasks.DynamoAttributeValue.fromString('Failed'),
          ':endTime': tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.State.EnteredTime')
          ),
        },
        resultPath: sfn.JsonPath.DISCARD,
      }
    );

    updateStepFunctionTaskToFailed.addRetry({
      interval: Duration.seconds(10),
      maxAttempts: 5,
      maxDelay: Duration.seconds(120),
      backoffRate: 2,
      jitterStrategy: sfn.JitterType.FULL,
    });

    const updateStepFunctionTaskToCompleted = new tasks.DynamoUpdateItem(
      this,
      'Update task status of Step Function to Succeeded',
      {
        table: microBatchDDBStack.ETLLogTable,
        key: {
          executionName: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.Execution.Name')
          ),
          taskId: tasks.DynamoAttributeValue.fromString(mainTaskId),
        },
        updateExpression: 'SET #status = :status, #endTime = :endTime',
        expressionAttributeNames: {
          '#status': 'status',
          '#endTime': 'endTime',
        },
        expressionAttributeValues: {
          ':status': tasks.DynamoAttributeValue.fromString('Succeeded'),
          ':endTime': tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.State.EnteredTime')
          ),
        },
        resultPath: sfn.JsonPath.DISCARD,
      }
    );

    const convertStartTimeToArchiveDate = new tasks.LambdaInvoke(
      this,
      'Convert Execution.StartTime to Archive date',
      {
        lambdaFunction: microBatchLambdaStack.ETLHelperStack.ETLHelper,
        payload: sfn.TaskInput.fromObject({
          API: 'ETL: DateTransform',
          'executionName.$': '$$.Execution.Name',
          'taskId.$': 'States.UUID()',
          parameters: {
            'dateString.$': '$$.Execution.StartTime',
            format: '%Y-%m-%dT%H:%M:%S.%f%z',
            'intervalDays.$': '$.metadata.athena.intervalDays',
          },
          extra: {
            parentTaskId: mainTaskId,
            'pipelineId.$': '$.metadata.pipelineId',
            'stateMachineName.$': '$$.StateMachine.Name',
            'stateName.$': '$$.State.Name',
          },
        }),
        retryOnServiceExceptions: false,
        resultSelector: {
          'date.$': '$.Payload.date',
        },
        resultPath: '$.results.migrationDate',
      }
    );

    const S3MigrationTaskFromHistoryToArchive = new tasks.LambdaInvoke(
      this,
      'Step 1: Migration S3 Objects from Delta to Archive',
      {
        lambdaFunction:
          microBatchLambdaStack.S3ObjectScanningStack.S3ObjectScanning,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          'executionName.$': '$$.Execution.Name',
          'srcPath.$':
            "States.Format('{}/{}={}', $.metadata.s3.srcPath, $.metadata.athena.firstPartitionKey, $.results.migrationDate.date)",
          'dstPath.$':
            "States.Format('{}/{}/{}={}', $.metadata.s3.archivePath, $$.Execution.Name, $.metadata.athena.firstPartitionKey, $.results.migrationDate.date)",
          sqsName: microBatchSQSStack.S3ObjectMigrationQ.queueName,
          keepPrefix: true,
          merge: false,
          deleteOnSuccess: true,
          maxRecords: -1,
          maxObjectFilesNumPerCopyTask: 1000,
          maxObjectFilesSizePerCopyTask: '10GiB',
          taskToken: sfn.JsonPath.taskToken,
          extra: {
            'pipelineId.$': '$.metadata.pipelineId',
            'stateMachineName.$': '$$.StateMachine.Name',
            'stateName.$': '$$.State.Name',
            parentTaskId: mainTaskId,
            API: 'Lambda: Invoke',
          },
        }),
        retryOnServiceExceptions: false,
        resultSelector: {
          'hasObjects.$': '$.hasObjects',
        },
        resultPath: '$.results.delta',
      }
    );

    const dropPartitionForHistoryTable = new tasks.LambdaInvoke(
      this,
      'Step 2: Batch Drop Partitions for History Data',
      {
        lambdaFunction: microBatchLambdaStack.ETLHelperStack.ETLHelper,
        payload: sfn.TaskInput.fromObject({
          API: 'Athena: BatchUpdatePartition',
          'executionName.$': '$$.Execution.Name',
          'taskId.$': 'States.UUID()',
          parameters: {
            action: 'DROP',
            'database.$': '$.metadata.athena.database',
            'tableName.$': '$.metadata.athena.tableName',
            'location.$':
              "States.Format('{}/{}', $.metadata.s3.archivePath, $$.Execution.Name)",
            'partitionPrefix.$':
              "States.Format('{}={}', $.metadata.athena.firstPartitionKey, $.results.migrationDate.date)",
            workGroup: microBatchAthenaStack.microBatchAthenaWorkGroup.name,
            outputLocation: `s3://${stagingBucket.bucketName}/athena-results`,
          },
          extra: {
            parentTaskId: mainTaskId,
            'pipelineId.$': '$.metadata.pipelineId',
            'stateMachineName.$': '$$.StateMachine.Name',
            'stateName.$': '$$.State.Name',
          },
        }),
        retryOnServiceExceptions: false,
        resultPath: sfn.JsonPath.DISCARD,
      }
    );

    const deltaHasData = new sfn.Choice(this, 'Delta has Data?')
      .when(
        sfn.Condition.booleanEquals('$.results.delta.hasObjects', true),
        dropPartitionForHistoryTable
      )
      .otherwise(updateStepFunctionTaskToCompleted);

    const sendFailureNotification = new tasks.SnsPublish(
      this,
      'Send Failure Notification',
      {
        topic: microBatchSNSStack.SNSReceiveStatesFailedTopic,
        message: sfn.TaskInput.fromObject({
          API: 'SNS: Publish',
          'stateMachineId.$': '$$.StateMachine.Id',
          'stateMachineName.$': '$$.StateMachine.Name',
          'stateName.$': '$$.State.Name',
          'executionId.$': '$$.Execution.Id',
          'executionName.$': '$$.Execution.Name',
          'pipelineId.$': '$.metadata.pipelineId',
          'tableName.$': '$.metadata.athena.tableName',
          'scheduleType.$': '$.metadata.scheduleType',
          'sourceType.$': '$.metadata.sourceType',
          'notification.$': '$.metadata.notification',
          'archivePath.$':
            "States.Format('{}/{}/original', $.metadata.s3.archivePath, $$.Execution.Name)",
          status: 'Failed',
          'metadata.$': '$.metadata',
        }),
      }
    );

    putStepFunctionTaskToDynamoDB
      .next(convertStartTimeToArchiveDate)
      .next(S3MigrationTaskFromHistoryToArchive)
      .next(deltaHasData);
    dropPartitionForHistoryTable.next(updateStepFunctionTaskToCompleted);

    convertStartTimeToArchiveDate.addCatch(sendFailureNotification, {
      resultPath: '$.errors.convertStartTimeToArchiveDate',
    });
    S3MigrationTaskFromHistoryToArchive.addCatch(sendFailureNotification, {
      resultPath: '$.errors.S3MigrationTaskFromHistoryToArchive',
    });
    dropPartitionForHistoryTable.addCatch(sendFailureNotification, {
      resultPath: '$.errors.dropPartitionForHistoryTable',
    });

    sendFailureNotification
      .next(updateStepFunctionTaskToFailed)
      .next(jobFailed);

    // Create a Step Function for LogArchive
    this.LogArchive = new sfn.StateMachine(this, 'LogArchive', {
      definitionBody: sfn.DefinitionBody.fromChainable(
        putStepFunctionTaskToDynamoDB
      ),
      role: this.LogArchiveRole.withoutPolicyUpdates(),
    });

    // Override the logical ID
    const cfnLogArchive = this.LogArchive.node
      .defaultChild as sfn.CfnStateMachine;
    cfnLogArchive.overrideLogicalId('LogArchive');

    NagSuppressions.addResourceSuppressions(this.LogArchive, [
      {
        id: 'AwsSolutions-SF1',
        reason: 'Step Function: LogArchive does not need enable Logging.',
      },
    ]);

    // Create a Policy to allow start log processor.
    const LogArchiveStartExecutionPolicy = new iam.Policy(
      this,
      'LogArchiveStartExecutionPolicy',
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['states:StartExecution'],
            resources: [this.LogArchive.stateMachineArn],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnLogArchiveStartExecutionPolicy = LogArchiveStartExecutionPolicy
      .node.defaultChild as iam.CfnPolicy;
    cfnLogArchiveStartExecutionPolicy.overrideLogicalId(
      'LogArchiveStartExecutionPolicy'
    );

    // Create a Role for EventBridge:Scheduler
    this.LogArchiveStartExecutionRole = new iam.Role(
      this,
      'LogArchiveStartExecutionRole',
      {
        assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
      }
    );

    // Override the logical ID
    const cfnLogArchiveStartExecutionRole = this.LogArchiveStartExecutionRole
      .node.defaultChild as iam.CfnRole;
    cfnLogArchiveStartExecutionRole.overrideLogicalId(
      'LogArchiveStartExecutionRole'
    );

    this.LogArchiveStartExecutionRole.attachInlinePolicy(
      LogArchiveStartExecutionPolicy
    );
  }
}
