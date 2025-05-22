// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
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
  CompressionType,
  DomainStatusCheckType,
  EC2GroupPlatform,
  IISlogParser,
  LogConfFilterCondition,
  LogType,
  MultiLineLogParser,
  ProtocolType,
  SyslogParser,
} from "API";
import { OptionType } from "components/AutoComplete/autoComplete";
export const INVALID = "invalid";
export const AUTO_REFRESH_INT = 8000;

export const MAX_INPUT_LENGTH = 128;

export const SOLUTION_REPO_NAME = "centralized-logging-with-opensearch";

export const LINUX_FLB_AGENT_VERSION = "FluentBit 1.9.10";
export const WINDOWS_FLB_AGENT_VERSION = "FluentBit 3.0.4 (Community)";

export const getFLBVersionByType = (type?: EC2GroupPlatform) => {
  return type === EC2GroupPlatform.Windows
    ? WINDOWS_FLB_AGENT_VERSION
    : LINUX_FLB_AGENT_VERSION;
};

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
export const VPC_TASK_SUFFIX = "-vpcflow";
export const AWSCONFIG_TASK_SUFFIX = "-config";

export const LAMBDA_TASK_GROUP_PREFIX = "/aws/lambda/";

export const EN_LANGUAGE_LIST = ["en", "en_US", "en-US", "en_GB"];
export const ZH_LANGUAGE_LIST = ["zh", "zh_CN", "zh-CN", "zh_TW"];

export const DOMAIN_ALLOW_STATUS: any = [
  DomainStatusCheckType.PASSED,
  DomainStatusCheckType.WARNING,
];

export const GITHUB_LINK =
  "https://github.com/aws-solutions/" + SOLUTION_REPO_NAME;
export const URL_FEEDBACK = GITHUB_LINK + "/issues";

export const WORKSHOP_DOCS_LINK =
  "https://catalog.workshops.aws/centralized-logging-with-opensearch";

const SOLUTION_DOCS_DOMAIN =
  "https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch";

