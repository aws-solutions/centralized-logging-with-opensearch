// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { DomainStatusCheckType } from "API";
import {
  createFieldValidator,
  pipFieldValidator,
  validateRequiredText,
  validateWithRegex,
  withI18nErrorMessage,
} from "assets/js/utils";
import i18n from "i18n";
import { YesNo } from "types";
import { GrafanaState } from "./grafana";

export enum ScheduleScale {
  MIN = "minutes",
  HOUR = "hours",
  DAY = "days",
}

export const initState = {
  sampleDashboard: YesNo.Yes,
  grafanaId: null as null | string,
  grafanaIdError: "",
  centralizedBucketName: null as null | string,
  centralizedBucketNameError: "",
  logArchiveSchedule: "cron(0 2 * * ? *)",
  logArchiveScheduleError: "",
  logMergerSchedule: "cron(0 1 * * ? *)",
  logMergerScheduleError: "",
  logProcessorScheduleError: "",
  logArchiveAge: 180 as number | undefined,
  logArchiveAgeError: "",
  logMergerAge: 7 as number | undefined,
  logMergerAgeError: "",
  centralizedTableName: "",
  centralizedTableNameError: "",
  logProcessorScheduleTime: 5 as number | undefined,
  logProcessorScheduleScale: ScheduleScale.MIN,
  logProcessorScheduleExpError: "",
};

export type CreateLightEngineSate = typeof initState;

export const CFN_KEYS_FROM_STATE = [
  "sampleDashboard",
  "grafanaId",
  "centralizedBucketName",
  "centralizedBucketPrefix",
  "centralizedTableName",
  "logArchiveAge",
  "logArchiveSchedule",
  "logMergerAge",
  "logMergerSchedule",
];

export enum CreateLightEngineActionTypes {
  SAMPLE_DASHBOARD_CHANGED = "SAMPLE_DASHBOARD_CHANGED",
  GRAFANA_ID_CHANGED = "GRAFANA_ID_CHANGED",
  CENTRALIZED_BUCKET_NAME_CHANGED = "CENTRALIZED_BUCKET_NAME_CHANGED",
  LOG_ARCHIVE_SCHEDULE_CHANGED = "LOG_ARCHIVE_SCHEDULE_CHANGED",
  LOG_MERGER_SCHEDULE_CHANGED = "LOG_MERGER_SCHEDULE_CHANGED",
  LOG_PROCESSOR_SCHEDULE_CHANGED = "LOG_PROCESSOR_SCHEDULE_CHANGED",
  CENTRALIZED_TABLE_NAME_CHANGED = "CENTRALIZED_TABLE_NAME_CHANGED",
  LOG_ARCHIVE_AGE_CHANGED = "LOG_ARCHIVE_AGE_CHANGED",
  LOG_MERGER_AGE_CHANGED = "LOG_MERGER_AGE_CHANGED",
  VALIDATE_LIGHT_ENGINE = "VALIDATE_LIGHT_ENGINE",
  CLEAR_LIGHT_ENGINE = "CLEAR_LIGHT_ENGINE",
  LOG_PROCESSOR_SCHEDULE_TIME_CHANGED = "LOG_PROCESSOR_SCHEDULE_TIME_CHANGED",
  LOG_PROCESSOR_SCHEDULE_SCALE_CHANGED = "LOG_PROCESSOR_SCHEDULE_SCALE_CHANGED",
}

export type SampleDashboardChanged = {
  type: CreateLightEngineActionTypes.SAMPLE_DASHBOARD_CHANGED;
  value: YesNo;
};
export type GrafanaIdChanged = {
  type: CreateLightEngineActionTypes.GRAFANA_ID_CHANGED;
  value: string;
};
export type CentralizedBucketNameChanged = {
  type: CreateLightEngineActionTypes.CENTRALIZED_BUCKET_NAME_CHANGED;
  value: string;
};
export type LogArchiveScheduleChanged = {
  type: CreateLightEngineActionTypes.LOG_ARCHIVE_SCHEDULE_CHANGED;
  value: string;
};
export type LogMergerScheduleChanged = {
  type: CreateLightEngineActionTypes.LOG_MERGER_SCHEDULE_CHANGED;
  value: string;
};
export type LogProcessorScheduleChanged = {
  type: CreateLightEngineActionTypes.LOG_PROCESSOR_SCHEDULE_CHANGED;
  value: string;
};
export type CentralizedTableNameChanged = {
  type: CreateLightEngineActionTypes.CENTRALIZED_TABLE_NAME_CHANGED;
  value: string;
};
export type LogArchiveAgeChanged = {
  type: CreateLightEngineActionTypes.LOG_ARCHIVE_AGE_CHANGED;
  value: number;
};
export type LogMergerAgeChanged = {
  type: CreateLightEngineActionTypes.LOG_MERGER_AGE_CHANGED;
  value: number;
};
export type ValidateLightEngine = {
  type: CreateLightEngineActionTypes.VALIDATE_LIGHT_ENGINE;
};

