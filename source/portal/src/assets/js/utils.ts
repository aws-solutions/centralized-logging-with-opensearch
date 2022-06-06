/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
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
import { EngineType } from "API";

const SPRINGBOOT_DEFAULT_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss,SSS";

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

// check index name is valid
export const checkIndexNameValidate = (indexName: string): boolean => {
  const IndexRegEx = /^[a-z][a-z0-9_-]*$/;
  return IndexRegEx.test(indexName);
};

// checkt string is json format
export const IsJsonString = (str: string): boolean => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

// format json string to dot
export const JsonToDotNotate = (obj: any, target?: any, prefix?: string) => {
  (target = target || {}), (prefix = prefix || "");
  Object.keys(obj).forEach(function (key) {
    if (typeof obj[key] !== "object" && obj[key] !== null) {
      return (target[prefix + key] = obj[key]);
    }
  });
  return target;
};

// export const JsonToDotNotate = (obj: any, target?: any, prefix?: string) => {
//   (target = target || {}), (prefix = prefix || "");
//   Object.keys(obj).forEach(function (key) {
//     if (typeof obj[key] === "object" && obj[key] !== null) {
//       JsonToDotNotate(obj[key], target, prefix + key + ".");
//     } else {
//       return (target[prefix + key] = obj[key]);
//     }
//   });
//   return target;
// };

