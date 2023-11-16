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
import { INVALID } from "./const";
import { format, parseISO } from "date-fns";
import { formatWithOptions } from "date-fns/fp";
import {
  AppPipeline,
  EngineType,
  LogType,
  MultiLineLogParser,
  SchedulerType,
  SyslogParser,
} from "API";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import i18n from "i18n";
import { LogProcessorType, SelectProcessorType } from "reducer/selectProcessor";
import { ServiceLogDetailProps } from "pages/dataInjection/serviceLog/ServiceLogDetail";

const SPRINGBOOT_DEFAULT_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss,SSS";
const stackPrefix = "CL";

// Build Dashboard Link
export const buildDashboardLink = (
  engine: string,
  elbLink: string,
  domainName: string
) => {
  if (domainName) {
    if (engine === EngineType.OpenSearch) {
      return `https://${domainName}/_dashboards/`;
    } else {
      return `https://${domainName}/_plugin/kibana/`;
    }
  } else {
    if (engine === EngineType.OpenSearch) {
      return `https://${elbLink}/_dashboards/`;
    } else {
      return `https://${elbLink}/_plugin/kibana/`;
    }
  }
};

// Split S3 Key String into bucket name and prefix
const getPosition = (string: string, subString: string, index: number) => {
  return string.split(subString, index).join(subString).length;
};

interface BucketAndPrefix {
  bucket: string;
  prefix: string;
}

export const splitStringToBucketAndPrefix = (
  s3KeyStr: string
): BucketAndPrefix => {
  const tmpBucketObj: BucketAndPrefix = {
    bucket: "",
    prefix: "",
  };
  const prefixIndex = getPosition(s3KeyStr, "/", 3);
  let tmpLogBucket = "";
  let tmpLogPath = "";
  const p1 = s3KeyStr.slice(0, prefixIndex);
  const p2 = s3KeyStr.slice(prefixIndex + 1);
  const s3BucketArr = p1.split("//");
  if (s3BucketArr && s3BucketArr.length > 1) {
    tmpLogBucket = s3BucketArr[1];
  }
  tmpLogPath = p2;
  tmpBucketObj.bucket = tmpLogBucket;
  tmpBucketObj.prefix = tmpLogPath;
  return tmpBucketObj;
};

export const bucketNameIsValid = (bucketName: string): boolean => {
  const REG1 = bucketName && /^[a-z\d.-]*$/.test(bucketName);
  const REG2 = bucketName && /^[a-z\d]/.test(bucketName);
  const REG3 = bucketName && !/-$/.test(bucketName);
  const REG4 = bucketName && !/\.+\./.test(bucketName);
  const REG5 = bucketName && !/-+\.$/.test(bucketName);
  const REG6 =
    bucketName &&
    !/^(?:(?:^|\.)(?:2(?:5[0-5]|[0-4]\d)|1?\d?\d)){4}$/.test(bucketName);
  const REG7 = bucketName && bucketName.length >= 3 && bucketName.length <= 63;
  if (REG1 && REG2 && REG3 && REG4 && REG5 && REG6 && REG7) {
    return true;
  }
  return false;
};

// check index name is valid
export const checkIndexNameValidate = (indexName: string): boolean => {
  const IndexRegEx = /^[a-z][a-z0-9_-]*$/;
  return IndexRegEx.test(indexName);
};

// check string is json format
export const IsJsonString = (str: string): boolean => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

// Transform JSON Schema
export const transformSchemaType = (schema: any) => {
  // when 'type' is 'null', change to 'string'
  if (schema.type === "null") {
    schema.type = "string";
  }

  // if has child properties
  if (schema.properties) {
    Object.values(schema.properties).forEach(transformSchemaType);
  }

  // if is array and has items
  if (schema.type === "array" && schema.items) {
    transformSchemaType(schema.items);
  }

  return schema;
};

// format event timestamp
export const formatLogEventTimestamp = (timestamp: number): string => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatString = `yyyy-MM-dd'T'HH:mm:ss.SSSxxx`;
  const options: any = { timeZone };
  return formatWithOptions(options, formatString, new Date(timestamp));
};

// format timeStamp
export const formatTimeStamp = (timestamp: number): string => {
  if (timestamp) {
    return format(new Date(timestamp), "yyyy-MM-dd HH:mm:ss");
  }
  return "-";
};

