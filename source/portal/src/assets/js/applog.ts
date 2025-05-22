// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BufferParameter, BufferType, LogType } from "API";
import { ExLogConf } from "pages/resources/common/LogConfigComp";

// Get Value From Parameters List
export const getListBufferLayer = (
  bufferType: BufferType | null | undefined,
  bufferResourceName: string
) => {
  if (bufferType === BufferType.None) {
    return "None";
  }
  if (bufferResourceName) {
    return `(${bufferType}) ${bufferResourceName}`;
  }
  return "-";
};

export const getParamValueByKey = (
  key: string,
  params: (BufferParameter | null)[] | null | undefined
): string => {
  if (params) {
    return (
      params.find((element) => element?.paramKey === key)?.paramValue || ""
    );
  }
  return "";
};

export const CovertObjToParameterKeyValue = (obj: any) => {
  return Object.keys(obj)
    .filter((key) => obj[key] !== undefined)
    .map((key) => {
      return {
        paramKey: key,
        paramValue: obj[key],
      };
    });
};

export function ParamListToObj(
  list: { paramKey: string; paramValue: unknown }[]
) {
  const obj: { [key: string]: unknown } = {};
  list.forEach((item) => {
    obj[item.paramKey] = item.paramValue;
  });
  return obj;
}

export const getSourceInfoValueByKey = (key: string, params: any): string => {
  if (params) {
    return params.find((element: any) => element?.key === key)?.value || "";
  }
  return "";
};

export interface ConfigValidateType {
  logConfigNameError: boolean;
  logConfigTypeError: boolean;
  showSampleLogRequiredError: boolean;
  showRegexLogParseError: boolean;
  showUserLogFormatError: boolean;
  showSampleLogInvalidError: boolean;
}

export const removeNewLineBreack = (curLogConfig: ExLogConf): ExLogConf => {
  if (
    curLogConfig?.logType === LogType.MultiLineText ||
    curLogConfig?.logType === LogType.SingleLineText
  ) {
    curLogConfig.regex = curLogConfig.regex?.trim().replace(/[\n\t\r]/g, "");
    curLogConfig.userLogFormat = curLogConfig.userLogFormat
      ?.trim()
      .replace(/[\n\t\r]/g, "");
  }
  return curLogConfig;
};
