// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  AnalyticEngineType,
  BufferType,
  CompressionType,
  PipelineAlarmStatus,
  PipelineMonitorStatus,
  PipelineStatus,
} from "API";
import { SNSCreateMethod } from "reducer/selectProcessor";

export const MockOSIData = {
  serviceAvailable: true,
  serviceAvailableChecked: true,
  serviceAvailableCheckedLoading: true,
  logProcessorType: "",
  logProcessorConcurrency: "",
  minOCU: "",
  maxOCU: "",
  logProcessorConcurrencyError: "",
  minOCUError: "",
  maxOCUError: "",
  unreservedAccountConcurrency: "",
};

export const MockCreateAlarmData = {
  isConfirmed: true,
  snsObj: null,
  topicCheckOption: SNSCreateMethod.ChooseCreateTopic,
  selectExistSNSError: "",
  snsTopicError: "",
  snsEmailError: "",
  monitor: {
    status: PipelineMonitorStatus.ENABLED,
    pipelineAlarmStatus: PipelineAlarmStatus.ENABLED,
    snsTopicName: "test",
    snsTopicArn: "arn:aws:sns:us-example-1:111111111111:<topic-name>",
    emails: "test@example.com",
  },
};

export const MockAppLogData = {
  openSearchId: "",
  warmEnable: true,
  coldEnable: true,
  confirmNetworkChecked: true,
  rolloverSizeNotSupport: true,
  warmTransitionType: "",
  aosParams: {} as any,
  bufferType: "",
  kdsBufferParams: {
    enableAutoScaling: "",
    shardCount: "",
    minCapacity: "",
    maxCapacity: "",
  },
  s3BufferBucketObj: null,
  s3BufferParams: {
    logBucketName: "",
    logBucketPrefix: "",
    logBucketSuffix: "",
    defaultCmkArn: "",
    maxFileSize: "",
    uploadTimeout: "",
    compressionType: CompressionType.GZIP,
    s3StorageClass: "",
  },
  force: true,
  monitor: {
    status: PipelineMonitorStatus.ENABLED,
    pipelineAlarmStatus: PipelineAlarmStatus.ENABLED,
    snsTopicName: "",
    snsTopicArn: "",
    emails: "",
  },
  // For Plugin
  type: "",
  destinationType: "",
  params: {
    geoPlugin: true,
    userAgentPlugin: true,
  },
};

export const MockAppLogDetailData: any = {
  __typename: "AppPipeline",
  pipelineId: "test",
  bufferType: BufferType.S3,
  bufferParams: [],
  parameters: [],
  aosParams: null,
  lightEngineParams: null,
  createdAt: "",
  status: PipelineStatus.ACTIVE,
  logConfigId: "",
  logConfigVersionNumber: 1,
  logConfig: null,
  bufferAccessRoleArn: "",
  bufferAccessRoleName: "",
  bufferResourceName: "",
  bufferResourceArn: "",
  processorLogGroupName: "",
  helperLogGroupName: "",
  logEventQueueName: "",
  monitor: {
    __typename: "MonitorDetail",
    status: PipelineMonitorStatus.ENABLED,
    backupBucketName: "test",
    errorLogPrefix: "test",
    pipelineAlarmStatus: PipelineAlarmStatus.ENABLED,
    snsTopicName: "test",
    snsTopicArn: "arn:aws:sns:us-example-1:111111111111:<topic-name>",
    emails: "test@example.com",
  },
  osiParams: null,
  osiPipelineName: "",
  minCapacity: 1,
  maxCapacity: 2,
  stackId: "",
  error: "",
  engineType: AnalyticEngineType,
  logStructure: null,
  tags: [],
};

export const MockEKSData = {
  id: "xxxx",
  sourceId: "xxxx",
  type: "EKSCluster",
  accountId: "111111111111",
  region: "us-west-2",
  eks: {
    eksClusterName: "eks-1",
    eksClusterArn: "arcn",
    cri: "containerd",
    vpcId: "vpc-1",
    eksClusterSGId: "sg-1",
    subnetIds: ["subnet-0e447ddfd88ce78c3", "subnet-0340e66e2160db14b"],
    oidcIssuer: "xxx",
    endpoint: "xxx",
    logAgentRoleArn: "arc",
    deploymentKind: "DaemonSet",
    __typename: "EKSSource",
  },
  s3: null,
  ec2: null,
  syslog: null,
  createdAt: "2023-09-05T07:15:35Z",
  updatedAt: "2023-09-05T07:15:35Z",
  status: "ACTIVE",
  tags: [],
  __typename: "LogSource",
};

export const MockEKSList = [
  {
    description: "AWS EKS ",
    id: "eks-1",
    name: "eks-1",
    parentId: null,
    __typename: "Resource",
  },
];
