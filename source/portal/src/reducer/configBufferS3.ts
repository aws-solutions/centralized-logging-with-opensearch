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

import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { CompressionType, LogType } from "API";
import { CovertObjToParameterKeyValue } from "assets/js/applog";
import { defaultStr } from "assets/js/utils";
import { OptionType } from "components/AutoComplete/autoComplete";
import { AmplifyConfigType, S3_STORAGE_CLASS_TYPE, YesNo } from "types";

export type S3BufferState = {
  // temporary for bucket selection
  s3BufferBucketObj: OptionType | null;
  // for validation
  logBucketError: string;
  logBucketPrefixError: string;
  bufferSizeError: string;
  bufferIntervalError: string;
  data: {
    logBucketName: string;
    logBucketPrefix: string;
    logBucketSuffix: string;
    defaultCmkArn: string;
    maxFileSize: string; // buffer size
    uploadTimeout: string; // buffer interval
    compressionType: CompressionType | string;
    s3StorageClass: string;
  };
};

export const INIT_S3BUFFER_DATA: S3BufferState = {
  // temporary for bucket selection
  s3BufferBucketObj: null,
  // for validation
  logBucketError: "",
  logBucketPrefixError: "",
  bufferSizeError: "",
  bufferIntervalError: "",
  data: {
    logBucketName: "", //amplifyConfig.default_logging_bucket,
    logBucketPrefix: "",
    logBucketSuffix: "",
    defaultCmkArn: "", // amplifyConfig.default_cmk_arn,
    maxFileSize: "50",
    uploadTimeout: "60",
    compressionType: CompressionType.GZIP,
    s3StorageClass: S3_STORAGE_CLASS_TYPE.INTELLIGENT_TIERING,
  },
};

export const convertS3BufferParameters = (
  state: S3BufferState,
  logType: LogType,
  shouldCreateDashboard?: string
) => {
  return CovertObjToParameterKeyValue({
    ...state.data,
    compressionType:
      state.data.compressionType === CompressionType.NONE
        ? undefined
        : state.data.compressionType,
    createDashboard:
      shouldCreateDashboard && [LogType.Nginx, LogType.Apache].includes(logType)
        ? shouldCreateDashboard
        : YesNo.No,
  });
};

export const validateLogBucket = (state: S3BufferState) => {
  if (state.data.logBucketName.trim() === "") {
    return "applog:create.ingestSetting.selectS3Bucket";
  }
  return "";
};

export const validateLogBucketPrefix = (state: S3BufferState) => {
  if (
    state.data.logBucketPrefix &&
    (state.data.logBucketPrefix === "/" ||
      !state.data.logBucketPrefix.endsWith("/"))
  ) {
    return "applog:create.ingestSetting.s3PrefixInvalid";
  } else {
    return "";
  }
};

export const validateBufferSize = (state: S3BufferState) => {
  if (
    parseInt(state.data.maxFileSize) < 1 ||
    parseInt(state.data.maxFileSize) > 50
  ) {
    return "applog:create.ingestSetting.bufferSizeError";
  } else {
    return "";
  }
};

export const validateBufferInterval = (state: S3BufferState) => {
  if (
    parseInt(state.data.uploadTimeout) < 1 ||
    parseInt(state.data.uploadTimeout) > 86400
  ) {
    return "applog:create.ingestSetting.bufferIntError";
  } else {
    return "";
  }
};

export const validateS3BufferParams = (openSearch: S3BufferState) => {
  return !(
    validateLogBucket(openSearch) ||
    validateLogBucketPrefix(openSearch) ||
    validateBufferSize(openSearch) ||
    validateBufferInterval(openSearch)
  );
};

export const s3BufferSlice = createSlice({
  name: "s3Buffer",
  initialState: INIT_S3BUFFER_DATA,
  reducers: {
    resetS3Buffer: (state) => {
      return {
        ...state,
        ...INIT_S3BUFFER_DATA,
      };
    },
    setLogBucketAndCMKArn: (
      state,
      { payload }: PayloadAction<AmplifyConfigType>
    ) => {
      state.s3BufferBucketObj = {
        name: payload.default_logging_bucket,
        value: payload.default_logging_bucket,
      };
      state.data.logBucketName = payload.default_logging_bucket;
      state.data.defaultCmkArn = payload.default_cmk_arn;
    },
    logBucketChanged: (
      state,
      { payload }: PayloadAction<OptionType | null>
    ) => {
      state.s3BufferBucketObj = payload;
      state.data.logBucketName = defaultStr(payload?.value);
      state.logBucketError = "";
    },
    logBucketPrefixChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.logBucketPrefix = payload;
      state.logBucketPrefixError = "";
    },
    bufferSizeChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.maxFileSize = payload;
      state.bufferSizeError = "";
    },
    bufferIntervalChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.uploadTimeout = payload;
      state.bufferIntervalError = "";
    },
    s3StorageClassChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.s3StorageClass = payload;
    },
    bufferCompressionTypeChanged: (
      state,
      { payload }: PayloadAction<string>
    ) => {
      state.data.compressionType = payload;
    },
    validateS3Buffer: (state) => {
      state.logBucketError = validateLogBucket(state);
      state.logBucketPrefixError = validateLogBucketPrefix(state);
      state.bufferSizeError = validateBufferSize(state);
      state.bufferIntervalError = validateBufferInterval(state);
    },
  },
});

export const {
  resetS3Buffer,
  setLogBucketAndCMKArn,
  logBucketChanged,
  logBucketPrefixChanged,
  bufferSizeChanged,
  bufferIntervalChanged,
  s3StorageClassChanged,
  bufferCompressionTypeChanged,
  validateS3Buffer,
} = s3BufferSlice.actions;
