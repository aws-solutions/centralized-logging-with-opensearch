// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PipelineAlarmStatus } from "API";
import {
  createAlarmReducer,
  CreateAlarmActionTypes,
  initState,
  SNSCreateMethod,
  validateExistSNS,
  validateAlarmInput,
  validateSNSTopicName,
  validSNSEmail,
} from "../createAlarm";

describe("createAlarmReducer", () => {
  it("should handle CHANGE_CONFIRM_STATUS", () => {
    const action: any = {
      type: CreateAlarmActionTypes.CHANGE_CONFIRM_STATUS,
      status: true,
    };
    const expectedState = {
      ...initState,
      isConfirmed: true,
      monitor: {
        ...initState.monitor,
        pipelineAlarmStatus: PipelineAlarmStatus.ENABLED,
      },
    };
    expect(createAlarmReducer(initState, action)).toEqual(expectedState);

    const actionDisable: any = {
      type: CreateAlarmActionTypes.CHANGE_CONFIRM_STATUS,
      status: false,
    };
    const expectedStateDisable = {
      ...initState,
      isConfirmed: false,
      monitor: {
        ...initState.monitor,
        pipelineAlarmStatus: PipelineAlarmStatus.DISABLED,
      },
    };
    expect(createAlarmReducer(initState, actionDisable)).toEqual(
      expectedStateDisable
    );
  });

  it("should handle CHANGE_ALARM_OPTION", () => {
    const action: any = {
      type: CreateAlarmActionTypes.CHANGE_ALARM_OPTION,
      option: SNSCreateMethod.ChooseCreateTopic,
    };
    const expectedState = {
      ...initState,
      topicCheckOption: SNSCreateMethod.ChooseCreateTopic,
      snsObj: null,
    };
    expect(createAlarmReducer(initState, action)).toEqual(expectedState);
  });

  it("should handle CHANGE_SNS_OBJ", () => {
    const action: any = {
      type: CreateAlarmActionTypes.CHANGE_SNS_OBJ,
      obj: {
        topicArn: "test",
        topicName: "test",
      },
    };
    const expectedState = {
      ...initState,
      snsObj: {
        topicArn: "test",
        topicName: "test",
      },
    };
    expect(createAlarmReducer(initState, action)).toEqual(expectedState);
  });

  it("should handle SET_EXIST_SNS_ERROR", () => {
    const action: any = {
      type: CreateAlarmActionTypes.SET_EXIST_SNS_ERROR,
      error: "error",
    };
    const expectedState = {
      ...initState,
      selectExistSNSError: "error",
    };
    expect(createAlarmReducer(initState, action)).toEqual(expectedState);
  });

  it("should handle SET_SNS_TOPIC_ERROR", () => {
    const action: any = {
      type: CreateAlarmActionTypes.SET_SNS_TOPIC_NAME_ERROR,
      error: "error",
    };
    const expectedState = {
      ...initState,
      snsTopicError: "error",
    };
    expect(createAlarmReducer(initState, action)).toEqual(expectedState);
  });

  it("should handle SET_SNS_EMAIL_ERROR", () => {
    const action: any = {
      type: CreateAlarmActionTypes.SET_SNS_EMAIL_ERROR,
      error: "error",
    };
    const expectedState = {
      ...initState,
      snsEmailError: "error",
    };
    expect(createAlarmReducer(initState, action)).toEqual(expectedState);
  });

  it("should handle CLEAR_ALARM", () => {
    const action: any = {
      type: CreateAlarmActionTypes.CLEAR_ALARM,
    };
    const expectedState = initState;
    expect(createAlarmReducer(initState, action)).toEqual({
      ...expectedState,
      monitor: {
        ...expectedState.monitor,
        pipelineAlarmStatus: PipelineAlarmStatus.DISABLED,
      },
    });
  });

  it("should handle VALIDATE_ALARM_INPUT", () => {
    const action: any = {
      type: CreateAlarmActionTypes.VALIDATE_ALARM_INPUT,
    };
    const expectedState = {
      ...initState,
      selectExistSNSError: validateExistSNS(initState),
      snsTopicError: validateSNSTopicName(initState),
      snsEmailError: validSNSEmail(initState),
    };
    expect(createAlarmReducer(initState, action)).toEqual(expectedState);
  });

  it("should handle ON_ALARM_CHANGE", () => {
    const action: any = {
      type: CreateAlarmActionTypes.ON_ALARM_CHANGE,
      alarm: {
        pipelineAlarmStatus: PipelineAlarmStatus.ENABLED,
      },
    };
    const expectedState = {
      ...initState,
      monitor: {
        pipelineAlarmStatus: PipelineAlarmStatus.ENABLED,
      },
    };
    expect(createAlarmReducer(initState, action)).toEqual(expectedState);
  });
});

