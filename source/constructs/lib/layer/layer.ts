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
import { Aws, aws_lambda as lambda, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

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
            '.pytest_cache',
            '___pycache__',
            '*.egg-info',
            'test',
            '.coverage*',
          ],
          bundling: {
            image: lambda.Runtime.PYTHON_3_11.bundlingImage,
            platform: 'linux/amd64',
            command: [
              '/bin/bash',
              '-c',
              [
                'pip install -r requirements.txt -t /asset-output/python --no-binary=pydantic',
                'cp -r /asset-input/commonlib /asset-output/python/',
              ].join(' && '),
            ],
          },
        }
      ),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      compatibleArchitectures: [lambda.Architecture.X86_64],
      description: `${Aws.STACK_NAME} - Shared python layer`,
    });
  }
}
