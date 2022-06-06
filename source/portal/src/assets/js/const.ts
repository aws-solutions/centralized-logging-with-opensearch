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
// import IMAGE_SL_Amazon_VPCLogs from "assets/images/type/amazon_vpclogs.svg";

import { AlarmType, LogType, MultiLineLogParser } from "API";
export const INVALID = "invalid";

export const DEFAULT_AGENT_VERSION = "FluentBit 1.8";
export const DEFAULT_PLATFORM = "Linux";
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
export const LOGHUB_DOCS_LINK = `${LOGHUB_DOCS_DOMAIN}/log-hub/`;
export const buildLogHubDocsLink = (lang: string, link: string) => {
  return `${LOGHUB_DOCS_DOMAIN}/log-hub${
    ZH_LANGUAGE_LIST.indexOf(lang) >= 0 ? "/zh" : "/en"
  }/${link}`;
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

export enum ServiceLogType {
  Amazon_S3 = "Amazon_S3",
  Amazon_RDS = "Amazon_RDS",
  Amazon_CloudTrail = "Amazon_CloudTrail",
  Amazon_CloudFront = "Amazon_CloudFront",
  Amazon_Lambda = "Amazon_Lambda",
  Amazon_VPCLogs = "Amazon_VPCLogs",
  Amazon_ELB = "Amazon_ELB",
  Amazon_WAF = "Amazon_WAF",
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
    desc: "<waf name>" + ELB_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: ELB_TASK_SUFFIX + "-YYYY-MM-DD",
  },
  Amazon_WAF: {
    desc: "<waf name>" + WAF_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: WAF_TASK_SUFFIX + "-YYYY-MM-DD",
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
  // {
  //   value: ServiceLogType.Amazon_VPCLogs,
  //   name: "VPC Flow Logs",
  //   img: IMAGE_SL_Amazon_VPCLogs,
  //   disabled: true,
  // },
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
  { name: "resource:config.type.singleLine", value: LogType.SingleLineText },
  { name: "resource:config.type.multiLine", value: LogType.MultiLineText },
];

export const MULTI_LINE_LOG_PARSER_LIST = [
  { name: "Java-Spring Boot", value: MultiLineLogParser.JAVA_SPRING_BOOT },
  { name: "Custom", value: MultiLineLogParser.CUSTOM },
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
    value: "false",
    isChecked: false,
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
