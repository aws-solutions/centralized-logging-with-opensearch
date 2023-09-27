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
import {
  aws_ecs as ecs,
} from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";

export interface EcsClusterProps {
  /**
   * Default VPC for ECS Cluster
   *
   * @default - None.
   */
   readonly vpc: IVpc;
}

/**
 * Stack to provision ECS Cluster
 */
export class EcsClusterStack extends Construct {
  readonly ecsCluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: EcsClusterProps) {
    super(scope, id);

    const stackPrefix = 'CL';

    this.ecsCluster =  new ecs.Cluster(this, `${stackPrefix}Cluster`, {
      vpc: props.vpc,
      containerInsights: true,
    });
  }
}
