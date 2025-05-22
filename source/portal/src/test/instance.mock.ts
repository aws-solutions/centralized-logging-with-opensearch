// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const instanceGroupMockData = {
  id: "xxxx",
  sourceId: "xxxx",
  type: "EC2",
  accountId: "123456789012",
  region: "us-example-2",
  eks: null,
  s3: null,
  ec2: {
    groupName: "test-instance-group",
    groupType: "EC2",
    groupPlatform: "Linux",
    asgName: "",
    instances: [
      {
        instanceId: "i-xxxxxxxxx",
        __typename: "EC2Instances",
      },
    ],
    __typename: "EC2Source",
  },
  syslog: null,
  createdAt: "2024-01-05T08:36:57Z",
  updatedAt: "2024-01-05T08:36:57Z",
  status: "ACTIVE",
  tags: [],
  __typename: "LogSource",
};

export const MockInstanceLogSources = [
  { ...instanceGroupMockData, id: "xxx-1" },
  {
    ...instanceGroupMockData,
    id: "xxx-2",
    ec2: {
      ...instanceGroupMockData.ec2,
      groupPlatform: "Linux",
    },
  },
  {
    ...instanceGroupMockData,
    id: "xxx-3",
    ec2: {
      ...instanceGroupMockData.ec2,
      groupPlatform: "Linux",
      groupType: "ASG",
    },
  },
];

export const MockListInstances = {
  instances: [
    {
      id: "i-xxx1",
      platformName: "Amazon Linux",
      platformType: "Linux",
      ipAddress: "",
      computerName: "1.ec2.internal",
      name: "NginxForOpenSearch/NginxProxyEC2LaunchTemplate",
      __typename: "Instance",
    },
  ],
  nextToken: "",
  __typename: "ListInstanceResponse",
};

export const MockGetAgentStatus = {
  commandId: "",
  instanceAgentStatusList: [
    {
      instanceId: "i-xxx1",
      status: "Online",
      invocationOutput: "Fluent Bit installed and online.",
      curlOutput: "",
      __typename: "InstanceAgentStatus",
    },
  ],
  __typename: "InstanceAgentStatusResponse",
};