export type LogProcessorScheduleTimeChanged = {
  type: CreateLightEngineActionTypes.LOG_PROCESSOR_SCHEDULE_TIME_CHANGED;
  value?: number;
};

export type LogProcessorScheduleScaleChanged = {
  type: CreateLightEngineActionTypes.LOG_PROCESSOR_SCHEDULE_SCALE_CHANGED;
  value: ScheduleScale;
};

export type ClearLightEngine = {
  type: CreateLightEngineActionTypes.CLEAR_LIGHT_ENGINE;
};

export type CreateLightEngineAction =
  | SampleDashboardChanged
  | GrafanaIdChanged
  | CentralizedBucketNameChanged
  | LogArchiveScheduleChanged
  | LogMergerScheduleChanged
  | LogProcessorScheduleChanged
  | CentralizedTableNameChanged
  | LogArchiveAgeChanged
  | LogMergerAgeChanged
  | ValidateLightEngine
  | LogProcessorScheduleTimeChanged
  | LogProcessorScheduleScaleChanged
  | ClearLightEngine;

const validateGteOne = createFieldValidator(
  ([param]: [number?, number?]) => param !== undefined && param >= 1
);

const CRON_REGEX_STR =
  "^cron\\(((\\d{1,2}|\\*),?\\/?)+\\s((\\d{1,2}|\\*),?)+\\s((\\d{1,2}|\\*|\\?),?)+\\s((\\d{1,2}|\\*|\\?|(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)),?)+\\s((\\d{1,2}[FL]?|\\*|\\?|(SAT|SUN|MON|TUE|WED|THU|FRI)#?\\d?),?-?)+\\s((\\d{1,4}|\\*),?-?)+\\)$";

const TABLE_NAME_REGEX = "^[0-9A-Za-z_-]+$";

const validateCronExpression = validateWithRegex(
  new RegExp(`${CRON_REGEX_STR}`)
)(() => i18n.t("lightengine:engine.create.errorCronExpression"));

const validateGrafanaId = withI18nErrorMessage(
  validateRequiredText("lightengine:engine.create.errorGrafanaIdMissing")
);
const validateCentralizedBucketName = withI18nErrorMessage(
  validateRequiredText("lightengine:engine.create.errorCentralBucketMissing")
);

const validateLogArchiveSchedule = pipFieldValidator(
  validateRequiredText(() =>
    i18n.t("lightengine:engine.create.errorLogArchiveScheduleMissing")
  ),
  validateCronExpression
);
const validateLogMergerSchedule = pipFieldValidator(
  validateRequiredText(() =>
    i18n.t("lightengine:engine.create.errorLogMergerScheduleMissing")
  ),
  validateCronExpression
);
const validateCentralizedTableName = pipFieldValidator(
  validateRequiredText(() => 
      i18n.t("lightengine:engine.create.errorCentralizedTableNameMissing")
  ),
  validateWithRegex(
      new RegExp(TABLE_NAME_REGEX)
    )(() => i18n.t("lightengine:engine.create.errorTableNameValidation"))
);
const validateLogArchiveAge = withI18nErrorMessage(
  pipFieldValidator(
    validateGteOne("lightengine:engine.create.errorLogArchiveAgeGteOne")
  )
);
const validateLogMergerAge = withI18nErrorMessage(
  pipFieldValidator(
    validateGteOne("lightengine:engine.create.errorLogMergerAgeGteOne")
  )
);

const validateLogProcessorScheduleExp = createFieldValidator(
  ({
    logProcessorScheduleScale,
    logProcessorScheduleTime,
  }: CreateLightEngineSate) => {
    if (!logProcessorScheduleTime) {
      return false;
    }
    if (
      logProcessorScheduleScale === ScheduleScale.MIN &&
      logProcessorScheduleTime < 1
    ) {
      return false;
    }
    return true;
  }
)(() => i18n.t("lightengine:engine.create.errorLogProcessorScheduleExp"));

