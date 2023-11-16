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
  CompressionType,
  CreateLightEngineAppPipelineMutationVariables,
} from "API";
import { AlarmStateType } from "reducer/createAlarm";
import { CreateLightEngineSate } from "reducer/createLightEngine";
import { CreateTagSate } from "reducer/createTags";
import { ApplicationLogType, YesNo } from "types";
import { CovertObjToParameterKeyValue } from "../applog";
import { cloneDeep } from "lodash";
import { ApiResponse, appSyncRequestMutation } from "../request";
import { createLightEngineAppPipeline } from "graphql/mutations";

export const CENTRALIZED_BUCKET_PREFIX = "datalake";

export const createLightEngineApplicationPipeline = async (
  lightEngine: CreateLightEngineSate,
  appPipeline: ApplicationLogType,
  logConfigObj: any,
  monitor: AlarmStateType,
  tags: CreateTagSate["tags"],
  isForce = false
) => {
  const createParams: CreateLightEngineAppPipelineMutationVariables = {
    logConfigId: logConfigObj.id,
    logConfigVersionNumber: parseInt(logConfigObj.version, 10),
    force: isForce,
    monitor: monitor.monitor,
    tags,
    bufferParams: CovertObjToParameterKeyValue(
      Object.assign(cloneDeep(appPipeline.s3BufferParams), {
        compressionType:
          appPipeline.s3BufferParams.compressionType === CompressionType.NONE
            ? undefined
            : appPipeline.s3BufferParams.compressionType,
        logBucketPrefix: `LightEngine/AppLogs/${lightEngine.centralizedTableName}`,
      })
    ),
    params: {
      centralizedBucketName: lightEngine.centralizedBucketName ?? "",
      centralizedBucketPrefix: CENTRALIZED_BUCKET_PREFIX,
      centralizedTableName: lightEngine.centralizedTableName ?? "",
      logProcessorSchedule: `rate(${lightEngine.logProcessorScheduleTime} ${lightEngine.logProcessorScheduleScale})`,
      logMergerSchedule: lightEngine.logMergerSchedule ?? "",
      logArchiveSchedule: lightEngine.logArchiveSchedule ?? "",
      logMergerAge: `${lightEngine.logMergerAge}`,
      logArchiveAge: `${lightEngine.logArchiveAge}`,
      importDashboards:
        lightEngine.sampleDashboard === YesNo.Yes ? "true" : "false",
      grafanaId:
        lightEngine.sampleDashboard === YesNo.Yes
          ? lightEngine.grafanaId
          : null,
      recipients: "",
    },
  };

  const createRes: ApiResponse<"createLightEngineAppPipeline", string> =
    await appSyncRequestMutation(createLightEngineAppPipeline, createParams);
  return createRes.data.createLightEngineAppPipeline;
};
