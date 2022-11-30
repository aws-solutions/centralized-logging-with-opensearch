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
import IMAGE_SL_Amazon_S3 from "assets/images/type/amazon_s3.svg";
import IMAGE_SL_Amazon_RDS from "assets/images/type/amazon_rds.svg";
import IMAGE_SL_Amazon_CloudTrail from "assets/images/type/amazon_cloudtrail.svg";
import IMAGE_SL_Amazon_CloudFront from "assets/images/type/amazon_cloudfront.svg";
import IMAGE_SL_Amazon_Lambda from "assets/images/type/amazon_lambda.svg";
import IMAGE_SL_Amazon_ELB from "assets/images/type/amazon_elb.svg";
import IMAGE_SL_Amazon_WAF from "assets/images/type/amazon_waf.svg";
import IMAGE_SL_Amazon_VPCLogs from "assets/images/type/amazon_vpclogs.svg";
import IMAGE_SL_Amazon_Config from "assets/images/type/amazon_config.svg";

import {
  AlarmType,
  LogConfFilterCondition,
  LogType,
  MultiLineLogParser,
  ProtocolType,
  SyslogParser,
} from "API";
import { OptionType } from "components/AutoComplete/autoComplete";
export const INVALID = "invalid";
export const AUTO_REFRESH_INT = 8000;

export const DEFAULT_AGENT_VERSION = "FluentBit 1.9.9";
export const DEFAULT_PLATFORM = "Linux";
export const ASG_SELECTION = "Auto Scaling group";
export const DEFAULT_INSTANCE_SELECTION = "Manual";

export const SIDE_BAR_OPEN_STORAGE_ID = "__log_hub_side_bar_open_storage_id__";
export const AMPLIFY_CONFIG_JSON = "__log_hub_amplify_config_json__";
export const PIPELINE_TASK_ES_USER_DEFAULT = "__log_hub_task_default_user_es__";

export const S3_TASK_SUFFIX = "-s3";
export const CLOUDTRAIL_TASK_SUFFIX = "-cloudtrail";
export const CLOUDFRONT_TASK_SUFFIX = "-cloudfront";
export const LAMBDA_TASK_SUFFIX = "-lambda";
export const RDS_TASK_SUFFIX = "-rds";
export const ELB_TASK_SUFFIX = "-elb";
export const WAF_TASK_SUFFIX = "-waf";
export const VPC_TASK_SUFFIX = "-vpc";
export const AWSCONFIG_TASK_SUFFIX = "-config";

export const LAMBDA_TASK_GROUP_PREFIX = "/aws/lambda/";
export const RDS_TASK_GROUP_PREFIX = "/aws/rds";

export const RDS_LOG_GROUP_SUFFIX_ERROR = "/error";
export const RDS_LOG_GROUP_SUFFIX_SLOWQUERY = "/slowquery";
export const RDS_LOG_GROUP_SUFFIX_GENERAL = "/general";
export const RDS_LOG_GROUP_SUFFIX_AUDIT = "/audit";

export const EN_LANGUAGE_LIST = ["en", "en_US", "en_GB"];
export const ZH_LANGUAGE_LIST = ["zh", "zh_CN", "zh_TW"];

export const GITHUB_LINK = "https://github.com/awslabs/log-hub";
export const URL_FEEDBACK = GITHUB_LINK + "/issues";

const LOGHUB_DOCS_DOMAIN = "https://awslabs.github.io";
const LOGHUB_DEV_DOCS_DOMAIN = "https://log-hub.docs.solutions.gcr.aws.dev";
export const LOGHUB_DOCS_LINK = `${LOGHUB_DOCS_DOMAIN}/log-hub/`;
export const buildLogHubDocsLink = (
  lang: string,
  link: string,
  version?: string
) => {
  return `${
    version === "develop"
      ? LOGHUB_DEV_DOCS_DOMAIN
      : LOGHUB_DOCS_DOMAIN + "/log-hub"
  }${ZH_LANGUAGE_LIST.indexOf(lang) >= 0 ? "/zh" : "/en"}/${link}`;
};

export const HELP_ALB_LINK =
  "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html";
export const HELP_ACM_LINK =
  "https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html";
export const HELP_CLOUDWATCH_ALARM_LINK =
  "https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cloudwatch-alarms.html";
