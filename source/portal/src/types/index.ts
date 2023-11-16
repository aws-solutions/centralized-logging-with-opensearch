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
import {
  Codec,
  CompressionType,
  DestinationType,
  IndexSuffix,
  LogSource,
  MonitorInput,
} from "API";
import { ConfigValidateType } from "assets/js/applog";
import { AUTH_TYPE } from "aws-appsync-auth-link";
import { OptionType } from "components/AutoComplete/autoComplete";
import { InstanceWithStatusType } from "pages/resources/common/InstanceTable";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import { InstanceGroupType } from "pages/resources/instanceGroup/create/CreateInstanceGroup";
export enum YesNo {
  Yes = "Yes",
  No = "No",
}

export enum CreationMethod {
  New = "New",
  Exists = "Exists",
}

export enum SupportPlugin {
  Geo = "geo_ip",
  UserAgent = "user_agent",
}

export enum AppSyncAuthType {
  OPEN_ID = AUTH_TYPE.OPENID_CONNECT,
  AMAZON_COGNITO_USER_POOLS = AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
}
export interface AmplifyConfigType {
  aws_project_region: string;
  aws_appsync_graphqlEndpoint: string;
  aws_appsync_region: string;
  aws_appsync_authenticationType: AppSyncAuthType;
  aws_oidc_provider: string;
  aws_oidc_client_id: string;
  aws_oidc_customer_domain: string;
  aws_cloudfront_url: string;
  aws_cognito_region: string;
  aws_user_pools_id: string;
  aws_user_pools_web_client_id: string;
  default_logging_bucket: string;
  default_cmk_arn: string;
  solution_version: string;
  solution_name: string;
  template_bucket: string;
}

export enum ArchiveFormat {
  gzip = "Gzip",
}

export const YESNO_LIST = [
  {
    name: "yes",
    value: YesNo.Yes,
  },
  {
    name: "no",
    value: YesNo.No,
  },
];

export const PROXY_INSTANCE_TYPE_LIST = [
  { name: "t3.nano", value: "t3.nano" },
  { name: "t3.micro", value: "t3.micro" },
  { name: "t3.small", value: "t3.small" },
  { name: "t3.large", value: "t3.large" },
];

export const PROXY_INSTANCE_NUMBER_LIST = [
  { name: "1", value: "1" },
  { name: "2", value: "2" },
  { name: "3", value: "3" },
  { name: "4", value: "4" },
];

export const CLOUDFRONT_LOG_STANDARD = [
  {
    name: "servicelog:cloudfront.standardLogs",
    value: DestinationType.S3,
  },
];

export const CLOUDFRONT_LOG_TYPE = [
  ...CLOUDFRONT_LOG_STANDARD,
  {
    name: "servicelog:cloudfront.realtimeLogs",
    value: DestinationType.KDS,
  },
];

export enum CloudFrontFieldType {
  CUSTOM = "CUSTOM",
  ALL = "ALL",
}

export const CLOUDFRONT_FIELDS_TYPE = [
  {
    name: "servicelog:cloudfront.selectAllFields",
    value: CloudFrontFieldType.ALL,
  },
  {
    name: "servicelog:cloudfront.customFields",
    value: CloudFrontFieldType.CUSTOM,
  },
];

export const AppLogClusterIndexSuffixFormatList = [
  {
    name: "YYYY-MM-DD-HH",
    value: IndexSuffix.yyyy_MM_dd_HH,
  },
  { name: "YYYY-MM-DD", value: IndexSuffix.yyyy_MM_dd },
  { name: "YYYY-MM", value: IndexSuffix.yyyy_MM },
  { name: "YYYY", value: IndexSuffix.yyyy },
];

export enum SERVICE_LOG_INDEX_SUFFIX {
  yyyy_MM_dd = "yyyy-MM-dd",
  yyyy_MM_dd_HH = "yyyy-MM-dd-HH",
  yyyy_MM = "yyyy-MM",
  yyyy = "yyyy",
}