// format date
export const formatLocalTime = (time: string): string => {
  if (time.trim() !== "") {
    return format(new Date(parseISO(time)), "yyyy-MM-dd HH:mm:ss");
  }
  return "-";
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const humanFileSize = (bytes: any, si = false, dp = 1) => {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }

  const units = si
    ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  );

  return bytes.toFixed(dp) + " " + units[u];
};

const APACHE_LOG_REG_MAP: any = {
  "%a": {
    reg: "(?<client_addr>[0-9.-]+)",
    key: "client_addr",
  },
  "%{c}a": {
    reg: "(?<connect_addr>[0-9.-]+)",
    key: "connect_addr",
  },
  "%A": {
    reg: "(?<local_addr>[0-9.-]+)",
    key: "local_addr",
  },
  "%B": {
    reg: "(?<response_bytes>\\d+|-)",
    key: "response_bytes",
  },
  "%b": {
    reg: "(?<response_size_bytes>\\d+|-)",
    key: "response_size_bytes",
  },
  "%D": {
    reg: "(?<request_time_msec>\\d+|-)",
    key: "request_time_msec",
  },
  "%f": {
    reg: '(?<filename>(?:[^"]|\\")+)',
    key: "filename",
  },
  "%h": {
    reg: "(?<remote_addr>[0-9.-]+)",
    key: "remote_addr",
  },
  "%H": {
    reg: '(?<request_protocol_supple>(?:[^"]|\\")+)',
    key: "request_protocol_supple",
  },
  "%k": {
    reg: "(?<keep_alive>\\d+|-)",
    key: "keep_alive",
  },
  "%l": {
    reg: "(?<remote_ident>[\\w.-]+)",
    key: "remote_ident",
  },
  "%L": {
    reg: "(?<error_log>[\\w\\d-]+)",
    key: "error_log",
  },
  "%m": {
    reg: "(?<request_method_supple>[\\w.-]+)",
    key: "request_method_supple",
  },
  "%p": {
    reg: "(?<remote_port>\\d{1,5}|-)",
    key: "remote_port",
  },
  "%P": {
    reg: "(?<child_process>\\d+|-)",
    key: "child_process",
  },
  "%q": {
    reg: '(?<request_query>(?:[^"]|\\")+)?',
    key: "request_query",
  },
  "%r": {
    reg: '(?<request_method>(?:[^"]|\\")+)\\s(?<request_uri>(?:[^"]|\\")+)\\s(?<request_protocol>(?:[^"]|\\")+)',
    key: "request",
  },
  "%R": {
    reg: '(?<response_handler>(?:[^"]|\\")+)',
    key: "response_handler",
  },
  "%s": {
    reg: "(?<status>\\d{3}|-)",
    key: "status",
  },
  "%>s": {
    reg: "(?<status>\\d{3}|-)",
    key: "status",
  },
  "%t": {
    reg: "\\[(?<time_local>[^\\[\\]]+|-)\\]",
    key: "time_local",
  },
  "%T": {
    reg: "(?<request_time_sec>[0-9]*.?[0-9]+|-)",
    key: "request_time_sec",
  },
  "%u": {
    reg: "(?<remote_user>[\\w.-]+)",
    key: "remote_user",
  },
  "%U": {
    reg: '(?<request_uri_supple>(?:[^"]|\\")+)',
    key: "request_uri_supple",
  },
  "%v": {
    reg: '(?<server_name>(?:[^"]|\\")+)',
    key: "server_name",
  },
  "%V": {
    reg: '(?<server_name_canonical>(?:[^"]|\\")+)',
    key: "server_name_canonical",
  },
  "%X": {
    reg: "(?<status_completed>[X\\+-]{1})",
    key: "status_completed",
  },
  "%I": {
    reg: "(?<bytes_received>\\d+|-)",
    key: "bytes_received",
  },
  "%O": {
    reg: "(?<bytes_sent>\\d+|-)",
    key: "bytes_sent",
  },
  "%S": {
    reg: '(?<bytes_combination>(?:[^"]|\\")+)',
    key: "bytes_combination",
  },
  "%{User-Agent}i": {
    reg: '(?<http_user_agent>[^"]*)',
    key: "http_user_agent",
  },
  "%{Referer}i": {
    reg: '(?<http_referer>[^"]*)',
    key: "http_referer",
  },
};

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

  let logContentString = "";
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
  logContentString = tmpContentArr.join("");
  function replacPercentItems(match: any) {
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
    replacPercentItems
  );
  const finalApacheReg = afterReplacePercent.replace(/\s/gm, "\\s+") + ".*";
  console.info("finalApacheReg:", finalApacheReg);
  return finalApacheReg;
};

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

  let logContentString = "";
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
  logContentString = tmpContentArr.join("");
  // 找出存在 双引号 "", 中括号 [], 这样分隔符的字段进行按需替换
  const regSplit = /("[^"]+")|(\[[^[\]].+\])/gm;
  // 替换以 $符号开头的变量
  function replacDollarItems(match: any) {
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
    const tmpRegStr = match.replace(regExDollar, replacDollarItems);
    return tmpRegStr;
  }
  const afterReplaceSplit = logContentString.replace(
    regSplit,
    replaceSplitItems
  );
  const afterReplaceDollar = afterReplaceSplit.replace(
    regExDollar,
    replacDollarItems
  );
  const finalNginxReg = afterReplaceDollar.replace(/\s/gm, "\\s+") + ".*";
  console.info("finalNginxReg:", finalNginxReg);
  return finalNginxReg;
};

