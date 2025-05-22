// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CompressionType, LogType } from "API";
import {
  INIT_S3BUFFER_DATA,
  S3BufferState,
  convertS3BufferParameters,
  s3BufferSlice,
  validateBufferInterval,
  validateBufferSize,
  validateLogBucket,
  validateLogBucketPrefix,
  validateS3BufferParams,
} from "../configBufferS3";
import { S3_STORAGE_CLASS_TYPE, YesNo } from "types";

jest.mock("i18n", () => ({
  t: (key: string) => key,
}));

describe("configBufferS3", () => {
  let initialState: S3BufferState;
  beforeEach(() => {
    initialState = {
      s3BufferBucketObj: null,
      logBucketError: "",
      logBucketPrefixError: "",
      bufferSizeError: "",
      bufferIntervalError: "",
      data: {
        logBucketName: "",
        logBucketPrefix: "",
        logBucketSuffix: "",
        defaultCmkArn: "",
        maxFileSize: "50",
        uploadTimeout: "60",
        compressionType: CompressionType.GZIP,
        s3StorageClass: S3_STORAGE_CLASS_TYPE.INTELLIGENT_TIERING,
      },
    };
  });

  describe("convertS3BufferParameters", () => {
    it("sets createDashboard to Yes when shouldCreateDashboard is provided and logType is Nginx", () => {
      const state = { ...initialState };
      const result = convertS3BufferParameters(state, LogType.Nginx, "Yes");
      const createDashboardObject = result.find(
        (item) => item.paramKey === "createDashboard"
      );
      expect(createDashboardObject?.paramValue).toBe("Yes");
    });

    it("sets createDashboard to No when shouldCreateDashboard is provided but logType is not Nginx or Apache", () => {
      const state = { ...initialState };
      const result = convertS3BufferParameters(state, LogType.JSON, "Yes");
      const createDashboardObject = result.find(
        (item) => item.paramKey === "createDashboard"
      );
      expect(createDashboardObject?.paramValue).toBe(YesNo.No);
    });

    it("sets createDashboard to No when shouldCreateDashboard is not provided", () => {
      const state = { ...initialState };
      const result = convertS3BufferParameters(state, LogType.Nginx);
      const createDashboardObject = result.find(
        (item) => item.paramKey === "createDashboard"
      );
      expect(createDashboardObject?.paramValue).toBe(YesNo.No);
    });

    it("set compressionType to undefined when compressionType is NONE", () => {
      const state = { ...initialState };
      state.data.compressionType = CompressionType.NONE;
      const result = convertS3BufferParameters(state, LogType.Nginx);
      const compressionTypeObject = result.find(
        (item) => item.paramKey === "compressionType"
      );
      expect(compressionTypeObject?.paramValue).toBe(undefined);
    });
  });

  describe("validateLogBucket", () => {
    it("should validate log bucket correctly", () => {
      const stateWithBucket = {
        ...initialState,
        s3BufferBucketObj: {
          value: "test",
          name: "test",
        },
        data: {
          ...initialState.data,
          logBucketName: "test",
        },
      };
      const validStr = validateLogBucket(stateWithBucket);
      expect(validStr).toEqual("");
    });
    it("should validate log bucket correctly", () => {
      const validStr = validateLogBucket(initialState);
      expect(validStr).toEqual("applog:create.ingestSetting.selectS3Bucket");
    });
  });

  describe("validateLogBucketPrefix", () => {
    it("should validate log bucket prefix correctly", () => {
      const stateWithBucket = {
        ...initialState,
        data: {
          ...initialState.data,
          logBucketPrefix: "test/",
        },
      };
      const validStr = validateLogBucketPrefix(stateWithBucket);
      expect(validStr).toEqual("");
    });

    it("should validate log bucket prefix not correctly", () => {
      const stateWithBucket = {
        ...initialState,
        data: {
          ...initialState.data,
          logBucketPrefix: "test",
        },
      };
      const validStr = validateLogBucketPrefix(stateWithBucket);
      expect(validStr).toEqual("applog:create.ingestSetting.s3PrefixInvalid");
    });
  });

  describe("validateBufferSize", () => {
    it("should validate buffer size correctly", () => {
      const validState = {
        ...initialState,
        data: {
          ...initialState.data,
          maxFileSize: "1",
        },
      };
      const validStr = validateBufferSize(validState);
      expect(validStr).toEqual("");
    });
    it("should validate buffer size not correctly", () => {
      const invalidState = {
        ...initialState,
        data: {
          ...initialState.data,
          maxFileSize: "51",
        },
      };
      const validStr = validateBufferSize(invalidState);
      expect(validStr).toEqual("applog:create.ingestSetting.bufferSizeError");
    });
  });

  describe("validateBufferInterval", () => {
    it("should validate buffer interval correctly", () => {
      const validState = {
        ...initialState,
        data: {
          ...initialState.data,
          uploadTimeout: "1",
        },
      };
      const validStr = validateBufferInterval(validState);
      expect(validStr).toEqual("");
    });

    it("should validate buffer interval not correctly", () => {
      const invalidState = {
        ...initialState,
        data: {
          ...initialState.data,
          uploadTimeout: "86401",
        },
      };
      const validStr = validateBufferInterval(invalidState);
      expect(validStr).toEqual("applog:create.ingestSetting.bufferIntError");
    });
  });

  describe("validateS3BufferParams", () => {
    it("should validate S3 buffer parameters correctly", () => {
      const validState = {
        ...initialState,
        s3BufferBucketObj: {
          value: "test",
          name: "test",
        },
        data: {
          ...initialState.data,
          logBucketName: "test",
        },
      };
      const validStr = validateS3BufferParams(validState);
      expect(validStr).toEqual(true);
    });
  });

  describe("s3BufferSlice", () => {
    it("should reset S3 buffer correctly", () => {
      const action = s3BufferSlice.actions.resetS3Buffer();
      const result = s3BufferSlice.reducer(initialState, action);
      expect(result).toEqual(INIT_S3BUFFER_DATA);
    });

    it("should set log bucket and CMK ARN correctly", () => {
      const action = s3BufferSlice.actions.setLogBucketAndCMKArn({
        default_logging_bucket: "test",
        default_cmk_arn: "test",
      } as any);
      const result = s3BufferSlice.reducer(initialState, action);
      expect(result.data.logBucketName).toEqual("test");
      expect(result.data.defaultCmkArn).toEqual("test");
    });

    it("should handle log bucket changed correctly", () => {
      const action = s3BufferSlice.actions.logBucketChanged({
        value: "test",
        name: "test",
      });
      const result = s3BufferSlice.reducer(initialState, action);
      expect(result.data.logBucketName).toEqual("test");
    });

    it("should handle log bucket prefix changed correctly", () => {
      const action = s3BufferSlice.actions.logBucketPrefixChanged("test");
      const result = s3BufferSlice.reducer(initialState, action);
      expect(result.data.logBucketPrefix).toEqual("test");
    });

    it("should handle buffer size changed correctly", () => {
      const action = s3BufferSlice.actions.bufferSizeChanged("1");
      const result = s3BufferSlice.reducer(initialState, action);
      expect(result.data.maxFileSize).toEqual("1");
    });

    it("should handle buffer interval changed correctly", () => {
      const action = s3BufferSlice.actions.bufferIntervalChanged("1");
      const result = s3BufferSlice.reducer(initialState, action);
      expect(result.data.uploadTimeout).toEqual("1");
    });

    it("should handle S3 storage class changed correctly", () => {
      const action = s3BufferSlice.actions.s3StorageClassChanged(
        S3_STORAGE_CLASS_TYPE.INTELLIGENT_TIERING
      );
      const result = s3BufferSlice.reducer(initialState, action);
      expect(result.data.s3StorageClass).toEqual(
        S3_STORAGE_CLASS_TYPE.INTELLIGENT_TIERING
      );
    });

    it("should handle buffer compression type changed correctly", () => {
      const action = s3BufferSlice.actions.bufferCompressionTypeChanged(
        CompressionType.GZIP
      );
      const result = s3BufferSlice.reducer(initialState, action);
      expect(result.data.compressionType).toEqual(CompressionType.GZIP);
    });

    it("should validate S3 buffer correctly", () => {
      const action = s3BufferSlice.actions.validateS3Buffer();
      const result = s3BufferSlice.reducer(initialState, action);
      expect(result.logBucketError).toEqual(
        "applog:create.ingestSetting.selectS3Bucket"
      );
      expect(result.logBucketPrefixError).toEqual("");
      expect(result.bufferSizeError).toEqual("");
      expect(result.bufferIntervalError).toEqual("");
    });
  });
});