describe("validateExistSNS", () => {
  it("should return error message if snsObj is null and ChooseExistTopic is selected", () => {
    const state = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseExistTopic,
      snsObj: null,
    };
    expect(validateExistSNS(state)).toBe("alarm.error.chooseExist");

    const state2 = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseExistTopic,
      snsObj: { name: "some-name", value: "some-value" },
      monitor: {
        ...initState.monitor,
        snsTopicArn: "",
      },
    };
    expect(validateExistSNS(state2)).toBe("alarm.error.chooseExist");

    const state3 = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseExistTopic,
      snsObj: null,
      monitor: {
        ...initState.monitor,
        snsTopicArn: "",
      },
    };
    expect(validateExistSNS(state3)).toBe("alarm.error.chooseExist");

    const state4 = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseExistTopic,
      snsObj: { name: "some-name", value: "some-value" },
      monitor: {
        ...initState.monitor,
        snsTopicArn: "some-arn",
      },
    };
    expect(validateExistSNS(state4)).toBe("");
  });

  it("should return error if snsObj is null and snsTopicArn is not empty", () => {
    const state = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseExistTopic,
      snsObj: null,
      monitor: {
        ...initState.monitor,
        snsTopicArn: "some-arn",
      },
    };

    expect(validateExistSNS(state)).toBe("alarm.error.chooseExist");
  });
  it("should return error if snsObj is not null but snsTopicArn is empty", () => {
    const state = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseExistTopic,
      snsObj: { name: "some-name", value: "some-value" },
      monitor: {
        ...initState.monitor,
        snsTopicArn: "",
      },
    };

    expect(validateExistSNS(state)).toBe("alarm.error.chooseExist");
  });
  it("should return error if both snsObj and snsTopicArn are null or empty", () => {
    const state = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseExistTopic,
      snsObj: null,
      monitor: {
        ...initState.monitor,
        snsTopicArn: "",
      },
    };

    expect(validateExistSNS(state)).toBe("alarm.error.chooseExist");
  });
  it("should return error if both snsObj and snsTopicArn are null or empty", () => {
    const state = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseExistTopic,
      snsObj: null,
      monitor: {
        ...initState.monitor,
        snsTopicArn: "",
      },
    };

    expect(validateExistSNS(state)).toBe("alarm.error.chooseExist");
  });
});

describe("validateSNSEmail", () => {
  it("should return error if isConfirmed is true, topicCheckOption is ChooseCreateTopic, and snsTopicName is empty", () => {
    const state = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseCreateTopic,
      monitor: {
        ...initState.monitor,
        snsTopicName: "",
      },
    };

    expect(validateSNSTopicName(state)).toBe("alarm.error.inputTopicName");
  });

  it("should not return error if isConfirmed is true, topicCheckOption is ChooseCreateTopic, and snsTopicName is not empty", () => {
    const state = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseCreateTopic,
      monitor: {
        ...initState.monitor,
        snsTopicName: "Valid Topic Name",
      },
    };

    expect(validateSNSTopicName(state)).toBe("");
  });
  it("should not return error if isConfirmed is false or topicCheckOption is not ChooseCreateTopic", () => {
    let state = {
      ...initState,
      isConfirmed: false,
      topicCheckOption: SNSCreateMethod.ChooseCreateTopic,
      monitor: {
        ...initState.monitor,
        snsTopicName: "",
      },
    };
    expect(validateSNSTopicName(state)).toBe("");
    state = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseExistTopic,
      monitor: {
        ...initState.monitor,
        snsTopicName: "",
      },
    };
    expect(validateSNSTopicName(state)).toBe("");
  });
});

describe("validSNSEmail", () => {
  it("should return error if email is invalid, isConfirmed is true, and topicCheckOption is ChooseCreateTopic", () => {
    const state = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseCreateTopic,
      monitor: {
        ...initState.monitor,
        emails: "invalidEmail",
      },
    };
    expect(validSNSEmail(state)).toBe("alarm.error.emailInvalid");
  });

  it("should not return error if email is valid, isConfirmed is true, and topicCheckOption is ChooseCreateTopic", () => {
    const state = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseCreateTopic,
      monitor: {
        ...initState.monitor,
        emails: "test@example.com",
      },
    };
    expect(validSNSEmail(state)).toBe("");
  });

  it("should not return error if isConfirmed is false or topicCheckOption is not ChooseCreateTopic", () => {
    let state = {
      ...initState,
      isConfirmed: false,
      topicCheckOption: SNSCreateMethod.ChooseCreateTopic,
      monitor: {
        ...initState.monitor,
        emails: "invalidEmail",
      },
    };
    expect(validSNSEmail(state)).toBe("");

    state = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseExistTopic,
      monitor: {
        ...initState.monitor,
        emails: "invalidEmail",
      },
    };
    expect(validSNSEmail(state)).toBe("");
  });

  it("should not return error if email field is empty or only contains spaces", () => {
    const state = {
      ...initState,
      isConfirmed: true,
      topicCheckOption: SNSCreateMethod.ChooseCreateTopic,
      monitor: {
        ...initState.monitor,
        emails: "    ", // Only spaces
      },
    };

    expect(validSNSEmail(state)).toBe("");
  });
});

describe("validateAlarmInput", () => {
  it("should return true if all validations pass", () => {
    const state = {
      ...initState,
    };
    expect(validateAlarmInput(state)).toBeTruthy();
  });
});