// format date
export const formatLocalTime = (time: string): string => {
  if (time) {
    return format(new Date(parseISO(time || "")), "yyyy-MM-dd HH:mm:ss");
  } else {
    return "-";
  }
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
  // console.info(logContentString.split(" "))
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
      return `(${groupName}\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+`;
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

// Spring Boot RegEx Generation
const timeWordsArr = ["%d", "%date"];
const timeWordsWithoutPercentArr = ["d", "date"];
const loggerWordsArr = ["%c", "%lo", "%logger"];
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

export const buildSpringBootRegExFromConfig = (
  logConfigString: string
): string => {
  function repaceTimeD(match: any) {
    return match.replaceAll("d", "\\d{1,2}");
  }

  // 首先找出 %X{XX} 这样的组合
  function findPercentAndBracket(match: any) {
    const stepMatch: any = match.match(/%\w+/);
    if (timeWordsArr.includes(stepMatch[0])) {
      const matchList = match.match(/{(.+)}/);
      let afterReplaceStr = "";
      if (matchList && matchList.length > 1) {
        const dateFormatStr = matchList[1];
        const tmpAfterReplaceStr = replaceTimeFormatToRegEx(dateFormatStr);
        // replace single d in time format
        const regexD = /[^\\](d)/gm;
        afterReplaceStr = tmpAfterReplaceStr.replace(regexD, repaceTimeD);
        console.info("afterReplaceStr:", afterReplaceStr);
      }
      return "(?<time>" + afterReplaceStr + ")";
    }
    if (loggerWordsArr.includes(stepMatch[0])) {
      return "(?<logger>\\S+)";
    }
    const matchList = match.match(/{(.+)}/);
    const mdcGroupName = matchList[1];
    return "(?<" + mdcGroupName + ">\\S+)";
  }
  const regex = /%\w+{[^{}]+}/gm;
  const afterPercentBracket = logConfigString.replace(
    regex,
    findPercentAndBracket
  );
  console.info("afterPercentBracket:", afterPercentBracket);

  // 匹配%开头的，不含%{}[]()
  const percentRegEx = /%[^%\\[\]{}()\s]+/gm;
  function findOnlyStartWithPercent(match: any) {
    console.info("percent match:", match);
    const groupName = match.match(/[a-zA-Z]+/)?.[0];
    console.info("groupName:", groupName);
    // 如果日期不包含日期格式如:{xxxx-xx-xx}, 则使用系统默认的时间都正则表达式
    if (timeWordsWithoutPercentArr.includes(groupName)) {
      return "(?<time>\\d{4}-\\d{2}-\\d{2}\\s\\d{2}:\\d{2}:\\d{2},\\d{3})";
    }
    // 找到特殊的需要处理的正则表达式，如message(%m)，换行(%n)
    if (levelGroupNameArr.includes(groupName)) {
      return "(?<level>[\\S]+)";
    }
    if (threadGroupNameArr.includes(groupName)) {
      return "(?<thread>\\S+)";
    }
    if (LineGroupNameArr.includes(groupName)) {
      return "(?<line>[\\S]+)";
    }
    if (messageGroupNameArr.includes(groupName)) {
      return "(?<message>[\\s\\S]+)";
    }
    if (groupName === "n") {
      return "";
    }
    return "(?<" + groupName + ">\\S+)";
  }

  // 处理中括号或者引号里面的情况, 如果是中括号，引号的情况，里面的内容实用 .+
  function processQuoteSplitInside(match: any) {
    const groupName = match.match(/[a-zA-Z]+/)?.[0];
    return "(?<" + groupName + ">.+)";
  }

  // 找出存在 双引号 "", 中括号 [], 这样分隔符的字段进行按需替换
  const regQuoteSplit = /("[^"]+")|(\[[^[\]].+\])/gm;
  function replaceQuoteSplitItems(match: any) {
    match = match.replace("[", "\\[").replace("]", "\\]");
    const tmpRegStr = match.replace(percentRegEx, processQuoteSplitInside);
    return tmpRegStr;
  }
  const afterReplaceQuoteSplit = afterPercentBracket.replace(
    regQuoteSplit,
    replaceQuoteSplitItems
  );
  console.info("afterReplaceQuoteSplit:", afterReplaceQuoteSplit);

  const afterOnlyPercent = afterReplaceQuoteSplit.replace(
    percentRegEx,
    findOnlyStartWithPercent
  );
  console.log("afterOnlyPercent:", afterOnlyPercent);

  const finalSpringBootReg = afterOnlyPercent.replace(/\s/gm, "\\s+");
  console.info("finalSpringBootReg:", finalSpringBootReg);
  return finalSpringBootReg;
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

export const buildESLink = (region: string, domainName: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/esv3/home?region=${region}#opensearch/domains/${domainName}`;
  }
  return `https://${region}.console.aws.amazon.com/esv3/home?region=${region}#opensearch/domains/${domainName}`;
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

export const buildVPCLink = (vpcId: string, region: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/vpc/home?region=${region}#vpcs:VpcId=${vpcId}`;
  }
  return `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#vpcs:VpcId=${vpcId}`;
};

export const buildSubnetLink = (subnetId: string, region: string): string => {
  if (region.startsWith("cn")) {
    return `https://console.amazonaws.cn/vpc/home?region=${region}#subnets:subnetId=${subnetId}`;
  }
  return `https://console.aws.amazon.com/vpc/home?region=${region}#subnets:subnetId=${subnetId}`;
};

export const buildSGLink = (sgId: string, region: string): string => {
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

export const buildS3Link = (
  bucketName: string,
  region: string,
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

export const buildTrailLink = (trailName: string, region: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/cloudtrail/home?region=${region}#/trails`;
  }
  return `https://${region}.console.aws.amazon.com/cloudtrail/home?region=${region}#/trails`;
};

export const buildCloudFrontLink = (
  cloudFrontId: string,
  region: string
): string => {
  if (region.startsWith("cn")) {
    return `https://console.amazonaws.cn/cloudfront/v3/home?region=${region}#/distributions/${cloudFrontId}`;
  }
  return `https://console.aws.amazon.com/cloudfront/v3/home?region=${region}#/distributions/${cloudFrontId}`;
};

export const buildLambdaLink = (
  functionName: string,
  region: string
): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/lambda/home?region=${region}#/functions/${functionName}?tab=code`;
  }
  return `https://${region}.console.aws.amazon.com/lambda/home?region=${region}#/functions/${functionName}?tab=code`;
};

export const buildRDSLink = (dbId: string, region: string): string => {
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

export const buildWAFLink = (region: string): string => {
  if (region.startsWith("cn")) {
    return `https://console.amazonaws.cn/wafv2/homev2/web-acls?region=${region}`;
  }
  return `https://console.aws.amazon.com/wafv2/homev2/web-acls?region=${region}`;
};

export const buildELBLink = (region: string): string => {
  if (region.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/ec2/v2/home?region=${region}#LoadBalancers`;
  }
  return `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#LoadBalancers`;
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
