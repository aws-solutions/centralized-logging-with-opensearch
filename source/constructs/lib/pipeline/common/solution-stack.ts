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

import {
  Stack,
  CfnParameter,
  CfnParameterProps,
  CfnOutput,
  CfnResource,
} from "aws-cdk-lib";

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
    const result = this.paramGroups.findIndex((param) => {
      return param.Label.default == label;
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
      "AWS::CloudFormation::Interface": {
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
    resource.addMetadata("cfn_nag", {
      rules_to_suppress: rules,
    });
  }
}
