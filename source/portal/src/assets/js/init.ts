// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  BufferType,
  Codec,
  CompressionType,
  EngineType,
  IndexSuffix,
  PipelineAlarmStatus,
  PipelineMonitorStatus,
} from "API";
import {
  AmplifyConfigType,
  ApplicationLogType,
  S3_STORAGE_CLASS_TYPE,
  WarmTransitionType,
} from "types";

export const MONITOR_ALARM_INIT_DATA = {
  status: PipelineMonitorStatus.ENABLED,
  pipelineAlarmStatus: PipelineAlarmStatus.ENABLED,
  snsTopicName: "",
  snsTopicArn: "",
  emails: "",
};

export const buildInitPipelineData = (
  amplifyConfig: AmplifyConfigType
): ApplicationLogType => {
  return {
    openSearchId: "",
    warmEnable: false,
    coldEnable: false,
    confirmNetworkChecked: false,

    rolloverSizeNotSupport: false,
    warmTransitionType: WarmTransitionType.IMMEDIATELY,

    aosParams: {
      domainName: "",
      engine: EngineType.OpenSearch,
      indexPrefix: "",

      opensearchArn: "",
      opensearchEndpoint: "",
      replicaNumbers: "1",
      shardNumbers: "",

      rolloverSize: "30gb",
      indexSuffix: IndexSuffix.yyyy_MM_dd,
      codec: Codec.best_compression,
      refreshInterval: "1s",
      vpc: {
        publicSubnetIds: "",
        privateSubnetIds: "",
        securityGroupId: "",
        vpcId: "",
      },
      warmLogTransition: "30",
      coldLogTransition: "60",
      logRetention: "180",
    },
    bufferType: BufferType.S3,
    kdsBufferParams: {
      enableAutoScaling: "false",
      shardCount: "1",
      minCapacity: "1",
      maxCapacity: "1",
    },
    s3BufferBucketObj: {
      name: amplifyConfig.default_logging_bucket,
      value: amplifyConfig.default_logging_bucket,
    },
    s3BufferParams: {
      logBucketName: amplifyConfig.default_logging_bucket,
      logBucketPrefix: "",
      logBucketSuffix: "",
      defaultCmkArn: amplifyConfig.default_cmk_arn,
      maxFileSize: "50",
      uploadTimeout: "60",
      compressionType: CompressionType.GZIP,
      s3StorageClass: S3_STORAGE_CLASS_TYPE.INTELLIGENT_TIERING,
    },
    force: false,
    monitor: MONITOR_ALARM_INIT_DATA,
    params: {
      geoPlugin: false,
      userAgentPlugin: false,
    },
  };
};