export const replaceSpringbootTimeFormat = (srcTime: string) => {
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
    console.info("MMM:", m);
    m.forEach((match, groupIndex) => {
      if (groupIndex === 2) {
        tmpFormat = match;
      }
    });
  }
  return tmpFormat;
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

const handleReplaceEnterAndBrackets = (str: string) => {
  // remove \n if at the last
  if (str.endsWith("\\n")) {
    str = str.replace(/\\n$/, "");
  }
  // if has the [ xxxx ]
  const finalRegexStr = str.replace(/\[.+?\]/, () => {
    return `(?<extradata>(\\[(.*)\\]|-))`;
  });
  return finalRegexStr;
};

export const buidSyslogRegexFromConfig = (userFormatStr: string) => {
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
  let finalaRegRegStr = logConfigString.replace(
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
  finalaRegRegStr = finalaRegRegStr.replaceAll("[", "\\[");
  finalaRegRegStr = finalaRegRegStr.replaceAll("]", "?\\]");

  // Replace % 开头，并且不含特殊字符
  finalaRegRegStr = finalaRegRegStr.replace(/%([\w-]+)/gi, (match, key) => {
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

  return { regexStr: finalaRegRegStr, timeRegexStr: springbootTimeRegEx };
};

export const domainIsValid = (domain: string): boolean => {
  const reg = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
  return reg.test(String(domain).toLowerCase());
};

export const emailIsValid = (email: string): boolean => {
  const re = /\w[-\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\.)+[A-Za-z]{2,14}/;
  return re.test(String(email).toLowerCase());
};

export const buildACMLink = (region: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/acm/home?region=${region}#/`;
  }
  return `https://${region}.console.aws.amazon.com/acm/home?region=${region}#/`;
};

export const buildEC2LInk = (region: string, instanceId: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/ec2/v2/home?region=${region}#Instances:instanceId=${instanceId}`;
  }
  return `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#Instances:v=3;instanceId=${instanceId}`;
};

export const buildKDSLink = (region: string, kdsName: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/kinesis/home?region=${region}#/streams/details/${kdsName}/monitoring`;
  }
  return `https://${region}.console.aws.amazon.com/kinesis/home?region=${region}#/streams/details/${kdsName}/monitoring`;
};

export const buildKDFLink = (region: string, kdfName: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/firehose/home?region=${region}#/details/${kdfName}/monitoring`;
  }
  return `https://${region}.console.aws.amazon.com/firehose/home?region=${region}#/details/${kdfName}/monitoring`;
};

export const buildCfnLink = (region: string, stackArn: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${encodeURIComponent(
      stackArn
    )}`;
  }
  return `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${encodeURIComponent(
    stackArn
  )}`;
};

export const buildESLink = (region: string, domainName: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/esv3/home?region=${region}#opensearch/domains/${domainName}`;
  }
  return `https://${region}.console.aws.amazon.com/aos/home?region=${region}#opensearch/domains/${domainName}`;
};

export const buildESCloudWatchLink = (
  region: string,
  domainName: string
): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/cloudwatch/home?region=${region}#dashboards:name=${domainName}`;
  }
  return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=${domainName}`;
};

export const buildVPCLink = (region: string, vpcId: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/vpc/home?region=${region}#vpcs:VpcId=${vpcId}`;
  }
  return `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#vpcs:VpcId=${vpcId}`;
};

