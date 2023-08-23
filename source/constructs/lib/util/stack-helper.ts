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
import { Construct } from 'constructs';

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
