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
import { Construct } from "constructs";
import {
  Fn,
  Stack,
  CfnParameter,
  CfnParameterProps,
  CfnOutput,
} from "aws-cdk-lib";
import { SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { OpenSearchInitStack } from "./opensearch-init-stack";

const { VERSION } = process.env;
export class SolutionStack extends Stack {
  private _paramGroup: { [grpname: string]: CfnParameter[] } = {};

  protected setDescription(description: string) {
    this.templateOptions.description = description;
  }
  protected newParam(id: string, props?: CfnParameterProps): CfnParameter {
    return new CfnParameter(this, id, props);
  }
  /* istanbul ignore next */
  protected addGroupParam(props: { [key: string]: CfnParameter[] }): void {
    for (const key of Object.keys(props)) {
      const params = props[key];
      this._paramGroup[key] = params.concat(this._paramGroup[key] ?? []);
    }
    this._setParamGroups();
  }
  /* istanbul ignore next */
  private _setParamGroups(): void {
    if (!this.templateOptions.metadata) {
      this.templateOptions.metadata = {};
    }
    const mkgrp = (label: string, params: CfnParameter[]) => {
      return {
        Label: { default: label },
        Parameters: params
          .map((p) => {
            return p ? p.logicalId : "";
          })
          .filter((id) => id),
      };
    };
    this.templateOptions.metadata["AWS::CloudFormation::Interface"] = {
      ParameterGroups: Object.keys(this._paramGroup).map((key) =>
        mkgrp(key, this._paramGroup[key])
      ),
    };
  }

  protected cfnOutput(
    id: string,
    value: string,
    description?: string
  ): CfnOutput {
    const o = new CfnOutput(this, id, { value, description });
    o.overrideLogicalId(id);
    return o;
  }
}

export class OpenSearchAdminStack extends SolutionStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.setDescription(
      `(SO8025-aos) - Log Hub - OpenSearch Administrator Template - Version ${VERSION}`
    );

    const opensearchDomainParam = this.newParam("OpenSearchDomainParam", {
      type: "String",
      description: "OpenSearch domain",
      default: "",
    });

    const createDashboardParam = this.newParam("CreateDashboardParam", {
      type: "String",
      description: "Yes, if you want to create a sample OpenSearch dashboard.",
      default: "No",
      allowedValues: ["Yes", "No"],
    });

    const opensearchShardNumbersParam = this.newParam(
      "OpenSearchShardNumbersParam",
      {
        type: "Number",
        description:
          "Number of shards to distribute the index evenly across all data nodes, keep the size of each shard between 10–50 GiB",
        default: 5,
      }
    );

    const opensearchReplicaNumbersParam = this.newParam(
      "OpenSearchReplicaNumbersParam",
      {
        type: "Number",
        description:
          "Number of replicas for OpenSearch Index. Each replica is a full copy of an index",
        default: 1,
      }
    );

    const opensearchDaysToWarmParam = this.newParam(
      "OpenSearchDaysToWarmParam",
      {
        type: "Number",
        description:
          "The number of days required to move the index into warm storage, this is only effecitve when the value is >0 and warm storage is enabled in OpenSearch",
        default: 0,
      }
    );

    const opensearchDaysToColdParam = this.newParam(
      "OpenSearchDaysToColdParam",
      {
        type: "Number",
        description:
          "The number of days required to move the index into cold storage, this is only effecitve when the value is >0 and cold storage is enabled in OpenSearch",
        default: 0,
      }
    );

    const opensearchDaysToRetain = this.newParam("OpenSearchDaysToRetain", {
      type: "Number",
      description:
        "The total number of days to retain the index, if value is 0, the index will not be deleted",
      default: 0,
    });

    const engineTypeParam = this.newParam("EngineTypeParam", {
      type: "String",
      description:
        "The engine type of the OpenSearch. Select OpenSearch or Elasticsearch.",
      default: "OpenSearch",
      allowedValues: ["OpenSearch", "Elasticsearch"],
    });

    const opensearchEndpointParam = this.newParam("OpenSearchEndpointParam", {
      type: "String",
      description:
        "The OpenSearch endpoint URL. e.g. vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com",
      allowedPattern: "^(?!https:\\/\\/).*",
      constraintDescription: "Please do not inclued https://",
      default: "",
    });

    const opensearchIndexPrefix = this.newParam("OpenSearchIndexPrefix", {
      type: "String",
      description: `The common prefix of OpenSearch index for the log.`,
      default: "",
    });

    const vpcIdParam = this.newParam("VpcIdParam", {
      type: "AWS::EC2::VPC::Id",
      description:
        "Select a VPC which has access to the OpenSearch domain. The log processing Lambda will be resides in the selected VPC.",
      default: "",
    });

    const subnetIdsParam = new CfnParameter(this, "SubnetIdsParam", {
      type: "List<AWS::EC2::Subnet::Id>",
      description:
        "Select at least two subnets which has access to the OpenSearch domain. The log processing Lambda will resides in the subnets. Please make sure the subnets has access to the Amazon S3 service.",
      default: "",
    });

    const securityGroupIdParam = new CfnParameter(
      this,
      "SecurityGroupIdParam",
      {
        type: "AWS::EC2::SecurityGroup::Id",
        description:
          "Select a Security Group which will be associated to the log processing Lambda. Please make sure the Security Group has access to the OpenSearch domain.",
        default: "",
      }
    );
    const logProcessorRoleArnParam = new CfnParameter(
      this,
      "LogProcessorRoleArnParam",
      {
        type: "String",
        description:
          "ARN of an IAM role to send data to the OpenSearch domain.",
        default: "",
      }
    );

    const processVpc = Vpc.fromVpcAttributes(this, "ProcessVpc", {
      vpcId: vpcIdParam.valueAsString,
      availabilityZones: Fn.getAzs(),
      privateSubnetIds: subnetIdsParam.valueAsList,
    });

    const processSg = SecurityGroup.fromSecurityGroupId(
      this,
      "ProcessSG",
      securityGroupIdParam.valueAsString
    );

    const osInitStack = new OpenSearchInitStack(this, "OpenSearchInit", {
      vpc: processVpc,
      securityGroup: processSg,
      endpoint: opensearchEndpointParam.valueAsString,
      logType: "",
      indexPrefix: opensearchIndexPrefix.valueAsString,
      engineType: engineTypeParam.valueAsString,
      domainName: opensearchDomainParam.valueAsString,
      createDashboard: createDashboardParam.valueAsString,
      logProcessorRoleArn: logProcessorRoleArnParam.valueAsString,
      shardNumbers: opensearchShardNumbersParam.valueAsString,
      replicaNumbers: opensearchReplicaNumbersParam.valueAsString,
      daysToWarm: opensearchDaysToWarmParam.valueAsString,
      daysToCold: opensearchDaysToColdParam.valueAsString,
      daysToRetain: opensearchDaysToRetain.valueAsString,
    });

    this.cfnOutput("OSInitHelperFn", osInitStack.helperFn.functionArn);
  }
}