export const HELP_VPC_PEERING_LINK =
  "https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html";
export const HELP_PRIVATE_S3_LINK =
  "https://docs.aws.amazon.com/AmazonS3/latest/userguide/privatelink-interface-endpoints.html";
export const HELP_NAT_GW_LINK =
  "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html";
export const HELP_CLOUDWATCH_LOG_LINK =
  "https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html";
export const HELP_ISM_LINK =
  "https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ism.html";

export const OS_SERVICE_LINK =
  "https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html";

export const DOCS_LINK_CREATE_ES =
  "https://docs.aws.amazon.com/opensearch-service/latest/developerguide/gsgcreate-domain.html";

export const ENABLE_ULTRAWARM =
  "https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ultrawarm.html#ultrawarm-enable";

export const ENABLE_CLODSTATE =
  "https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cold-storage.html#coldstorage-enable";

export const S3_ACCESS_LOG_LINK =
  "https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html";

export const CLOUDTRAIL_LOG_LINK =
  "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-find-log-files.html";

export const RDS_LOG_LINK =
  "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.html";

export const CLOUDFRONT_LOG_LINK =
  "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/logging.html";

export const LAMBDA_LOG_LINK =
  "https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html";

export const ELB_ACCESS_LOG_LINK =
  "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html";

export const WAF_ACCESS_LOG_LINK =
  "https://docs.aws.amazon.com/waf/latest/developerguide/logging.html";

export const AWS_CONFIG_LOG_LINK =
  "https://docs.aws.amazon.com/config/latest/developerguide/manage-delivery-channel.html";

export const VPC_FLOW_LOG_LINK =
  "https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html";

export const ENABLE_RDS_LOGS_LINK =
  "https://aws.amazon.com/premiumsupport/knowledge-center/rds-mysql-logs/";

export const GRANT_EC2_PERMISSION_LINK =
  "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html#permission-to-pass-iam-roles";

export const NGINX_LOG_CONFIG_LINK =
  "https://docs.nginx.com/nginx/admin-guide/monitoring/logging/";

export const APACHE_LOG_CONFIG_LINK =
  "https://httpd.apache.org/docs/2.4/logs.html";

export const REG_EX_LOG_HELP_LINK_1 =
  "https://en.wikipedia.org/wiki/Regular_expression";
export const REG_EX_LOG_HELP_LINK_2 = "https://rubular.com/";
export const REG_EX_LOG_HELP_LINK_3 =
  "https://docs.fluentbit.io/manual/pipeline/parsers/regular-expression";

export const RUBULAR_LINK = "https://rubular.com/";

export const DAEMONSET_LINK =
  "https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/";

export const STRFTIME_LINK =
  "https://www.cplusplus.com/reference/ctime/strftime/";

export const CREATE_OS_ALARM_LINK =
  "https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cloudwatch-alarms.html";

export const CREATE_OS_PROXY_LINK =
  "https://aws.amazon.com/premiumsupport/knowledge-center/opensearch-outside-vpc-nginx/";

export const DOC_VPC_ACCEPT_LINK =
  "https://docs.aws.amazon.com/vpc/latest/peering/create-vpc-peering-connection.html";

export const DOC_VPC_ROUTE_TABLE_LINK =
  "https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html";

export const DOC_VPC_SECURITY_GROUP_LINK =
  "https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-security-groups.html";

export const CONFIG_FILTER_GREP_LINK =
  "https://docs.fluentbit.io/manual/pipeline/filters/grep";

export const ASG_LAUNCH_TEMPLATE_LINK =
  "https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html#advanced-settings-for-your-launch-template";

export const ASG_LAUNCH_CONFIG_LINK =
  "https://docs.aws.amazon.com/autoscaling/ec2/userguide/change-launch-config.html";

export enum ServiceLogType {
  Amazon_S3 = "Amazon_S3",
  Amazon_RDS = "Amazon_RDS",
  Amazon_CloudTrail = "Amazon_CloudTrail",
  Amazon_CloudFront = "Amazon_CloudFront",
  Amazon_Lambda = "Amazon_Lambda",
  Amazon_VPCLogs = "Amazon_VPCLogs",
  Amazon_ELB = "Amazon_ELB",
  Amazon_WAF = "Amazon_WAF",
  Amazon_Config = "Amazon_Config",
}

