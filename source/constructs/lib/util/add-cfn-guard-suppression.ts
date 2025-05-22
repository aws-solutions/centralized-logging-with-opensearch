// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IAspect, CfnResource } from "aws-cdk-lib";
import { IConstruct } from "constructs";

export function addCfnGuardSuppressions(
    resource: CfnResource,
    suppressions: string[],
): void {
  const targetResource =
      (resource.node.defaultChild as CfnResource) || resource;
  const existingMetadata = targetResource.getMetadata("guard") || {};
  const existingSuppressedRules = (existingMetadata.SuppressedRules ||
      []) as string[];

  const mergedSuppressedRules = [
    ...new Set([...existingSuppressedRules, ...suppressions]),
  ];

  targetResource.addMetadata("guard", {
    ...existingMetadata,
    SuppressedRules: mergedSuppressedRules,
  });
}

export class CfnGuardSuppressResourceList implements IAspect {
  private readonly resourceSuppressions: { [key: string]: string[] };

  constructor(resourceSuppressions: { [key: string]: string[] }) {
    this.resourceSuppressions = resourceSuppressions;
  }

  public visit(node: IConstruct): void {
    if (
        CfnResource.isCfnResource(node) &&
        node.cfnResourceType in this.resourceSuppressions
    ) {
      addCfnGuardSuppressions(
          node,
          this.resourceSuppressions[node.cfnResourceType],
      );
    } else if (
        node.node.defaultChild &&
        CfnResource.isCfnResource(node.node.defaultChild) &&
        node.node.defaultChild.cfnResourceType in this.resourceSuppressions
    ) {
      addCfnGuardSuppressions(
          node.node.defaultChild as CfnResource,
          this.resourceSuppressions[node.node.defaultChild.cfnResourceType],
      );
    }
  }
}