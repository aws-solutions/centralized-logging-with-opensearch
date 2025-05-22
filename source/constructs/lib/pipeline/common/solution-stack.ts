// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Stack,
  CfnParameter,
  CfnParameterProps,
  CfnOutput,
  CfnResource,
  IAspect,
} from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

interface CfnNagSuppressRule {
  readonly id: string;
  readonly reason: string;
}

export class SolutionStack extends Stack {
  private paramGroups: any[] = [];
  private paramLabels: any = {};

  protected setDescription(description: string) {
    this.templateOptions.description = description;
  }
  protected newParam(id: string, props?: CfnParameterProps): CfnParameter {
    return new CfnParameter(this, id, props);
  }
  /* istanbul ignore next */
  protected addToParamGroups(label: string, ...param: string[]) {
    const result = this.paramGroups.findIndex((p) => {
      return p.Label.default == label;
    });
    if (result === -1) {
      this.paramGroups.push({
        Label: { default: label },
        Parameters: param,
      });
    } else {
      this.paramGroups[result].Parameters.push(...param);
    }
  }

  protected addToParamLabels(label: string, param: string) {
    this.paramLabels[param] = {
      default: label,
    };
  }

  protected setMetadata() {
    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };
  }

  /* istanbul ignore next */
  protected cfnOutput(
    id: string,
    value: string,
    description?: string
  ): CfnOutput {
    const o = new CfnOutput(this, id, { value, description });
    o.overrideLogicalId(id);
    return o;
  }

  protected addCfnNagSuppressRules(
    resource: CfnResource,
    rules: CfnNagSuppressRule[]
  ) {
    resource.addMetadata('cfn_nag', {
      rules_to_suppress: rules,
    });
  }
}

export class AddCfnNagSuppressRules implements IAspect {
  public constructor(private rules: CfnNagSuppressRule[]) {}

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      node.addMetadata('cfn_nag', {
        rules_to_suppress: this.rules,
      });
    }
  }
}
