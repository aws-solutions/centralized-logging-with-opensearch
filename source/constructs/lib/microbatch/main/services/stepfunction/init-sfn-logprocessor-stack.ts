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
import { Aws, Duration, aws_stepfunctions as sfn, aws_stepfunctions_tasks as tasks, aws_iam as iam, aws_s3 as s3 } from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";
import { InitSFNAthenaWorkflowStack } from "./init-sfn-athena-workflow-stack";
import { InitAthenaStack } from "../athena/init-athena-stack";
import { InitLambdaStack } from "../lambda/init-lambda-stack";
import { InitIAMStack } from "../iam/init-iam-stack";
import { InitDynamoDBStack } from "../dynamodb/init-dynamodb-stack"
import { InitSNSStack } from "../sns/init-sns-stack";
import { InitKMSStack } from "../kms/init-kms-stack";
import { InitSQSStack } from "../sqs/init-sqs-stack";

export interface  InitStepFunctionLogProcessorProps {
  readonly solutionId: string;
  readonly mainTaskId: string;
  readonly stagingBucket: s3.Bucket;
  readonly AthenaWorkflowStack: InitSFNAthenaWorkflowStack;
  readonly microBatchLambdaStack: InitLambdaStack;
  readonly microBatchIAMStack: InitIAMStack;
  readonly microBatchDDBStack: InitDynamoDBStack;
  readonly microBatchAthenaStack: InitAthenaStack;
  readonly microBatchSNSStack: InitSNSStack;
  readonly microBatchKMSStack: InitKMSStack;
  readonly microBatchSQSStack: InitSQSStack;
}

export class InitStepFunctionLogProcessorStack extends Construct {
    readonly LogProcessor: sfn.StateMachine;
    readonly LogProcessorRole: iam.Role;
    readonly LogProcessorStartExecutionRole: iam.Role;

