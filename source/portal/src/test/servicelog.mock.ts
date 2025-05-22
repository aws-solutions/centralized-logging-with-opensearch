// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { DestinationType, ServiceType } from "API";
import { CreateLogMethod } from "assets/js/const";
import { MONITOR_ALARM_INIT_DATA } from "assets/js/init";
import { S3SourceType } from "pages/dataInjection/serviceLog/create/cloudtrail/steps/comp/SourceType";
import { INIT_OPENSEARCH_DATA } from "reducer/createOpenSearch";
import { LogProcessorType } from "reducer/selectProcessor";
import { CloudFrontFieldType, WAFIngestOption, YesNo } from "types";

export const cloudFrontMockData = {
  type: ServiceType.CloudFront,
  source: "",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: "",
  params: {
    logBucketName: "",
    cloudFrontObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketS3Path: "",
    manualBucketName: "",
    logBucketPrefix: "",

    geoPlugin: false,
    userAgentPlugin: false,

    userIsConfirmed: false,
    fieldType: CloudFrontFieldType.ALL,
    customFields: [],
    samplingRate: "1",
    shardCount: "1",
    minCapacity: "1",
    enableAutoScaling: YesNo.No,
    maxCapacity: "1",

    tmpFlowList: [],
    s3SourceType: S3SourceType.NONE,
    successTextType: "",
    ...INIT_OPENSEARCH_DATA,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
};

export const cloudtrailMockData = {
  type: ServiceType.CloudTrail,
  source: "",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: "",
  params: {
    taskType: CreateLogMethod.Automatic,
    manualBucketS3Path: "",
    curTrailObj: null,
    logBucketName: "",
    logBucketPrefix: "",

    logSource: "",
    shardCount: "1",
    minCapacity: "1",
    enableAutoScaling: YesNo.No,
    maxCapacity: "1",

    logType: ServiceType.CloudTrail,
    successTextType: "",
    s3SourceType: S3SourceType.NONE,
    tmpFlowList: [],

    ...INIT_OPENSEARCH_DATA,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
};

export const elbMockData = {
  type: ServiceType.ELB,
  source: "",
  target: "",
  arnId: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: DestinationType.S3,
  params: {
    logBucketName: "",
    elbObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketELBPath: "",
    manualBucketName: "",
    logBucketPrefix: "",
    geoPlugin: false,
    userAgentPlugin: false,
    ...INIT_OPENSEARCH_DATA,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
};

export const wafMockData = {
  type: ServiceType.WAF,
  source: "",
  target: "",
  arnId: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: DestinationType.S3,
  params: {
    logBucketName: "",
    wafObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketWAFPath: "",
    manualBucketName: "",
    logBucketPrefix: "",
    webACLNames: "",
    ingestOption: WAFIngestOption.FullRequest,
    interval: "",
    webACLScope: "",
    logSource: "",
    ...INIT_OPENSEARCH_DATA,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
};

export const mockServiceLogDetailData = {
  id: "xxxx",
  type: "S3",
  destinationType: "S3",
  source: "clo-xxxx-xxxx",
  target: "opensearch-for-clo",
  parameters: [
    {
      parameterKey: "logBucketName",
      parameterValue: "clo-xxxx-1u1m21g4c5dtb",
      __typename: "Parameter",
    },
    {
      parameterKey: "logBucketPrefix",
      parameterValue: "",
      __typename: "Parameter",
    },
    {
      parameterKey: "showAdvancedSetting",
      parameterValue: "false",
      __typename: "Parameter",
    },
    {
      parameterKey: "engineType",
      parameterValue: "OpenSearch",
      __typename: "Parameter",
    },
    {
      parameterKey: "endpoint",
      parameterValue: "vpc",
      __typename: "Parameter",
    },
    {
      parameterKey: "domainName",
      parameterValue: "opensearch-for-clo",
      __typename: "Parameter",
    },
    {
      parameterKey: "indexPrefix",
      parameterValue: "clo-xxx-xxx",
      __typename: "Parameter",
    },
    {
      parameterKey: "createDashboard",
      parameterValue: "Yes",
      __typename: "Parameter",
    },
    {
      parameterKey: "vpcId",
      parameterValue: "vpc-1",
      __typename: "Parameter",
    },
    {
      parameterKey: "subnetIds",
      parameterValue: "subnet-1,subnet-1",
      __typename: "Parameter",
    },
    {
      parameterKey: "securityGroupId",
      parameterValue: "sg-1",
      __typename: "Parameter",
    },
    {
      parameterKey: "shardNumbers",
      parameterValue: "1",
      __typename: "Parameter",
    },
    {
      parameterKey: "replicaNumbers",
      parameterValue: "1",
      __typename: "Parameter",
    },
    {
      parameterKey: "warmAge",
      parameterValue: "",
      __typename: "Parameter",
    },
    {
      parameterKey: "coldAge",
      parameterValue: "",
      __typename: "Parameter",
    },
    {
      parameterKey: "retainAge",
      parameterValue: "180d",
      __typename: "Parameter",
    },
    {
      parameterKey: "rolloverSize",
      parameterValue: "30gb",
      __typename: "Parameter",
    },
    {
      parameterKey: "indexSuffix",
      parameterValue: "yyyy-MM-dd",
      __typename: "Parameter",
    },
    {
      parameterKey: "codec",
      parameterValue: "best_compression",
      __typename: "Parameter",
    },
    {
      parameterKey: "refreshInterval",
      parameterValue: "1s",
      __typename: "Parameter",
    },
    {
      parameterKey: "backupBucketName",
      parameterValue: "clo-xxx-xxx",
      __typename: "Parameter",
    },
    {
      parameterKey: "defaultCmkArnParam",
      parameterValue: "arn:aws:kms:us-west-2:111111111111:key/xxx-xx-xx-xx-xxx",
      __typename: "Parameter",
    },
    {
      parameterKey: "logSourceAccountId",
      parameterValue: "111111111111",
      __typename: "Parameter",
    },
    {
      parameterKey: "logProcessorConcurrency",
      parameterValue: "0",
      __typename: "Parameter",
    },
    {
      parameterKey: "logSourceRegion",
      parameterValue: "us-example-2",
      __typename: "Parameter",
    },
    {
      parameterKey: "logSourceAccountAssumeRole",
      parameterValue: "",
      __typename: "Parameter",
    },
  ],
  createdAt: "2024-04-12T07:46:29Z",
  status: "ACTIVE",
  tags: [],
  error: null,
  monitor: {
    status: "ENABLED",
    backupBucketName: null,
    errorLogPrefix: "error/AWSLogs/S3/index-prefix=clo-xxx-xxxx/",
    pipelineAlarmStatus: "DISABLED",
    snsTopicName: "",
    snsTopicArn: "",
    emails: "",
    __typename: "MonitorDetail",
  },
  osiParams: {
    minCapacity: 0,
    maxCapacity: 0,
    __typename: "OpenSearchIngestionParams",
  },
  osiPipelineName: "cl-xxx-xxx-xx-xx",
  processorLogGroupName: null,
  helperLogGroupName: null,
  logEventQueueName: null,
  deliveryStreamName: null,
  bufferResourceName: null,
  stackId: null,
  logSourceAccountId: null,
  logSourceRegion: null,
  engineType: "OpenSearch",
  lightEngineParams: null,
  __typename: "ServicePipeline",
};

export const mockS3ServicePipelineData: any = {
  id: "xxxx",
  engineType: "OpenSearch",
  type: "S3",
  status: "ACTIVE",
  source: "xxxxx",
  esName: "opensearch-for-clo",
  esIndex: "cl-aws-s3-xxx-xx",
  logLocation: "s3://clo-xxx-xxx/",
  createSampleData: "Yes",
  createTime: "2024-03-18 15:56:02",
  warnRetention: "",
  coldRetention: "",
  logRetention: "",
  warmAge: "",
  coldAge: "",
  retainAge: "7d",
  shardNumbers: "",
  replicaNumbers: "1",
  logSourceAccountId: "111111111111",
  destinationType: "S3",
  samplingRate: "",
  minCapacity: "",
  maxCapacity: "",
  enableAutoScaling: "",
  rolloverSize: "30gb",
  indexSuffix: "yyyy-MM-dd",
  codec: "best_compression",
  fieldNames: "",
  tags: [],
  sourceKDS: "",
  sourceSQS: "CL-xxx-xxx-xxx-xxx",
  sourceKDF: "",
  processorLambda: "/aws/lambda/CL-xxx-xxx-xxx",
  helperLambda: null,
  failedS3Bucket:
    "clo-xxx-xxx/error/AWSLogs/S3/index-prefix=cl-aws-s3-xxx-xxx/",
  webACLScope: "",
  stackId:
    "arn:aws:cloudformation:us-west-2:111111111111:stack/CL-xx-xx/xxx-xx-11ee-8d4d-xx",
  monitor: {
    status: "ENABLED",
    backupBucketName: "",
    errorLogPrefix: "",
    pipelineAlarmStatus: "ENABLED",
    snsTopicName: "",
    snsTopicArn: "",
    emails: "",
  },
  osiParams: {
    minCapacity: 0,
    maxCapacity: 0,
  },
  osiPipelineName: "cl-xxx-xx-xx-xx",
};

export const MockCloudFrontList = [
  {
    id: "cloudfront-1",
    name: "xxxx.example.net",
    parentId: null,
    description: "clo - Web Console Distribution (us-example-2)",
    __typename: "Resource",
  },
];

export const MockSelectProcessorState = {
  serviceAvailable: true,
  serviceAvailableChecked: true,
  serviceAvailableCheckedLoading: false,
  logProcessorType: LogProcessorType.OSI,
  logProcessorConcurrency: "0",
  minOCU: "1",
  maxOCU: "4",
  logProcessorConcurrencyError: "",
  minOCUError: "",
  maxOCUError: "",
  unreservedAccountConcurrency: "0",
};

export const MockLightEngineData: any = {
  sampleDashboard: "Yes",
  grafanaId: "xx-xx-xx-xx-xx",
  grafanaIdError: "",
  centralizedBucketName: "aws-glue-assets-xxx-us-west-2",
  centralizedBucketNameError: "",
  logArchiveSchedule: "cron(0 2 * * ? *)",
  logArchiveScheduleError: "",
  logMergerSchedule: "cron(0 1 * * ? *)",
  logMergerScheduleError: "",
  logProcessorScheduleError: "",
  logArchiveAge: 180,
  logArchiveAgeError: "",
  logMergerAge: 7,
  logMergerAgeError: "",
  centralizedTableName: "cloudfront_xxx",
  centralizedTableNameError: "",
  logProcessorScheduleTime: 5,
  logProcessorScheduleScale: "minutes",
  logProcessorScheduleExpError: "",
};

export const MockGrafanaData: any = {
  loading: false,
  status: "PASSED",
  grafanaName: "test",
  grafanaNameError: "",
  grafanaUrl: "https://test.example.com",
  grafanaUrlError: "",
  grafanaToken: "gs_xxxxxx",
  grafanaTokenError: "",
  grafanaURLConnectivity: "PASSED",
  grafanaTokenValidity: "PASSED",
  grafanaHasInstalledAthenaPlugin: "PASSED",
  grafanaDataSourcePermission: "PASSED",
  grafanaFolderPermission: "PASSED",
  grafanaDashboardsPermission: "PASSED",
};

export const MockConvertSvcTaskData = {
  parameters: [
    {
      parameterKey: "importDashboards",
      parameterValue: "true",
    },
    {
      parameterKey: "grafanaId",
      parameterValue: "xxx-xxx-xxx-xx-xx",
    },
    {
      parameterKey: "centralizedBucketName",
      parameterValue: "clo-xxx-xxx",
    },
    {
      parameterKey: "logArchiveSchedule",
      parameterValue: "cron(0 2 * * ? *)",
    },
    {
      parameterKey: "logMergerSchedule",
      parameterValue: "cron(0 1 * * ? *)",
    },
    {
      parameterKey: "logArchiveAge",
      parameterValue: "30",
    },
    {
      parameterKey: "logMergerAge",
      parameterValue: "7",
    },
    {
      parameterKey: "centralizedTableName",
      parameterValue: "cloudfront_xxx",
    },
    {
      parameterKey: "logProcessorSchedule",
      parameterValue: "rate(5 minutes)",
    },
    {
      parameterKey: "centralizedBucketPrefix",
      parameterValue: "datalake",
    },
    {
      parameterKey: "logBucketName",
      parameterValue: "clo-xxx-xxx",
    },
    {
      parameterKey: "logBucketPrefix",
      parameterValue: "",
    },
    {
      parameterKey: "enrichmentPlugins",
      parameterValue: "geo_ip,user_agent",
    },
  ],
  ingestion: {
    bucket: "clo-webconsoleuicloudfrontloggingbucketb9d4f512-mrivbk0jr5ss",
    prefix: "",
  },
};

export const MockCloudWatchLogConfig = [
  {
    destinationType: "KDS",
    destinationName: "xxx",
    name: "Realtime-Logs",
    logFormat: "",
    region: "us-west-2",
    __typename: "ResourceLogConf",
  },
  {
    destinationType: "S3",
    destinationName: "s3://xxx/",
    name: "Standard-Logs",
    logFormat: "",
    region: "us-west-2",
    __typename: "ResourceLogConf",
  },
];

export const MockCloudTrailList = [
  {
    id: "cloudtrail-1",
    name: "cloudtrail-1",
    parentId: null,
    description: "clo - CloudTrail",
    __typename: "Resource",
  },
];

export const MockELBList = [
  {
    id: "xxxx",
    name: "elb-1",
    parentId: null,
    description: null,
    __typename: "Resource",
  },
];

export const MockLambdaList = [
  {
    description: "AWS CDK ",
    id: "CL-xx-xx-xx",
    name: "lambda-xx-xxx-Provider-$LATEST",
    parentId: null,
    __typename: "Resource",
  },
];

export const MockRDSList = [
  {
    id: "rds-1",
    name: "rds-1 - [MySQL]",
    parentId: null,
    description: "clo - RDS",
    __typename: "Resource",
  },
];

export const MockS3List = [
  {
    id: "clo-xxx-xxx",
    name: "clo-xxx-xxx",
    parentId: null,
    description: "clo - S3",
    __typename: "Resource",
  },
];

export const MockWAFList = [
  {
    id: "waf-1",
    name: "waf-1",
    parentId: null,
    description: "clo - WAF",
    __typename: "Resource",
  },
];

export const MockVPCList = [
  {
    id: "vpc-1",
    name: "vpc-1",
    parentId: null,
    description: "clo - VPC",
    __typename: "Resource",
  },
];

export const MockResourceLoggingBucketData = {
  enabled: true,
  bucket: "clo-xxx-xxx",
  prefix: "prefix/us-example-2",
  source: null,
  __typename: "LoggingBucket",
};

export const MockVPCLogSourceList = [
  {
    destinationType: "S3",
    destinationName: "s3://test/vpcflowlogs/1/",
    name: "fl-1 (vpc-1)",
    logFormat:
      "${account-id} ${action} ${az-id} ${bytes} ${dstaddr} ${dstport} ${end} ${flow-direction} ${instance-id} ${interface-id} ${log-status} ${packets} ${pkt-dst-aws-service} ${pkt-dstaddr} ${pkt-src-aws-service} ${pkt-srcaddr} ${protocol} ${region} ${srcaddr} ${srcport} ${start} ${sublocation-id} ${sublocation-type} ${subnet-id} ${tcp-flags} ${traffic-path} ${type} ${version} ${vpc-id}",
    region: "us-east-2",
    __typename: "ResourceLogConf",
  },
  {
    destinationType: "S3",
    destinationName: "s3://test/vpcflowlogs2/",
    name: "fl-2 (vpc-2)",
    logFormat:
      "${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status}",
    region: "us-east-2",
    __typename: "ResourceLogConf",
  },
];