export const buildSolutionDocsLink = (link: string) => {
  return `${SOLUTION_DOCS_DOMAIN}/${link}`;
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

export const S3_STORAGE_CLASS_LINK =
  "https://aws.amazon.com/s3/storage-classes/";

export const CLOUDWATCH_PRICING_LINK =
  "https://aws.amazon.com/cloudwatch/pricing/";

export const PIPELINE_ALARM_DOC_LINK =
  "https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/log-alarms.html";

export const CLOUDWATCH_ALARM_LINK =
  "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html";

export const OSI_PIPELINE_LINK =
  "https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ingestion.html";

export const ATHENA_FORMAT_LINK =
  "https://docs.aws.amazon.com/athena/latest/ug/compression-formats.html";

export const LAMBDA_CONCURRENCY_DOC_LINK =
  "https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html";

export const SHARD_NUMBER_LINK =
  "https://docs.aws.amazon.com/opensearch-service/latest/developerguide/sizing-domains.html#bp-sharding";

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

export enum AppLogSourceType {
  EC2 = "ec2",
  EKS = "eks",
  SYSLOG = "syslog",
  S3 = "s3",
}

type ServiceTypeDesc = {
  [key: string]: any;
};

export const ServiceTypeDescMap: ServiceTypeDesc = {
  Amazon_S3: {
    desc: S3_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: S3_TASK_SUFFIX + "-YYYY-MM-DD",
    pureSuffix: S3_TASK_SUFFIX,
  },
  Amazon_RDS: {
    desc: RDS_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: RDS_TASK_SUFFIX + "-YYYY-MM-DD",
    pureSuffix: RDS_TASK_SUFFIX,
  },
  Amazon_CloudTrail: {
    desc: CLOUDTRAIL_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: CLOUDTRAIL_TASK_SUFFIX + "-YYYY-MM-DD",
    pureSuffix: CLOUDTRAIL_TASK_SUFFIX,
  },
  Amazon_CloudFront: {
    desc: CLOUDFRONT_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: CLOUDFRONT_TASK_SUFFIX + "-YYYY-MM-DD",
    pureSuffix: CLOUDFRONT_TASK_SUFFIX,
  },
  Amazon_Lambda: {
    desc: LAMBDA_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: LAMBDA_TASK_SUFFIX + "-YYYY-MM-DD",
    pureSuffix: LAMBDA_TASK_SUFFIX,
  },
  Amazon_ELB: {
    desc: ELB_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: ELB_TASK_SUFFIX + "-YYYY-MM-DD",
    pureSuffix: ELB_TASK_SUFFIX,
  },
  Amazon_WAF: {
    desc: WAF_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: WAF_TASK_SUFFIX + "-YYYY-MM-DD",
    pureSuffix: WAF_TASK_SUFFIX,
  },
  Amazon_VPCLogs: {
    desc: VPC_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: VPC_TASK_SUFFIX + "-YYYY-MM-DD",
    pureSuffix: VPC_TASK_SUFFIX,
  },
  Amazon_Config: {
    desc: AWSCONFIG_TASK_SUFFIX + "-YYYY-MM-DD",
    suffix: AWSCONFIG_TASK_SUFFIX + "-YYYY-MM-DD",
    pureSuffix: AWSCONFIG_TASK_SUFFIX,
  },
};

type LogMapType = {
  [key: string]: string;
};

export enum ResourceStatus {
  INACTIVE = "INACTIVE",
}

export const ServiceTypeNameMap: LogMapType = {
  S3: "servicelog:create.service.s3",
  CloudTrail: "servicelog:create.service.trail",
  CloudFront: "servicelog:create.service.cloudfront",
  Lambda: "servicelog:create.service.lambda",
  RDS: "servicelog:create.service.rds",
  ELB: "servicelog:create.service.elb",
  WAF: "servicelog:create.service.waf",
  WAFSampled: "servicelog:create.service.waf",
  VPC: "servicelog:create.service.vpc",
  Config: "servicelog:create.service.config",
};

export const ServiceTypeMapMidSuffix: any = {
  S3: S3_TASK_SUFFIX,
  CloudTrail: CLOUDTRAIL_TASK_SUFFIX,
  CloudFront: CLOUDFRONT_TASK_SUFFIX,
  Lambda: LAMBDA_TASK_SUFFIX,
  RDS: RDS_TASK_SUFFIX,
  ELB: ELB_TASK_SUFFIX,
  WAF: WAF_TASK_SUFFIX,
  WAFSampled: WAF_TASK_SUFFIX,
  VPC: VPC_TASK_SUFFIX,
  Config: AWSCONFIG_TASK_SUFFIX,
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
    value: ServiceLogType.Amazon_CloudFront,
    name: ServiceTypeNameMap.CloudFront,
    img: IMAGE_SL_Amazon_CloudFront,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_WAF,
    name: ServiceTypeNameMap.WAF,
    img: IMAGE_SL_Amazon_WAF,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_ELB,
    name: ServiceTypeNameMap.ELB,
    img: IMAGE_SL_Amazon_ELB,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_VPCLogs,
    name: ServiceTypeNameMap.VPC,
    img: IMAGE_SL_Amazon_VPCLogs,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_RDS,
    name: ServiceTypeNameMap.RDS,
    img: IMAGE_SL_Amazon_RDS,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_CloudTrail,
    name: ServiceTypeNameMap.CloudTrail,
    img: IMAGE_SL_Amazon_CloudTrail,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_Config,
    name: ServiceTypeNameMap.Config,
    img: IMAGE_SL_Amazon_Config,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_Lambda,
    name: ServiceTypeNameMap.Lambda,
    img: IMAGE_SL_Amazon_Lambda,
    disabled: false,
  },
  {
    value: ServiceLogType.Amazon_S3,
    name: ServiceTypeNameMap.S3,
    img: IMAGE_SL_Amazon_S3,
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
  { name: "string", value: "string" },
  { name: "epoch_millis", value: "epoch_millis" },
  { name: "epoch_second", value: "epoch_second" },
  { name: "map", value: "map" },
  { name: "object", value: "object" },
  { name: "array", value: "array" },
];

export const LOG_CONFIG_TYPE_LIST = [
  { name: "resource:config.type.json", value: LogType.JSON },
  { name: "resource:config.type.apache", value: LogType.Apache },
  { name: "resource:config.type.nginx", value: LogType.Nginx },
  { name: "resource:config.type.syslog", value: LogType.Syslog },
  { name: "resource:config.type.singleLine", value: LogType.SingleLineText },
  { name: "resource:config.type.multiLine", value: LogType.MultiLineText },
  { name: "resource:config.type.windowsEvent", value: LogType.WindowsEvent },
  { name: "resource:config.type.iis", value: LogType.IIS },
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

export const IIS_LOG_PARSER_LIST = [
  { name: "W3C", value: IISlogParser.W3C },
  { name: "IIS", value: IISlogParser.IIS },
  { name: "NCSA", value: IISlogParser.NCSA },
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
    name: "cluster:detail.alarms.list.kmsKeyInAccess",
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

export const COMPRESS_TYPE = [
  {
    name: "None",
    value: CompressionType.NONE,
  },
  {
    name: "Gzip",
    value: CompressionType.GZIP,
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
  "AppLogs/<index-prefix>/year=%Y/month=%m/day=%d/";

export const NOT_SUPPORT_KDS_AUTO_SCALING_REGION = ["cn-northwest-1"];

export const CloudFrontFieldTypeList = [
  { name: "asn", value: "asn" },
  { name: "c-country", value: "c-country" },
  { name: "c-ip", value: "c-ip" },
  { name: "c-ip-version", value: "c-ip-version" },
  { name: "c-port", value: "c-port" },
  {
    name: "cache-behavior-path-pattern",
    value: "cache-behavior-path-pattern",
  },
  { name: "cs-accept", value: "cs-accept" },
  { name: "cs-accept-encoding", value: "cs-accept-encoding" },
  { name: "cs-bytes", value: "cs-bytes" },
  { name: "cs-cookie", value: "cs-cookie" },
  { name: "cs-header-names", value: "cs-header-names" },
  { name: "cs-headers", value: "cs-headers" },
  { name: "cs-headers-count", value: "cs-headers-count" },
  { name: "cs-host", value: "cs-host" },
  { name: "cs-method", value: "cs-method" },
  { name: "cs-protocol", value: "cs-protocol" },
  { name: "cs-protocol-version", value: "cs-protocol-version" },
  { name: "cs-referer", value: "cs-referer" },
  { name: "cs-uri-query", value: "cs-uri-query" },
  { name: "cs-uri-stem", value: "cs-uri-stem" },
  { name: "cs-user-agent", value: "cs-user-agent" },
  { name: "fle-encrypted-fields", value: "fle-encrypted-fields" },
  { name: "fle-status", value: "fle-status" },
  { name: "origin-fbl", value: "origin-fbl" },
  { name: "origin-lbl", value: "origin-lbl" },
  {
    name: "primary-distribution-dns-name",
    value: "primary-distribution-dns-name",
  },
  { name: "primary-distribution-id", value: "primary-distribution-id" },
  { name: "sc-bytes", value: "sc-bytes" },
  { name: "sc-content-len", value: "sc-content-len" },
  { name: "sc-content-type", value: "sc-content-type" },
  { name: "sc-range-end", value: "sc-range-end" },
  { name: "sc-range-start", value: "sc-range-start" },
  { name: "sc-status", value: "sc-status" },
  { name: "ssl-cipher", value: "ssl-cipher" },
  { name: "ssl-protocol", value: "ssl-protocol" },
  { name: "time-taken", value: "time-taken" },
  { name: "time-to-first-byte", value: "time-to-first-byte" },
  { name: "timestamp", value: "timestamp" },
  {
    name: "x-edge-detailed-result-type",
    value: "x-edge-detailed-result-type",
  },
  { name: "x-edge-location", value: "x-edge-location" },
  { name: "x-edge-request-id", value: "x-edge-request-id" },
  {
    name: "x-edge-response-result-type",
    value: "x-edge-response-result-type",
  },
  { name: "x-edge-result-type", value: "x-edge-result-type" },
  { name: "x-forwarded-for", value: "x-forwarded-for" },
  { name: "x-host-header", value: "x-host-header" },
];

export const FieldSortingArr = [
  "timestamp",
  "c-ip",
  "time-to-first-byte",
  "sc-status",
  "sc-bytes",
  "cs-method",
  "cs-protocol",
  "cs-host",
  "cs-uri-stem",
  "cs-bytes",
  "x-edge-location",
  "x-edge-request-id",
  "x-host-header",
  "time-taken",
  "cs-protocol-version",
  "c-ip-version",
  "cs-user-agent",
  "cs-referer",
  "cs-cookie",
  "cs-uri-query",
  "x-edge-response-result-type",
  "x-forwarded-for",
  "ssl-protocol",
  "ssl-cipher",
  "x-edge-result-type",
  "fle-encrypted-fields",
  "fle-status",
  "sc-content-type",
  "sc-content-len",
  "sc-range-start",
  "sc-range-end",
  "c-port",
  "x-edge-detailed-result-type",
  "c-country",
  "cs-accept-encoding",
  "cs-accept",
  "cache-behavior-path-pattern",
  "cs-headers",
  "cs-header-names",
  "cs-headers-count",
  "primary-distribution-id",
  "primary-distribution-dns-name",
  "origin-fbl",
  "origin-lbl",
  "asn",
];

export const PROXY_INSTANCE_TYPE_AND_NUMBER_LIST = [
  { conUser: "4", instanceType: "t3.nano", instanceNumber: "1" },
  { conUser: "6", instanceType: "t3.micro", instanceNumber: "1" },
  { conUser: "8", instanceType: "t3.nano", instanceNumber: "2" },
  { conUser: "10", instanceType: "t3.small", instanceNumber: "1" },
  { conUser: "12", instanceType: "t3.micro", instanceNumber: "2" },
  { conUser: "20", instanceType: "t3.small", instanceNumber: "2" },
  { conUser: "25", instanceType: "t3.large", instanceNumber: "1" },
  { conUser: "50+", instanceType: "t3.large", instanceNumber: "2" },
];

export const TOPIC_NAME_REGEX = /^[a-zA-Z0-9-_]{1,128}$/;

export const APACHE_LOG_REG_MAP: any = {
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

export const VPC_FLOW_LOG_SELECT_ALL_FIELDS =
  "${account-id} ${action} ${az-id} ${bytes} ${dstaddr} ${dstport} ${end} ${flow-direction} ${instance-id} ${interface-id} ${log-status} ${packets} ${pkt-dst-aws-service} ${pkt-dstaddr} ${pkt-src-aws-service} ${pkt-srcaddr} ${protocol} ${region} ${srcaddr} ${srcport} ${start} ${sublocation-id} ${sublocation-type} ${subnet-id} ${tcp-flags} ${traffic-path} ${type} ${version} ${vpc-id}";

export const genSvcStepTitle = (isOSI = false) => {
  return [
    "step.logSource",
    "step.analyticsEngine",
    "step.logProcessing",
    isOSI ? "step.tags" : "step.alarmTags",
  ];
};
