// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CompressionType,
  CreateLightEngineAppPipelineMutationVariables,
  LogStructure,
} from "API";
import { AlarmStateType } from "reducer/createAlarm";
import { CreateLightEngineSate } from "reducer/createLightEngine";
import { CreateTagSate } from "reducer/createTags";
import { YesNo } from "types";
import { CovertObjToParameterKeyValue } from "../applog";
import { cloneDeep } from "lodash";
import { ApiResponse, appSyncRequestMutation } from "../request";
import { createLightEngineAppPipeline } from "graphql/mutations";
import { S3BufferState } from "reducer/configBufferS3";
import { defaultStr, ternary } from "../utils";

export const CENTRALIZED_BUCKET_PREFIX = "datalake";

export const createLightEngineApplicationPipeline = async (
  lightEngine: CreateLightEngineSate,
  s3BufferData: S3BufferState,
  logConfigObj: any,
  monitor: AlarmStateType,
  tags: CreateTagSate["tags"],
  isForce = false,
  logStructure = LogStructure.FLUENT_BIT_PARSED_JSON
) => {
  const createParams: CreateLightEngineAppPipelineMutationVariables = {
    logConfigId: logConfigObj.id,
    logConfigVersionNumber: parseInt(logConfigObj.version, 10),
    force: isForce,
    monitor: monitor.monitor,
    logStructure,
    tags,
    bufferParams: CovertObjToParameterKeyValue(
      Object?.assign(cloneDeep(s3BufferData.data) ?? {}, {
        compressionType: ternary(
          s3BufferData.data.compressionType === CompressionType.NONE,
          undefined,
          s3BufferData.data.compressionType
        ),
        logBucketPrefix: `LightEngine/AppLogs/${lightEngine.centralizedTableName}`,
      })
    ),
    params: {
      centralizedBucketName: defaultStr(lightEngine.centralizedBucketName),
      centralizedBucketPrefix: CENTRALIZED_BUCKET_PREFIX,
      centralizedTableName: defaultStr(lightEngine.centralizedTableName),
      logProcessorSchedule: `rate(${lightEngine.logProcessorScheduleTime} ${lightEngine.logProcessorScheduleScale})`,
      logMergerSchedule: defaultStr(lightEngine.logMergerSchedule),
      logArchiveSchedule: defaultStr(lightEngine.logArchiveSchedule),
      logMergerAge: `${lightEngine.logMergerAge}`,
      logArchiveAge: `${lightEngine.logArchiveAge}`,
      importDashboards: ternary(
        lightEngine.sampleDashboard === YesNo.Yes,
        "true",
        "false"
      ),
      grafanaId: ternary(
        lightEngine.sampleDashboard === YesNo.Yes,
        lightEngine.grafanaId,
        null
      ),
      recipients: "",
    },
  };

  const createRes: ApiResponse<"createLightEngineAppPipeline", string> =
    await appSyncRequestMutation(createLightEngineAppPipeline, createParams);
  return createRes.data.createLightEngineAppPipeline;
};