export const buildSubnetLink = (region: string, subnetId: string): string => {
  if (region.startsWith("cn")) {
    return `https://console.amazonaws.cn/vpc/home?region=${region}#subnets:subnetId=${subnetId}`;
  }
  return `https://console.aws.amazon.com/vpc/home?region=${region}#subnets:subnetId=${subnetId}`;
};

export const buildVPCPeeringLink = (
  region: string,
  vpcPeeringId: string
): string => {
  if (region.startsWith("cn")) {
    return `https://console.amazonaws.cn/vpc/home?region=${region}#PeeringConnectionDetails:VpcPeeringConnectionId=${vpcPeeringId}`;
  }
  return `https://console.aws.amazon.com/vpc/home?region=${region}#PeeringConnectionDetails:VpcPeeringConnectionId=${vpcPeeringId}`;
};

export const buildNaclLink = (region: string, naclId: string): string => {
  if (region.startsWith("cn")) {
    return `https://console.amazonaws.cn/vpc/home?region=${region}#NetworkAclDetails:networkAclId=${naclId}`;
  }
  return `https://console.aws.amazon.com/vpc/home?region=${region}#NetworkAclDetails:networkAclId=${naclId}`;
};

export const buildRouteTableLink = (
  region: string,
  routeTableId: string
): string => {
  if (region.startsWith("cn")) {
    return `https://console.amazonaws.cn/vpc/home?region=${region}#RouteTableDetails:RouteTableId=${routeTableId}`;
  }
  return `https://console.aws.amazon.com/vpc/home?region=${region}#RouteTableDetails:RouteTableId=${routeTableId}`;
};

export const buildSGLink = (region: string, sgId: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/ec2/v2/home?region=${region}#SecurityGroup:securityGroupId=${sgId}`;
  }
  return `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#SecurityGroup:securityGroupId=${sgId}`;
};

const getDirPrefixByPrefixStr = (prefix: string) => {
  if (prefix && prefix.indexOf("/") >= 0) {
    const slashPos = prefix.lastIndexOf("/");
    prefix = prefix.slice(0, slashPos + 1);
  }
  return prefix;
};

export function buildCreateS3Link(region: string) {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/s3/bucket/create?region=${region}`;
  }
  return `https://s3.console.aws.amazon.com/s3/bucket/create?region=${region}`;
}

export const buildS3Link = (
  region: string,
  bucketName: string,
  prefix?: string
): string => {
  if (region.startsWith("cn")) {
    if (prefix) {
      const resPrefix = getDirPrefixByPrefixStr(prefix);
      if (resPrefix.endsWith("/")) {
        return `https://console.amazonaws.cn/s3/buckets/${bucketName}?region=${region}&prefix=${resPrefix}`;
      }
    }
    return `https://console.amazonaws.cn/s3/buckets/${bucketName}`;
  }
  if (prefix) {
    const resPrefix = getDirPrefixByPrefixStr(prefix);
    if (resPrefix.endsWith("/")) {
      return `https://s3.console.aws.amazon.com/s3/buckets/${bucketName}?region=${region}&prefix=${resPrefix}`;
    }
  }
  return `https://s3.console.aws.amazon.com/s3/buckets/${bucketName}`;
};

export const buildS3LinkFromS3URI = (region: string, uri?: string): string => {
  if (!uri) {
    return "";
  }
  const bucketAndPrefix = uri.startsWith("s3://") ? uri.split("s3://")[1] : uri;
  const bucketName = bucketAndPrefix.split("/")[0];
  const prefix = bucketAndPrefix.substring(bucketName.length + 1);
  const postfix = prefix.endsWith("/") ? "" : "/";
  if (region.startsWith("cn")) {
    return `https://console.amazonaws.cn/s3/buckets/${bucketName}?region=${region}&prefix=${prefix}${postfix}`;
  }
  return `https://s3.console.aws.amazon.com/s3/buckets/${bucketName}?region=${region}&prefix=${prefix}${postfix}`;
};

export const buildTrailLink = (region: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/cloudtrail/home?region=${region}#/trails`;
  }
  return `https://${region}.console.aws.amazon.com/cloudtrail/home?region=${region}#/trails`;
};

export const buildConfigLink = (region: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/config/home?region=${region}#/dashboard`;
  }
  return `https://${region}.console.aws.amazon.com/config/home?region=${region}#/dashboard`;
};

