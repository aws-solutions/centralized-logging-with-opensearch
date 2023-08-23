import * as path from 'path';
import { Aws, aws_lambda as lambda, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class SharedPythonLayer extends lambda.LayerVersion {
  public static getInstance(scope: Construct): SharedPythonLayer {
    const stack = Stack.of(scope);
    let layer = SharedPythonLayer._instances.get(stack);
    if (!layer) {
      layer = new SharedPythonLayer(stack, 'SharedPythonLayer');
      SharedPythonLayer._instances.set(stack, layer);
    }
    return layer;
  }

  private static _instances = new Map<Construct, SharedPythonLayer>();

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../lambda/common-lib'),
        {
          exclude: [
            '.venv',
            '.venv-test',
            '.pytest_cache',
            '___pycache__',
            '*.egg-info',
            'test',
            '.coverage*',
          ],
          bundling: {
            image: lambda.Runtime.PYTHON_3_9.bundlingImage,
            command: [
              'bash',
              '-xc',
              [
                'mkdir -p /tmp/ws',
                'cd /tmp/ws',
                'python3 -m venv .venv',
                'source .venv/bin/activate',
                'pip3 install --upgrade build',
                'cp -rvf /asset-input /tmp/ws/',
                'cd /tmp/ws/asset-input',
                'python3 -m build -s -o /tmp/ws/dist/',
                'pip3 install /tmp/ws/dist/commonlib-0.1.0.tar.gz -t /asset-output/python',
                'deactivate',
              ].join(' && '),
            ],
          },
        }
      ),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
      description: `${Aws.STACK_NAME} - Shared python layer`,
    });
  }
}
