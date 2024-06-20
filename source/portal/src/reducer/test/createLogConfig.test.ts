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

import { LogType, MultiLineLogParser, SyslogParser } from "API";
import {
  LogConfigState,
  configLogTypeChanged,
  configNameChanged,
  convertJSONToKeyValueList,
  filterRegexChanged,
  findTimeKeyObject,
  getCurrentParser,
  hasUserFormatType,
  isCustomRegexType,
  isCustomType,
  isMultilineCustom,
  isNginxOrApache,
  isSingleLineText,
  isSpringBootType,
  jsonSchemaChanged,
  logConfigSlice,
  multiLineParserChanged,
  parseLog,
  regexChanged,
  regexKeyListChanged,
  resetLogConfig,
  setEditLogConfig,
  subStringValue,
  sysLogParserChanged,
  timeKeyChanged,
  timeKeyFormatChanged,
  timeOffsetChanged,
  userLogFormatChanged,
  userSampleLogChanged,
  validatingTimeKeyFormat,
} from "reducer/createLogConfig";

beforeEach(() => {
  jest.spyOn(console, "info").mockImplementation(jest.fn());
});

describe("createLogConfig Reducer", () => {
  let initState: LogConfigState;
  beforeEach(() => {
    initState = {
      data: {
        __typename: "LogConfig",
        version: 0,
        id: "",
        name: "",
        logType: null,
        multilineLogParser: null,
        createdAt: null,
        userSampleLog: "",
        userLogFormat: "",
        regex: "",
        regexFieldSpecs: [],
        filterConfigMap: {
          enabled: false,
          filters: [],
        },
        timeKey: "",
        timeOffset: "",
        jsonSchema: "",
      },
      showLogFormat: false,
      showRegex: false,
      regexDisabled: false,
      timeRegex: "",
      logResMap: {},
      regexKeyList: [],
      selectTimeKeyList: [],
      // validation
      isDuplicated: false,
      nameError: "",
      logTypeError: "",
      syslogParserError: "",
      multiLineParserError: "",
      iisParserError: "",
      logFormatError: "",
      regexError: "",
      userSampleLogError: "",
      userSampleLogSuccess: "",
      timeKeyFormatLoading: false,
      timeKeyFormatError: "",
      timeKeyFormatSuccess: "",
    };
  });

  it("should reset log config state", () => {
    const action = resetLogConfig();
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState).toEqual(initState);
  });

  it("should set edit log config", () => {
    const action = setEditLogConfig({
      __typename: "LogConfig",
      version: 0,
      id: "",
      name: "test",
      logType: null,
      multilineLogParser: null,
      createdAt: null,
      userSampleLog: "",
      userLogFormat: "",
      regex: "",
      regexFieldSpecs: [],
      filterConfigMap: {
        enabled: false,
        filters: [],
      },
      timeKey: "",
      timeOffset: "",
      jsonSchema: "",
    });
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.name).toEqual("test");
  });

  it("should set log config name", () => {
    const action = configNameChanged("test1");
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.name).toEqual("test1");
  });

  it("should config log type changed", () => {
    const action = configLogTypeChanged(LogType.Apache);
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.logType).toEqual(LogType.Apache);
  });

  it("should syslog parser changed", () => {
    const action = sysLogParserChanged(SyslogParser.RFC3164);
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.syslogParser).toEqual(SyslogParser.RFC3164);
  });

  it("should multiline log parser changed", () => {
    const action = multiLineParserChanged(MultiLineLogParser.JAVA_SPRING_BOOT);
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.multilineLogParser).toEqual(
      MultiLineLogParser.JAVA_SPRING_BOOT
    );
  });

  it("should log format changed", () => {
    const action = userLogFormatChanged("test");
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.userLogFormat).toEqual("test");
  });

  it("should regex changed", () => {
    const action = regexChanged("test");
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.regex).toEqual("test");
  });

  it("should sample log changed", () => {
    const action = userSampleLogChanged("test");
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.userSampleLog).toEqual("test");
  });

  it("should json schema changed", () => {
    const action = jsonSchemaChanged({ properties: { test: "test" } });
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.jsonSchema).toEqual({ properties: { test: "test" } });
  });

  it("should time offset changed", () => {
    const action = timeOffsetChanged("+8:00");
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.timeOffset).toEqual("+8:00");
  });

  it("should convert json to key value list", () => {
    initState.data.logType = LogType.JSON;
    initState.data.userSampleLog = '{"test": "test"}';
    const action = convertJSONToKeyValueList();
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.jsonSchema).toEqual({
      $schema: "http://json-schema.org/draft-07/schema",
      properties: {
        test: {
          type: "string",
        },
      },
      type: "object",
    });
  });

  it("should parse log", () => {
    initState.data.logType = LogType.Apache;
    initState.data.regex = `(?<remote_addr>[0-9.-]+)\\s+(?<remote_ident>[\\w.-]+)\\s+(?<remote_user>[\\w.-]+)\\s+\\[(?<time_local>[^\\[\\]]+|-)\\]\\s+\\"(?<request_method>(?:[^"]|\\")+)\\s(?<request_uri>(?:[^"]|\\")+)\\s(?<request_protocol>(?:[^"]|\\")+)\\"\\s+(?<status>\\d{3}|-)\\s+(?<response_size_bytes>\\d+|-)\\s+\\"(?<http_referer>[^"]*)\\"\\s+\\"(?<http_user_agent>[^"]*)\\".*`;
    initState.data.userSampleLog = `127.0.0.1 - - [22/Dec/2021:06:48:57 +0000] "GET /xxx HTTP/1.1" 404 196 "-" "curl/7.79.1"`;
    const action = parseLog();
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.logResMap).toEqual({
      http_referer: "-",
      http_user_agent: "curl/7.79.1",
      remote_addr: "127.0.0.1",
      remote_ident: "-",
      remote_user: "-",
      request_method: "GET",
      request_protocol: "HTTP/1.1",
      request_uri: "/xxx",
      response_size_bytes: "196",
      status: "404",
      time_local: "22/Dec/2021:06:48:57 +0000",
    });
    expect(newState.userSampleLogSuccess).toEqual(
      `resource:config.parsing.valid`
    );
  });

  it("should regex key list changed", () => {
    const action = regexKeyListChanged([
      {
        key: "test1",
        value: "test2",
        type: "string",
        format: "test3",
        loadingCheck: false,
        showError: false,
        error: "",
        showSuccess: false,
      },
    ]);
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.regexFieldSpecs).toEqual([
      {
        key: "test1",
        type: "string",
        format: "test3",
      },
    ]);
  });

  it("should time key changed", () => {
    const action = timeKeyChanged("test");
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.timeKey).toEqual("test");
  });

  it("should validating time key format", () => {
    const action = validatingTimeKeyFormat({
      loading: true,
      valid: 1,
    });
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.timeKeyFormatLoading).toEqual(true);
  });

  it("should time key format changed", () => {
    const action = timeKeyFormatChanged();
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.timeKeyFormatSuccess).toEqual("");
    expect(newState.timeKeyFormatError).toEqual("");
  });

  it("should filter regex changed", () => {
    const action = filterRegexChanged({
      enabled: true,
      filters: [],
    });
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.filterConfigMap?.enabled).toBeTruthy();
  });

  it("should is custom type", () => {
    initState.data.logType = LogType.JSON;
    expect(isCustomType(initState)).toBeTruthy();
  });

  it("should is springBoot type", () => {
    initState.data.logType = LogType.MultiLineText;
    initState.data.multilineLogParser = MultiLineLogParser.JAVA_SPRING_BOOT;
    expect(isSpringBootType(initState)).toBeTruthy();
  });

  it("should is multi-line custom type", () => {
    initState.data.logType = LogType.MultiLineText;
    initState.data.multilineLogParser = MultiLineLogParser.CUSTOM;
    expect(isMultilineCustom(initState)).toBeTruthy();
  });

  it("should is single line type", () => {
    const logType = LogType.SingleLineText;
    expect(isSingleLineText(logType)).toBeTruthy();
  });

  it("should is Nginx or Apache", () => {
    const logType = LogType.Apache;
    expect(isNginxOrApache(logType)).toBeTruthy();
  });

  it("should is Nginx or Apache", () => {
    const logType = LogType.Nginx;
    expect(isNginxOrApache(logType)).toBeTruthy();
  });

  it("should is custom regex type", () => {
    const logType = LogType.Syslog;
    expect(isCustomRegexType(logType)).toBeTruthy();
  });

  it("should has user format type", () => {
    initState.data.logType = LogType.Apache;
    expect(hasUserFormatType(initState)).toBeTruthy();
  });

  it("should find time key object", () => {
    initState.data.timeKey = "time";
    initState.regexKeyList = [
      {
        key: "time",
        value: "test",
        type: "string",
        format: "test-format",
        loadingCheck: false,
        showError: false,
        error: "",
        showSuccess: false,
      },
    ];
    expect(findTimeKeyObject(initState)?.format).toEqual("test-format");
  });

  it("should substring value", () => {
    const value = "test";
    expect(subStringValue(value)).toBe("test");
  });

  it("should get current parser", () => {
    const logType = LogType.Syslog;
    const parser = SyslogParser.RFC3164;
    expect(getCurrentParser(logType, parser)).toBe(SyslogParser.RFC3164);
  });
});
