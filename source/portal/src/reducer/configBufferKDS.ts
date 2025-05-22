// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { LogType } from "API";
import { CovertObjToParameterKeyValue } from "assets/js/applog";
import { YesNo } from "types";

export type KDSBufferState = {
  // for validation
  minCapacityError: string;
  maxCapacityError: string;
  data: {
    enableAutoScaling: string;
    shardCount: string;
    minCapacity: string;
    maxCapacity: string;
  };
};

export const INIT_KDS_BUFFER_DATA: KDSBufferState = {
  // for validation
  minCapacityError: "",
  maxCapacityError: "",
  data: {
    enableAutoScaling: "false",
    shardCount: "1",
    minCapacity: "1",
    maxCapacity: "1",
  },
};

export const convertKDSBufferParameters = (
  state: KDSBufferState,
  logType: LogType,
  shouldCreateDashboard?: string
) => {
  return CovertObjToParameterKeyValue({
    ...state.data,
    createDashboard:
      shouldCreateDashboard && [LogType.Nginx, LogType.Apache].includes(logType)
        ? shouldCreateDashboard
        : YesNo.No,
  });
};

export const validateMinCapacity = (state: KDSBufferState) => {
  if (state.data.minCapacity === "" || parseInt(state.data.minCapacity) <= 0) {
    return "applog:create.ingestSetting.shardNumError";
  } else {
    return "";
  }
};

export const validateMaxCapacity = (state: KDSBufferState) => {
  const intStartShardNum = parseInt(state.data.minCapacity);
  const intMaxShardNum = parseInt(state.data.maxCapacity);
  if (
    state.data.enableAutoScaling === "true" &&
    (intMaxShardNum <= 0 ||
      Number.isNaN(intMaxShardNum) ||
      intMaxShardNum <= intStartShardNum)
  ) {
    return "applog:create.ingestSetting.maxShardNumError";
  } else {
    return "";
  }
};

export const validateKDSBufferParams = (kdsBuffer: KDSBufferState) => {
  return !(validateMinCapacity(kdsBuffer) || validateMaxCapacity(kdsBuffer));
};

export const kdsBufferSlice = createSlice({
  name: "kdsBuffer",
  initialState: INIT_KDS_BUFFER_DATA,
  reducers: {
    resetKDSBuffer: (state) => {
      return {
        ...state,
        ...INIT_KDS_BUFFER_DATA,
      };
    },
    minCapacityChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.shardCount = payload;
      state.data.minCapacity = payload;
      state.minCapacityError = "";
      state.maxCapacityError = "";
    },
    enableAutoScalingChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.enableAutoScaling = payload;
      state.maxCapacityError = "";
    },
    maxCapacityChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.maxCapacity = payload;
      state.maxCapacityError = "";
    },
    validateKDSBuffer: (state) => {
      state.maxCapacityError = validateMinCapacity(state);
      state.maxCapacityError = validateMaxCapacity(state);
    },
  },
});

export const {
  resetKDSBuffer,
  minCapacityChanged,
  enableAutoScalingChanged,
  maxCapacityChanged,
  validateKDSBuffer,
} = kdsBufferSlice.actions;
