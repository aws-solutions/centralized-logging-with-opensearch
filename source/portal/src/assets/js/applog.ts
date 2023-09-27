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

export const checkConfigInput = (
  curLogConfig: ExLogConf | undefined
): ConfigValidateType => {
  let logConfigNameError = false;
  let logConfigTypeError = false;
  let showSampleLogRequiredError = false;
  let showRegexLogParseError = false;
  const showUserLogFormatError = false;
  const showSampleLogInvalidError = false;

  if (!curLogConfig?.name?.trim()) {
    logConfigNameError = true;
  }

  if (!curLogConfig?.logType) {
    logConfigTypeError = true;
  }

  if (
    curLogConfig?.logType === LogType.MultiLineText ||
    curLogConfig?.logType === LogType.SingleLineText
  ) {
    if (!curLogConfig.userSampleLog?.trim()) {
      showSampleLogRequiredError = true;
    }

    if (!curLogConfig?.regexKeyList || curLogConfig?.regexKeyList.length <= 0) {
      showRegexLogParseError = true;
    }
  }

  return {
    logConfigNameError,
    logConfigTypeError,
    showSampleLogRequiredError,
    showRegexLogParseError,
    showUserLogFormatError,
    showSampleLogInvalidError,
  };
};

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