type ServiceTypeDesc = {
  [key: string]: any;
};

export const ServiceTypeDescMap: ServiceTypeDesc = {
  Amazon_S3: {
    desc: "<bucket name>" + S3_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: S3_TASK_SUFFIX + "-YYYY-MM-DD",
  },
  Amazon_RDS: {
    desc: "<db identifier>" + RDS_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: RDS_TASK_SUFFIX + "-YYYY-MM-DD",
  },
  Amazon_CloudTrail: {
    desc: "<cloudtrail name>" + CLOUDTRAIL_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: CLOUDTRAIL_TASK_SUFFIX + "-YYYY-MM-DD",
  },
  Amazon_CloudFront: {
    desc: "<distribution id>" + CLOUDFRONT_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: CLOUDFRONT_TASK_SUFFIX + "-YYYY-MM-DD",
  },
  Amazon_Lambda: {
    desc: "<function name>" + LAMBDA_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: LAMBDA_TASK_SUFFIX + "-YYYY-MM-DD",
  },
  Amazon_ELB: {
    desc: "<elb name>" + ELB_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: ELB_TASK_SUFFIX + "-YYYY-MM-DD",
  },
  Amazon_WAF: {
    desc: "<waf name>" + WAF_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: WAF_TASK_SUFFIX + "-YYYY-MM-DD",
  },
  Amazon_VPCLogs: {
    desc: "<vpc name>" + VPC_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: VPC_TASK_SUFFIX + "-YYYY-MM-DD",
  },
  Amazon_Config: {
    desc: "<config name>" + AWSCONFIG_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: AWSCONFIG_TASK_SUFFIX + "-YYYY-MM-DD",
  },
};

type LogMapType = {
  [key: string]: string;
};

export enum ResourceStatus {
  INACTIVE = "INACTIVE",
}

export const ServiceTypeMap: LogMapType = {
  S3: "S3",
  CloudTrail: "CloudTrail",
  CloudFront: "CloudFront",
  Lambda: "Lambda",
  RDS: "RDS",
  ELB: "ELB",
  WAF: "WAF",
  WAFSampled: "WAFSampled",
  VPC: "VPC",
  Config: "Config",
};

export const ServiceLogTypeMap: LogMapType = {
  Amazon_S3: "s3",
  Amazon_RDS: "rds",
  Amazon_CloudTrail: "cloudtrail",
  Amazon_CloudFront: "cloudfront",
  Amazon_Lambda: "lambda",
  Amazon_VPCLogs: "vpclogs",
  Amazon_ELB: "elb",
  Amazon_WAF: "waf",
  Amazon_Config: "config",
};

export const ServiceLogList = [
  {
    value: ServiceLogType.Amazon_S3,
    name: "servicelog:create.service.s3",
    img: IMAGE_SL_Amazon_S3,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_CloudTrail,
    name: "servicelog:create.service.trail",
    img: IMAGE_SL_Amazon_CloudTrail,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_RDS,
    name: "servicelog:create.service.rds",
    img: IMAGE_SL_Amazon_RDS,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_CloudFront,
    name: "servicelog:create.service.cloudfront",
    img: IMAGE_SL_Amazon_CloudFront,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_Lambda,
    name: "servicelog:create.service.lambda",
    img: IMAGE_SL_Amazon_Lambda,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_ELB,
    name: "servicelog:create.service.elb",
    img: IMAGE_SL_Amazon_ELB,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_WAF,
    name: "servicelog:create.service.waf",
    img: IMAGE_SL_Amazon_WAF,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_VPCLogs,
    name: "servicelog:create.service.vpc",
    img: IMAGE_SL_Amazon_VPCLogs,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_Config,
    name: "servicelog:create.service.config",
    img: IMAGE_SL_Amazon_Config,
    disabled: false,
  },
];

export enum CreateLogMethod {
  Automatic = "Automatic",
  Manual = "Manual",
}

export enum RDSTypes {
  Aurora = "Aurora",
  MySQL = "MySQL",
}

export const RDS_TYPE_LIST = [
  { name: "Aurora MySQL", value: RDSTypes.Aurora },
  { name: "RDS MySQL", value: RDSTypes.MySQL },
];

