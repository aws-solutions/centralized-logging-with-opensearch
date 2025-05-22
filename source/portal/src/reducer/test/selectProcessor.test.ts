// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  selectProcessorReducer,
  SelectProcessorState,
  SelectProcessorActionTypes,
  OnTypeChange,
  OnMinOCUChange,
  OnMaxOCUChange,
  ValidateAlarmInput,
  ResetSelect,
  OnServiceAvailableChecked,
  OnServiceAvailableCheckedLoading,
  validateMinOCU,
  LogProcessorType,
  validateMaxOCU,
  validateOCUInput,
  getRestUnreservedAccountConcurrency,
  OnUnreservedAccountConcurrencyChange,
  OnLambdaConcurrencyChange,
} from "../selectProcessor";

jest.mock("i18n", () => ({
  t: (key: string) => key,
}));

describe("selectProcessorReducer", () => {
  let initialState: SelectProcessorState;

  beforeEach(() => {
    initialState = {
      serviceAvailable: false,
      serviceAvailableChecked: false,
      serviceAvailableCheckedLoading: false,
      logProcessorType: "LAMBDA",
      logProcessorConcurrency: "0",
      minOCU: "1",
      maxOCU: "4",
      logProcessorConcurrencyError: "",
      minOCUError: "",
      maxOCUError: "",
      unreservedAccountConcurrency: "300",
    };
  });

  it("should handle CHANGE_PROCESSOR_TYPE action", () => {
    const action: OnTypeChange = {
      type: SelectProcessorActionTypes.CHANGE_PROCESSOR_TYPE,
      processorType: "OSI",
    };
    const newState = selectProcessorReducer(initialState, action);
    expect(newState.logProcessorType).toEqual("OSI");
  });

  it("should handle CHANGE_MIN_OCU action", () => {
    const action: OnMinOCUChange = {
      type: SelectProcessorActionTypes.CHANGE_MIN_OCU,
      minOCU: "2",
    };
    const newState = selectProcessorReducer(initialState, action);
    expect(newState.minOCU).toEqual("2");
  });

  it("should handle CHANGE_MAX_OCU action", () => {
    const action: OnMaxOCUChange = {
      type: SelectProcessorActionTypes.CHANGE_MAX_OCU,
      maxOCU: "6",
    };
    const newState = selectProcessorReducer(initialState, action);
    expect(newState.maxOCU).toEqual("6");
  });

  it("should handle CHANGE_LAMBDA_CONCURRENCY action", () => {
    const action: OnLambdaConcurrencyChange = {
      type: SelectProcessorActionTypes.CHANGE_LAMBDA_CONCURRENCY,
      concurrency: "100",
    };
    const newState = selectProcessorReducer(initialState, action);
    expect(newState.logProcessorConcurrency).toEqual("100");
  });

  it("should handle CHANGE_LAMBDA_CONCURRENCY action with error", () => {
    const action: OnLambdaConcurrencyChange = {
      type: SelectProcessorActionTypes.CHANGE_LAMBDA_CONCURRENCY,
      concurrency: "100",
    };
    const newState = selectProcessorReducer(
      { ...initialState, unreservedAccountConcurrency: "100" },
      action
    );
    expect(newState.logProcessorConcurrency).toEqual("100");
    expect(newState.logProcessorConcurrencyError).toEqual(
      "processor.concurrencyMinError"
    );
  });

  it("should handle CHANGE_UNRESERVED_CONCURRENCY action", () => {
    const action: OnUnreservedAccountConcurrencyChange = {
      type: SelectProcessorActionTypes.CHANGE_UNRESERVED_CONCURRENCY,
      concurrency: "100",
    };
    const newState = selectProcessorReducer(initialState, action);
    expect(newState.unreservedAccountConcurrency).toEqual("100");
  });

  it("should handle VALIDATE_OCU_INPUT action", () => {
    const action: ValidateAlarmInput = {
      type: SelectProcessorActionTypes.VALIDATE_OCU_INPUT,
    };
    const newState = selectProcessorReducer(initialState, action);
    expect(newState.minOCUError).toEqual("");
  });

  it("should handle RESET_SELECT action", () => {
    const action: ResetSelect = {
      type: SelectProcessorActionTypes.RESET_SELECT,
    };
    const newState = selectProcessorReducer(initialState, action);
    expect(newState.minOCU).toEqual("1");
  });

  it("should handle SET_SERVICE_AVAILABLE_CHECK action", () => {
    const action: OnServiceAvailableChecked = {
      type: SelectProcessorActionTypes.SET_SERVICE_AVAILABLE_CHECK,
      available: true,
    };
    const newState = selectProcessorReducer(initialState, action);
    expect(newState.serviceAvailable).toEqual(true);
  });

  it("should handle SET_SERVICE_AVAILABLE_CHECK_LOADING action", () => {
    const action: OnServiceAvailableCheckedLoading = {
      type: SelectProcessorActionTypes.SET_SERVICE_AVAILABLE_CHECK_LOADING,
      loading: true,
    };
    const newState = selectProcessorReducer(initialState, action);
    expect(newState.serviceAvailableCheckedLoading).toEqual(true);
  });

  it("should return min error when minOCU is empty", () => {
    expect(validateMinOCU(initialState)).toEqual("");
    const invalidMinOCUState = {
      ...initialState,
      logProcessorType: LogProcessorType.OSI,
      minOCU: "-1",
    };
    expect(validateMinOCU(invalidMinOCUState)).toEqual("processor.minError");
  });

  it("should return max error when maxOCU is empty", () => {
    expect(validateMaxOCU(initialState)).toEqual("");
    const invalidMaxOCUState = {
      ...initialState,
      logProcessorType: LogProcessorType.OSI,
      maxOCU: "0",
    };
    expect(validateMaxOCU(invalidMaxOCUState)).toEqual("processor.maxError");
    const invalidMaxOCUStateLargerThan96 = {
      ...initialState,
      logProcessorType: LogProcessorType.OSI,
      maxOCU: "97",
    };
    expect(validateMaxOCU(invalidMaxOCUStateLargerThan96)).toEqual(
      "processor.maxError"
    );
  });

  it("should return true when minOCU and maxOCU are valid", () => {
    const valid = validateOCUInput(initialState);
    expect(valid).toBeTruthy();
  });

  it("should return error when concurrency is empty", () => {
    const invalidState = {
      ...initialState,
      logProcessorConcurrency: "",
    };
    const valid = validateOCUInput(invalidState);
    expect(valid).toBeFalsy();
  });

  it("should return unreserved account concurrency min error when reserved concurrency less than 100 ", () => {
    const invalidMinErrorConcurrency = {
      ...initialState,
      logProcessorType: LogProcessorType.LAMBDA,
      unreservedAccountConcurrency: "100",
      logProcessorConcurrency: "99",
    };
    const valid = validateOCUInput(invalidMinErrorConcurrency);
    expect(valid).toBeFalsy();
  });

  it("should return rest unreserved concurrency", () => {
    const data = getRestUnreservedAccountConcurrency("100", "300");
    expect(data === "200");
  });

  it("should return rest unreserved concurrency while not set concurrency", () => {
    const data = getRestUnreservedAccountConcurrency("", "300");
    expect(data === "300");
  });
});