export const buildCloudFrontLink = (
  region: string,
  cloudFrontId: string
): string => {
  if (region.startsWith("cn")) {
    return `https://console.amazonaws.cn/cloudfront/v3/home?region=${region}#/distributions/${cloudFrontId}`;
  }
  return `https://console.aws.amazon.com/cloudfront/v3/home?region=${region}#/distributions/${cloudFrontId}`;
};

export const buildLambdaLink = (
  region: string,
  functionName: string
): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/lambda/home?region=${region}#/functions/${functionName}?tab=code`;
  }
  return `https://${region}.console.aws.amazon.com/lambda/home?region=${region}#/functions/${functionName}?tab=code`;
};

export const buildLambdaLogStreamLink = (
  region: string,
  functionName: string,
  logStreamName: string
): string => {
  const funcUri = functionName;
  const logStreamUri = logStreamName;
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${funcUri}/log-events/${logStreamUri}`;
  }
  return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${funcUri}/log-events/${logStreamUri}`;
};

export const buildRDSLink = (region: string): string => {
  if (region.startsWith("cn")) {
    return `https://console.amazonaws.cn/rds/home?region=${region}#databases:`;
  }
  return `https://console.aws.amazon.com/rds/home?region=${region}#databases:`;
};

export const buildRoleLink = (roleId: string, region: string): string => {
  if (region.startsWith("cn")) {
    return `https://console.amazonaws.cn/iam/home?#/roles/${roleId}`;
  }
  return `https://console.aws.amazon.com/iam/home?#/roles/${roleId}`;
};

export const buildAlarmLink = (region: string): string => {
  if (region.startsWith("cn")) {
    return `https://console.amazonaws.cn/cloudwatch/home?region=${region}#alarmsV2:`;
  }
  return `https://console.aws.amazon.com/cloudwatch/home?region=${region}#alarmsV2:`;
};

export const buildWAFLink = (region: string, webACLScope?: string): string => {
  if (region.startsWith("cn")) {
    return `https://console.amazonaws.cn/wafv2/homev2/web-acls?region=${region}`;
  } else {
    if (webACLScope === "CLOUDFRONT") {
      return `https://console.aws.amazon.com/wafv2/homev2/web-acls?region=global`;
    } else {
      return `https://console.aws.amazon.com/wafv2/homev2/web-acls?region=${region}`;
    }
  }
};

export const buildELBLink = (region: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/ec2/v2/home?region=${region}#LoadBalancers`;
  }
  return `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#LoadBalancers`;
};

export const buildKeyPairsLink = (region: string) => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/ec2/v2/home?region=${region}#KeyPairs:`;
  }
  return `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#KeyPairs:`;
};

export const buildEKSLink = (
  region: string,
  clusterName?: string | null | undefined
): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/eks/home?region=${region}#/clusters${
      clusterName ? "/" + clusterName : ""
    }`;
  }
  return `https://${region}.console.aws.amazon.com/eks/home?region=${region}#/clusters${
    clusterName ? "/" + clusterName : ""
  }`;
};

export const buildASGLink = (region: string, groupName: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/ec2/home?region=${region}#AutoScalingGroupDetails:id=${groupName}`;
  }
  return `https://${region}.console.aws.amazon.com/ec2/home?region=${region}#AutoScalingGroupDetails:id=${groupName}`;
};

export const buildCrossAccountTemplateLink = (
  region: string,
  solutionVersion: string,
  templateBucket: string,
  solutionName: string
): string => {
  return `https://${templateBucket}.s3.amazonaws.com/${solutionName}/${solutionVersion}/CrossAccount.template`;
};

export const buildSQSLink = (region: string, queueName: string): string => {
  const uri = `https://sqs.${region}.amazonaws.com//`;
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/sqs/v2/home?region=${region}#/queues/${encodeURIComponent(
      uri
    )}${queueName}`;
  }
  return `https://${region}.console.aws.amazon.com/sqs/v2/home?region=${region}#/queues/${encodeURIComponent(
    uri
  )}${queueName}`;
};

export const buildNLBLinkByDNS = (region: string, dnsName: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/ec2/home?region=${region}#LoadBalancers:dnsName=${dnsName}`;
  }
  return `https://${region}.console.aws.amazon.com/ec2/home?region=${region}#LoadBalancers:dnsName=${dnsName}`;
};

