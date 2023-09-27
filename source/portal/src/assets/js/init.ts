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

import {
  BufferType,
  Codec,
  CompressionType,
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
  pipelineAlarmStatus: PipelineAlarmStatus.DISABLED,
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
    enableRolloverByCapacity: true,
    warmTransitionType: WarmTransitionType.IMMEDIATELY,

    aosParams: {
      domainName: "",
      engine: "",
      failedLogBucket: amplifyConfig.default_logging_bucket,
      indexPrefix: "",

      opensearchArn: "",
      opensearchEndpoint: "",
      replicaNumbers: "1",
      shardNumbers: "1",

      rolloverSize: "30",
      indexSuffix: IndexSuffix.yyyy_MM_dd,
      codec: Codec.best_compression,
      refreshInterval: "1s",
      vpc: {
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
    mskBufferParams: {
      mskClusterName: "",
      mskClusterArn: "",
      mskBrokerServers: "",
      topic: "",
    },
    force: false,
    monitor: MONITOR_ALARM_INIT_DATA,
  };
};
