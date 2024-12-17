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

export interface InitStepFunctionLogMergerProps {
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

export class InitStepFunctionLogMergerStack extends Construct {
  readonly LogMerger: sfn.StateMachine;
  readonly LogMergerRole: iam.Role;
  readonly LogMergerStartExecutionRole: iam.Role;

  constructor(
    scope: Construct,
    id: string,
    props: InitStepFunctionLogMergerProps
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

    const LogMergerLambdaInvokePolicy = new iam.Policy(
      this,
      'LogMergerLambdaInvokePolicy',
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
    const cfnLogMergerLambdaInvokePolicy = LogMergerLambdaInvokePolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnLogMergerLambdaInvokePolicy.overrideLogicalId(
      'LogMergerLambdaInvokePolicy'
    );

    const LogMergerRWDDBPolicy = new iam.Policy(this, 'LogMergerRWDDBPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem'],
          resources: [`${microBatchDDBStack.ETLLogTable.tableArn}`],
        }),
      ],
    });

    // Override the logical ID
    const cfnLogMergerRWDDBPolicy = LogMergerRWDDBPolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnLogMergerRWDDBPolicy.overrideLogicalId('LogMergerRWDDBPolicy');

    const LogMergerRWSNSPolicy = new iam.Policy(this, 'LogMergerRWSNSPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['SNS:Publish'],
          resources: [
            `${microBatchSNSStack.SNSReceiveStatesFailedTopic.topicArn}`,
          ],
        }),
      ],
    });

    // Override the logical ID
    const cfnLogMergerRWSNSPolicy = LogMergerRWSNSPolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnLogMergerRWSNSPolicy.overrideLogicalId('LogMergerRWSNSPolicy');

    // Create a Role for StepFunction:LogMerger
    this.LogMergerRole = new iam.Role(this, 'LogMergerRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
    });

    this.LogMergerRole.addManagedPolicy(
      microBatchIAMStack.KMSPublicAccessPolicy
    );
    this.LogMergerRole.attachInlinePolicy(LogMergerLambdaInvokePolicy);
    this.LogMergerRole.attachInlinePolicy(LogMergerRWSNSPolicy);
    this.LogMergerRole.attachInlinePolicy(LogMergerRWDDBPolicy);

    // Override the logical ID
    const cfnLogMergerRole = this.LogMergerRole.node
      .defaultChild as iam.CfnRole;
    cfnLogMergerRole.overrideLogicalId('LogMergerRole');

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

    updateStepFunctionTaskToCompleted.addRetry({
      interval: Duration.seconds(10),
      maxAttempts: 5,
      maxDelay: Duration.seconds(120),
      backoffRate: 2,
      jitterStrategy: sfn.JitterType.FULL,
    });

    const convertStartTimeToETLDate = new tasks.LambdaInvoke(
      this,
      'Convert Execution.StartTime to etl date',
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

    const S3MergeTaskFromDeltaToArchive = new tasks.LambdaInvoke(
      this,
      'Step 1: Merge S3 Objects from Delta to Archive',
      {
        lambdaFunction:
          microBatchLambdaStack.S3ObjectScanningStack.S3ObjectScanning,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          'executionName.$': '$$.Execution.Name',
          'srcPath.$':
            "States.Format('{}/{}={}', $.metadata.s3.srcPath, $.metadata.athena.firstPartitionKey, $.results.migrationDate.date)",
          'dstPath.$':
            "States.Format('{}/{}/merge/{}={}', $.metadata.s3.archivePath, $$.Execution.Name, $.metadata.athena.firstPartitionKey, $.results.migrationDate.date)",
          sqsName: microBatchSQSStack.S3ObjectMergeQ.queueName,
          'keepPrefix.$': '$.metadata.athena.partitionInfo',
          merge: true,
          size: '256MiB',
          deleteOnSuccess: false,
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
        resultPath: '$.results.delta',
      }
    );

    const S3MigrationTaskFromDeltaToArchive = new tasks.LambdaInvoke(
      this,
      'Step 2: Migration S3 Objects from Delta to Archive for Backup',
      {
        lambdaFunction:
          microBatchLambdaStack.S3ObjectScanningStack.S3ObjectScanning,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          'executionName.$': '$$.Execution.Name',
          'srcPath.$':
            "States.Format('{}/{}={}', $.metadata.s3.srcPath, $.metadata.athena.firstPartitionKey, $.results.migrationDate.date)",
          'dstPath.$':
            "States.Format('{}/{}/original/{}={}', $.metadata.s3.archivePath, $$.Execution.Name, $.metadata.athena.firstPartitionKey, $.results.migrationDate.date)",
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
        resultPath: sfn.JsonPath.DISCARD,
      }
    );

    const S3MergedMigrationTaskFromArchiveToDelta = new tasks.LambdaInvoke(
      this,
      'Step 3: Migration Merged S3 Objects from Archive to Delta',
      {
        lambdaFunction:
          microBatchLambdaStack.S3ObjectScanningStack.S3ObjectScanning,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          'executionName.$': '$$.Execution.Name',
          'srcPath.$':
            "States.Format('{}/{}/merge/{}={}', $.metadata.s3.archivePath, $$.Execution.Name, $.metadata.athena.firstPartitionKey, $.results.migrationDate.date)",
          'dstPath.$':
            "States.Format('{}/{}={}', $.metadata.s3.srcPath, $.metadata.athena.firstPartitionKey, $.results.migrationDate.date)",
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
        resultPath: sfn.JsonPath.DISCARD,
      }
    );

    const addPartitionForDeltaTable = new tasks.LambdaInvoke(
      this,
      'Step 4: Add Merged Partitions in Batch operation',
      {
        lambdaFunction: microBatchLambdaStack.ETLHelperStack.ETLHelper,
        payload: sfn.TaskInput.fromObject({
          API: 'Athena: BatchUpdatePartition',
          'executionName.$': '$$.Execution.Name',
          'taskId.$': 'States.UUID()',
          parameters: {
            action: 'ADD',
            'database.$': '$.metadata.athena.database',
            'tableName.$': '$.metadata.athena.tableName',
            'location.$': '$.metadata.s3.srcPath',
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

    const dropPartitionForDeltaTable = new tasks.LambdaInvoke(
      this,
      'Step 5: Batch Drop Partitions before Merging',
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
              "States.Format('{}/{}/original', $.metadata.s3.archivePath, $$.Execution.Name)",
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

    const deltaHasData = new sfn.Choice(this, 'Delta has Data?')
      .when(
        sfn.Condition.booleanEquals('$.results.delta.hasObjects', true),
        S3MigrationTaskFromDeltaToArchive
      )
      .otherwise(updateStepFunctionTaskToCompleted);

    putStepFunctionTaskToDynamoDB
      .next(convertStartTimeToETLDate)
      .next(S3MergeTaskFromDeltaToArchive)
      .next(deltaHasData);
    S3MigrationTaskFromDeltaToArchive.next(
      S3MergedMigrationTaskFromArchiveToDelta
    )
      .next(addPartitionForDeltaTable)
      .next(dropPartitionForDeltaTable)
      .next(updateStepFunctionTaskToCompleted);

    S3MergeTaskFromDeltaToArchive.addCatch(sendFailureNotification, {
      resultPath: '$.errors.S3MergeTaskFromDeltaToArchive',
    });
    S3MigrationTaskFromDeltaToArchive.addCatch(sendFailureNotification, {
      resultPath: '$.errors.S3MigrationTaskFromDeltaToArchive',
    });
    S3MergedMigrationTaskFromArchiveToDelta.addCatch(sendFailureNotification, {
      resultPath: '$.errors.S3MergedMigrationTaskFromArchiveToDelta',
    });

    addPartitionForDeltaTable.addCatch(sendFailureNotification, {
      resultPath: '$.errors.addPartitionForDeltaTable',
    });
    dropPartitionForDeltaTable.addCatch(sendFailureNotification, {
      resultPath: '$.errors.dropPartitionForDeltaTable',
    });

    sendFailureNotification
      .next(updateStepFunctionTaskToFailed)
      .next(jobFailed);

    // Create a Step Function for LogMerger
    this.LogMerger = new sfn.StateMachine(this, 'LogMerger', {
      definitionBody: sfn.DefinitionBody.fromChainable(
        putStepFunctionTaskToDynamoDB
      ),
      role: this.LogMergerRole.withoutPolicyUpdates(),
    });

    // Override the logical ID
    const cfnLogMerger = this.LogMerger.node
      .defaultChild as sfn.CfnStateMachine;
    cfnLogMerger.overrideLogicalId('LogMerger');

    NagSuppressions.addResourceSuppressions(this.LogMerger, [
      {
        id: 'AwsSolutions-SF1',
        reason: 'Step Function: LogMerger does not need enable Logging.',
      },
    ]);

    // Create a Policy to allow start log processor.
    const LogMergerStartExecutionPolicy = new iam.Policy(
      this,
      'LogMergerStartExecutionPolicy',
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['states:StartExecution'],
            resources: [this.LogMerger.stateMachineArn],
          }),
        ],
      }
    );

    // Override the logical ID
    const cfnLogMergerStartExecutionPolicy = LogMergerStartExecutionPolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnLogMergerStartExecutionPolicy.overrideLogicalId(
      'LogMergerStartExecutionPolicy'
    );

    // Create a Role for EventBridge:Scheduler
    this.LogMergerStartExecutionRole = new iam.Role(
      this,
      'LogMergerStartExecutionRole',
      {
        assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
      }
    );

    // Override the logical ID
    const cfnLogMergerStartExecutionRole = this.LogMergerStartExecutionRole.node
      .defaultChild as iam.CfnRole;
    cfnLogMergerStartExecutionRole.overrideLogicalId(
      'LogMergerStartExecutionRole'
    );

    this.LogMergerStartExecutionRole.attachInlinePolicy(
      LogMergerStartExecutionPolicy
    );
  }
}
