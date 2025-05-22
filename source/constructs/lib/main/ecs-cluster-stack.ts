// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { aws_ecs as ecs } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

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

    this.ecsCluster = new ecs.Cluster(this, `${stackPrefix}Cluster`, {
      vpc: props.vpc,
      containerInsights: true,
    });
  }
}
