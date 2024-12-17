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

import { IISlogParser, LogType, MultiLineLogParser, SyslogParser } from "API";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import {
  LogConfigState,
  buildRegexFromApacheLog,
  buildRegexFromNginxLog,
  buildSpringBootRegExFromConfig,
  buildSyslogRegexFromConfig,
  configLogTypeChanged,
  configNameChanged,
  convertJSONToKeyValueList,
  filterRegexChanged,
  findTimeKeyObject,
  getCurrentParser,
  getFormatDescription,
  getFormatInfoType,
  getFormatInputType,
  getFormatPlaceholder,
  getFormatTitle,
  getRegexDescription,
  getRegexInfoType,
  getRegexTitle,
  hasUserFormatType,
  iisLogParserChanged,
  isCustomRegexType,
  isCustomType,
  isJSONType,
  isMultilineCustom,
  isNginxOrApache,
  isSingleLineText,
  isSpringBootType,
  isWindowsIISLogWithW3C,
  jsonSchemaChanged,
  logConfigSlice,
  multiLineParserChanged,
  parseLog,
  regexChanged,
  regexKeyListChanged,
  replaceSpringBootTimeFormat,
  resetLogConfig,
  setEditLogConfig,
  subStringValue,
  sysLogParserChanged,
  timeKeyChanged,
  timeKeyFormatChanged,
  timeOffsetChanged,
  userLogFormatChanged,
  userSampleLogChanged,
  validateLogConfig,
  validateLogConfigName,
  validateLogConfigType,
  validateSampleLog,
  validateSyslogParser,
  validateUserLogFormat,
  validatingTimeKeyFormat,
} from "reducer/createLogConfig";
import { mockConfigData } from "test/config.mock";

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
      description: "",
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

  it("should set edit log config Apache", () => {
    const action = setEditLogConfig({
      ...mockConfigData,
      logType: LogType.Apache,
    } as ExLogConf);
    logConfigSlice.reducer(initState, action);
  });

  it("should set edit log config single line", () => {
    const action = setEditLogConfig({
      ...mockConfigData,
      logType: LogType.SingleLineText,
    } as ExLogConf);
    logConfigSlice.reducer(initState, action);
  });

  it("should set edit log config syslog", () => {
    const action = setEditLogConfig({
      ...mockConfigData,
      logType: LogType.Syslog,
    } as ExLogConf);
    logConfigSlice.reducer(initState, action);
  });

  it("should set edit log config iis w3c", () => {
    const action = setEditLogConfig({
      ...mockConfigData,
      logType: LogType.IIS,
      iisLogParser: IISlogParser.W3C,
    } as ExLogConf);
    logConfigSlice.reducer(initState, action);
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

  it("should config log type changed for not apache", () => {
    const action = configLogTypeChanged(LogType.JSON);
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.logType).toEqual(LogType.JSON);
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

  it("should iis log parser changed w3c", () => {
    const action = iisLogParserChanged(IISlogParser.W3C);
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.iisLogParser).toEqual(IISlogParser.W3C);
  });

  it("should iis log parser changed nscs", () => {
    const action = iisLogParserChanged(IISlogParser.NCSA);
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.iisLogParser).toEqual(IISlogParser.NCSA);
  });

  it("should iis log parser changed iis", () => {
    const action = iisLogParserChanged(IISlogParser.IIS);
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.iisLogParser).toEqual(IISlogParser.IIS);
  });

  it("should log format changed", () => {
    const action = userLogFormatChanged("test");
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.userLogFormat).toEqual("test");
  });

  it("should log format changed for apache", () => {
    const action = userLogFormatChanged("test");
    logConfigSlice.reducer(
      {
        ...initState,
        data: {
          ...initState.data,
          logType: LogType.Apache,
        },
      },
      action
    );
  });

  it("should log format changed for nginx", () => {
    const action = userLogFormatChanged("test");
    logConfigSlice.reducer(
      {
        ...initState,
        data: {
          ...initState.data,
          logType: LogType.Nginx,
        },
      },
      action
    );
  });

  it("should log format changed for syslog custom", () => {
    const action = userLogFormatChanged("test");
    logConfigSlice.reducer(
      {
        ...initState,
        data: {
          ...initState.data,
          logType: LogType.Syslog,
          syslogParser: SyslogParser.CUSTOM,
        },
      },
      action
    );
  });

  it("should log format changed for SpringBoot", () => {
    const action = userLogFormatChanged("test");
    logConfigSlice.reducer(
      {
        ...initState,
        data: {
          ...initState.data,
          logType: LogType.MultiLineText,
          multilineLogParser: MultiLineLogParser.JAVA_SPRING_BOOT,
        },
      },
      action
    );
  });

  it("should log format changed for iis w3c", () => {
    const action = userLogFormatChanged("test");
    logConfigSlice.reducer(
      {
        ...initState,
        data: {
          ...initState.data,
          logType: LogType.IIS,
          iisLogParser: IISlogParser.W3C,
        },
      },
      action
    );
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

  it("should sample log changed SpringBoot", () => {
    const action = userSampleLogChanged("test");
    initState.data.logType = LogType.MultiLineText;
    initState.data.multilineLogParser = MultiLineLogParser.JAVA_SPRING_BOOT;
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.userSampleLog).toEqual("test");
  });

  it("should sample log changed IIS Log", () => {
    const action = userSampleLogChanged("test");
    initState.data.logType = LogType.IIS;
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

  it("should parse log sample empty", () => {
    initState.data.logType = LogType.Apache;
    initState.data.userSampleLog = ``;
    const action = parseLog();
    logConfigSlice.reducer(initState, action);
  });

  it("should parse log regex empty", () => {
    initState.data.logType = LogType.Apache;
    initState.data.userSampleLog = `127.0.0.1 - - [22/Dec/2021:06:48:57 +0000] "GET /xxx HTTP/1.1" 404 196 "-" "curl/7.79.1"`;
    initState.data.regex = "";
    const action = parseLog();
    logConfigSlice.reducer(initState, action);
  });

  it("should parse log duplicated group", () => {
    initState.data.logType = LogType.Apache;
    initState.data.regex = `(?<remote_addr>[0-9.-]+)\\s+(?<remote_ident>[\\w.-]+)\\s+(?<remote_user>[\\w.-]+)\\s+\\[(?<remote_user>[^\\[\\]]+|-)\\]\\s+\\"(?<request_method>(?:[^"]|\\")+)\\s(?<request_uri>(?:[^"]|\\")+)\\s(?<request_protocol>(?:[^"]|\\")+)\\"\\s+(?<status>\\d{3}|-)\\s+(?<response_size_bytes>\\d+|-)\\s+\\"(?<http_referer>[^"]*)\\"\\s+\\"(?<http_user_agent>[^"]*)\\".*`;
    initState.data.userSampleLog = `127.0.0.1 - - [22/Dec/2021:06:48:57 +0000] "GET /xxx HTTP/1.1" 404 196 "-" "curl/7.79.1"`;
    const action = parseLog();
    logConfigSlice.reducer(initState, action);
  });

  it("should parse log invalid", () => {
    initState.data.logType = LogType.Apache;
    initState.data.regex = `(?<remote_addr>[0-1.-]+)\\s+(?<remote_ident>[\\w.-]+)\\s+(?<remote_user>[\\w.-]+)\\s+\\[(?<time_local>[^\\[\\]]+|-)\\]\\s+\\"(?<request_method>(?:[^"]|\\")+)\\s(?<request_uri>(?:[^"]|\\")+)\\s(?<request_protocol>(?:[^"]|\\")+)\\"\\s+(?<status>\\d{3}|-)\\s+(?<response_size_bytes>\\d+|-)\\s+\\"(?<http_referer>[^"]*)\\"\\s+\\"(?<http_user_agent>[^"]*)\\".*`;
    initState.data.userSampleLog = `127.0.0.1 - - [22/Dec/2021:06:48:57 +0000] "GET /xxx HTTP/1.1" 404 196 "-" "curl/7.79.1"`;
    const action = parseLog();
    logConfigSlice.reducer(initState, action);
  });

  it("should parse is custom log", () => {
    initState.data.logType = LogType.SingleLineText;
    initState.data.timeKey = "time";
    initState.data.regex = `(?<remote_addr>[0-1.-]+)\\s+(?<remote_ident>[\\w.-]+)\\s+(?<remote_user>[\\w.-]+)\\s+\\[(?<time>[^\\[\\]]+|-)\\]\\s+\\"(?<request_method>(?:[^"]|\\")+)\\s(?<request_uri>(?:[^"]|\\")+)\\s(?<request_protocol>(?:[^"]|\\")+)\\"\\s+(?<status>\\d{3}|-)\\s+(?<response_size_bytes>\\d+|-)\\s+\\"(?<http_referer>[^"]*)\\"\\s+\\"(?<http_user_agent>[^"]*)\\".*`;
    initState.data.userSampleLog = `127.0.0.1 - - [22/Dec/2021:06:48:57 +0000] "GET /xxx HTTP/1.1" 404 196 "-" "curl/7.79.1"`;
    const action = parseLog();
    logConfigSlice.reducer(initState, action);
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

  it("should time key changed json", () => {
    const action = timeKeyChanged("test");
    initState.data.logType = LogType.JSON;
    initState.data.jsonSchema =
      '{"format":"","type":"object","properties":{"a":{"format":"","type":"integer"},"b":{"format":"","type":"string"},"c":{"format":"%Y","timeKey":true,"type":"date"}}}';
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.timeKey).toEqual("test");
  });

  it("should time key changed error", () => {
    const action = timeKeyChanged("test");
    initState.data.logType = LogType.Apache;
    initState.userSampleLogError = "error";
    const newState = logConfigSlice.reducer(initState, action);
    expect(newState.data.timeKey).toEqual("test");
  });

  it("should time key changed json without schema", () => {
    const action = timeKeyChanged("test");
    initState.data.logType = LogType.JSON;
    initState.data.jsonSchema = "";
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

  it("should validateLogConfig return empty", () => {
    const newState = {
      ...initState,
      regexKeyList: [
        {
          key: "date",
          value: "test",
          type: "string",
          format: "test-format",
          loadingCheck: false,
          showError: false,
          error: "",
          showSuccess: false,
        },
      ],
    };
    const action = validateLogConfig();
    logConfigSlice.reducer(newState, action);
  });

  it("should is custom type json", () => {
    initState.data.logType = LogType.JSON;
    expect(isCustomType(initState)).toBeTruthy();
  });

  it("should is custom type SingleLineText", () => {
    initState.data.logType = LogType.SingleLineText;
    expect(isCustomType(initState)).toBeTruthy();
  });

  it("should is custom type Syslog", () => {
    initState.data.logType = LogType.MultiLineText;
    initState.data.multilineLogParser = MultiLineLogParser.CUSTOM;
    expect(isCustomType(initState)).toBeTruthy();
  });

  it("should is custom type Syslog", () => {
    initState.data.logType = LogType.Syslog;
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

  it("should isWindowsIISLogWithW3C", () => {
    expect(isWindowsIISLogWithW3C(LogType.IIS, IISlogParser.W3C)).toBeTruthy();
  });

  it("should isJSONType", () => {
    expect(isJSONType(LogType.JSON)).toBeTruthy();
  });

  it("should validate log name not empty", () => {
    initState.data.name = "test";
    expect(validateLogConfigName(initState)).toBe("");
  });

  it("should validate log name empty", () => {
    initState.data.logType = LogType.Apache;
    initState.data.name = "";
    expect(validateLogConfigName(initState)).toBe(
      "resource:config.common.configNameError"
    );
  });

  it("should validate log type not empty", () => {
    initState.data.logType = LogType.Apache;
    expect(validateLogConfigType(initState)).toBe("");
  });

  it("should validate log type empty", () => {
    initState.data.logType = null;
    initState.data.name = "test";
    expect(validateLogConfigType(initState)).toBe(
      "resource:config.common.logTypeError"
    );
  });

  it("should validate syslog parser not empty", () => {
    initState.data.name = "test";
    expect(validateSyslogParser(initState)).toBe("");
  });

  it("should validate syslog parser empty", () => {
    initState.data.logType = LogType.Syslog;
    initState.data.name = "";
    expect(validateSyslogParser(initState)).toBe("error.syslogParserError");
  });

  it("should validate log format not empty", () => {
    initState.data.userLogFormat = "test";
    expect(validateUserLogFormat(initState)).toBe("");
  });

  it("should validate log format empty", () => {
    initState.data.logType = LogType.Apache;
    initState.data.userLogFormat = "";
    expect(validateUserLogFormat(initState)).toBe(
      "resource:config.parsing.userLogFormatNotEmpty"
    );
  });

  it("should validate log format latin", () => {
    initState.data.logType = LogType.MultiLineText;
    initState.data.multilineLogParser = MultiLineLogParser.JAVA_SPRING_BOOT;
    initState.data.userLogFormat = "中文";
    expect(validateUserLogFormat(initState)).toBe(
      "resource:config.parsing.userLogFormatError"
    );
  });

  it("should validateSampleLog json empty", () => {
    initState.data.logType = LogType.JSON;
    initState.data.userSampleLog = "";
    expect(validateSampleLog(initState)).toBe(
      "resource:config.parsing.sampleLogJSONDesc"
    );
  });

  it("should validateSampleLog json schema empty", () => {
    initState.data.logType = LogType.JSON;
    initState.data.userSampleLog = `{"test": "test"}`;
    initState.data.jsonSchema = "";
    expect(validateSampleLog(initState)).toBe(
      "resource:config.parsing.regexLogParseError"
    );
  });

  it("should validateSampleLog invalid json", () => {
    initState.data.logType = LogType.JSON;
    initState.data.userSampleLog = "{a:b}";
    expect(validateSampleLog(initState)).toBe(
      "resource:config.parsing.notJSONFormat"
    );
  });

  it("should return getFormatInfoType", () => {
    getFormatInfoType(LogType.JSON);
  });

  it("should return getFormatTitle", () => {
    getFormatTitle(LogType.JSON);
  });

  it("should return getFormatDescription", () => {
    getFormatDescription(LogType.JSON);
  });

  it("should return getFormatInputType", () => {
    getFormatInputType(LogType.JSON);
  });

  it("should return getFormatPlaceholder", () => {
    getFormatPlaceholder(LogType.JSON);
  });

  it("should return getRegexTitle", () => {
    getRegexTitle(LogType.MultiLineText, MultiLineLogParser.CUSTOM);
  });

  it("should return getRegexInfoType", () => {
    getRegexInfoType(LogType.MultiLineText, MultiLineLogParser.CUSTOM);
  });

  it("should return  getRegexDescription", () => {
    getRegexDescription(LogType.MultiLineText, MultiLineLogParser.CUSTOM);
  });

  it("should return replaceSpringBootTimeFormat", () => {
    expect(replaceSpringBootTimeFormat("yyyy")).toBe("%Y");
  });

  it("should convert spring boot config to regex", () => {
    const regex = buildSpringBootRegExFromConfig(
      "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n"
    );
    expect(regex).toEqual({
      regexStr:
        "(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}) (?<level>\\s*[\\S]+\\s*) \\[(?<thread>\\S+)?\\] (?<logger>.+) : (?<message>[\\s\\S]+)",
      timeRegexStr: "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}",
    });
  });

  it("should convert nginx config to regex", () => {
    const regex = buildRegexFromNginxLog(
      `log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
      '$status $body_bytes_sent "$http_referer" '
      '"$http_user_agent" "$http_x_forwarded_for"';
      `,
      true
    );
    expect(regex).toEqual(
      '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+\\/\\S+\\/\\d+:\\d+:\\d+:\\d+\\s+\\S+)\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*'
    );
  });

  it("should convert apache config to regex", () => {
    const regex = buildRegexFromApacheLog(
      `LogFormat "%h %l %u %t \\"%r\\" %>s %b \\"%{Referer}i\\" \\"%{User-Agent}i\\"" combined`
    );
    expect(regex).toEqual(
      '(?<remote_addr>[0-9.-]+)\\s+(?<remote_ident>[\\w.-]+)\\s+(?<remote_user>[\\w.-]+)\\s+\\[(?<time_local>[^\\[\\]]+|-)\\]\\s+\\"(?<request_method>(?:[^"]|\\")+)\\s(?<request_uri>(?:[^"]|\\")+)\\s(?<request_protocol>(?:[^"]|\\")+)\\"\\s+(?<status>\\d{3}|-)\\s+(?<response_size_bytes>\\d+|-)\\s+\\"(?<http_referer>[^"]*)\\"\\s+\\"(?<http_user_agent>[^"]*)\\".*'
    );
  });

  it("should custom syslog config to regex", () => {
    const regex = buildSyslogRegexFromConfig(
      `<%pri%>1 %timestamp:::date-rfc3339% %HOSTNAME% %app-name% %procid% %msgid% %msg%\n`
    );
    expect(regex.trim()).toEqual(
      "<(?<pri>[0-9]{1,5})>1 (?<time>[^\\s]+) (?<hostname>([^\\s]+)|-) (?<appname>([^\\s]+)|-) (?<procid>([-0-9]+)|-) (?<msgid>([^\\s]+)|-) (?<msg>.+)"
    );
  });
});