export const buildLambdaCWLGroupLink = (
  region: string,
  groupName: string
): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${groupName.replace(
      /\//g,
      decodeURIComponent("%24252F")
    )}`;
  }
  return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${groupName.replace(
    /\//g,
    decodeURIComponent("%24252F")
  )}
    `;
};

export const buildGlueTableLink = (
  region: string,
  database = "",
  table = ""
): string => {
  return `https://${region}.${
    region.startsWith("cn") ? "console.amazonaws.cn" : "console.aws.amazon.com"
  }/glue/home?region=${region}#/v2/data-catalog/tables/view/${table}?database=${database}`;
};

export const buildGlueDatabaseLink = (
  region: string,
  database = ""
): string => {
  return `https://${region}.${
    region.startsWith("cn") ? "console.amazonaws.cn" : "console.aws.amazon.com"
  }/glue/home?region=${region}#/v2/data-catalog/databases/view/${database}`;
};

export const buildStepFunctionLink = (region: string, arn = ""): string => {
  return `https://${region}.${
    region.startsWith("cn") ? "console.amazonaws.cn" : "console.aws.amazon.com"
  }/states/home?region=${region}#/statemachines/view/${arn}`;
};

export const buildSchedulerLink = (
  region: string,
  type?: SchedulerType,
  group?: string,
  name?: string
): string => {
  const host = region.startsWith("cn")
    ? "console.amazonaws.cn"
    : "console.aws.amazon.com";
  return type === SchedulerType.EventBridgeScheduler
    ? `https://${region}.${host}/scheduler/home?region=${region}#schedules/${group}/${name}`
    : `https://${region}.${host}/events/home?region=${region}#/eventbus/${group}/rules/${name}`;
};

export const buildStepFunctionExecutionLink = (
  region: string,
  arn = ""
): string => {
  return `https://${region}.${
    region.startsWith("cn") ? "console.amazonaws.cn" : "console.aws.amazon.com"
  }/states/home?region=${region}#/v2/executions/details/${arn}`;
};

export const buildOSILink = (region: string, osiName: string) => {
  return `https://${region}.${
    region.startsWith("cn") ? "console.amazonaws.cn" : "console.aws.amazon.com"
  }/aos/home?region=${region}#opensearch/ingestion-pipelines/${osiName}`;
};

export const getRegexAndTimeByConfigAndFormat = (
  curConfig: ExLogConf,
  format: string
) => {
  let tmpExp = "";
  let tmpTimeExp = "";

  if (curConfig.logType === LogType.Nginx) {
    tmpExp = buildRegexFromNginxLog(format, true);
  }
  if (curConfig.logType === LogType.Apache) {
    tmpExp = buildRegexFromApacheLog(format);
  }
  if (
    curConfig.logType === LogType.Syslog &&
    curConfig.syslogParser === SyslogParser.CUSTOM
  ) {
    tmpExp = buidSyslogRegexFromConfig(format);
  }
  if (
    curConfig.logType === LogType.SingleLineText ||
    (curConfig.logType === LogType.MultiLineText &&
      curConfig.multilineLogParser === MultiLineLogParser.CUSTOM)
  ) {
    tmpExp = format;
  }
  if (
    curConfig.logType === LogType.MultiLineText &&
    curConfig.multilineLogParser === MultiLineLogParser.JAVA_SPRING_BOOT
  ) {
    const { regexStr, timeRegexStr } = buildSpringBootRegExFromConfig(format);
    tmpExp = regexStr;
    tmpTimeExp = timeRegexStr;
  }
  return { tmpExp, tmpTimeExp };
};

export function containsNonLatinCodepoints(str: string) {
  return [...str].some((char) => char.charCodeAt(0) > 127);
}

export function generateEc2Permissions(
  awsPartition: string,
  accountId: string,
  getObjectResources: string[]
): string {
  return JSON.stringify(
    {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "VisualEditor0",
          Effect: "Allow",
          Action: "s3:GetObject",
          Resource: getObjectResources,
        },
        {
          Sid: "AssumeRoleInMainAccount",
          Effect: "Allow",
          Action: "sts:AssumeRole",
          Resource: [
            `arn:${awsPartition}:iam::${accountId}:role/${stackPrefix}-buffer-access*`,
          ],
        },
        {
          Sid: "AssumeRoleInMainAccountCWL",
          Effect: "Allow",
          Action: "sts:AssumeRole",
          Resource: [
            `arn:${awsPartition}:iam::${accountId}:role/${stackPrefix}-cloudwatch-access*`,
          ],
        },
        {
          Effect: "Allow",
          Action: [
            "ssm:DescribeInstanceProperties",
            "ssm:UpdateInstanceInformation",
          ],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: [
            "ec2messages:GetEndpoint",
            "ec2messages:AcknowledgeMessage",
            "ec2messages:SendReply",
            "ec2messages:GetMessages",
          ],
          Resource: "*",
        },
      ],
    },
    null,
    2
  );
}

