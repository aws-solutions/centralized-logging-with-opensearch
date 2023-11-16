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
import { aws_stepfunctions as sfn, aws_stepfunctions_tasks as tasks, aws_iam as iam, aws_s3 as s3, Duration } from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";
import { InitLambdaStack } from "../lambda/init-lambda-stack";
import { InitIAMStack } from "../iam/init-iam-stack";
import { InitKMSStack } from "../kms/init-kms-stack";


export interface  InitSFNAthenaWorkflowProps {
  readonly solutionId: string;
  readonly stagingBucket: s3.Bucket;
  readonly microBatchLambdaStack: InitLambdaStack;
  readonly microBatchIAMStack: InitIAMStack;
  readonly microBatchKMSStack: InitKMSStack;
}

export class InitSFNAthenaWorkflowStack extends Construct {
    readonly AthenaWorkflow: sfn.StateMachine;
    readonly AthenaWorkflowRole: iam.Role;

    constructor(scope: Construct, id: string, props: InitSFNAthenaWorkflowProps) {
      super(scope, id);

      let stagingBucket = props.stagingBucket;
      let microBatchLambdaStack = props.microBatchLambdaStack;
      let microBatchIAMStack = props.microBatchIAMStack;

      const AthenaWorkflowLambdaInvokePolicy = new iam.Policy(this, "AthenaWorkflowLambdaInvokePolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "lambda:InvokeFunction",
            ], 
            resources: [
              `${microBatchLambdaStack.ETLHelperStack.ETLHelper.functionArn}`,
              `${microBatchLambdaStack.ETLHelperStack.ETLHelper.functionArn}:*`,
            ],
          }),
        ],
      });

      // Override the logical ID
      const cfnAthenaWorkflowLambdaInvokePolicy = AthenaWorkflowLambdaInvokePolicy.node.defaultChild as iam.CfnPolicy;
      cfnAthenaWorkflowLambdaInvokePolicy.overrideLogicalId("AthenaWorkflowLambdaInvokePolicy");


      // Create a Role for StepFunction:AthenaWorkflow 
      this.AthenaWorkflowRole = new iam.Role(this, "AthenaWorkflowRole", {
        assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      });

      this.AthenaWorkflowRole.addManagedPolicy(microBatchIAMStack.S3PublicAccessPolicy);
      this.AthenaWorkflowRole.addManagedPolicy(microBatchIAMStack.GluePublicAccessPolicy);
      this.AthenaWorkflowRole.addManagedPolicy(microBatchIAMStack.AthenaPublicAccessPolicy);
      this.AthenaWorkflowRole.addManagedPolicy(microBatchIAMStack.KMSPublicAccessPolicy);
      this.AthenaWorkflowRole.attachInlinePolicy(AthenaWorkflowLambdaInvokePolicy);

      // Override the logical ID
      const cfnAthenaWorkflowRole = this.AthenaWorkflowRole.node.defaultChild as iam.CfnRole;
      cfnAthenaWorkflowRole.overrideLogicalId("AthenaWorkflowRole");
      
      const jobFailed = new sfn.Fail(this, "Job Failed");

      const startQueryExecution = new tasks.AthenaStartQueryExecution(this, "Athena: StartQueryExecution", {
        queryString: sfn.JsonPath.stringAt("$.queryString"),
        workGroup: sfn.JsonPath.stringAt("$.workGroup"),
        resultConfiguration: {
          encryptionConfiguration: {
            encryptionOption: tasks.EncryptionOption.KMS,
          },
          outputLocation: {
            bucketName: stagingBucket.bucketName,
            objectKey: "athena-results",
          },
        },
        integrationPattern: sfn.IntegrationPattern.RUN_JOB,
        resultPath: "$.athena.response",
      });

      startQueryExecution.addRetry({
        interval: Duration.seconds(1),
        maxAttempts: 2,
        maxDelay: Duration.seconds(10),
        backoffRate: 2,
        jitterStrategy: sfn.JitterType.FULL,
      });

      const writeQueryExecutionStatusToDDB = new tasks.LambdaInvoke(this, "Put Athena: StartQueryExecution logs to DynamoDB", {
        lambdaFunction: microBatchLambdaStack.ETLHelperStack.ETLHelper,
        payload: sfn.TaskInput.fromObject({
          "API": "Athena: GetQueryExecution",
          "executionName.$": "$.executionName",
          "taskId.$": "$.athena.response.QueryExecution.QueryExecutionId",
          "extra": {
            "API": "Athena: StartQueryExecution",
            "parentTaskId.$": "$.extra.parentTaskId",
            "pipelineId.$": "$.extra.pipelineId",
            "stateMachineName.$": "$$.StateMachine.Name",
            "stateName.$": "$.extra.stateName",
          }
        }),
        retryOnServiceExceptions: false,
        resultPath: sfn.JsonPath.DISCARD,
      });

      const writeQueryExecutionFailedStatusToDDB = new tasks.LambdaInvoke(this, "Put Athena: StartQueryExecution failed logs to DynamoDB", {
        lambdaFunction: microBatchLambdaStack.ETLHelperStack.ETLHelper,
        payload: sfn.TaskInput.fromObject({
          "API": "DynamoDB: PutItem",
          "executionName.$": "$.executionName",
          "taskId.$": "States.UUID()",
          "extra": {
            "API": "Athena: StartQueryExecution",
            data: sfn.JsonPath.stringAt("$.queryString"),
            startTime: sfn.JsonPath.stringAt("$$.Execution.StartTime"),
            endTime: sfn.JsonPath.stringAt("$$.State.EnteredTime"),
            "status": "FAILED",
            "parentTaskId.$": "$.extra.parentTaskId",
            "pipelineId.$": "$.extra.pipelineId",
            "stateMachineName.$": "$$.StateMachine.Name",
            "stateName.$": "$.extra.stateName",
          }
        }),
        retryOnServiceExceptions: false,
        resultPath: sfn.JsonPath.DISCARD,
      });

      startQueryExecution.next(writeQueryExecutionStatusToDDB);
      startQueryExecution.addCatch(writeQueryExecutionFailedStatusToDDB, {resultPath: "$.errors.startQueryExecution"});
      writeQueryExecutionFailedStatusToDDB.next(jobFailed);

      // Create a Step Function for AthenaWorkflow
      this.AthenaWorkflow  = new sfn.StateMachine(this, 'AthenaWorkflow', {
        definitionBody: sfn.DefinitionBody.fromChainable(startQueryExecution),
        role: this.AthenaWorkflowRole.withoutPolicyUpdates(),
      });

      // Override the logical ID
      const cfnAthenaWorkflow = this.AthenaWorkflow.node.defaultChild as sfn.CfnStateMachine;
      cfnAthenaWorkflow.overrideLogicalId("AthenaWorkflow");

      NagSuppressions.addResourceSuppressions(this.AthenaWorkflow, [
        {
          id: "AwsSolutions-SF1",
          reason: "Step Function: AthenaWorkflow does not need enable Logging.",
        },
      ]);

    }
}