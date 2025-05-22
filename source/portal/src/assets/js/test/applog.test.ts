// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// logHelpers.test.ts
import {
  getListBufferLayer,
  getParamValueByKey,
  getSourceInfoValueByKey,
  removeNewLineBreack,
  ParamListToObj,
  CovertObjToParameterKeyValue,
} from "../applog";
import { BufferType, LogType } from "API"; // 假设API模块已存在

describe("applog.ts", () => {
  describe("getListBufferLayer", () => {
    it('should return "None" when bufferType is None', () => {
      expect(getListBufferLayer(BufferType.None, "someResource")).toEqual(
        "None"
      );
    });

    it("should return formatted string when resourceName is provided", () => {
      expect(getListBufferLayer(BufferType.MSK, "kafkaResource")).toEqual(
        "(MSK) kafkaResource"
      );
    });

    it('should return "-" when resourceName is not provided', () => {
      expect(getListBufferLayer(BufferType.MSK, "")).toEqual("-");
    });
  });

  describe("CovertObjToParameterKeyValue", () => {
    it("should convert an object to array of parameter key-values", () => {
      const obj = { key1: "value1", key2: "value2", key3: undefined };
      const result = CovertObjToParameterKeyValue(obj);
      expect(result).toEqual([
        { paramKey: "key1", paramValue: "value1" },
        { paramKey: "key2", paramValue: "value2" },
      ]);
    });

    it("should ignore keys with undefined values", () => {
      const obj = { key1: undefined, key2: "value2" };
      const result = CovertObjToParameterKeyValue(obj);
      expect(result).toEqual([{ paramKey: "key2", paramValue: "value2" }]);
    });
  });

  describe("ParamListToObj", () => {
    it("should convert array of parameter key-values to object", () => {
      const list = [
        { paramKey: "key1", paramValue: "value1" },
        { paramKey: "key2", paramValue: "value2" },
      ];
      const result = ParamListToObj(list);
      expect(result).toEqual({
        key1: "value1",
        key2: "value2",
      });
    });

    it("should handle empty lists", () => {
      const list: any = [];
      const result = ParamListToObj(list);
      expect(result).toEqual({});
    });
  });

  describe("getParamValueByKey", () => {
    const params: any = [
      { paramKey: "key1", paramValue: "value1" },
      { paramKey: "key2", paramValue: "value2" },
    ];

    it("should return the correct param value for a given key", () => {
      expect(getParamValueByKey("key1", params)).toEqual("value1");
    });

    it("should return an empty string if the key is not found", () => {
      expect(getParamValueByKey("key3", params)).toEqual("");
    });

    it("should return an empty string if params is empty", () => {
      expect(getParamValueByKey("key1", null)).toEqual("");
    });
  });

  describe("getSourceInfoValueByKey", () => {
    const sourceInfo = [
      { key: "sourceKey1", value: "sourceValue1" },
      { key: "sourceKey2", value: "sourceValue2" },
    ];

    it("should return the correct source info value for a given key", () => {
      expect(getSourceInfoValueByKey("sourceKey1", sourceInfo)).toEqual(
        "sourceValue1"
      );
    });

    it("should return an empty string if the key is not found", () => {
      expect(getSourceInfoValueByKey("sourceKey3", sourceInfo)).toEqual("");
    });

    it("should return an empty string if sourceInfo is empty", () => {
      expect(getSourceInfoValueByKey("sourceKey1", null)).toEqual("");
    });
  });

  describe("removeNewLineBreak", () => {
    it("should remove newline, tab, and return characters from regex and userLogFormat", () => {
      const logConfig: any = {
        logType: LogType.MultiLineText,
        regex: "regex\n\t\r",
        userLogFormat: "format\n\t\r",
      };
      const cleanedConfig = removeNewLineBreack(logConfig);
      expect(cleanedConfig.regex).toEqual("regex");
      expect(cleanedConfig.userLogFormat).toEqual("format");
    });

    it("should not modify regex or userLogFormat if logType is not MultiLineText or SingleLineText", () => {
      const logConfig: any = {
        logType: "Other",
        regex: "regex\n\t\r",
        userLogFormat: "format\n\t\r",
      };
      const cleanedConfig = removeNewLineBreack(logConfig);
      expect(cleanedConfig.regex).toEqual("regex\n\t\r");
      expect(cleanedConfig.userLogFormat).toEqual("format\n\t\r");
    });
  });
});
