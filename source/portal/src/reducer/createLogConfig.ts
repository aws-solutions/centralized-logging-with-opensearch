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

import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  IISlogParser,
  LogType,
  MultiLineLogParser,
  ProcessorFilterRegexInput,
  SyslogParser,
} from "API";
import { ExLogConf, RegexListType } from "pages/resources/common/LogConfigComp";
import { InfoBarTypes } from "./appReducer";
import { APACHE_LOG_REG_MAP, INVALID } from "assets/js/const";
import {
  IsJsonString,
  containsNonLatinCodepoints,
  defaultStr,
  ternary,
  transformSchemaType,
} from "assets/js/utils";
import { JsonSchemaInferrer } from "js-json-schema-inferrer";
import { OptionType } from "components/AutoComplete/autoComplete";
import i18n from "i18n";
import cloneDeep from "lodash.clonedeep";

const IIS_LOG_TIME_STAMP = "log_timestamp";
export const TIME_KEY_TYPES = ["date", "epoch_millis", "epoch_second"];
const REGEX_DUPLICATED_MESSAGE = "Duplicate capture group name";
const SPRINGBOOT_DEFAULT_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss,SSS";
const WINDOWS_EVENT_SCHEMA = {
  type: "object",
  properties: {
    RecordNumber: {
      type: "number",
    },
    TimeGenerated: {
      type: "string",
      timeKey: true,
      format: "%Y-%m-%d %H:%M:%S %z",
    },
    TimeWritten: {
      type: "string",
    },
    EventID: {
      type: "number",
    },
    Qualifiers: {
      type: "number",
    },
    EventType: {
      type: "string",
    },
    EventCategory: {
      type: "number",
    },
    Channel: {
      type: "string",
    },
    SourceName: {
      type: "string",
    },
    ComputerName: {
      type: "string",
    },
    Data: {
      type: "string",
    },
    Sid: {
      type: "string",
    },
    Message: {
      type: "string",
    },
    StringInserts: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
};

export const isCustomType = (logConfig: LogConfigState) => {
  return (
    logConfig.data.logType === LogType.JSON ||
    logConfig.data.logType === LogType.SingleLineText ||
    logConfig.data.logType === LogType.Syslog ||
    (logConfig.data.logType === LogType.MultiLineText &&
      logConfig.data.multilineLogParser === MultiLineLogParser.CUSTOM)
  );
};

export const isSpringBootType = (logConfig: LogConfigState) => {
  return (
    logConfig.data.logType === LogType.MultiLineText &&
    logConfig.data.multilineLogParser === MultiLineLogParser.JAVA_SPRING_BOOT
  );
};

export const isMultilineCustom = (logConfig: LogConfigState) => {
  return (
    logConfig.data.logType === LogType.MultiLineText &&
    logConfig.data.multilineLogParser === MultiLineLogParser.CUSTOM
  );
};

export const isSingleLineText = (logType?: LogType | null) => {
  return logType === LogType.SingleLineText;
};

export const isNginxOrApache = (logType?: LogType | null) => {
  return logType === LogType.Apache || logType === LogType.Nginx;
};

export const isCustomRegexType = (logType?: LogType | null) => {
  return (
    logType === LogType.SingleLineText ||
    logType === LogType.Syslog ||
    logType === LogType.MultiLineText ||
    logType === LogType.IIS
  );
};

export const isWindowsEvent = (logType?: LogType | null) => {
  return logType === LogType.WindowsEvent;
};

export const isWindowsIISLog = (logType?: LogType | null) => {
  return logType === LogType.IIS;
};

export const isWindowsLog = (logType?: LogType | null) => {
  return isWindowsEvent(logType) || isWindowsIISLog(logType);
};

export const isWindowsIISLogWithW3C = (
  logType?: LogType | null,
  iisLogParser?: IISlogParser | null
) => {
  return logType === LogType.IIS && iisLogParser === IISlogParser.W3C;
};

export const isJSONType = (logType?: LogType | null) => {
  return logType === LogType.JSON;
};

export const hasUserFormatType = (logConfig: LogConfigState) => {
  return (
    logConfig.data.logType === LogType.Apache ||
    logConfig.data.logType === LogType.Nginx ||
    (logConfig.data.logType === LogType.Syslog &&
      logConfig.data.syslogParser === SyslogParser.CUSTOM) ||
    (logConfig.data.logType === LogType.MultiLineText &&
      logConfig.data.multilineLogParser === MultiLineLogParser.JAVA_SPRING_BOOT)
  );
};

export const findTimeKeyObject = (logConfig: LogConfigState) => {
  return logConfig.regexKeyList?.find(
    (element) => element.key === logConfig.data.timeKey
  );
};

const getWindowsTimeFormat = (
  key?: string,
  iisParser?: IISlogParser | null
) => {
  if (key === "date") {
    if (iisParser === IISlogParser.IIS) {
      return "%d/%m/%Y";
    } else if (iisParser === IISlogParser.W3C) {
      return "%Y-%m-%d";
    } else {
      return "";
    }
  } else if (key === "time") {
    return "%H:%M:%S";
  } else {
    return "";
  }
};

export const getDefaultFormat = (
  state: LogConfigState,
  type: string,
  key?: string
): string => {
  if (type === "date") {
    if (isSpringBootType(state)) {
      return replaceSpringBootTimeFormat(
        getLogFormatByUserLogConfig(defaultStr(state.data.userLogFormat))
      );
    } else if (isWindowsIISLog(state.data.logType)) {
      return getWindowsTimeFormat(key, state.data.iisLogParser);
    } else {
      return "";
    }
  } else {
    return "";
  }
};

export const subStringValue = (value: string) => {
  return value?.length > 450 ? value.substring(0, 448) + "..." : value;
};

export type LogFormatInputType = "input" | "textarea";

export type LogConfigFormAttribute = {
  formatInfoType?: InfoBarTypes;
  formatTitle?: string;
  formatDescription?: string;
  regexInfoType?: InfoBarTypes;
  regexTitle?: string;
  regexDescription?: string;
  sampleLogInfoType?: InfoBarTypes;
  sampleLogTitle?: string;
  sampleLogDescription?: string;
  inputType: LogFormatInputType;
  placeholder: string;
};

export type LogFormatMapType = {
  [key in LogType]: LogConfigFormAttribute;
};

export type RegExMapType = {
  [key in
    | SyslogParser
    | MultiLineLogParser
    | IISlogParser]: LogConfigFormAttribute;
};

export const LOG_CONFIG_PARSER_MAP: RegExMapType = {
  [IISlogParser.IIS]: {
    regexTitle: "resource:config.common.regexFormat",
    regexDescription: "",
    inputType: "textarea",
    placeholder: "\\S\\s+.*",
  },
  [IISlogParser.NCSA]: {
    regexTitle: "resource:config.common.regexFormat",
    regexDescription: "",
    inputType: "textarea",
    placeholder: "\\S\\s+.*",
  },
  [IISlogParser.W3C]: {
    regexTitle: "resource:config.common.regexFormat",
    regexDescription: "",
    inputType: "textarea",
    placeholder: "\\S\\s+.*",
  },
  [SyslogParser.RFC5424]: {
    regexTitle: "resource:config.common.regexFormat",
    regexDescription: "",
    inputType: "textarea",
    placeholder: "\\S\\s+.*",
  },
  [SyslogParser.RFC3164]: {
    regexTitle: "resource:config.common.regexFormat",
    regexDescription: "",
    inputType: "textarea",
    placeholder: "\\S\\s+.*",
  },
  [MultiLineLogParser.JAVA_SPRING_BOOT]: {
    regexTitle: "",
    regexDescription: "",
    inputType: "textarea",
    placeholder: "",
  },
  [SyslogParser.CUSTOM]: {
    regexInfoType: InfoBarTypes.REGEX_LOG_FORMAT,
    regexTitle: "resource:config.common.firstLineRegEx",
    regexDescription: "resource:config.common.firstLineRegExDesc",
    inputType: "textarea",
    placeholder: "\\S\\s+.*",
  },
};

export const LOG_CONFIG_TYPE_MAP: LogFormatMapType = {
  [LogType.JSON]: {
    formatTitle: "",
    formatDescription: "",
    inputType: "input",
    placeholder: "",
  },
  [LogType.Apache]: {
    formatInfoType: InfoBarTypes.APACHE_LOG_FORMAT,
    formatTitle: "resource:config.common.apacheFormat",
    formatDescription: "resource:config.common.apacheFormatDesc",
    sampleLogInfoType: InfoBarTypes.APACHE_SAMPLE_LOG_PARSING,
    inputType: "textarea",
    placeholder: 'LogFormat "%h %l ...',
  },
  [LogType.Nginx]: {
    formatInfoType: InfoBarTypes.NGINX_LOG_FORMAT,
    formatTitle: "resource:config.common.nginxFormat",
    formatDescription: "resource:config.common.nginxFormatDesc",
    sampleLogInfoType: InfoBarTypes.NGINX_SAMPLE_LOG_PARSING,
    inputType: "textarea",
    placeholder: "log_format main ...",
  },
  [LogType.Syslog]: {
    formatTitle: "resource:config.common.syslogFormat",
    formatDescription: "resource:config.common.syslogFormatDesc",
    inputType: "input",
    placeholder:
      "<%pri%>1 %timestamp:::date-rfc3339% %HOSTNAME% %app-name% %procid% %msgid% %msg%\n",
  },
  [LogType.MultiLineText]: {
    formatTitle: "resource:config.common.springbootLogFormat",
    formatDescription: "resource:config.common.springbootLogFormatDesc",
    inputType: "input",
    placeholder: "%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n",
  },
  [LogType.SingleLineText]: {
    formatInfoType: InfoBarTypes.REGEX_LOG_FORMAT,
    formatTitle: "",
    formatDescription: "",
    inputType: "input",
    placeholder: "",
    regexInfoType: InfoBarTypes.REGEX_LOG_FORMAT,
    regexTitle: "resource:config.common.regexFormat",
    regexDescription: "resource:config.common.regexFormatDesc",
  },
  [LogType.WindowsEvent]: {
    formatTitle: "",
    formatDescription: "",
    inputType: "textarea",
    placeholder: "",
  },
  [LogType.Regex]: {
    formatTitle: "",
    formatDescription: "",
    inputType: "input",
    placeholder: "",
  },
  [LogType.IIS]: {
    formatTitle: "resource:config.common.iisFormat",
    formatDescription: "resource:config.common.iisFormatDesc",
    inputType: "textarea",
    placeholder: "#Fields: ...",
  },
};

export const getFormatInfoType = (
  logType: LogType
): InfoBarTypes | undefined => {
  return LOG_CONFIG_TYPE_MAP[logType].formatInfoType;
};

export const getFormatTitle = (logType: LogType): string => {
  return defaultStr(LOG_CONFIG_TYPE_MAP[logType].formatTitle);
};

export const getFormatDescription = (logType: LogType): string => {
  return defaultStr(LOG_CONFIG_TYPE_MAP[logType].formatDescription);
};

export const getFormatInputType = (logType: LogType): LogFormatInputType => {
  return LOG_CONFIG_TYPE_MAP[logType].inputType;
};

export const getFormatPlaceholder = (logType: LogType): string => {
  return LOG_CONFIG_TYPE_MAP[logType].placeholder;
};

export type ParserType =
  | SyslogParser
  | MultiLineLogParser
  | IISlogParser
  | null
  | undefined;
export const getCurrentParser = (
  logType: LogType,
  syslogParser?: SyslogParser | null,
  multilineParser?: MultiLineLogParser | null,
  iisLogParser?: IISlogParser | null
): ParserType => {
  if (logType === LogType.Syslog) {
    return syslogParser;
  } else if (logType === LogType.MultiLineText) {
    return multilineParser;
  } else if (logType === LogType.IIS) {
    return iisLogParser;
  }
  return null;
};

export const getRegexInfoType = (
  logType: LogType,
  parser: ParserType
): InfoBarTypes | undefined => {
  if (!logType) {
    return undefined;
  }
  if (isSingleLineText(logType)) {
    return LOG_CONFIG_TYPE_MAP[logType].regexInfoType;
  } else {
    if (!parser) {
      return undefined;
    }
    return LOG_CONFIG_PARSER_MAP[parser].regexInfoType;
  }
};

export const getRegexTitle = (logType: LogType, parser: ParserType): string => {
  if (!logType) return "";
  if (isSingleLineText(logType)) {
    return defaultStr(LOG_CONFIG_TYPE_MAP[logType].regexTitle);
  }
  return parser ? defaultStr(LOG_CONFIG_PARSER_MAP[parser].regexTitle) : "";
};

export const getRegexDescription = (
  logType: LogType,
  parser: ParserType
): string => {
  if (!logType) return "";
  if (isSingleLineText(logType)) {
    return defaultStr(LOG_CONFIG_TYPE_MAP[logType].regexDescription);
  }
  return parser
    ? defaultStr(LOG_CONFIG_PARSER_MAP[parser].regexDescription)
    : "";
};

export const getSampleLogInfoType = (
  logType: LogType
): InfoBarTypes | undefined => {
  return LOG_CONFIG_TYPE_MAP[logType].sampleLogInfoType;
};

export type LogConfigState = {
  data: ExLogConf;
  timeRegex: string;
  showLogFormat: boolean;
  showRegex: boolean;
  regexDisabled?: boolean;
  logResMap: any;
  regexKeyList: RegexListType[];
  selectTimeKeyList: OptionType[];
  // validation
  isDuplicated: boolean;
  nameError: string;
  logTypeError: string;
  syslogParserError: string;
  multiLineParserError: string;
  iisParserError: string;
  logFormatError: string;
  regexError: string;
  userSampleLogError: string;
  userSampleLogSuccess: string;
  timeKeyFormatLoading: boolean;
  timeKeyFormatError: string;
  timeKeyFormatSuccess: string;
};

export const INIT_CONFIG_DATA: LogConfigState = {
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

export const replaceSpringBootTimeFormat = (srcTime: string) => {
  let destTime = "";
  if (srcTime) {
    destTime = srcTime
      .replaceAll("yyyy", "%Y")
      .replaceAll("EEEE", "%A")
      .replaceAll("EEE", "%A")
      .replaceAll("SSS", "%L")
      .replaceAll("yy", "%y")
      .replaceAll("MM", "%m")
      .replaceAll("HH", "%H")
      .replaceAll("mm", "%M")
      .replaceAll("ss", "%S")
      .replaceAll("dd", "%d");
  }
  return destTime;
};

export const getLogFormatByUserLogConfig = (config: string): string => {
  const withBraketReg = /(%d|%date){([^{}]+)}/g;
  let m;
  let tmpFormat = SPRINGBOOT_DEFAULT_TIME_FORMAT;
  if ((m = withBraketReg.exec(config)) !== null) {
    m.forEach((match, groupIndex) => {
      if (groupIndex === 2) {
        tmpFormat = match;
      }
    });
  }
  return tmpFormat;
};

// build nginx log regex
export const buildRegexFromNginxLog = (
  logConfigString: string,
  hasGroup: boolean
): string => {
  console.info("================NGINX LOG REG START====================");
  // 判断字符串是否以 log_format ***** ' 开头
  const formatRegEx = /log_format\s+\w+\s+'.*/;
  const isValidFormat = formatRegEx.test(logConfigString);

  if (!isValidFormat) {
    console.log("log format is invalid.");
    return INVALID;
  }

  // 去掉log_format xxx开头的字符串
  const withoutStartString = logConfigString.replace(
    /^log_format\s+\w+\s+/,
    ""
  );

  const tmpContentArr: string[] = [];
  const regex = /'(.*?)'/gm;
  let m;
  while ((m = regex.exec(withoutStartString)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }
    // The result can be accessed through the `m`-variable.
    m.forEach((match, groupIndex) => {
      // 只 append 引号里面的内容
      if (groupIndex === 1) {
        tmpContentArr.push(match);
      }
    });
  }
  const logContentString = tmpContentArr.join("");
  // 找出存在 双引号 "", 中括号 [], 这样分隔符的字段进行按需替换
  const regSplit = /("[^"]+")|(\[[^[\]].+\])/gm;
  // 替换以 $符号开头的变量
  function replaceDollarItems(match: any) {
    let groupName = "";
    if (hasGroup) {
      groupName = `?<${match.substring(1, match.length)}>`;
    }
    if (match === `$request`) {
      return `(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+`;
    } else if (match.startsWith("$time")) {
      return `(${groupName}\\d+/\\S+/\\d+:\\d+:\\d+:\\d+\\s+\\S+)`;
    } else if (match.startsWith("$http")) {
      return `(${groupName}[^"]*)`;
    } else if (match.startsWith("$")) {
      return `(${groupName}\\S+)`;
    } else {
      return `(${groupName}[^"]*)`;
    }
  }

  // 匹配到以 $ 符号开头的
  const regExDollar = /\$[^\\\][\s$"]*/gm;
  function replaceSplitItems(match: any) {
    match = match.replace("[", "\\[").replace("]", "\\]");
    return match.replace(regExDollar, replaceDollarItems);
  }
  const afterReplaceSplit = logContentString.replace(
    regSplit,
    replaceSplitItems
  );
  const afterReplaceDollar = afterReplaceSplit.replace(
    regExDollar,
    replaceDollarItems
  );
  const finalNginxReg = afterReplaceDollar.replace(/\s/gm, "\\s+") + ".*";
  console.info("finalNginxReg:", finalNginxReg);
  return finalNginxReg;
};

// build apache log regex
export const buildRegexFromApacheLog = (logConfigString: string): string => {
  console.info("================APACHE LOG REG START====================");

  // 判断字符串是否以 log_format ***** ' 开头
  const formatRegEx = /LogFormat\s+.*/;
  const isValidFormat = formatRegEx.test(logConfigString);

  if (!isValidFormat) {
    console.log("log format is invalid.");
    return INVALID;
  }

  // 去掉LogFormat开头的字符串
  const withoutStartString = logConfigString.replace(/^LogFormat\s+/, "");
  const tmpContentArr: string[] = [];
  const regex = /"([^"].+)"/gm; // 获取双引号（不含双引号）的内容
  const str = withoutStartString;
  let m;

  while ((m = regex.exec(str)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }
    // The result can be accessed through the `m`-variable.
    m.forEach((match, groupIndex) => {
      // 只 append 引号里面的内容
      if (groupIndex === 1) {
        tmpContentArr.push(match);
      }
    });
  }
  const logContentString = tmpContentArr.join("");
  function replacePercentItems(match: any) {
    if (APACHE_LOG_REG_MAP[match]) {
      return APACHE_LOG_REG_MAP[match]?.reg;
    } else {
      const groupName = `?<${match.substring(1, match.length)}>`;
      return `(${groupName}[^"]*)`;
    }
  }

  const regExPercent = /%[^\\\][\s$"]*/gm;
  const afterReplacePercent = logContentString.replace(
    regExPercent,
    replacePercentItems
  );
  const finalApacheReg = afterReplacePercent.replace(/\s/gm, "\\s+") + ".*";
  console.info("finalApacheReg:", finalApacheReg);
  return finalApacheReg;
};

// Syslog RegEx Generator
const SYSLOG_KEY_REGEX_MAP: any = {
  PRI: "[0-9]{1,5}",
  HOSTNAME: "([^\\s]+)|-",
  "APP-NAME": "([^\\s]+)|-",
  PROCID: "([-0-9]+)|-",
  MSGID: "([^\\s]+)|-",
  TIMESTAMP: "[^\\s]+",
  "STRUCTURED-DATA": "[^\\s]+",
  "%BOM": "([^\\s+])|(\\s)|-",
  MSG: ".+",
};

export const handleReplaceEnterAndBrackets = (str: string) => {
  // remove \n if at the last
  if (str.endsWith("\\n")) {
    str = str.replace(/\\n$/, "");
  }
  // if has the [ xxxx ]
  return str.replace(/\[.{1,500}?\]/, () => {
    return `(?<extradata>\\[.*\\]|-)`;
  });
};

// build syslog log regex
export const buildSyslogRegexFromConfig = (userFormatStr: string) => {
  let finalRegexStr = handleReplaceEnterAndBrackets(userFormatStr);
  finalRegexStr = finalRegexStr.replace(/%([\w:-]+?)%/gi, (match, key) => {
    // if the timestamp without specify format
    if (key.toLowerCase() === "timestamp") {
      return `(?<timestamp>\\w+\\s+\\d+ \\d+:\\d+:\\d+)`;
    }

    // if the key has :::
    if (key.indexOf(":::") > 0) {
      const splitArr = key.split(":::");
      if (splitArr.length > 1) {
        key = splitArr[0];
        const format = splitArr[1];
        // split timestamp when time has format
        if (key.toLowerCase() === "timestamp" && format === "date-rfc3339") {
          return `(?<time>[^\\s]+)`;
        }
      }
    }

    // transform group key to lower case
    let groupKey = key.toLowerCase();
    if (groupKey.indexOf("-") > 0) {
      groupKey = groupKey.replace("-", "");
    }

    if (SYSLOG_KEY_REGEX_MAP[key.toUpperCase()]) {
      return `(?<${groupKey}>${SYSLOG_KEY_REGEX_MAP[key.toUpperCase()]})`;
    }

    return `(?<${groupKey}>[^\\s]+)`;
  });

  return finalRegexStr;
};

// Spring Boot RegEx Generator
const timeWordsNameArr = ["d", "date"];
const loggerWordsArr = ["c", "lo", "logger"];
const messageGroupNameArr = ["m", "msg", "message"];
const levelGroupNameArr = ["p", "le", "level"];
const LineGroupNameArr = ["L", "line"];
const threadGroupNameArr = ["thread", "t"];

const replaceTimeFormatToRegEx = (timeFormatStr: string): any => {
  return timeFormatStr
    .replaceAll("YYYY", "\\d{4}")
    .replaceAll("yyyy", "\\d{4}")
    .replaceAll("MMMM", "\\w{3,9}")
    .replaceAll("EEEE", "\\w{6,9}")
    .replaceAll("mmmm", "\\d{4}")
    .replaceAll("YYY", "\\d{4}")
    .replaceAll("EEE", "\\w{3}")
    .replaceAll("yyy", "\\d{4}")
    .replaceAll("DDDD", "\\d{4}")
    .replaceAll("dddd", "\\d{4}")
    .replaceAll("MMM", "\\w{3}")
    .replaceAll("mmm", "\\d{3}")
    .replaceAll("DDD", "\\d{3}")
    .replaceAll("ddd", "\\d{3}")
    .replaceAll("SSS", "\\d{3}")
    .replaceAll("HHH", "\\w{3}")
    .replaceAll("hhh", "\\d{3}")
    .replaceAll("YY", "\\d{2}")
    .replaceAll("EE", "\\w{3}")
    .replaceAll("yy", "\\d{2}")
    .replaceAll("MM", "\\d{2}")
    .replaceAll("mm", "\\d{2}")
    .replaceAll("DD", "\\d{2}")
    .replaceAll("dd", "\\d{2}")
    .replaceAll("HH", "\\d{2}")
    .replaceAll("hh", "\\d{2}")
    .replaceAll("SS", "\\d{1,3}")
    .replaceAll("ss", "\\d{2}")
    .replaceAll("Y", "\\d{4}")
    .replaceAll("y", "\\d{4}")
    .replaceAll("M", "\\d{1}")
    .replaceAll("m", "\\d{1,2}")
    .replaceAll("D", "\\d{1,2}")
    .replaceAll("E", "\\w{3}")
    .replaceAll("S", "\\d{1,3}")
    .replaceAll("s", "\\d{1,2}");
};

export const buildSpringBootRegExFromConfig = (
  logConfigString: string
): { regexStr: string; timeRegexStr: string } => {
  console.info("================SPRINGBOOT LOG REG START====================");
  let springbootTimeRegEx = "";
  // Replace With  %xx{xxxx} format
  let finalRegRegStr = logConfigString.replace(
    /%(\w+)\{(.+?)\}/gi,
    (match, key, str) => {
      if (key === "X") {
        // Customize Key, may be empty (space)
        return `(?<${str}>\\S+|\\s?)`;
      }
      if (timeWordsNameArr.includes(key)) {
        springbootTimeRegEx = replaceTimeFormatToRegEx(str);
        return `(?<time>${springbootTimeRegEx})`;
      }
      return `(?<${key}>\\S+)`;
    }
  );

  // Find and Replace double [ ] 转义
  finalRegRegStr = finalRegRegStr.replaceAll("[", "\\[");
  finalRegRegStr = finalRegRegStr.replaceAll("]", "?\\]");

  // Replace % 开头，并且不含特殊字符
  finalRegRegStr = finalRegRegStr.replace(/%([\w-]+)/gi, (match, key) => {
    console.info("match with %xx");
    key = key.replace(/[\W\d]+/, "");
    // 找到特殊的需要处理的正则表达式，如message(%m)，换行(%n)
    if (levelGroupNameArr.includes(key)) {
      return "(?<level>\\s*[\\S]+\\s*)";
    }
    if (threadGroupNameArr.includes(key)) {
      return "(?<thread>\\S+)";
    }
    if (LineGroupNameArr.includes(key)) {
      return "(?<line>[\\w]+)";
    }
    if (messageGroupNameArr.includes(key)) {
      return "(?<message>[\\s\\S]+)";
    }
    if (loggerWordsArr.includes(key)) {
      return "(?<logger>.+)";
    }
    if (key === "n") {
      return "";
    }
    return `(?<${key}>\\S+)`;
  });
  return { regexStr: finalRegRegStr, timeRegexStr: springbootTimeRegEx };
};

const RFC3164_DEFAULT_REGEX = `^\\<(?<pri>[0-9]+)\\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\\/\\.\\-]*)(?:\\[(?<pid>[0-9]+)\\])?(?:[^\\:]*\\:)? *(?<message>.*)$`;
const RFC5424_DEFAULT_REGEX = `^\\<(?<pri>[0-9]{1,5})\\>1 (?<time>[^ ]+) (?<host>[^ ]+) (?<ident>[^ ]+) (?<pid>[-0-9]+) (?<msgid>[^ ]+) (?<extradata>\\[.*\\]|-) (?<message>.+)$`;

// Windows IIS IIS Log Regex
const IIS_LOG_DEFAULT_REGEX = `^(?<remote_ip>[^,]+),\\s*(?<user_name>[^,]+),\\s*(?<date>[^,]+),\\s*(?<time>[^,]+),\\s*(?<hostname>[^,]+),\\s*(?<server_name>[^,]+),\\s*(?<server_ip>[^,]+),\\s*(?<time_taken>[^,]+),\\s*(?<client_bytes>[^,]+),\\s*(?<server_bytes>[^,]+),\\s*(?<status_code>[^,]+),\\s*(?<sub_status>[^,]+),\\s*(?<method>[^,]+),\\s*(?<url>[^,]+),\\s*(?<query_string>[^\\s]*)`;

// Windows IIS NCSA Log Regex
const IIS_NCSA_DEFAULT_REGEX = `^(?<remote_ip>[^ ]+) - (?<user_name>[^ ]+) \\[(?<datetime>[^\\]]+)\\] "(?<method>\\S+) (?<url>\\S+) (?<http_version>[^"]+)" (?<status_code>\\d+) (?<body_received>\\d+)`;

// Windows IIS Log W3C Fields Mapping
export const IIS_W3C_FIELDS_MAP: any = {
  date: "date",
  time: "time",
  "s-sitename": "site_name",
  "s-computername": "server_name",
  "s-ip": "server_ip",
  "cs-method": "method",
  "cs-uri-stem": "url",
  "cs-uri-query": "query_string",
  "s-port": "port",
  "cs-username": "user_name",
  "c-ip": "remote_ip",
  "cs-version": "http_version",
  "cs(User-Agent)": "user_agent",
  "cs(Cookie)": "cookie",
  "cs(Referer)": "referrer",
  "cs-host": "hostname",
  "sc-status": "status_code",
  "sc-substatus": "sub_status",
  "sc-win32-status": "win32_status",
  "sc-bytes": "body_received",
  "cs-bytes": "body_sent",
  "time-taken": "time_taken",
  "queue-name": "queue_name",
  "reason-phrase": "reason_phrase",
};

// window iis w3c log
export const generateWindowsW3CRegex = (configString: string) => {
  configString = configString.replace(/\r?\n|\r/g, ""); // remove new line
  const fields = configString.split(" ").slice(1); // remove '#Fields:'
  const regexParts = fields.map((field) => {
    field = IIS_W3C_FIELDS_MAP[field] ?? field.replace(/-/g, "_");
    if (field === "time_taken") {
      return `(?<${field}>\\S+)`;
    }
    return `(?<${field}>[^ ]+)`;
  });
  return `^${regexParts.join(" ")}`;
};

const IISKeyTypeMap: any = {
  date: "date",
  time: "date",
  port: "keyword",
  status_code: "keyword",
  sub_status: "keyword",
  win32_status: "keyword",
  body_received: "long",
  body_sent: "long",
  time_taken: "long",
};

const getIISLogKeyType = (key: string) => {
  if (key.includes("ip")) {
    return "ip";
  }
  return IISKeyTypeMap[key] ?? "text";
};

export const getDefaultType = (
  logConfig: LogConfigState,
  key: string,
  value?: string | number
): string => {
  if (isWindowsIISLog(logConfig.data.logType)) {
    return getIISLogKeyType(key);
  }
  if (key === "time") {
    return "date";
  }
  if (value) {
    if (typeof value === "number" && isFinite(value)) {
      if (Number.isInteger(value)) {
        return "integer";
      }
      return "";
    }
  }
  if (
    logConfig.data.logType === LogType.MultiLineText &&
    logConfig.data.multilineLogParser === MultiLineLogParser.JAVA_SPRING_BOOT
  ) {
    if (key === "level") {
      return "keyword";
    }
  }
  return "text";
};

const convertJsonToRegexList = (json: any) => {
  const result: any = [];
  Object.keys(json).forEach((key) => {
    const item = {
      key: key,
      type: json[key].type,
      format: json[key].format,
      value: "",
      loadingCheck: false,
      showError: false,
      showSuccess: false,
      error: "",
    };
    result.push(item);
  });
  return result;
};

export const getTimeKeyList = (regexList: RegexListType[]) => {
  //   get Time Key Option List
  const tmpTimeKeyList: OptionType[] = [
    {
      name: i18n.t("none"),
      value: "",
    },
  ];
  regexList?.forEach((element) => {
    if (TIME_KEY_TYPES.includes(element.type)) {
      tmpTimeKeyList.push({
        name: element.key,
        value: element.key,
      });
    }
  });
  return tmpTimeKeyList;
};

export const convertLogSpecList = (
  regexList: RegexListType[],
  configType?: LogType | null
): any => {
  if (regexList.length > 0) {
    const normalList = regexList.map(({ key, type, format }) => {
      return {
        key,
        type,
        format: ternary(format, format, undefined),
      };
    });
    if (isWindowsIISLog(configType)) {
      normalList.push({
        key: IIS_LOG_TIME_STAMP,
        type: "date",
        format: "%Y-%m-%dT%H:%M:%S.%LZ",
      });
    }
    return normalList;
  }
  return [];
};

export const validateLogConfigName = (state: LogConfigState) => {
  if (!state.data.name?.trim()) {
    return "resource:config.common.configNameError";
  }
  return "";
};

export const validateLogConfigType = (state: LogConfigState) => {
  if (!state.data.logType) {
    return "resource:config.common.logTypeError";
  }
  return "";
};

export const validateSyslogParser = (state: LogConfigState) => {
  if (state.data.logType === LogType.Syslog) {
    if (!state.data.syslogParser) {
      return "error.syslogParserError";
    }
  }
  return "";
};

export const validateMultiLineParser = (state: LogConfigState) => {
  if (state.data.logType === LogType.MultiLineText) {
    if (!state.data.multilineLogParser) {
      return "error.multilineParserError";
    }
  }
  return "";
};

export const validateIISParser = (state: LogConfigState) => {
  if (state.data.logType === LogType.IIS) {
    if (!state.data.iisLogParser) {
      return "error.iisParserError";
    }
  }
  return "";
};

export const validateUserLogFormat = (state: LogConfigState) => {
  if (hasUserFormatType(state) && !state.data.userLogFormat?.trim()) {
    return "resource:config.parsing.userLogFormatNotEmpty";
  } else if (
    hasUserFormatType(state) &&
    state.data.userLogFormat &&
    isSpringBootType(state) &&
    containsNonLatinCodepoints(state.data.userLogFormat)
  ) {
    return "resource:config.parsing.userLogFormatError";
  }
  return "";
};

export const validateRegex = (state: LogConfigState) => {
  if (
    (isSingleLineText(state.data.logType) || isMultilineCustom(state)) &&
    !state.data.regex?.trim()
  ) {
    return "resource:config.parsing.regexMustNotBeEmpty";
  }
  return "";
};

export const validateSampleLog = (state: LogConfigState) => {
  // do not validate sample log if the type is apache or nginx
  if (isNginxOrApache(state.data.logType)) {
    return "";
  }
  if (!state.data.userSampleLog?.trim()) {
    if (state.data.logType === LogType.JSON) {
      return "resource:config.parsing.sampleLogJSONDesc";
    }
    return "resource:config.parsing.sampleRequired";
  } else if (state.data.logType === LogType.JSON) {
    if (!IsJsonString(state.data.userSampleLog)) {
      return "resource:config.parsing.notJSONFormat";
    } else if (!state.data.jsonSchema) {
      return "resource:config.parsing.regexLogParseError";
    }
  } else if (state.userSampleLogError) {
    return "resource:config.parsing.invalid";
  }
  return "";
};

export const validateRegexListTimeFormat = (state: LogConfigState) => {
  // Do not valid IIS time, Need Confirm
  if (state.data.logType === LogType.IIS) {
    return "";
  }
  let valid = true;
  for (const each of state.regexKeyList ?? []) {
    if (each.type === "date" && !each?.format?.trim()) {
      valid = false;
    }
  }
  if (!valid) {
    return "error.inputTimeKeyFormat";
  }
  return "";
};

export const validateTimeKeyFormat = (state: LogConfigState) => {
  if (
    findTimeKeyObject(state) &&
    findTimeKeyObject(state)?.type === "date" &&
    !findTimeKeyObject(state)?.format
  ) {
    return "error.inputTimeKeyFormat";
  }
  return "";
};

export const validateWindowsHasCookie = (state: LogConfigState) => {
  if (
    isWindowsIISLog(state.data.logType) &&
    state.data.userLogFormat?.toLocaleLowerCase()?.includes("cookie")
  ) {
    return true;
  }
  return false;
};

export const validateLogConfigParams = (logConfig: LogConfigState) => {
  if (isWindowsEvent(logConfig.data.logType)) {
    return !(
      validateLogConfigName(logConfig) || validateLogConfigType(logConfig)
    );
  }
  return !(
    validateLogConfigName(logConfig) ||
    validateLogConfigType(logConfig) ||
    validateSyslogParser(logConfig) ||
    validateMultiLineParser(logConfig) ||
    validateIISParser(logConfig) ||
    validateUserLogFormat(logConfig) ||
    validateSampleLog(logConfig) ||
    validateRegex(logConfig) ||
    validateRegexListTimeFormat(logConfig) ||
    validateTimeKeyFormat(logConfig) ||
    logConfig.userSampleLogError ||
    logConfig.regexError
  );
};

export const resetCommonFields = (
  state: LogConfigState,
  configPreserveData: string[],
  showHideFields: string[]
) => {
  const customExtendFields: any = cloneDeep({ ...INIT_CONFIG_DATA });
  showHideFields.forEach((field: any) => {
    delete customExtendFields[field];
  });
  delete customExtendFields.data;
  const commonConfigFields: any = cloneDeep({ ...INIT_CONFIG_DATA.data });
  [...configPreserveData, "id"].forEach((field: any) => {
    delete commonConfigFields[field];
  });
  // reset extend custom fields
  Object.assign(state, customExtendFields);
  // reset config data fields
  Object.assign(state.data, commonConfigFields);
};

export const findTimeAndDateProperty = (list: RegexListType[]) => {
  return list.find(
    (item) => TIME_KEY_TYPES.includes(item.type) && item.key === "time"
  );
};

const handleSetSyslogEditState = (
  state: LogConfigState,
  action: PayloadAction<ExLogConf>
) => {
  if (SyslogParser.CUSTOM === action.payload.syslogParser) {
    state.showLogFormat = true;
    state.showRegex = false;
  } else {
    state.showLogFormat = false;
    state.showRegex = true;
    if (
      action.payload.syslogParser === SyslogParser.RFC5424 ||
      action.payload.syslogParser === SyslogParser.RFC3164
    ) {
      state.regexDisabled = true;
    }
  }
};

const handleFormatChangeForNginx = (
  state: LogConfigState,
  action: PayloadAction<string>
) => {
  const regexStr = buildRegexFromNginxLog(action.payload, true);
  if (action.payload && regexStr === INVALID) {
    state.logFormatError = "resource:config.common.nginxFormatInvalid";
  } else {
    state.data.regex = regexStr;
  }
};

const handleFormatChangeForApache = (
  state: LogConfigState,
  action: PayloadAction<string>
) => {
  const regexStr = buildRegexFromApacheLog(action.payload);
  if (action.payload && regexStr === INVALID) {
    state.logFormatError = "resource:config.common.apacheFormatError";
  } else {
    state.data.regex = regexStr;
  }
};

const handleParsingNginxOrApacheLog = (state: LogConfigState, found: any) => {
  if (found?.groups) {
    state.logResMap = found.groups;
    state.userSampleLogError = "";
    state.userSampleLogSuccess = "resource:config.parsing.valid";
    const tmpList = Object.entries(found.groups).map((key) => {
      return { key: key[0] } as any;
    });
    state.regexKeyList = tmpList;
    state.data.regexFieldSpecs = [];
    state.selectTimeKeyList = getTimeKeyList(tmpList);
  } else {
    state.logResMap = {};
    state.userSampleLogSuccess = "";
    state.userSampleLogError = "resource:config.parsing.invalid";
  }
};

const handleParsingCustomRegexType = (state: LogConfigState, found: any) => {
  const initArr: RegexListType[] = [];
  if (found?.groups) {
    state.userSampleLogError = "";
    state.userSampleLogSuccess = "resource:config.parsing.valid";
    const foundObjectList = Object.entries(found.groups);
    if (foundObjectList.length) {
      foundObjectList.forEach((element: any) => {
        const type = getDefaultType(state, element[0], element[1]);
        // date format for SpringBoot is immutable, pre-assign the format
        const format = getDefaultFormat(state, type, element[0]);
        initArr.push({
          key: element[0],
          type,
          format,
          value: subStringValue(element[1]),
          loadingCheck: false,
          showError: false,
          showSuccess: false,
          error: "",
        });
      });
    }
  } else {
    state.userSampleLogSuccess = "";
    state.userSampleLogError = "resource:config.parsing.invalid";
  }
  state.regexKeyList = initArr;
  state.data.regexFieldSpecs = convertLogSpecList(initArr, state.data.logType);
  state.selectTimeKeyList = getTimeKeyList(initArr);
  // find time as date type
  if (
    findTimeAndDateProperty(initArr) &&
    !isWindowsIISLog(state.data.logType)
  ) {
    state.data.timeKey = "time";
  }
};

export const asyncParseRegex = createAsyncThunk(
  "logConfigSlice/asyncParseRegex",
  async (state: LogConfigState, thunkAPI) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker("/regexWorker.js");
      worker.onmessage = (event) => {
        if (event.data.error) {
          reject(thunkAPI.rejectWithValue(event.data.error));
        } else {
          resolve(event.data.result);
        }
      };
      worker.onerror = (error) => {
        reject(thunkAPI.rejectWithValue(error.message));
      };
      worker.postMessage({
        pattern: state.data.regex,
        text: defaultStr(state.data.userSampleLog),
      });
      setTimeout(() => {
        worker.terminate();
        reject(thunkAPI.rejectWithValue("timeout"));
      }, 2000); // Set timeout for 2 seconds
    });
  }
);

