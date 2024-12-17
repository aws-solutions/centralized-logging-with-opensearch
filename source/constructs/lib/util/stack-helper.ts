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
import * as fs from 'fs';
import * as path from 'path';
import { CfnElement, CfnResource, IAspect } from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';

type ConstructParam = [scope: Construct, id: string, props?: any];

/**
 * This is a higher-order function that takes a constructor class
 * and returns a factory function that can create instances of that class with the specified
 * parameters. This HOF could help to bypass the  sonar cube issue `Either remove this useless object instantiation of "Object" or use it`
 * @param ConstructClass - The Construct that you want to create.
 * @returns The factory that takes in a variable number of
 * parameters (`params`) and returns an instance of the Constructor.
 */
export const constructFactory =
  <T extends Construct, P extends ConstructParam>(
    ConstructClass: new (...p: P) => T
  ) =>
  (...params: P): T => {
    return new ConstructClass(...params);
  };

/**
 * This High Order function constructs a new instance of a given class with a fixed logical ID for use
 * in a CloudFormation template.
 * Refer: https://stackoverflow.com/questions/57213637/aws-cdk-fixed-logical-ids
 * @param ConstructClass - A constructor function for a CloudFormation construct, such as `CfnBucket`
 * or `CfnFunction`.
 * @returns The function being returned takes the construct params of `ConstructClass`, and returns the
 * instance of `ConstructClass` with fixed logical ID in CFN template
 */
export const constructWithFixedLogicalId =
  <T extends Construct, P extends ConstructParam>(
    ConstructClass: new (...p: P) => T
  ) =>
  (...params: P): T => {
    const construct = new ConstructClass(...params);
    const cfnElement = construct.node.defaultChild as CfnElement;
    // Make the logical ID in CFN template fixed
    cfnElement.overrideLogicalId(params[1]);

    return construct;
  };

export class UseS3BucketNotificationsWithRetryAspects implements IAspect {
  public visit(node: IConstruct): void {
    if (
      node instanceof CfnResource &&
      node.cfnResourceType === 'AWS::Lambda::Function'
    ) {
      const code = fs.readFileSync(
        path.join(
          __dirname,
          '../../lambda/custom-resource/put_s3_bucket_notification_with_retry.py'
        ),
        'utf8'
      );
      node.addPropertyOverride('Code.ZipFile', code);
    }
  }
}

export class EnforceUnmanagedS3BucketNotificationsAspects implements IAspect {
  public visit(node: IConstruct): void {
    if (
      node instanceof CfnResource &&
      node.cfnResourceType === 'Custom::S3BucketNotifications'
    ) {
      node.addPropertyOverride('Managed', false);
    }
  }
}

export const DEFAULTS = {
  VERSION: process.env.VERSION || 'v1.0.0',
  SOLUTION_ID: process.env.SOLUTION_ID || 'SO8025',
  STACK_PREFIX: process.env.STACK_PREFIX || 'CL',
};
