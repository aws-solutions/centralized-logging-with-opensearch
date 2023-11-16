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

export enum LogProcessorType {
  LAMBDA = "LAMBDA",
  OSI = "OSI",
}

export interface SelectProcessorType {
  serviceAvailable: boolean;
  serviceAvailableChecked: boolean;
  serviceAvailableCheckedLoading: boolean;
  logProcessorType: string;
  minOCU: string;
  maxOCU: string;
  minOCUError: string;
  maxOCUError: string;
}

export enum SNSCreateMethod {
  ChooseExistTopic = "chooseExistTopic",
  ChooseCreateTopic = "chooseCreateTopic",
}

const INIT_STATE = {
  serviceAvailable: false,
  serviceAvailableChecked: false,
  serviceAvailableCheckedLoading: false,
  logProcessorType: LogProcessorType.LAMBDA,
  minOCU: "1",
  maxOCU: "4",
  minOCUError: "",
  maxOCUError: "",
};

const initState: SelectProcessorType = INIT_STATE;

export type SelectProcessorState = typeof initState;

export enum SelectProcessorActionTypes {
  CHANGE_PROCESSOR_TYPE = "CHANGE_PROCESSOR_TYPE",
  CHANGE_MIN_OCU = "CHANGE_MIN_OCU",
  CHANGE_MAX_OCU = "CHANGE_MAX_OCU",
  SET_MIN_OCU_ERROR = "SET_MIN_OCU_ERROR",
  SET_MAX_OCU_ERROR = "SET_MAX_OCU_ERROR",
  VALIDATE_OCU_INPUT = "VALIDATE_OCU_INPUT",
  RESET_SELECT = "RESET_SELECT",
  SET_SERVICE_AVAILABLE_CHECK = "SET_SERVICE_AVAILABLE_CHECK",
  SET_SERVICE_AVAILABLE_CHECK_LOADING = "SET_SERVICE_AVAILABLE_CHECK_LOADING",
}

export type SetFieldError = {
  type:
    | SelectProcessorActionTypes.SET_MIN_OCU_ERROR
    | SelectProcessorActionTypes.SET_MAX_OCU_ERROR;
  error: string;
};

export type OnTypeChange = {
  type: SelectProcessorActionTypes.CHANGE_PROCESSOR_TYPE;
  processorType: string;
};

export type OnMinOCUChange = {
  type: SelectProcessorActionTypes.CHANGE_MIN_OCU;
  minOCU: string;
};

export type OnMaxOCUChange = {
  type: SelectProcessorActionTypes.CHANGE_MAX_OCU;
  maxOCU: string;
};

export type OnServiceAvailableChecked = {
  type: SelectProcessorActionTypes.SET_SERVICE_AVAILABLE_CHECK;
  available: boolean;
};

export type ValidateAlarmInput = {
  type: SelectProcessorActionTypes.VALIDATE_OCU_INPUT;
};

export type ResetSelect = {
  type: SelectProcessorActionTypes.RESET_SELECT;
};

export type OnServiceAvailableCheckedLoading = {
  type: SelectProcessorActionTypes.SET_SERVICE_AVAILABLE_CHECK_LOADING;
  loading: boolean;
};

export type SelectProcessorActions =
  | OnTypeChange
  | OnMinOCUChange
  | OnMaxOCUChange
  | SetFieldError
  | ValidateAlarmInput
  | ResetSelect
  | OnServiceAvailableChecked
  | OnServiceAvailableCheckedLoading;

const validateMinOCU = (state: SelectProcessorState) => {
  if (
    state.logProcessorType === LogProcessorType.OSI &&
    (!state.minOCU || parseInt(state.minOCU) <= 0)
  ) {
    return "processor.minError";
  }
  return "";
};

const validateMaxOCU = (state: SelectProcessorState) => {
  if (
    state.logProcessorType === LogProcessorType.OSI &&
    (!state.maxOCU ||
      parseInt(state.maxOCU) < parseInt(state.minOCU) ||
      parseInt(state.maxOCU) > 96)
  ) {
    return "processor.maxError";
  }
  return "";
};

export const validateOCUInput = (state: SelectProcessorState) =>
  validateMinOCU(state) === "" && validateMaxOCU(state) === "";

export const selectProcessorReducer = (
  state = initState,
  action: SelectProcessorActions
): SelectProcessorState => {
  switch (action.type) {
    case SelectProcessorActionTypes.CHANGE_PROCESSOR_TYPE:
      return {
        ...state,
        logProcessorType: action.processorType,
      };
    case SelectProcessorActionTypes.CHANGE_MIN_OCU:
      return {
        ...state,
        minOCU: action.minOCU,
        minOCUError: "",
      };
    case SelectProcessorActionTypes.CHANGE_MAX_OCU:
      return {
        ...state,
        maxOCU: action.maxOCU,
        maxOCUError: "",
      };
    case SelectProcessorActionTypes.VALIDATE_OCU_INPUT:
      return {
        ...state,
        minOCUError: validateMinOCU(state),
        maxOCUError: validateMaxOCU(state),
      };
    case SelectProcessorActionTypes.SET_SERVICE_AVAILABLE_CHECK:
      return {
        ...state,
        serviceAvailable: action.available,
        serviceAvailableChecked: true,
      };
    case SelectProcessorActionTypes.SET_SERVICE_AVAILABLE_CHECK_LOADING:
      return {
        ...state,
        serviceAvailableCheckedLoading: action.loading,
      };
    case SelectProcessorActionTypes.RESET_SELECT:
      return INIT_STATE;
    default:
      return state;
  }
};
