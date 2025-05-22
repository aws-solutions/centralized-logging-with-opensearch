// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  AlarmType,
  DomainDetails,
  DomainHealth,
  EngineType,
  ResourceStatus,
  StackStatus,
  StorageType,
} from "API";
import { ImportedDomainType } from "pages/clusters/importcluster/ImportCluster";

export const domainMockData: DomainDetails = {
  id: "xxxx",
  domainArn: "arn:aws:es:us-example-2:11111111111:domain/test-domain",
  domainName: "test-domain",
  engine: EngineType.Elasticsearch,
  version: "2.5",
  endpoint: "vpc-test-domain-xxxxx.us-example-2.es.amazonaws.com",
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
  proxyStatus: StackStatus.ENABLED,
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
  alarmStatus: StackStatus.ENABLED,
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
        type: AlarmType.FREE_STORAGE_SPACE,
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
    health: DomainHealth.GREEN,
    __typename: "DomainMetrics",
  },
  status: "IMPORTED",
  resources: [
    {
      name: "VPCPeering",
      values: [null],
      status: ResourceStatus.CREATED,
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

export const mockImportedDomainList = [
  {
    id: "xxxxx",
    domainName: "xxxx-test",
    engine: "OpenSearch",
    version: "2.11",
    endpoint: "xxxx-.us-example-1.es.example.com",
    metrics: {
      searchableDocs: 3141,
      freeStorageSpace: 78699.73,
      health: "GREEN",
      __typename: "DomainMetrics",
    },
    __typename: "ImportedDomain",
  },
];

export const mockListResource = [
  {
    id: "vpc-1",
    name: "Vpc1",
  },
  {
    id: "vpc-2",
    name: "Vpc2",
  },
  { id: "subnet-123", name: "Subnet123" },
  { id: "subnet-234", name: "Subnet234" },
  { id: "sg-123", name: "SecurityGroup1" },
  { id: "key-123", name: "Key1" },
  { id: "cert-456", name: "Certificate1" },
];

export const mockVPCResourceList = [
  {
    id: "vpc-xxx",
    name: "xxx-xxx-vpc-vpc",
    parentId: null,
    description: null,
    __typename: "Resource",
  },
  {
    id: "vpc-xxxx-1",
    name: "us-example-1-vpc",
    parentId: null,
    description: null,
    __typename: "Resource",
  },
];

export const mockDomainNames = [
  {
    domainName: "test-us-domain",
    status: "ACTIVE",
    __typename: "DomainNameAndStatus",
  },
];

export const mockDomainStatusCheckData = {
  status: "PASSED",
  details: [
    {
      name: "OpenSearchDomainEngine",
      values: ["OpenSearch"],
      errorCode: null,
      status: "PASSED",
      __typename: "DomainStatusCheckDetail",
    },
    {
      name: "OpenSearchDomainVersion",
      values: ["2.11"],
      errorCode: null,
      status: "PASSED",
      __typename: "DomainStatusCheckDetail",
    },
    {
      name: "OpenSearchDomainNetworkType",
      values: ["private"],
      errorCode: null,
      status: "PASSED",
      __typename: "DomainStatusCheckDetail",
    },
    {
      name: "SolutionPrivateSubnetWithNAT",
      values: ["subnet-1", "subnet-1"],
      errorCode: null,
      status: "PASSED",
      __typename: "DomainStatusCheckDetail",
    },
  ],
  multiAZWithStandbyEnabled: false,
  __typename: "DomainStatusCheckResponse",
};

export const mockDomainVpc = {
  vpcId: "vpc-1",
  subnetIds: ["subnet-1"],
  availabilityZones: ["us-example-1a"],
  securityGroupIds: ["sg-1"],
  __typename: "ESVPCInfo",
};

export const mockImportResult = {
  id: "xxxxxx",
  resources: [
    {
      name: "VPCPeering",
      values: [],
      status: "CREATED",
      __typename: "DomainRelevantResource",
    },
    {
      name: "OpenSearchSecurityGroup",
      values: [],
      status: "CREATED",
      __typename: "DomainRelevantResource",
    },
    {
      name: "OpenSearchNetworkACL",
      values: [],
      status: "CREATED",
      __typename: "DomainRelevantResource",
    },
    {
      name: "OpenSearchRouteTables",
      values: [],
      status: "CREATED",
      __typename: "DomainRelevantResource",
    },
    {
      name: "solutionRouteTableDetailItem",
      values: [],
      status: "CREATED",
      __typename: "DomainRelevantResource",
    },
  ],
  __typename: "ImportDomainResponse",
};

export const mockOpenSearchStateData: any = {
  domainLoading: false,
  domainNameError: false,
  domainCheckedStatus: {
    status: "PASSED",
    details: [
      {
        name: "OpenSearchDomainEngine",
        values: ["OpenSearch"],
        errorCode: null,
        status: "PASSED",
        __typename: "DomainStatusCheckDetail",
      },
      {
        name: "OpenSearchDomainVersion",
        values: ["2.11"],
        errorCode: null,
        status: "PASSED",
        __typename: "DomainStatusCheckDetail",
      },
      {
        name: "OpenSearchDomainNetworkType",
        values: ["private"],
        errorCode: null,
        status: "PASSED",
        __typename: "DomainStatusCheckDetail",
      },
      {
        name: "SolutionPrivateSubnetWithNAT",
        values: ["subnet-1", "subnet-1"],
        errorCode: null,
        status: "PASSED",
        __typename: "DomainStatusCheckDetail",
      },
      {
        name: "CheckOpenSearchSecurityGroup",
        values: ["sg-1"],
        errorCode: null,
        status: "PASSED",
        __typename: "DomainStatusCheckDetail",
      },
      {
        name: "CheckOpenSearchNetworkACL",
        values: ["acl-1"],
        errorCode: null,
        status: "PASSED",
        __typename: "DomainStatusCheckDetail",
      },
      {
        name: "CheckOpenSearchVPCRouteTable",
        values: ["subnet-1"],
        errorCode: null,
        status: "PASSED",
        __typename: "DomainStatusCheckDetail",
      },
      {
        name: "CheckSolutionVPCRouteTable",
        values: ["subnet-0340e66e2160db14b", "subnet-0e447ddfd88ce78c3"],
        errorCode: null,
        status: "PASSED",
        __typename: "DomainStatusCheckDetail",
      },
    ],
    multiAZWithStandbyEnabled: false,
    __typename: "DomainStatusCheckResponse",
  },
  shardsError: "",
  capacityError: "",
  warmLogError: "",
  coldLogError: "",
  retentionLogError: "",
  indexPrefixError: "",
  showAdvancedSetting: false,
  needCreateLogging: false,
  engineType: "OpenSearch",
  warmEnable: false,
  coldEnable: false,
  endpoint: "vpc-xxx.example.com",
  domainName: "opensearch-for-clo",
  opensearchArn:
    "arn:aws:es:us-example-2:111111111111:domain/opensearch-for-clo",
  esDomainId: "2864694e441928e0d6f8bbbcb619facd",
  indexPrefix: "xxxx",
  createDashboard: "Yes",
  vpcId: "vpc-1",
  subnetIds: "subnet-1,subnet-1",
  publicSubnetIds: "",
  securityGroupId: "sg-1",
  shardNumbers: "",
  replicaNumbers: "1",
  warmTransitionType: "IMMEDIATELY",
  warmAge: "0",
  coldAge: "60",
  retainAge: "180",
  rolloverSize: "30gb",
  indexSuffix: "yyyy-MM-dd",
  appIndexSuffix: "yyyy_MM_dd",
  codec: "best_compression",
  refreshInterval: "1s",
  rolloverSizeNotSupport: false,
};