export const logConfigSlice = createSlice({
  name: "logConfig",
  initialState: INIT_CONFIG_DATA,
  reducers: {
    resetLogConfig: () => INIT_CONFIG_DATA,
    setEditLogConfig: (state, action: PayloadAction<ExLogConf>) => {
      state.data = action.payload;
      const tmpRegexKeyList = action.payload.regexFieldSpecs as any;
      // update regex key list value
      if (isSingleLineText(state.data.logType) || isMultilineCustom(state)) {
        const result = RegExp(defaultStr(state.data.regex)).exec(
          defaultStr(state.data.userSampleLog)
        );
        const updatedList = tmpRegexKeyList.map((element: any) => {
          return {
            ...element,
            value: result?.groups?.[element.key],
          };
        });
        state.regexKeyList = updatedList;
      } else {
        state.regexKeyList = tmpRegexKeyList;
      }
      state.selectTimeKeyList = getTimeKeyList(tmpRegexKeyList);
      if (
        action.payload.logType === LogType.JSON &&
        action.payload.jsonSchema
      ) {
        state.data.jsonSchema = JSON.parse(action.payload.jsonSchema);
      }
      if (isNginxOrApache(action.payload.logType)) {
        state.showLogFormat = true;
        state.showRegex = false;
      } else {
        state.showLogFormat = false;
        if (isSingleLineText(action.payload.logType)) {
          state.showRegex = true;
        } else if (action.payload.logType === LogType.Syslog) {
          handleSetSyslogEditState(state, action);
        } else if (
          action.payload.logType === LogType.IIS &&
          action.payload.iisLogParser === IISlogParser.W3C
        ) {
          state.showLogFormat = true;
          state.showRegex = false;
        } else {
          state.showRegex = false;
        }
      }
    },
    configNameChanged: (state, action: PayloadAction<string>) => {
      console.info("configNameChanged:");
      state.data.name = action.payload;
      state.nameError = "";
    },
    configLogTypeChanged: (state, action: PayloadAction<LogType>) => {
      console.info("configLogTypeChanged:");
      // reset rest data
      resetCommonFields(state, ["name"], []);
      state.data.logType = action.payload;
      if (isNginxOrApache(action.payload)) {
        state.showLogFormat = true;
        state.showRegex = false;
      } else {
        state.showLogFormat = false;
        if (isSingleLineText(action.payload)) {
          state.showRegex = true;
          state.data.regex = "(?<log>.+)";
        } else {
          state.showRegex = false;
          state.data.regex = "";
          if (isWindowsEvent(action.payload)) {
            state.data.jsonSchema = JSON.stringify(WINDOWS_EVENT_SCHEMA);
          }
        }
      }
    },
    sysLogParserChanged: (state, action: PayloadAction<SyslogParser>) => {
      console.info("sysLogParserChanged:");
      resetCommonFields(state, ["name", "logType"], []);
      state.data.syslogParser = action.payload;
      if ([SyslogParser.CUSTOM].includes(action.payload)) {
        state.showLogFormat = true;
        state.showRegex = false;
      } else {
        state.showLogFormat = false;
        state.showRegex = true;
        if (action.payload === SyslogParser.RFC5424) {
          state.regexDisabled = true;
          state.data.regex = RFC5424_DEFAULT_REGEX;
        } else if (action.payload === SyslogParser.RFC3164) {
          state.regexDisabled = true;
          state.data.regex = RFC3164_DEFAULT_REGEX;
        }
      }
    },
    iisLogParserChanged: (state, action: PayloadAction<IISlogParser>) => {
      console.info("iisLogParserChanged:");
      resetCommonFields(state, ["name", "logType"], []);
      state.data.iisLogParser = action.payload;
      if ([IISlogParser.W3C].includes(action.payload)) {
        state.showLogFormat = true;
        state.showRegex = false;
      } else {
        state.showLogFormat = false;
        state.showRegex = true;
        if (action.payload === IISlogParser.IIS) {
          state.regexDisabled = true;
          state.data.regex = IIS_LOG_DEFAULT_REGEX;
        } else if (action.payload === IISlogParser.NCSA) {
          state.regexDisabled = true;
          state.data.regex = IIS_NCSA_DEFAULT_REGEX;
        }
      }
    },
    multiLineParserChanged: (
      state,
      action: PayloadAction<MultiLineLogParser>
    ) => {
      console.info("multiLineParserChanged:");
      resetCommonFields(state, ["name", "logType"], []);
      state.data.multilineLogParser = action.payload;
      if ([MultiLineLogParser.JAVA_SPRING_BOOT].includes(action.payload)) {
        state.showLogFormat = true;
        state.showRegex = false;
      } else {
        state.showLogFormat = false;
        state.showRegex = true;
        state.data.regex = "(?<log>.+)";
      }
    },
    userLogFormatChanged: (state, action: PayloadAction<string>) => {
      console.info("userLogFormatChanged:");
      // reset data
      resetCommonFields(
        state,
        [
          "name",
          "logType",
          "iisLogParser",
          "syslogParser",
          "multilineLogParser",
        ],
        ["showLogFormat", "showRegex", "regexDisabled"]
      );
      // set new data
      state.data.userLogFormat = action.payload;
      state.logFormatError = "";
      if (state.data.logType === LogType.Nginx) {
        handleFormatChangeForNginx(state, action);
      } else if (state.data.logType === LogType.Apache) {
        handleFormatChangeForApache(state, action);
      } else if (
        state.data.logType === LogType.Syslog &&
        state.data.syslogParser === SyslogParser.CUSTOM
      ) {
        state.data.regex = buildSyslogRegexFromConfig(action.payload);
      } else if (
        state.data.logType === LogType.MultiLineText &&
        state.data.multilineLogParser === MultiLineLogParser.JAVA_SPRING_BOOT
      ) {
        const { regexStr, timeRegexStr } = buildSpringBootRegExFromConfig(
          action.payload
        );
        state.logFormatError = "";
        state.timeRegex = timeRegexStr;
        state.data.regex = regexStr;
      } else if (
        state.data.logType === LogType.IIS &&
        state.data.iisLogParser === IISlogParser.W3C
      ) {
        state.data.regex = generateWindowsW3CRegex(action.payload);
      } else {
        state.data.regex = action.payload;
      }
    },
    regexChanged: (state, action: PayloadAction<string>) => {
      console.info("regexChanged:");
      // reset data
      resetCommonFields(
        state,
        [
          "name",
          "logType",
          "iisLogParser",
          "syslogParser",
          "multilineLogParser",
          "userLogFormat",
        ],
        ["showLogFormat", "showRegex", "regexDisabled"]
      );
      state.data.regex = action.payload;
    },
    userSampleLogChanged: (state, action: PayloadAction<string>) => {
      console.info("userSampleLogChanged:");
      // reset data
      state.logResMap = {};
      state.regexKeyList = [];
      state.data.regexFieldSpecs = [];
      state.data.filterConfigMap = {
        enabled: false,
        filters: [],
      };
      if (isSpringBootType(state)) {
        state.data.timeKey = "time";
        state.data.timeKeyRegex = state.timeRegex;
      } else if (isWindowsIISLog(state.data.logType)) {
        state.data.timeKey = IIS_LOG_TIME_STAMP;
        state.data.timeKeyRegex = "";
      } else {
        state.data.timeKey = "";
        state.data.timeKeyRegex = "";
      }
      state.data.timeOffset = "";
      state.data.jsonSchema = "";
      // set new data
      state.data.userSampleLog = action.payload;
      state.userSampleLogError = "";
      state.userSampleLogSuccess = "";
    },
    jsonSchemaChanged: (state, action: PayloadAction<any>) => {
      console.info("jsonSchemaChanged:");
      state.data.jsonSchema = action.payload;
      const tmpList = convertJsonToRegexList(action.payload.properties);
      state.data.regexFieldSpecs = convertLogSpecList(tmpList);
      state.regexKeyList = tmpList;
      state.selectTimeKeyList = getTimeKeyList(tmpList);
    },
    timeOffsetChanged: (state, action: PayloadAction<string>) => {
      console.info("timeOffsetChanged:");
      state.data.timeOffset = action.payload;
    },
    convertJSONToKeyValueList: (state) => {
      console.info("convertJSONToKeyValueList:");
      if (!state.data?.userSampleLog) {
        return;
      }
      if (!IsJsonString(state.data.userSampleLog)) {
        state.userSampleLogError = "resource:config.parsing.notJSONFormat";
        return;
      }
      state.userSampleLogError = "";
      try {
        const defaultConfig = {
          type: true,
          string: {
            detectFormat: false,
          },
          object: {},
          array: {
            arrayInferMode: "first", // "tuple",
          },
          common: {},
        };
        const schema = JsonSchemaInferrer(
          JSON.parse(state.data.userSampleLog),
          defaultConfig
        );
        if (schema) {
          state.data.jsonSchema = transformSchemaType(schema);
          const tmpList = convertJsonToRegexList(schema.properties);
          state.data.regexFieldSpecs = convertLogSpecList(tmpList);
          state.regexKeyList = tmpList;
          state.data.timeKey = ""; // reset timekey when user parse log
          state.selectTimeKeyList = getTimeKeyList(tmpList);
        }
      } catch (error) {
        state.userSampleLogError = "resource:config.parsing.notJSONFormat";
        console.error("Invalid JSON");
      }
    },
    parseLog: (state) => {
      if (!state.data?.userSampleLog?.trim()) {
        state.userSampleLogError = "resource:config.parsing.sampleRequired";
        return;
      }
      const regex = defaultStr(state.data.regex);
      if (!regex.trim()) {
        return;
      }
      let isValid = true;
      state.isDuplicated = false;
      try {
        new RegExp(regex);
      } catch (error: any) {
        isValid = false;
        if (error.message.includes(REGEX_DUPLICATED_MESSAGE)) {
          state.isDuplicated = true;
          state.logFormatError = "resource:config.parsing.duplicated";
          state.regexError = "resource:config.parsing.duplicated";
          state.userSampleLogError = "resource:config.parsing.invalid";
          return;
        }
        state.userSampleLogError = "resource:config.parsing.invalid";
      }
      if (!isValid) {
        state.regexError = "resource:config.parsing.alert";
        return;
      }
      state.userSampleLogError = "";
      const found: any = RegExp(regex).exec(state.data?.userSampleLog);
      if (isNginxOrApache(state.data.logType)) {
        handleParsingNginxOrApacheLog(state, found);
      } else if (isCustomRegexType(state.data.logType)) {
        handleParsingCustomRegexType(state, found);
      }
    },
    regexKeyListChanged: (state, action: PayloadAction<RegexListType[]>) => {
      console.info("regexKeyListChanged:");
      state.regexKeyList = action.payload;
      state.selectTimeKeyList = getTimeKeyList(action.payload);
      state.data.regexFieldSpecs = convertLogSpecList(
        action.payload,
        state.data.logType
      );
      // find time as date type
      if (findTimeAndDateProperty(action.payload)) {
        state.data.timeKey = "time";
      }
    },
    timeKeyChanged: (state, action: PayloadAction<string>) => {
      console.info("timeKeyChanged:");
      const key = action.payload;
      state.data.timeKey = key;
      // update json schema time key
      if (state.data.logType === LogType.JSON && state.data.jsonSchema) {
        const properties = (state.data.jsonSchema as any).properties;
        if (properties) {
          Object.keys(properties).forEach((k) => {
            if (
              Object.prototype.hasOwnProperty.call(properties[k], "timeKey")
            ) {
              properties[k].timeKey = false;
            }
          });
          if (Object.prototype.hasOwnProperty.call(properties, key)) {
            properties[key].timeKey = true;
          }
        }
      }
      state.timeKeyFormatSuccess = "";
      state.timeKeyFormatError = "";
    },
    validatingTimeKeyFormat: (
      state,
      action: PayloadAction<{ loading: boolean; valid: number }>
    ) => {
      console.info("validatingTimeKeyFormat:");
      state.timeKeyFormatLoading = action.payload.loading;
      // 1: valid, -1: invalid, 0: empty
      if (action.payload.valid === 1) {
        state.timeKeyFormatError = "";
        state.timeKeyFormatSuccess = "resource:config.parsing.formatSuccess";
      } else if (action.payload.valid === -1) {
        state.timeKeyFormatSuccess = "";
        state.timeKeyFormatError = "resource:config.parsing.formatError";
      } else {
        state.timeKeyFormatSuccess = "";
        state.timeKeyFormatError = "";
      }
    },
    timeKeyFormatChanged: (state) => {
      console.info("timeKeyFormatChanged:");
      state.timeKeyFormatSuccess = "";
      state.timeKeyFormatError = "";
    },
    filterRegexChanged: (
      state,
      action: PayloadAction<ProcessorFilterRegexInput>
    ) => {
      console.info("filterRegexChanged:");
      state.data.filterConfigMap = action.payload;
    },
    validateLogConfig: (state) => {
      console.info("validateLogConfig:");
      state.nameError = validateLogConfigName(state);
      state.logTypeError = validateLogConfigType(state);
      state.syslogParserError = validateSyslogParser(state);
      state.multiLineParserError = validateMultiLineParser(state);
      state.iisParserError = validateIISParser(state);
      state.logFormatError = state.isDuplicated
        ? "resource:config.parsing.duplicated"
        : validateUserLogFormat(state);
      state.regexError = state.isDuplicated
        ? "resource:config.parsing.duplicated"
        : validateRegex(state);
      state.userSampleLogError = validateSampleLog(state);
      state.timeKeyFormatError = validateTimeKeyFormat(state);
      const list = state.regexKeyList ?? [];
      for (const each of list) {
        if (each.type === "date") {
          if (each?.format?.trim()) {
            each.error = "";
          } else {
            each.error = "error.inputTimeKeyFormat";
          }
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(asyncParseRegex.pending, (state) => {
        console.info(state);
      })
      .addCase(
        asyncParseRegex.fulfilled,
        (state: LogConfigState, action: any) => {
          if (!state.data?.userSampleLog?.trim()) {
            state.userSampleLogError = "resource:config.parsing.sampleRequired";
            return;
          }
          const regex = defaultStr(state.data.regex);
          if (!regex.trim()) {
            return;
          }
          let isValid = true;
          state.isDuplicated = false;
          try {
            new RegExp(regex);
          } catch (error: any) {
            isValid = false;
            if (error.message.includes(REGEX_DUPLICATED_MESSAGE)) {
              state.isDuplicated = true;
              state.logFormatError = "resource:config.parsing.duplicated";
              state.regexError = "resource:config.parsing.duplicated";
              state.userSampleLogError = "resource:config.parsing.invalid";
              return;
            }
          }
          if (!isValid) {
            state.regexError = "resource:config.parsing.alert";
            return;
          }
          state.userSampleLogError = "";
          const found: any = action.payload;
          console.info("state.data.logType:", state.data.logType);
          if (isNginxOrApache(state.data.logType)) {
            handleParsingNginxOrApacheLog(state, found);
          } else if (isCustomRegexType(state.data.logType)) {
            handleParsingCustomRegexType(state, found);
          }
        }
      )
      .addCase(asyncParseRegex.rejected, (state, action) => {
        if (action.payload === "timeout") {
          state.userSampleLogError = "resource:config.parsing.regexTimeout";
        }
      });
  },
});

export const {
  setEditLogConfig,
  resetLogConfig,
  configNameChanged,
  configLogTypeChanged,
  sysLogParserChanged,
  multiLineParserChanged,
  iisLogParserChanged,
  userLogFormatChanged,
  regexChanged,
  userSampleLogChanged,
  jsonSchemaChanged,
  timeOffsetChanged,
  convertJSONToKeyValueList,
  parseLog,
  regexKeyListChanged,
  timeKeyChanged,
  validatingTimeKeyFormat,
  timeKeyFormatChanged,
  filterRegexChanged,
  validateLogConfig,
} = logConfigSlice.actions;
