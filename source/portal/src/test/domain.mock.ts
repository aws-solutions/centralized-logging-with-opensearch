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

import { DomainDetails, EngineType, StorageType } from "API";
import { ImportedDomainType } from "pages/clusters/importcluster/ImportCluster";

export const domainMockData: DomainDetails = {
  id: "xxxx",
  domainArn:
    "arn:aws:es:us-example-2:11111111111:domain/test-us-example-2-opensearch",
  domainName: "test-us-example-2-opensearch",
  engine: EngineType.Elasticsearch,
  version: "2.5",
  endpoint:
    "vpc-test-us-example-2-opensearch-xxxxx.us-example-2.es.amazonaws.com",
  region: "us-example-2",
  accountId: "11111111111",
  vpc: {
    vpcId: "vpc-xxxxxx",
    privateSubnetIds: "subnet-xxxxxxxx,subnet-xxxxxxxx",
    publicSubnetIds: null,
    securityGroupId: "sg-xxxxxxxx",
    __typename: "VPCInfo",
  },
  esVpc: {
    vpcId: "vpc-xxxxxxxx",
    subnetIds: ["subnet-xxxxxxxx"],
    availabilityZones: ["us-example-2"],
    securityGroupIds: ["sg-xxxxxxxx"],
    __typename: "ESVPCInfo",
  },
  nodes: {
    instanceType: "t3.small.elasticsearch",
    instanceCount: 2,
    dedicatedMasterEnabled: false,
    zoneAwarenessEnabled: false,
    dedicatedMasterType: "N/A",
    dedicatedMasterCount: 0,
    warmEnabled: false,
    warmType: "N/A",
    warmCount: 0,
    coldEnabled: false,
    __typename: "Node",
  },
  storageType: StorageType.EBS,
  volume: {
    type: "gp3",
    size: 100,
    __typename: "Volume",
  },
  cognito: {
    enabled: false,
    userPoolId: "N/A",
    domain: "",
    identityPoolId: "N/A",
    roleArn: "N/A",
    __typename: "Cognito",
  },
  tags: [],
  //   proxyStatus: "ENABLED",
  proxyALB: "CL-Pr-xxxxxxxx.us-example-2.elb.example.com",
  proxyError: "",
  proxyInput: {
    vpc: {
      vpcId: "vpc-xxxxxxxx",
      privateSubnetIds: "subnet-xxxxxxxx,subnet-xxxxxxxx",
      publicSubnetIds: "subnet-xxxxxxxx,subnet-xxxxxxxx",
      securityGroupId: "sg-xxxxxxxxx",
      __typename: "VPCInfo",
    },
    certificateArn:
      "arn:aws:acm:us-example-2:11111111111:certificate/xxx-xxx-xxx-xxx-xxxx",
    keyName: "magic-test-us-example-2",
    customEndpoint: "clo-opensearch.xxxx.com",
    cognitoEndpoint: "",
    __typename: "ProxyInfo",
  },
  //   alarmStatus: "ENABLED",
  alarmError: "",
  alarmInput: {
    alarms: [
      {
        value: "true",
        __typename: "AlarmInfo",
      },
      {
        value: "true",
        __typename: "AlarmInfo",
      },
      {
        value: "20480",
        __typename: "AlarmInfo",
      },
      {
        value: "1",
        __typename: "AlarmInfo",
      },
      {
        value: "3",
        __typename: "AlarmInfo",
      },
      {
        value: "true",
        __typename: "AlarmInfo",
      },
      {
        value: "true",
        __typename: "AlarmInfo",
      },
      {
        value: "true",
        __typename: "AlarmInfo",
      },
      {
        value: "true",
        __typename: "AlarmInfo",
      },
      {
        value: "true",
        __typename: "AlarmInfo",
      },
      {
        value: "true",
        __typename: "AlarmInfo",
      },
      {
        value: "true",
        __typename: "AlarmInfo",
      },
    ],
    email: "test@example.com",
    phone: "",
    __typename: "AlarmStackInfo",
  },
  metrics: {
    searchableDocs: 73530784,
    freeStorageSpace: 71414.792,
    // health: "GREEN",
    __typename: "DomainMetrics",
  },
  status: "IMPORTED",
  resources: [
    {
      name: "VPCPeering",
      values: [null],
      //   status: "CREATED",
      __typename: "DomainRelevantResource",
    },
  ],
  __typename: "DomainDetails",
};

export const domainMockImportedCluster: ImportedDomainType = {
  showVPCAlert: false,
  creationMethod: "Auto",
  logProcessVpcOptionList: [],
  logProcessSubnetOptionList: [],
  logProcessSecGroupList: [],
  domainName: "test",
  domainStatus: "ACTIVE",
  region: "us-example-1",
  vpc: {
    securityGroupId: "sg-123456789",
    publicSubnetIds: "subnet-123456789,subnet-123456789",
    privateSubnetIds: "subnet-123456789,subnet-123456789",
    vpcId: "vpc-123456789",
  },
};
