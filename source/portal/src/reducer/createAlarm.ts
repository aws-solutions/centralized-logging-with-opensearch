// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MonitorInput, PipelineAlarmStatus, PipelineMonitorStatus } from "API";
import { emailIsValid } from "assets/js/utils";
import { SelectItem } from "components/Select/select";

export interface AlarmStateType {
  isConfirmed: boolean;
  snsObj: SelectItem | null;
  topicCheckOption: string;
  selectExistSNSError: string;
  snsTopicError: string;
  snsEmailError: string;
  monitor: MonitorInput;
}

export enum SNSCreateMethod {
  ChooseExistTopic = "chooseExistTopic",
  ChooseCreateTopic = "chooseCreateTopic",
}

export const initState: AlarmStateType = {
  isConfirmed: false,
  snsObj: null,
  topicCheckOption: SNSCreateMethod.ChooseExistTopic,
  selectExistSNSError: "",
  snsTopicError: "",
  snsEmailError: "",
  monitor: {
    status: PipelineMonitorStatus.ENABLED,
    pipelineAlarmStatus: PipelineAlarmStatus.ENABLED,
    snsTopicName: "",
    snsTopicArn: "",
    emails: "",
  },
};

export type CreateAlarmState = typeof initState;

export enum CreateAlarmActionTypes {
  CHANGE_CONFIRM_STATUS = "CHANGE_CONFIRM_STATUS",
  CHANGE_ALARM_OPTION = "CHANGE_ALARM_OPTION",
  CHANGE_SNS_OBJ = "CHANGE_SNS_OBJ",
  ON_ALARM_CHANGE = "ON_ALARM_CHANGE",
  CLEAR_ALARM = "CLEAR_ALARM",
  SET_EXIST_SNS_ERROR = "SET_EXIST_SNS_ERROR",
  SET_SNS_TOPIC_NAME_ERROR = "SET_SNS_TOPIC_NAME_ERROR",
  SET_SNS_EMAIL_ERROR = "SET_SNS_EMAIL_ERROR",
  VALIDATE_ALARM_INPUT = "VALIDATE_ALARM_INPUT",
}

export type SetFieldError = {
  type:
    | CreateAlarmActionTypes.SET_EXIST_SNS_ERROR
    | CreateAlarmActionTypes.SET_SNS_TOPIC_NAME_ERROR
    | CreateAlarmActionTypes.SET_SNS_EMAIL_ERROR;
  error: string;
};

export type ChangeConfirm = {
  type: CreateAlarmActionTypes.CHANGE_CONFIRM_STATUS;
  status: boolean;
};

export type ChangeAlarmOption = {
  type: CreateAlarmActionTypes.CHANGE_ALARM_OPTION;
  option: string;
};

export type ChangeSNSObj = {
  type: CreateAlarmActionTypes.CHANGE_SNS_OBJ;
  obj: SelectItem | null;
};

export type ClearAlarm = {
  type: CreateAlarmActionTypes.CLEAR_ALARM;
};

export type OnAlarmChange = {
  type: CreateAlarmActionTypes.ON_ALARM_CHANGE;
  alarm: MonitorInput;
};

export type ValidateAlarmInput = {
  type: CreateAlarmActionTypes.VALIDATE_ALARM_INPUT;
};

export type CreateAlarmActions =
  | ChangeConfirm
  | ChangeAlarmOption
  | ChangeSNSObj
  | ClearAlarm
  | OnAlarmChange
  | SetFieldError
  | ValidateAlarmInput;

export const validateExistSNS = (state: CreateAlarmState) => {
  if (
    state.isConfirmed &&
    state.topicCheckOption === SNSCreateMethod.ChooseExistTopic
  ) {
    if (!state.snsObj || !state.monitor.snsTopicArn) {
      return "alarm.error.chooseExist";
    }
  }
  return "";
};

export const validateSNSTopicName = (state: CreateAlarmState) => {
  if (
    state.isConfirmed &&
    state.topicCheckOption === SNSCreateMethod.ChooseCreateTopic
  ) {
    if (!state.monitor.snsTopicName) {
      return "alarm.error.inputTopicName";
    }
  }
  return "";
};

export const validSNSEmail = (state: CreateAlarmState) => {
  if (
    state.isConfirmed &&
    state.topicCheckOption === SNSCreateMethod.ChooseCreateTopic
  ) {
    if (state.monitor?.emails?.trim() && !emailIsValid(state.monitor.emails)) {
      return "alarm.error.emailInvalid";
    }
  }
  return "";
};

export const validateAlarmInput = (state: CreateAlarmState) =>
  validateExistSNS(state) === "" &&
  validateSNSTopicName(state) === "" &&
  validSNSEmail(state) === "";

export const createAlarmReducer = (
  state = initState,
  action: CreateAlarmActions
): CreateAlarmState => {
  switch (action.type) {
    case CreateAlarmActionTypes.CHANGE_CONFIRM_STATUS:
      return {
        ...state,
        isConfirmed: action.status,
        monitor: {
          ...state.monitor,
          pipelineAlarmStatus: action.status
            ? PipelineAlarmStatus.ENABLED
            : PipelineAlarmStatus.DISABLED,
        },
      };
    case CreateAlarmActionTypes.CHANGE_ALARM_OPTION:
      return {
        ...state,
        topicCheckOption: action.option,
        snsObj: null,
        selectExistSNSError: "",
        snsTopicError: "",
        snsEmailError: "",
        monitor: {
          ...state.monitor,
          snsTopicName: "",
          snsTopicArn: "",
          emails: "",
        },
      };
    case CreateAlarmActionTypes.CHANGE_SNS_OBJ:
      return {
        ...state,
        snsObj: action.obj,
        selectExistSNSError: "",
        monitor: {
          ...state.monitor,
          snsTopicName: action.obj?.name ?? "",
          snsTopicArn: action.obj?.value ?? "",
        },
      };
    case CreateAlarmActionTypes.SET_EXIST_SNS_ERROR:
      return {
        ...state,
        selectExistSNSError: action.error,
      };
    case CreateAlarmActionTypes.SET_SNS_TOPIC_NAME_ERROR:
      return {
        ...state,
        snsTopicError: action.error,
      };
    case CreateAlarmActionTypes.SET_SNS_EMAIL_ERROR:
      return {
        ...state,
        snsEmailError: action.error,
      };
    case CreateAlarmActionTypes.ON_ALARM_CHANGE:
      return {
        ...state,
        monitor: { ...action.alarm },
      };
    case CreateAlarmActionTypes.CLEAR_ALARM:
      return {
        ...initState,
        monitor: {
          ...initState.monitor,
          pipelineAlarmStatus: PipelineAlarmStatus.DISABLED,
        },
      };
    case CreateAlarmActionTypes.VALIDATE_ALARM_INPUT:
      return {
        ...state,
        selectExistSNSError: validateExistSNS(state),
        snsTopicError: validateSNSTopicName(state),
        snsEmailError: validSNSEmail(state),
      };
    default:
      return state;
  }
};
