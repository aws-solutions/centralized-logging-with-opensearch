// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { combineReducers } from "redux";
import appReducer, { Action, AppStateProps } from "./appReducer";
import {
  CreateLightEngineAction,
  CreateLightEngineSate,
  createLightEngineReducer,
} from "./createLightEngine";
import {
  CreateTagActions,
  CreateTagSate,
  createTagReducer,
} from "./createTags";

import {
  CreateAlarmActions,
  CreateAlarmState,
  createAlarmReducer,
} from "./createAlarm";
import { grafana, GrafanaState } from "./grafana";
import { openSearchSlice, OpenSearchState } from "./createOpenSearch";

import {
  SelectProcessorActions,
  SelectProcessorState,
  selectProcessorReducer,
} from "./selectProcessor";
import { S3BufferState, s3BufferSlice } from "./configBufferS3";
import { KDSBufferState, kdsBufferSlice } from "./configBufferKDS";
import { LogConfigState, logConfigSlice } from "./createLogConfig";
import { MemberAccountState, memberAccountSlice } from "./linkMemberAccount";

export const reducers = {
  app: appReducer,
  createTag: createTagReducer,
  createLightEngine: createLightEngineReducer,
  createAlarm: createAlarmReducer,
  grafana: grafana.reducer,
  selectProcessor: selectProcessorReducer,
  openSearch: openSearchSlice.reducer,
  s3Buffer: s3BufferSlice.reducer,
  kdsBuffer: kdsBufferSlice.reducer,
  logConfig: logConfigSlice.reducer,
  memberAccount: memberAccountSlice.reducer,
};

export type RootState = {
  app: AppStateProps;
  createTag: CreateTagSate;
  createLightEngine: CreateLightEngineSate;
  createAlarm: CreateAlarmState;
  grafana: GrafanaState;
  selectProcessor: SelectProcessorState;
  openSearch: OpenSearchState;
  s3Buffer: S3BufferState;
  kdsBuffer: KDSBufferState;
  logConfig: LogConfigState;
  memberAccount: MemberAccountState;
};

export type Actions =
  | CreateTagActions
  | Action
  | CreateAlarmActions
  | CreateLightEngineAction
  | SelectProcessorActions;

export const reducer = combineReducers(reducers);