export const validateLightEngine = (
  state: CreateLightEngineSate,
  grafana: GrafanaState
) =>
  (state.sampleDashboard === YesNo.Yes
    ? validateGrafanaId(state.grafanaId || "") === "" &&
      grafana.status === DomainStatusCheckType.PASSED
    : true) &&
  validateCentralizedBucketName(state.centralizedBucketName || "") === "" &&
  validateLogArchiveSchedule(state.logArchiveSchedule) === "" &&
  validateLogMergerSchedule(state.logMergerSchedule) === "" &&
  validateCentralizedTableName(state.centralizedTableName) === "" &&
  validateLogArchiveAge([state.logArchiveAge, state.logMergerAge]) === "" &&
  validateLogMergerAge([state.logMergerAge, state.logArchiveAge]) === "" &&
  validateLogProcessorScheduleExp(state) === "";

export const createLightEngineReducer = (
  state = initState,
  action: CreateLightEngineAction
): CreateLightEngineSate => {
  switch (action.type) {
    case CreateLightEngineActionTypes.SAMPLE_DASHBOARD_CHANGED:
      return {
        ...state,
        sampleDashboard: action.value,
      };
    case CreateLightEngineActionTypes.GRAFANA_ID_CHANGED:
      return {
        ...state,
        grafanaId: action.value,
        grafanaIdError: state.sampleDashboard
          ? validateGrafanaId(action.value)
          : "",
      };
    case CreateLightEngineActionTypes.CENTRALIZED_BUCKET_NAME_CHANGED:
      return {
        ...state,
        centralizedBucketName: action.value,
        centralizedBucketNameError: validateCentralizedBucketName(action.value),
      };
    case CreateLightEngineActionTypes.CENTRALIZED_TABLE_NAME_CHANGED:
      return {
        ...state,
        centralizedTableName: action.value,
        centralizedTableNameError: validateCentralizedTableName(action.value),
      };
    case CreateLightEngineActionTypes.LOG_ARCHIVE_SCHEDULE_CHANGED:
      return {
        ...state,
        logArchiveSchedule: action.value,
        logArchiveScheduleError: validateLogArchiveSchedule(action.value),
      };
    case CreateLightEngineActionTypes.LOG_MERGER_SCHEDULE_CHANGED:
      return {
        ...state,
        logMergerSchedule: action.value,
        logMergerScheduleError: validateLogMergerSchedule(action.value),
      };
    case CreateLightEngineActionTypes.LOG_PROCESSOR_SCHEDULE_SCALE_CHANGED:
      return {
        ...state,
        logProcessorScheduleScale: action.value,
        logProcessorScheduleExpError: validateLogProcessorScheduleExp({
          ...state,
          logProcessorScheduleScale: action.value,
        }),
      };
    case CreateLightEngineActionTypes.LOG_PROCESSOR_SCHEDULE_TIME_CHANGED:
      return {
        ...state,
        logProcessorScheduleTime: action.value,
        logProcessorScheduleExpError: validateLogProcessorScheduleExp({
          ...state,
          logProcessorScheduleTime: action.value,
        }),
      };
    case CreateLightEngineActionTypes.LOG_ARCHIVE_AGE_CHANGED:
      return {
        ...state,
        logArchiveAge: action.value,
        logArchiveAgeError: validateLogArchiveAge([
          action.value,
          state.logMergerAge,
        ]),
      };
    case CreateLightEngineActionTypes.LOG_MERGER_AGE_CHANGED:
      return {
        ...state,
        logMergerAge: action.value,
        logMergerAgeError: validateLogMergerAge([
          action.value,
          state.logArchiveAge,
        ]),
      };
    case CreateLightEngineActionTypes.VALIDATE_LIGHT_ENGINE:
      return {
        ...state,
        grafanaIdError: state.sampleDashboard
          ? validateGrafanaId(state.grafanaId)
          : "",
        centralizedBucketNameError: validateCentralizedBucketName(
          state.centralizedBucketName || ""
        ),
        centralizedTableNameError: validateCentralizedTableName(
          state.centralizedTableName
        ),
        logArchiveScheduleError: validateLogArchiveSchedule(
          state.logArchiveSchedule
        ),
        logMergerScheduleError: validateLogMergerSchedule(
          state.logMergerSchedule
        ),
        logProcessorScheduleExpError: validateLogProcessorScheduleExp(state),
        logArchiveAgeError: validateLogArchiveAge([
          state.logArchiveAge,
          state.logMergerAge,
        ]),
        logMergerAgeError: validateLogMergerAge([
          state.logMergerAge,
          state.logArchiveAge,
        ]),
      };
    case CreateLightEngineActionTypes.CLEAR_LIGHT_ENGINE:
      return initState;
    default:
      return state;
  }
};