export const getAWSPartition = (region: string) => {
  return region.startsWith("cn") ? "aws-cn" : "aws";
};

export type FieldValidator<T> = (param: T) => string;

export const createFieldValidator =
  <T extends any[]>(validator: (...params: T) => boolean) =>
  (errorMessage: string | (() => string)) =>
  (...params: T) => {
    if (!validator(...params)) {
      return typeof errorMessage === "string" ? errorMessage : errorMessage();
    }
    return "";
  };

export const validateRequiredText = createFieldValidator(
  (text?: string | null) => !!text
);

export const validateWithRegex = (reg: RegExp) =>
  createFieldValidator((text: string) => reg.test(text));

export const pipFieldValidator =
  <T extends any[]>(...validators: ((...param: T) => string)[]) =>
  (...param: T) => {
    for (const validator of validators) {
      const res = validator(...param);
      if (res !== "") {
        return res;
      }
    }
    return "";
  };

export const validateS3BucketName = createFieldValidator((text: string) =>
  bucketNameIsValid(text)
);

export const validateContainNonLatin = createFieldValidator((text: string) =>
  containsNonLatinCodepoints(text)
);

export const withI18nErrorMessage =
  <T>(validator: FieldValidator<T>) =>
  (param: T) => {
    const i18nKey = validator(param);
    return i18nKey === "" ? "" : i18n.t(i18nKey);
  };

type Reducer<State, Action> = (state: State, action: Action) => State;

export const combineReducers =
  <State, Action, K extends keyof State = keyof State>(slices: {
    [k in K]: Reducer<State[k], any>;
  }) =>
  (state: State, action: Action) =>
    Object.keys(slices).reduce((acc, prop) => {
      const reducer = slices[prop as K];
      return {
        ...acc,
        [prop as K]: reducer(acc[prop as K], action),
      };
    }, state);

/**
 * The `ternary` function in TypeScript returns `caseOne` if `cond` is true, otherwise it returns
 * `caseTwo`.
 * @param {any} cond - A boolean value that represents the condition to be evaluated.
 * @param {T} caseOne - The `caseOne` parameter is the value that will be returned if the `cond`
 * parameter is `true`.
 * @param {T} caseTwo - The `caseTwo` parameter is the value that will be returned if the `cond`
 * parameter is `false`.
 */
export const ternary = <T>(cond: any, caseOne: T, caseTwo: T) =>
  cond ? caseOne : caseTwo;

export const hasSamePrefix = (paths: string[]) => {
  if (paths.length === 0) {
    return false;
  }
  const prefixes = paths.map((path) => path.slice(0, path.lastIndexOf("/")));
  return prefixes.every((prefix) => prefix === prefixes[0]);
};

export const buildOSIParamsValue = (osiObj: SelectProcessorType) => {
  return {
    minCapacity: ternary(
      osiObj.logProcessorType === LogProcessorType.OSI,
      parseInt(osiObj.minOCU),
      0
    ),
    maxCapacity: ternary(
      osiObj.logProcessorType === LogProcessorType.OSI,
      parseInt(osiObj.maxOCU),
      0
    ),
  };
};

export const buildOSIPipelineNameByPipelineId = (pipelineId: string) => {
  return `cl-${pipelineId.substring(0, 23)}`;
};

export const isOSIPipeline = (
  pipeline?: AppPipeline | ServiceLogDetailProps | null
) => {
  return !!(
    pipeline?.osiParams?.minCapacity &&
    parseInt(pipeline.osiParams.minCapacity.toString()) > 0
  );
};

export const isEmpty = (value: any) => {
  if (value === null || value === undefined || value === "{}") {
    return true;
  }
  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  return false;
};

export const defaultStr = (
  expectStr: string | null | undefined,
  defaultValue?: string
) => {
  return expectStr ?? defaultValue ?? "";
};
