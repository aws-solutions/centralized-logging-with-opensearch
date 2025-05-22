// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
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
      warmTransitionType: WarmTransitionType.IMMEDIATELY,

      aosParams: {
        domainName: "",
        engine: "OpenSearch",
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
      force: false,
      monitor: MONITOR_ALARM_INIT_DATA,
      params: {
        geoPlugin: false,
        userAgentPlugin: false,
      },
    };
    const pipelineData = buildInitPipelineData(amplifyConfigMock);
    expect(pipelineData).toEqual(expectedPipelineData);
  });

  it("should initialize monitor alarm data correctly", () => {
    const pipelineData = buildInitPipelineData(amplifyConfigMock);
    expect(pipelineData.monitor).toEqual(MONITOR_ALARM_INIT_DATA);
  });
});