export type AlarmParamType = {
  key: AlarmType;
  name: string;
  value: boolean | string;
  isChecked: boolean;
  isNumber?: boolean;
  isInvalid?: boolean;
};

export const FB_TYPE_LIST = [
  { name: "null", value: "null" },
  { name: "boolean", value: "boolean" },
  { name: "byte", value: "byte" },
  { name: "short", value: "short" },
  { name: "integer", value: "integer" },
  { name: "long", value: "long" },
  { name: "double", value: "double" },
  { name: "float", value: "float" },
  { name: "half_float", value: "half_float" },
  { name: "scaled_float", value: "scaled_float" },
  { name: "keyword", value: "keyword" },
  { name: "text", value: "text" },
  { name: "binary", value: "binary" },
  { name: "date", value: "date" },
  { name: "ip", value: "ip" },
];

export const LOG_CONFIG_TYPE_LIST = [
  { name: "resource:config.type.json", value: LogType.JSON },
  { name: "resource:config.type.apache", value: LogType.Apache },
  { name: "resource:config.type.nginx", value: LogType.Nginx },
  { name: "resource:config.type.syslog", value: LogType.Syslog },
  { name: "resource:config.type.singleLine", value: LogType.SingleLineText },
  { name: "resource:config.type.multiLine", value: LogType.MultiLineText },
];

export const SYSLOG_CONFIG_TYPE_LIST = [
  { name: "resource:config.type.syslog", value: LogType.Syslog },
  { name: "resource:config.type.json", value: LogType.JSON },
  { name: "resource:config.type.singleLine", value: LogType.SingleLineText },
];

export const MULTI_LINE_LOG_PARSER_LIST = [
  { name: "Java-Spring Boot", value: MultiLineLogParser.JAVA_SPRING_BOOT },
  { name: "Custom", value: MultiLineLogParser.CUSTOM },
];

export const SYS_LOG_PARSER_LIST = [
  { name: "RFC5424", value: SyslogParser.RFC5424 },
  { name: "RFC3164", value: SyslogParser.RFC3164 },
  { name: "Custom", value: SyslogParser.CUSTOM },
];

export const domainAlramList: AlarmParamType[] = [
  {
    key: AlarmType.CLUSTER_RED,
    name: "cluster:detail.alarms.list.clusterRed",
    value: "false",
    isChecked: false,
  },
  {
    key: AlarmType.CLUSTER_YELLOW,
    name: "cluster:detail.alarms.list.clusterYellow",
    value: "false",
    isChecked: false,
  },
  {
    key: AlarmType.FREE_STORAGE_SPACE,
    name: "cluster:detail.alarms.list.freeStorageSpace",
    value: "20",
    isChecked: false,
    isNumber: true,
  },
  {
    key: AlarmType.WRITE_BLOCKED,
    name: "cluster:detail.alarms.list.writeBlocked",
    value: "1",
    isChecked: false,
    isNumber: true,
  },
  {
    key: AlarmType.NODE_UNREACHABLE,
    name: "cluster:detail.alarms.list.nodeUnreachable",
    value: "3",
    isChecked: false,
    isNumber: true,
  },
  {
    key: AlarmType.SNAPSHOT_FAILED,
    name: "cluster:detail.alarms.list.snapshotFailed",
    value: "false",
    isChecked: false,
  },
  {
    key: AlarmType.CPU_UTILIZATION,
    name: "cluster:detail.alarms.list.cpuUtilization",
    value: "false",
    isChecked: false,
  },
  {
    key: AlarmType.JVM_MEMORY_PRESSURE,
    name: "cluster:detail.alarms.list.jvmMemory",
    value: "false",
    isChecked: false,
  },
  {
    key: AlarmType.MASTER_CPU_UTILIZATION,
    name: "cluster:detail.alarms.list.masterCPU",
    value: "false",
    isChecked: false,
  },
  {
    key: AlarmType.MASTER_JVM_MEMORY_PRESSURE,
    name: "cluster:detail.alarms.list.masterJVM",
    value: "false",
    isChecked: false,
  },
  {
    key: AlarmType.KMS_KEY_DISABLED,
    name: "cluster:detail.alarms.list.kmsKeyDisabled",
    value: "false",
    isChecked: false,
  },
  {
    key: AlarmType.KMS_KEY_INACCESSIBLE,
    name: "cluster:detail.alarms.list.kmsKeyDisabled",
    value: "false",
    isChecked: false,
  },
];