export const ServiceLogClusterIndexSuffixFormatList = [
  {
    name: "YYYY-MM-DD-HH",
    value: SERVICE_LOG_INDEX_SUFFIX.yyyy_MM_dd_HH,
  },
  { name: "YYYY-MM-DD", value: SERVICE_LOG_INDEX_SUFFIX.yyyy_MM_dd },
  { name: "YYYY-MM", value: SERVICE_LOG_INDEX_SUFFIX.yyyy_MM },
  { name: "YYYY", value: SERVICE_LOG_INDEX_SUFFIX.yyyy },
];

export const ClusterCompressionTypeList = [
  { name: "best_compression", value: Codec.best_compression },
  { name: "default", value: Codec.default },
];

export enum WarmTransitionType {
  IMMEDIATELY = "IMMEDIATELY",
  BY_DAYS = "BY_DAYS",
}

export const WarmLogSettingsList = [
  {
    name: "servicelog:cluster.warmImmediately",
    value: WarmTransitionType.IMMEDIATELY,
  },
  {
    name: "servicelog:cluster.warmByDays",
    value: WarmTransitionType.BY_DAYS,
  },
];

export enum CWLSourceType {
  S3 = "S3 Bucket",
  CWL = "CloudWatch Logs",
}

export const CWL_SOURCE_LIST = [
  { name: CWLSourceType.S3, value: DestinationType.S3 },
  { name: CWLSourceType.CWL, value: DestinationType.CloudWatch },
];

export enum S3_STORAGE_CLASS_TYPE {
  STANDARD = "STANDARD",
  STANDARD_IA = "STANDARD_IA",
  ONEZONE_IA = "ONEZONE_IA",
  INTELLIGENT_TIERING = "INTELLIGENT_TIERING",
}

export const S3_STORAGE_CLASS_OPTIONS = [
  { name: "Standard", value: S3_STORAGE_CLASS_TYPE.STANDARD },
  { name: "Standard-IA", value: S3_STORAGE_CLASS_TYPE.STANDARD_IA },
  { name: "One Zone-IA", value: S3_STORAGE_CLASS_TYPE.ONEZONE_IA },
  {
    name: "Intelligent-Tiering",
    value: S3_STORAGE_CLASS_TYPE.INTELLIGENT_TIERING,
  },
];

export type TagType = {
  key: string;
  value: string;
};
export interface ApplicationLogType {
  openSearchId: string;
  warmEnable: boolean;
  coldEnable: boolean;
  confirmNetworkChecked: boolean;
  rolloverSizeNotSupport: boolean;
  enableRolloverByCapacity: boolean;
  warmTransitionType: string;
  aosParams: {
    coldLogTransition: string;
    domainName: string;
    engine: string;
    failedLogBucket: string;
    indexPrefix: string;
    logRetention: string;
    opensearchArn: string;
    opensearchEndpoint: string;
    replicaNumbers: string;
    shardNumbers: string;
    rolloverSize: string;
    indexSuffix: string;
    codec: string;
    refreshInterval: string;
    vpc: {
      privateSubnetIds: string;
      securityGroupId: string;
      vpcId: string;
    };
    warmLogTransition: string;
  };
  bufferType: string;
  kdsBufferParams: {
    enableAutoScaling: string;
    shardCount: string;
    minCapacity: string;
    maxCapacity: string;
  };
  s3BufferBucketObj: OptionType | null;
  s3BufferParams: {
    logBucketName: string;
    logBucketPrefix: string;
    logBucketSuffix: string;
    defaultCmkArn: string;
    maxFileSize: string;
    uploadTimeout: string;
    compressionType: CompressionType | string;
    s3StorageClass: string;
  };
  mskBufferParams: {
    mskClusterName: string;
    mskClusterArn: string;
    mskBrokerServers: string;
    topic: string;
  };
  force: boolean;
  monitor: MonitorInput;
}

export interface IngestionPropsType {
  instanceGroupMethod: CreationMethod | string;
  chooseInstanceGroup: LogSource[];
  curInstanceGroup: InstanceGroupType;
  instanceGroupCheckedInstances: InstanceWithStatusType[];
  createNewInstanceGroupId: string;
  instanceGroupNameEmpty: boolean;
  logConfigMethod: CreationMethod | string;
  curLogConfig: ExLogConf;
  logConfigError: ConfigValidateType;
  logPathEmptyError: boolean;
  showChooseExistsError: boolean;
  createDashboard: string;
  accountId: string;
  logPath: string;
}
