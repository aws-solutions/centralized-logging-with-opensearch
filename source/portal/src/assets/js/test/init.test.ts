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
import { buildInitPipelineData, MONITOR_ALARM_INIT_DATA } from "../init"; // Update the import path as needed
import { BufferType, Codec, CompressionType, IndexSuffix } from "API";
import { WarmTransitionType, S3_STORAGE_CLASS_TYPE } from "types";

describe("buildInitPipelineData", () => {
  const amplifyConfigMock: any = {
    default_logging_bucket: "default-bucket",
    default_cmk_arn: "default-cmk-arn",
  };
  it("should build initial pipeline data with the given amplify config", () => {
    const expectedPipelineData = {
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
        failedLogBucket: "default-bucket",
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
        name: "default-bucket",
        value: "default-bucket",
      },
      s3BufferParams: {
        logBucketName: "default-bucket",
        logBucketPrefix: "",
        logBucketSuffix: "",
        defaultCmkArn: "default-cmk-arn",
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
    const pipelineData = buildInitPipelineData(amplifyConfigMock);
    expect(pipelineData).toEqual(expectedPipelineData);
  });

  it("should initialize monitor alarm data correctly", () => {
    const pipelineData = buildInitPipelineData(amplifyConfigMock);
    expect(pipelineData.monitor).toEqual(MONITOR_ALARM_INIT_DATA);
  });
});