export const S3_FILE_TYPE_LIST = [
  { name: "Json", value: "json" },
  { name: "Single-line Text", value: "text" },
];

export const REPLICA_COUNT_LIST = [
  { name: "0", value: "0" },
  { name: "1", value: "1" },
  { name: "2", value: "2" },
  { name: "3", value: "3" },
];

export const AMPLIFY_ZH_DICT = {
  zh: {
    "Sign In": "登录",
    "Sign Up": "注册",
    "Sign Out": "退出",
    "Forgot your password?": "忘记密码？",
    "Reset your password": "重置密码",
    "Reset password": "重置密码",
    Username: "用户名",
    Password: "密码",
    "Change Password": "修改密码",
    Email: "邮箱",
    email: "邮箱",
    "Phone Number": "电话",
    "Confirm a Code": "确认码",
    "Confirm Sign In": "确认登录",
    "Confirm Sign Up": "确认注册",
    "Back to Sign In": "回到登录",
    "Send Code": "发送确认码",
    Confirm: "确认",
    "Resend a Code": "重发确认码",
    Submit: "提交",
    Skip: "跳过",
    Verify: "验证",
    "Verify Contact": "验证联系方式",
    Code: "确认码",
    "Account recovery requires verified contact information":
      "账户恢复需要验证过的联系方式",
    "User does not exist": "用户不存在",
    "User already exists": "用户已经存在",
    "Incorrect username or password.": "用户名或密码错误",
    "Invalid password format": "密码格式错误",
    "Invalid phone number format": "电话格式错误，请使用格式 +12345678900",
    "Enter your username": "请输入您的邮箱",
    "Enter your password": "请输入您的密码",
    "Enter your phone number": "请输入您的手机号",
    "Enter your email": "请输入您的邮箱",
    "Enter your code": "请输入您的验证码",
    "Lost your code?": "没收到验证码？",
    "Resend Code": "重新发送验证码",
    "New password": "新密码",
    "Enter your new password": "请输入新密码",
    Change: "修改",
  },
};

export enum CompressionType {
  None = "",
  Gzip = "gzip",
}

export const COMPRESS_TYPE = [
  {
    name: "None",
    value: CompressionType.None,
  },
  {
    name: "Gzip",
    value: CompressionType.Gzip,
  },
];

export const FILTER_CONDITION_LIST = [
  {
    name: "resource:config.filter.include",
    value: LogConfFilterCondition.Include,
  },
  {
    name: "resource:config.filter.exclude",
    value: LogConfFilterCondition.Exclude,
  },
];

export const generateTimeZoneList = () => {
  const timezoneOptionList: OptionType[] = [];
  for (let i = -12; i <= 12; i++) {
    timezoneOptionList.push({
      name:
        i < 0
          ? "UTC-" + Math.abs(i).toString().padStart(2, "0") + ":00"
          : "UTC+" + Math.abs(i).toString().padStart(2, "0") + ":00",
      value:
        i < 0
          ? "-" + Math.abs(i).toString().padStart(2, "0") + "00"
          : "+" + Math.abs(i).toString().padStart(2, "0") + "00",
    });
  }
  return timezoneOptionList;
};

export const PROTOCOL_LIST = [
  {
    name: "UDP",
    value: ProtocolType.UDP,
  },
  {
    name: "TCP",
    value: ProtocolType.TCP,
  },
];

export const S3_BUFFER_PREFIX =
  "AppLogs/<index-prefix>/year=%Y/month=%m/day=%d";

export const RFC3164_DEFAULT_REGEX = `^\\<(?<pri>[0-9]+)\\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\\/\\.\\-]*)(?:\\[(?<pid>[0-9]+)\\])?(?:[^\\:]*\\:)? *(?<message>.*)$`;
export const RFC5424_DEFAULT_REGEX = `^\\<(?<pri>[0-9]{1,5})\\>1 (?<time>[^ ]+) (?<host>[^ ]+) (?<ident>[^ ]+) (?<pid>[-0-9]+) (?<msgid>[^ ]+) (?<extradata>(\\[(.*)\\]|-)) (?<message>.+)$`;

export const NOT_SUPPORT_KDS_AUTO_SCALING_REGION = ["cn-northwest-1"];
