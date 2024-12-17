import * as fs from 'fs';
import * as path from 'path';
import { Aws, Duration } from 'aws-cdk-lib';
import { ArnPrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { SharedPythonLayer } from '../layer/layer';

const SOLUTION_ID = 'SO8025';
const STACK_PREFIX = 'CL';

export class CloudWatchAlarmManagerSingleton extends Construct {
  private static isPermissionInitialized: boolean = false;
  readonly handlerFunc: lambda.SingletonFunction;
  readonly throttleFunc: lambda.SingletonFunction;

  constructor(
    scope: Construct,
    id: string,
    env: {
      [key: string]: string;
    } = {}
  ) {
    super(scope, id);

    // Define the inline Python code for the Lambda function
    const pythonCode = fs
      .readFileSync(
        path.join(__dirname, '../../lambda/utils/throttle_lambda.py')
      )
      .toString();

    // Create the Lambda function
    const throttleFunc = (this.throttleFunc = new lambda.SingletonFunction(
      this,
      'ThrottleLambda',
      {
        uuid: 'ThrottleLambda',
        runtime: lambda.Runtime.PYTHON_3_11, // Choose the Python runtime
        handler: 'index.handler',
        memorySize: 128,
        environment: {
          SOLUTION_ID: SOLUTION_ID,
          SOLUTION_VERSION: process.env.VERSION
            ? process.env.VERSION
            : 'v1.0.0',
        },
        code: lambda.Code.fromInline(pythonCode),
        layers: [SharedPythonLayer.getInstance(this)],
      }
    ));

    this.handlerFunc = new lambda.SingletonFunction(
      this,
      'CentralAlarmHandler',
      {
        uuid: 'CentralAlarmHandlerSingleton',
        code: lambda.AssetCode.fromAsset(
          path.join(__dirname, '../../lambda/api/alarm')
        ),
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'lambda_function.lambda_handler',
        timeout: Duration.seconds(60),
        memorySize: 512,
        layers: [SharedPythonLayer.getInstance(this)],
        environment: {
          SOLUTION_ID: SOLUTION_ID,
          STACK_PREFIX: STACK_PREFIX,
          SOLUTION_VERSION: process.env.VERSION
            ? process.env.VERSION
            : 'v1.0.0',
          THROTTLE_LAMBDA_ARN: throttleFunc.functionArn,
        },
        description: `${Aws.STACK_NAME} - Helper function to automated create and delete app pipeline alarm`,
      }
    );
    for (const [key, value] of Object.entries(env)) {
      this.throttleFunc.addEnvironment(key, value);
      this.handlerFunc.addEnvironment(key, value);
    }

    if (!CloudWatchAlarmManagerSingleton.isPermissionInitialized) {
      // Permissions
      throttleFunc.addPermission('InvokeFromCWAlarm', {
        principal: new ArnPrincipal('lambda.alarms.cloudwatch.amazonaws.com'),
        sourceArn: `arn:${Aws.PARTITION}:cloudwatch:${Aws.REGION}:${Aws.ACCOUNT_ID}:alarm:CL*`,
      });
      throttleFunc.addToRolePolicy(
        new PolicyStatement({
          actions: [
            'lambda:PutFunctionConcurrency',
            'lambda:GetFunctionConcurrency',
          ],
          resources: [
            `arn:${Aws.PARTITION}:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:CL-*`,
          ],
        })
      );
      CloudWatchAlarmManagerSingleton.isPermissionInitialized = true;
    }
  }
}