    constructor(scope: Construct, id: string, props: InitStepFunctionLogProcessorProps) {
      super(scope, id);

      let stagingBucket = props.stagingBucket;
      let AthenaWorkflowStack = props.AthenaWorkflowStack;
      let microBatchLambdaStack = props.microBatchLambdaStack;
      let microBatchIAMStack = props.microBatchIAMStack;
      let microBatchDDBStack = props.microBatchDDBStack;
      let microBatchAthenaStack = props.microBatchAthenaStack
      let microBatchSNSStack = props.microBatchSNSStack;
      let microBatchSQSStack = props.microBatchSQSStack;
      let mainTaskId = props.mainTaskId;

      const LogProcessorLambdaInvokePolicy = new iam.Policy(this, "LogProcessorLambdaInvokePolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "lambda:InvokeFunction",
            ], 
            resources: [
              `${microBatchLambdaStack.S3ObjectScanningStack.S3ObjectScanning.functionArn}`,
              `${microBatchLambdaStack.S3ObjectScanningStack.S3ObjectScanning.functionArn}:*`,
              `${microBatchLambdaStack.SendTemplateEmailStack.SendTemplateEmail.functionArn}`,
              `${microBatchLambdaStack.SendTemplateEmailStack.SendTemplateEmail.functionArn}:*`,
              `${microBatchLambdaStack.ETLHelperStack.ETLHelper.functionArn}`,
              `${microBatchLambdaStack.ETLHelperStack.ETLHelper.functionArn}:*`,
            ],
          }),
        ],
      });

      // Override the logical ID
      const cfnLogProcessorLambdaInvokePolicy = LogProcessorLambdaInvokePolicy.node.defaultChild as iam.CfnPolicy;
      cfnLogProcessorLambdaInvokePolicy.overrideLogicalId("LogProcessorLambdaInvokePolicy");

      const LogProcessorRWDDBPolicy = new iam.Policy(this, "LogProcessorRWDDBPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
            ], 
            resources: [`${microBatchDDBStack.ETLLogTable.tableArn}`],
          }),
        ],
      });

      // Override the logical ID
      const cfnLogProcessorRWDDBPolicy= LogProcessorRWDDBPolicy.node.defaultChild as iam.CfnPolicy;
      cfnLogProcessorRWDDBPolicy.overrideLogicalId("LogProcessorRWDDBPolicy");

      const LogProcessorStartStateMachinePolicy = new iam.Policy(this, "LogProcessorStartStateMachinePolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "states:StartExecution",
            ], 
            resources: [
              `${AthenaWorkflowStack.AthenaWorkflow.stateMachineArn}`,
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "states:DescribeExecution",
                "states:StopExecution",
            ], 
            resources: [
              `${AthenaWorkflowStack.AthenaWorkflow.stateMachineArn}:*`,
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "events:PutTargets",
                "events:PutRule",
                "events:DescribeRule"
            ], 
            resources: [
              `arn:${Aws.PARTITION}:events:${Aws.REGION}:${Aws.ACCOUNT_ID}:rule/StepFunctionsGetEventsForStepFunctionsExecutionRule`,
            ],
          }),
        ],
      });

      // Override the logical ID
      const cfnLogProcessorStartStateMachinePolicy = LogProcessorStartStateMachinePolicy.node.defaultChild as iam.CfnPolicy;
      cfnLogProcessorStartStateMachinePolicy.overrideLogicalId("LogProcessorStartStateMachinePolicy");

      const LogProcessorRWSNSPolicy = new iam.Policy(this, "LogProcessorRWSNSPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "SNS:Publish",
            ], 
            resources: [`${microBatchSNSStack.SNSReceiveStatesFailedTopic.topicArn}`],
          }),
        ],
      });

      // Override the logical ID
      const cfnLogProcessorRWSNSPolicy= LogProcessorRWSNSPolicy.node.defaultChild as iam.CfnPolicy;
      cfnLogProcessorRWSNSPolicy.overrideLogicalId("LogProcessorRWSNSPolicy");

      // Create a Role for StepFunction:LogProcessor 
      this.LogProcessorRole = new iam.Role(this, "LogProcessorRole", {
        assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      });

      this.LogProcessorRole.addManagedPolicy(microBatchIAMStack.S3PublicAccessPolicy);
      this.LogProcessorRole.addManagedPolicy(microBatchIAMStack.GluePublicAccessPolicy);
      this.LogProcessorRole.addManagedPolicy(microBatchIAMStack.AthenaPublicAccessPolicy);
      this.LogProcessorRole.addManagedPolicy(microBatchIAMStack.KMSPublicAccessPolicy);
      this.LogProcessorRole.attachInlinePolicy(LogProcessorLambdaInvokePolicy);
      this.LogProcessorRole.attachInlinePolicy(LogProcessorRWDDBPolicy);
      this.LogProcessorRole.attachInlinePolicy(LogProcessorStartStateMachinePolicy);
      this.LogProcessorRole.attachInlinePolicy(LogProcessorRWSNSPolicy);

      // Override the logical ID
      const cfnLogProcessorRole = this.LogProcessorRole.node.defaultChild as iam.CfnRole;
      cfnLogProcessorRole.overrideLogicalId("LogProcessorRole");

      const jobFailed = new sfn.Fail(this, "Job Failed");

      const putStepFunctionTaskToDynamoDB = new tasks.DynamoPutItem(this, "Put task info of Step Function to DynamoDB", {
        table: microBatchDDBStack.ETLLogTable,
        item: {
          "executionName": tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$$.Execution.Name")),
          "taskId": tasks.DynamoAttributeValue.fromString(mainTaskId),
          "API": tasks.DynamoAttributeValue.fromString("Step Functions: StartExecution"),
          "data": tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("States.JsonToString($$.Execution.Input)")),
          "pipelineId": tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$.metadata.pipelineId")),
          "startTime": tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$$.Execution.StartTime")),
          "stateMachineName": tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$$.StateMachine.Name")),
          "stateName": tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$$.State.Name")),
          "pipelineIndexKey": tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt(`States.Format('{}:{}:{}', $.metadata.pipelineId, $.metadata.scheduleType, '${mainTaskId}')`)),
          "status": tasks.DynamoAttributeValue.fromString("Running")
        },
        resultPath: sfn.JsonPath.DISCARD,
      });

      putStepFunctionTaskToDynamoDB.addRetry({
        interval: Duration.seconds(10),
        maxAttempts: 5,
        maxDelay: Duration.seconds(120),
        backoffRate: 2,
        jitterStrategy: sfn.JitterType.FULL,
      });

      const updateStepFunctionTaskToFailed = new tasks.DynamoUpdateItem(this, "Update task status of Step Function to Failed", {
        table: microBatchDDBStack.ETLLogTable,
        key: {
          "executionName": tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$$.Execution.Name")),
          "taskId": tasks.DynamoAttributeValue.fromString(mainTaskId)},
        updateExpression: "SET #status = :status, #endTime = :endTime",
        expressionAttributeNames: {
          "#status": "status",
          "#endTime": "endTime"
        },
        expressionAttributeValues: {
          ":status": tasks.DynamoAttributeValue.fromString("Failed"),
          ":endTime": tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$$.State.EnteredTime")),
        },
        resultPath: sfn.JsonPath.DISCARD,
      });
      
      updateStepFunctionTaskToFailed.addRetry({
        interval: Duration.seconds(10),
        maxAttempts: 5,
        maxDelay: Duration.seconds(120),
        backoffRate: 2,
        jitterStrategy: sfn.JitterType.FULL,
      });

      const updateStepFunctionTaskToCompleted = new tasks.DynamoUpdateItem(this, "Update task status of Step Function to Succeeded", {
        table: microBatchDDBStack.ETLLogTable,
        key: {
          "executionName": tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$$.Execution.Name")),
          "taskId": tasks.DynamoAttributeValue.fromString(mainTaskId)},
        updateExpression: "SET #status = :status, #endTime = :endTime",
        expressionAttributeNames: {
          "#status": "status",
          "#endTime": "endTime"
        },
        expressionAttributeValues: {
          ":status": tasks.DynamoAttributeValue.fromString("Succeeded"),
          ":endTime": tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$$.State.EnteredTime")),
        },
        resultPath: sfn.JsonPath.DISCARD,
      });

      updateStepFunctionTaskToCompleted.addRetry({
        interval: Duration.seconds(10),
        maxAttempts: 5,
        maxDelay: Duration.seconds(120),
        backoffRate: 2,
        jitterStrategy: sfn.JitterType.FULL,
      });

      const S3MigrationTaskFromStagingToArchive = new tasks.LambdaInvoke(this, "Step 1: Migration S3 Objects from Staging to Archive", {
        lambdaFunction: microBatchLambdaStack.S3ObjectScanningStack.S3ObjectScanning,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
            "metadata.$": "$.metadata",
            "executionName.$": "$$.Execution.Name",
            "srcPath.$": "$.metadata.s3.srcPath",
            "dstPath.$": "States.Format('{}/{}', $.metadata.s3.archivePath, $$.Execution.Name)",
            "sqsName": microBatchSQSStack.S3ObjectMigrationQ.queueName,
            "keepPrefix": true,
            "merge": false,
            "deleteOnSuccess": true,
            "maxRecords": 15000,
            "maxObjectFilesNumPerCopyTask": 50,
            "maxObjectFilesSizePerCopyTask": "10GiB",
            "sourceType.$": "$.metadata.sourceType",
            "enrichmentPlugins.$": "$.metadata.enrichmentPlugins",
            taskToken: sfn.JsonPath.taskToken,
            "extra": {
              "pipelineId.$": "$.metadata.pipelineId",
              "stateMachineName.$": "$$.StateMachine.Name",
              "stateName.$": "$$.State.Name",
              "parentTaskId": mainTaskId,
              "API": "Lambda: Invoke"
            }
        }),
        retryOnServiceExceptions: false,
        resultSelector: {
          "hasObjects.$": "$.hasObjects"
        },
        resultPath: "$.results.staging",
      });

      const sendFailureNotification = new tasks.SnsPublish(this, "Send Failure Notification" ,{
        topic: microBatchSNSStack.SNSReceiveStatesFailedTopic,
        message: sfn.TaskInput.fromObject({
          "API": "SNS: Publish",
          "stateMachineId.$": "$$.StateMachine.Id",
          "stateMachineName.$": "$$.StateMachine.Name",
          "stateName.$": "$$.State.Name",
          "executionId.$": "$$.Execution.Id",
          "executionName.$": "$$.Execution.Name",
          "pipelineId.$": "$.metadata.pipelineId",
          "tableName.$": "$.metadata.athena.tableName",
          "scheduleType.$": "$.metadata.scheduleType",
          "sourceType.$": "$.metadata.sourceType",
          "notification.$": "$.metadata.notification",
          "archivePath.$": "States.Format('{}/{}', $.metadata.s3.archivePath, $$.Execution.Name)",
          "status": "Failed",
          "metadata.$": "$.metadata",
        }),
      });

      const executionInputFormatter = new tasks.LambdaInvoke(this, 'Step 2: Execution input formatting...', {
        lambdaFunction: microBatchLambdaStack.ETLHelperStack.ETLHelper,
        payload: sfn.TaskInput.fromObject({
          "API": "Step Functions: ExecutionInputFormatter",
          "parameters": {
            "input": {
              "metadata.$": "$.metadata"
            },
          },
          "executionName.$": "$$.Execution.Name",
          "taskId.$": "States.UUID()",
          taskToken: sfn.JsonPath.taskToken,
          "extra": {
            "parentTaskId": mainTaskId,
            "pipelineId.$": "$.metadata.pipelineId",
            "stateMachineName.$": "$$.StateMachine.Name",
            "stateName.$": "$$.State.Name",
          },
        }),
        retryOnServiceExceptions: false,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        resultSelector: {
          "metadata.$": "$.metadata"
        },
        resultPath: "$.input",
      });

      const createTmpTableInAthena = new tasks.LambdaInvoke(this, 'Step 3.1: Create tmp table in Athena', {
        lambdaFunction: microBatchLambdaStack.ETLHelperStack.ETLHelper,
        payload: sfn.TaskInput.fromObject({
          "API": "Athena: StartQueryExecution",
          "executionName.$": "$$.Execution.Name",
          "taskId.$": "States.UUID()",
          "parameters": {
            "queryString.$": "$.input.metadata.athena.statements.create",
            "workGroup": microBatchAthenaStack.microBatchAthenaWorkGroup.name,
            "outputLocation": `s3://${stagingBucket.bucketName}/athena-results`,
          },
          "extra": {
            "parentTaskId": mainTaskId,
            "pipelineId.$": "$.metadata.pipelineId",
            "stateMachineName.$": "$$.StateMachine.Name",
            "stateName.$": "$$.State.Name",
          },
          taskToken: sfn.JsonPath.taskToken,
        }),
        retryOnServiceExceptions: false,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        resultPath: sfn.JsonPath.DISCARD,
      });

      const insertIntoDeltaFromTmpTableInAthena = new tasks.StepFunctionsStartExecution(this, "Step 3.2: Insert into delta from tmp table in Athena", {
        stateMachine: AthenaWorkflowStack.AthenaWorkflow,
        integrationPattern: sfn.IntegrationPattern.RUN_JOB,
        input: sfn.TaskInput.fromObject({
          "queryString.$": "$.input.metadata.athena.statements.insert",
          "workGroup": microBatchAthenaStack.microBatchAthenaWorkGroup.name,
          "executionName.$": "$$.Execution.Name",
          "extra": {
            "parentTaskId": mainTaskId,
            "pipelineId.$": "$.metadata.pipelineId",
            "stateName.$": "$$.State.Name",
          },
          "AWS_STEP_FUNCTIONS_STARTED_BY_EXECUTION_ID.$": "$$.Execution.Id"
        }),
        associateWithParent: true,
        taskTimeout: sfn.Timeout.duration(Duration.minutes(30)),
        resultPath: sfn.JsonPath.DISCARD,
      });

      const droppingTmpTableInAthena = new tasks.LambdaInvoke(this, 'Step 3.3: Dropping tmp table in Athena', {
        lambdaFunction: microBatchLambdaStack.ETLHelperStack.ETLHelper,
        payload: sfn.TaskInput.fromObject({
          "API": "Athena: StartQueryExecution",
          "executionName.$": "$$.Execution.Name",
          "taskId.$": "States.UUID()",
          "parameters": {
            "queryString.$": "$.input.metadata.athena.statements.drop",
            "workGroup": microBatchAthenaStack.microBatchAthenaWorkGroup.name,
            "outputLocation": `s3://${stagingBucket.bucketName}/athena-results`,
          },
          "extra": {
            "parentTaskId": mainTaskId,
            "pipelineId.$": "$.metadata.pipelineId",
            "stateMachineName.$": "$$.StateMachine.Name",
            "stateName.$": "$$.State.Name",
          },
          taskToken: sfn.JsonPath.taskToken,
        }),
        retryOnServiceExceptions: false,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        resultPath: sfn.JsonPath.DISCARD,
      });

      const measuringKPIsInAthena = new tasks.StepFunctionsStartExecution(this, "Step 3.4: Measuring KPIs in Athena - Optional", {
        stateMachine: AthenaWorkflowStack.AthenaWorkflow,
        integrationPattern: sfn.IntegrationPattern.RUN_JOB,
        input: sfn.TaskInput.fromObject({
          "queryString.$": "$.aggregate",
          "workGroup": microBatchAthenaStack.microBatchAthenaWorkGroup.name,
          "executionName.$": "$$.Execution.Name",
          "extra": {
            "parentTaskId": mainTaskId,
            "pipelineId.$": "$.metadata.pipelineId",
            "stateName.$": "$$.State.Name",
          },
          taskTimeout: sfn.Timeout.duration(Duration.minutes(30)),
          "AWS_STEP_FUNCTIONS_STARTED_BY_EXECUTION_ID.$": "$$.Execution.Id"
        }),
        associateWithParent: true,
        resultPath: sfn.JsonPath.DISCARD,
      });

      const measuringKPIsMap = new sfn.Map(this, 'Measuring KPIs Map', {
        maxConcurrency: 1,
        itemsPath: sfn.JsonPath.stringAt('$.input.metadata.athena.statements.aggregate'),
        parameters: {
          "metadata.$": "$.metadata",
          "aggregate.$": "$$.Map.Item.Value"
        },
        resultPath: sfn.JsonPath.DISCARD,
      });

      const isNeedAggregate = new sfn.Choice(this, 'Has errors or need aggregate?')
        .when(sfn.Condition.isPresent("$.errors"), sendFailureNotification)
        .when(sfn.Condition.isPresent("$.input.metadata.athena.statements.aggregate"), measuringKPIsMap)
        .otherwise(updateStepFunctionTaskToCompleted);

      const stagingHasData = new sfn.Choice(this, 'Staging has Data?')
        .when(sfn.Condition.booleanEquals("$.results.staging.hasObjects", true), executionInputFormatter)
        .otherwise(updateStepFunctionTaskToCompleted);

      putStepFunctionTaskToDynamoDB.next(S3MigrationTaskFromStagingToArchive);
      S3MigrationTaskFromStagingToArchive.addCatch(sendFailureNotification, {resultPath: "$.errors.S3MigrationTaskFromStagingToArchive"});
      S3MigrationTaskFromStagingToArchive.next(stagingHasData);

      executionInputFormatter.next(createTmpTableInAthena).next(insertIntoDeltaFromTmpTableInAthena).next(droppingTmpTableInAthena);
      droppingTmpTableInAthena.next(isNeedAggregate);

      executionInputFormatter.addCatch(sendFailureNotification, {resultPath: "$.errors.executionInputFormatting"});
      createTmpTableInAthena.addCatch(droppingTmpTableInAthena, {resultPath: "$.errors.createTmpTableInAthena"});

      insertIntoDeltaFromTmpTableInAthena.addCatch(droppingTmpTableInAthena, {resultPath: "$.errors.insertIntoDeltaFromTmpTableInAthena"});
      droppingTmpTableInAthena.addCatch(sendFailureNotification, {resultPath: "$.errors.droppingTmpTableInAthena"});
 
      measuringKPIsMap.addCatch(sendFailureNotification, {resultPath: "$.errors.measuringKPIsMap"});
      measuringKPIsMap.itemProcessor(measuringKPIsInAthena).next(updateStepFunctionTaskToCompleted);
      sendFailureNotification.next(updateStepFunctionTaskToFailed).next(jobFailed);

      // Create a Step Function for LogProcessor
      this.LogProcessor  = new sfn.StateMachine(this, 'LogProcessor', {
        definitionBody: sfn.DefinitionBody.fromChainable(putStepFunctionTaskToDynamoDB),
        role: this.LogProcessorRole.withoutPolicyUpdates(),
      });

      // Override the logical ID
      const cfnLogProcessor = this.LogProcessor.node.defaultChild as sfn.CfnStateMachine;
      cfnLogProcessor.overrideLogicalId("LogProcessor");

      this.LogProcessor.node.addDependency(LogProcessorStartStateMachinePolicy);

      NagSuppressions.addResourceSuppressions(this.LogProcessor, [
        {
          id: "AwsSolutions-SF1",
          reason: "Step Function: LogProcessor does not need enable Logging.",
        },
      ]);

      // Create a Policy to allow start log processor.
      const LogProcessorStartExecutionPolicy = new iam.Policy(this, "LogProcessorStartExecutionPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "states:StartExecution",
            ], 
            resources: [this.LogProcessor.stateMachineArn],
          }),
        ],
      });

      // Override the logical ID
      const cfnLogProcessorStartExecutionPolicy = LogProcessorStartExecutionPolicy.node.defaultChild as iam.CfnPolicy;
      cfnLogProcessorStartExecutionPolicy.overrideLogicalId("LogProcessorStartExecutionPolicy");

      // Create a Role for EventBridge:Scheduler
      this.LogProcessorStartExecutionRole = new iam.Role(this, "LogProcessorStartExecutionRole", {
        assumedBy: new iam.ServicePrincipal("events.amazonaws.com"),
      });

      // Override the logical ID
      const cfnLogProcessorStartExecutionRole = this.LogProcessorStartExecutionRole.node.defaultChild as iam.CfnRole;
      cfnLogProcessorStartExecutionRole.overrideLogicalId("LogProcessorStartExecutionRole");

      this.LogProcessorStartExecutionRole.attachInlinePolicy(LogProcessorStartExecutionPolicy);

    }
}