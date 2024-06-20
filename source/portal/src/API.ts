/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type VPCInput = {
  vpcId: string,
  publicSubnetIds?: string | null,
  privateSubnetIds?: string | null,
  securityGroupId: string,
};

export type TagInput = {
  key?: string | null,
  value?: string | null,
};

export type ImportDomainResponse = {
  __typename: "ImportDomainResponse",
  id?: string | null,
  resources?:  Array<DomainRelevantResource | null > | null,
};

export type DomainRelevantResource = {
  __typename: "DomainRelevantResource",
  name?: string | null,
  values?: Array< string | null > | null,
  status?: ResourceStatus | null,
};

export enum ResourceStatus {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  DELETED = "DELETED",
  REVERSED = "REVERSED",
  UNCHANGED = "UNCHANGED",
  ERROR = "ERROR",
}


export type RemoveDomainResponse = {
  __typename: "RemoveDomainResponse",
  error?: string | null,
  errorCode?: ErrorCode | null,
  resources?:  Array<DomainRelevantResource | null > | null,
};

export enum ErrorCode {
  DuplicatedIndexPrefix = "DuplicatedIndexPrefix",
  DuplicatedWithInactiveIndexPrefix = "DuplicatedWithInactiveIndexPrefix",
  OverlapIndexPrefix = "OverlapIndexPrefix",
  OverlapWithInactiveIndexPrefix = "OverlapWithInactiveIndexPrefix",
  AccountNotFound = "AccountNotFound",
  OldAOSVersion = "OldAOSVersion",
  AOSNotInPrivateSubnet = "AOSNotInPrivateSubnet",
  WithoutNAT = "WithoutNAT",
  EKS_CLUSTER_NOT_CLEANED = "EKS_CLUSTER_NOT_CLEANED",
  ASSOCIATED_STACK_UNDER_PROCESSING = "ASSOCIATED_STACK_UNDER_PROCESSING",
  SVC_PIPELINE_NOT_CLEANED = "SVC_PIPELINE_NOT_CLEANED",
  APP_PIPELINE_NOT_CLEANED = "APP_PIPELINE_NOT_CLEANED",
  DOMAIN_ALREADY_IMPORTED = "DOMAIN_ALREADY_IMPORTED",
  DOMAIN_NOT_ACTIVE = "DOMAIN_NOT_ACTIVE",
  DOMAIN_UNDER_PROCESSING = "DOMAIN_UNDER_PROCESSING",
  DOMAIN_RELATED_RESOURCES_REVERSE_FAILED = "DOMAIN_RELATED_RESOURCES_REVERSE_FAILED",
  IMPORT_OPENSEARCH_DOMAIN_FAILED = "IMPORT_OPENSEARCH_DOMAIN_FAILED",
  REMOVE_OPENSEARCH_DOMAIN_FAILED = "REMOVE_OPENSEARCH_DOMAIN_FAILED",
  UNSUPPORTED_DOMAIN_ENGINE = "UNSUPPORTED_DOMAIN_ENGINE",
  DOMAIN_NETWORK_TYPE_NOT_PRIVATE = "DOMAIN_NETWORK_TYPE_NOT_PRIVATE",
  OLD_DOMAIN_VERSION = "OLD_DOMAIN_VERSION",
  SUBNET_WITHOUT_NAT = "SUBNET_WITHOUT_NAT",
  AOS_SECURITY_GROUP_CHECK_FAILED = "AOS_SECURITY_GROUP_CHECK_FAILED",
  NETWORK_ACL_CHECK_FAILED = "NETWORK_ACL_CHECK_FAILED",
  VPC_PEERING_CHECK_FAILED = "VPC_PEERING_CHECK_FAILED",
  AOS_VPC_ROUTING_CHECK_FAILED = "AOS_VPC_ROUTING_CHECK_FAILED",
  SOLUTION_VPC_ROUTING_CHECK_FAILED = "SOLUTION_VPC_ROUTING_CHECK_FAILED",
  DUPLICATED_INDEX_PREFIX = "DUPLICATED_INDEX_PREFIX",
  DUPLICATED_WITH_INACTIVE_INDEX_PREFIX = "DUPLICATED_WITH_INACTIVE_INDEX_PREFIX",
  OVERLAP_INDEX_PREFIX = "OVERLAP_INDEX_PREFIX",
  OVERLAP_WITH_INACTIVE_INDEX_PREFIX = "OVERLAP_WITH_INACTIVE_INDEX_PREFIX",
  UNSUPPORTED_ACTION_HAS_INGESTION = "UNSUPPORTED_ACTION_HAS_INGESTION",
  UNSUPPORTED_ACTION_SOURCE_HAS_INGESTION = "UNSUPPORTED_ACTION_SOURCE_HAS_INGESTION",
  UPDATE_CWL_ROLE_FAILED = "UPDATE_CWL_ROLE_FAILED",
  ASSUME_ROLE_CHECK_FAILED = "ASSUME_ROLE_CHECK_FAILED",
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  ACCOUNT_ALREADY_EXISTS = "ACCOUNT_ALREADY_EXISTS",
  ITEM_NOT_FOUND = "ITEM_NOT_FOUND",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  GRAFANA_URL_CONNECTIVITY_FAILED = "GRAFANA_URL_CONNECTIVITY_FAILED",
  GRAFANA_TOKEN_VALIDATION_FAILED = "GRAFANA_TOKEN_VALIDATION_FAILED",
  GRAFANA_HAS_INSTALLED_ATHENA_PLUGIN_FAILED = "GRAFANA_HAS_INSTALLED_ATHENA_PLUGIN_FAILED",
  GRAFANA_DATA_SOURCE_PERMISSION_CHECK_FAILED = "GRAFANA_DATA_SOURCE_PERMISSION_CHECK_FAILED",
  GRAFANA_FOLDER_PERMISSION_CHECK_FAILED = "GRAFANA_FOLDER_PERMISSION_CHECK_FAILED",
  GRAFANA_DASHBOARDS_PERMISSION_CHECK_FAILED = "GRAFANA_DASHBOARDS_PERMISSION_CHECK_FAILED",
}


export enum ServiceType {
  S3 = "S3",
  CloudTrail = "CloudTrail",
  CloudFront = "CloudFront",
  RDS = "RDS",
  VPC = "VPC",
  Lambda = "Lambda",
  ELB = "ELB",
  WAF = "WAF",
  WAFSampled = "WAFSampled",
  Config = "Config",
}


export type ParameterInput = {
  parameterKey?: string | null,
  parameterValue?: string | null,
};

export enum DestinationType {
  S3 = "S3",
  CloudWatch = "CloudWatch",
  KDS = "KDS",
  KDF = "KDF",
}


export type OpenSearchIngestionInput = {
  minCapacity?: number | null,
  maxCapacity?: number | null,
};

export type MonitorInput = {
  status?: PipelineMonitorStatus | null,
  pipelineAlarmStatus?: PipelineAlarmStatus | null,
  snsTopicName?: string | null,
  snsTopicArn?: string | null,
  emails?: string | null,
};

export enum PipelineMonitorStatus {
  ENABLED = "ENABLED",
  DISABLED = "DISABLED",
}


export enum PipelineAlarmStatus {
  ENABLED = "ENABLED",
  DISABLED = "DISABLED",
}


export type LightEngineIngestion = {
  bucket: string,
  prefix: string,
};

export type ProxyInput = {
  vpc: VPCInput,
  certificateArn: string,
  keyName: string,
  customEndpoint: string,
  cognitoEndpoint?: string | null,
  proxyInstanceType?: string | null,
  proxyInstanceNumber?: string | null,
};

export type AlarmStackInput = {
  alarms?: Array< AlarmInput | null > | null,
  email?: string | null,
  phone?: string | null,
};

export type AlarmInput = {
  type?: AlarmType | null,
  value?: string | null,
};

export enum AlarmType {
  CLUSTER_RED = "CLUSTER_RED",
  CLUSTER_YELLOW = "CLUSTER_YELLOW",
  FREE_STORAGE_SPACE = "FREE_STORAGE_SPACE",
  WRITE_BLOCKED = "WRITE_BLOCKED",
  NODE_UNREACHABLE = "NODE_UNREACHABLE",
  SNAPSHOT_FAILED = "SNAPSHOT_FAILED",
  CPU_UTILIZATION = "CPU_UTILIZATION",
  JVM_MEMORY_PRESSURE = "JVM_MEMORY_PRESSURE",
  KMS_KEY_DISABLED = "KMS_KEY_DISABLED",
  KMS_KEY_INACCESSIBLE = "KMS_KEY_INACCESSIBLE",
  MASTER_CPU_UTILIZATION = "MASTER_CPU_UTILIZATION",
  MASTER_JVM_MEMORY_PRESSURE = "MASTER_JVM_MEMORY_PRESSURE",
}


export enum ResourceType {
  S3Bucket = "S3Bucket",
  VPC = "VPC",
  Subnet = "Subnet",
  SecurityGroup = "SecurityGroup",
  Certificate = "Certificate",
  Trail = "Trail",
  KeyPair = "KeyPair",
  Distribution = "Distribution",
  RDS = "RDS",
  Lambda = "Lambda",
  ELB = "ELB",
  WAF = "WAF",
  Config = "Config",
  EKSCluster = "EKSCluster",
  ASG = "ASG",
  SNS = "SNS",
}


export type LoggingBucket = {
  __typename: "LoggingBucket",
  enabled?: boolean | null,
  bucket?: string | null,
  prefix?: string | null,
  source?: LoggingBucketSource | null,
};

export enum LoggingBucketSource {
  WAF = "WAF",
  KinesisDataFirehoseForWAF = "KinesisDataFirehoseForWAF",
}


export type ResourceLogConf = {
  __typename: "ResourceLogConf",
  destinationType: DestinationType,
  destinationName: string,
  name?: string | null,
  logFormat?: string | null,
  region?: string | null,
};

// *The following belongs to applog* #
export enum LogType {
  JSON = "JSON",
  Regex = "Regex",
  Nginx = "Nginx",
  Apache = "Apache",
  Syslog = "Syslog",
  SingleLineText = "SingleLineText",
  MultiLineText = "MultiLineText",
  WindowsEvent = "WindowsEvent",
  IIS = "IIS",
}


export enum SyslogParser {
  RFC5424 = "RFC5424",
  RFC3164 = "RFC3164",
  CUSTOM = "CUSTOM",
}


export enum MultiLineLogParser {
  JAVA_SPRING_BOOT = "JAVA_SPRING_BOOT",
  CUSTOM = "CUSTOM",
}


export enum IISlogParser {
  W3C = "W3C",
  IIS = "IIS",
  NCSA = "NCSA",
}


export type ProcessorFilterRegexInput = {
  enabled: boolean,
  filters?: Array< LogConfFilterInput | null > | null,
};

export type LogConfFilterInput = {
  key: string,
  condition: LogConfFilterCondition,
  value: string,
};

export enum LogConfFilterCondition {
  Include = "Include",
  Exclude = "Exclude",
}


export type RegularSpecInput = {
  key: string,
  type: string,
  format?: string | null,
};

export enum BufferType {
  None = "None",
  KDS = "KDS",
  S3 = "S3",
  MSK = "MSK",
}


export type BufferInput = {
  paramKey?: string | null,
  paramValue?: string | null,
};

export type AOSParameterInput = {
  vpc: VPCInput,
  opensearchArn: string,
  opensearchEndpoint: string,
  domainName: string,
  indexPrefix: string,
  warmLogTransition?: string | null,
  coldLogTransition?: string | null,
  logRetention?: string | null,
  rolloverSize?: string | null,
  codec?: Codec | null,
  indexSuffix?: IndexSuffix | null,
  refreshInterval?: string | null,
  shardNumbers: number,
  replicaNumbers: number,
  engine: EngineType,
  failedLogBucket: string,
};

export enum Codec {
  best_compression = "best_compression",
  default = "default",
}


export enum IndexSuffix {
  yyyy_MM_dd = "yyyy_MM_dd",
  yyyy_MM_dd_HH = "yyyy_MM_dd_HH",
  yyyy_MM = "yyyy_MM",
  yyyy = "yyyy",
}


export enum EngineType {
  Elasticsearch = "Elasticsearch",
  OpenSearch = "OpenSearch",
}


export type LightEngineParameterInput = {
  centralizedBucketName: string,
  centralizedBucketPrefix: string,
  centralizedTableName: string,
  logProcessorSchedule: string,
  logMergerSchedule: string,
  logArchiveSchedule: string,
  logMergerAge: string,
  logArchiveAge: string,
  importDashboards: string,
  grafanaId?: string | null,
  recipients?: string | null,
};

export enum LogStructure {
  RAW = "RAW",
  FLUENT_BIT_PARSED_JSON = "FLUENT_BIT_PARSED_JSON",
}


export enum LogSourceType {
  EC2 = "EC2",
  S3 = "S3",
  EKSCluster = "EKSCluster",
  Syslog = "Syslog",
}


export type EC2SourceInput = {
  groupName?: string | null,
  groupType?: EC2GroupType | null,
  groupPlatform?: EC2GroupPlatform | null,
  asgName?: string | null,
  instances?: Array< EC2InstancesInput | null > | null,
};

export enum EC2GroupType {
  EC2 = "EC2",
  ASG = "ASG",
}


export enum EC2GroupPlatform {
  Linux = "Linux",
  Windows = "Windows",
}


export type EC2InstancesInput = {
  instanceId?: string | null,
};

export type SyslogSourceInput = {
  protocol?: ProtocolType | null,
  port?: number | null,
  nlbArn?: string | null,
  nlbDNSName?: string | null,
};

export enum ProtocolType {
  TCP = "TCP",
  UDP = "UDP",
}


export type EKSSourceInput = {
  eksClusterName?: string | null,
  cri?: CRI | null,
  deploymentKind?: EKSDeployKind | null,
};

export enum CRI {
  containerd = "containerd",
  docker = "docker",
}


export enum EKSDeployKind {
  DaemonSet = "DaemonSet",
  Sidecar = "Sidecar",
}


export type S3SourceInput = {
  mode?: IngestionMode | null,
  bucketName?: string | null,
  keyPrefix?: string | null,
  keySuffix?: string | null,
  compressionType?: CompressionType | null,
};

export enum IngestionMode {
  ONE_TIME = "ONE_TIME",
  ON_GOING = "ON_GOING",
}


export enum CompressionType {
  GZIP = "GZIP",
  NONE = "NONE",
}


export enum LogSourceUpdateAction {
  ADD = "ADD",
  REMOVE = "REMOVE",
  MODIFY = "MODIFY",
}


export type EC2SourceUpdateInput = {
  instances?: Array< EC2InstancesInput | null > | null,
};

export enum PipelineType {
  APP = "APP",
  SERVICE = "SERVICE",
}


export type DomainNames = {
  __typename: "DomainNames",
  domainNames?:  Array<DomainNameAndStatus > | null,
};

export type DomainNameAndStatus = {
  __typename: "DomainNameAndStatus",
  domainName?: string | null,
  status?: DomainImportStatus | null,
};

export enum DomainImportStatus {
  ACTIVE = "ACTIVE",
  IMPORTED = "IMPORTED",
  INACTIVE = "INACTIVE",
  IN_PROGRESS = "IN_PROGRESS",
  UNKNOWN = "UNKNOWN",
  FAILED = "FAILED",
}


export type ESVPCInfo = {
  __typename: "ESVPCInfo",
  vpcId: string,
  subnetIds?: Array< string > | null,
  availabilityZones?: Array< string | null > | null,
  securityGroupIds?: Array< string | null > | null,
};

export type ImportedDomain = {
  __typename: "ImportedDomain",
  id: string,
  domainName: string,
  engine?: EngineType | null,
  version: string,
  endpoint: string,
  metrics?: DomainMetrics | null,
};

export type DomainMetrics = {
  __typename: "DomainMetrics",
  searchableDocs?: number | null,
  freeStorageSpace?: number | null,
  health?: DomainHealth | null,
};

export enum DomainHealth {
  GREEN = "GREEN",
  RED = "RED",
  YELLOW = "YELLOW",
  UNKNOWN = "UNKNOWN",
  ERROR = "ERROR",
}


export type DomainDetails = {
  __typename: "DomainDetails",
  id: string,
  domainArn: string,
  domainName: string,
  engine?: EngineType | null,
  version: string,
  endpoint: string,
  region?: string | null,
  accountId?: string | null,
  vpc?: VPCInfo | null,
  esVpc?: ESVPCInfo | null,
  nodes?: Node | null,
  storageType: StorageType,
  volume?: Volume | null,
  cognito?: Cognito | null,
  tags?:  Array<Tag | null > | null,
  proxyStatus?: StackStatus | null,
  proxyALB?: string | null,
  proxyError?: string | null,
  proxyInput?: ProxyInfo | null,
  alarmStatus?: StackStatus | null,
  alarmError?: string | null,
  alarmInput?: AlarmStackInfo | null,
  metrics?: DomainMetrics | null,
  status?: string | null,
  resources?:  Array<DomainRelevantResource | null > | null,
};

export type VPCInfo = {
  __typename: "VPCInfo",
  vpcId: string,
  privateSubnetIds?: string | null,
  publicSubnetIds?: string | null,
  securityGroupId?: string | null,
};

export type Node = {
  __typename: "Node",
  instanceType: string,
  instanceCount?: number | null,
  dedicatedMasterEnabled?: boolean | null,
  zoneAwarenessEnabled?: boolean | null,
  dedicatedMasterType?: string | null,
  dedicatedMasterCount?: number | null,
  warmEnabled?: boolean | null,
  warmType?: string | null,
  warmCount?: number | null,
  coldEnabled?: boolean | null,
};

export enum StorageType {
  EBS = "EBS",
  Instance = "Instance",
}


export type Volume = {
  __typename: "Volume",
  type: string,
  size: number,
};

export type Cognito = {
  __typename: "Cognito",
  enabled?: boolean | null,
  userPoolId?: string | null,
  domain?: string | null,
  identityPoolId?: string | null,
  roleArn?: string | null,
};

export type Tag = {
  __typename: "Tag",
  key?: string | null,
  value?: string | null,
};

export enum StackStatus {
  CREATING = "CREATING",
  DELETING = "DELETING",
  ERROR = "ERROR",
  ENABLED = "ENABLED",
  DISABLED = "DISABLED",
}


export type ProxyInfo = {
  __typename: "ProxyInfo",
  vpc?: VPCInfo | null,
  certificateArn?: string | null,
  keyName?: string | null,
  customEndpoint?: string | null,
  cognitoEndpoint?: string | null,
};

export type AlarmStackInfo = {
  __typename: "AlarmStackInfo",
  alarms?:  Array<AlarmInfo | null > | null,
  email?: string | null,
  phone?: string | null,
};

export type AlarmInfo = {
  __typename: "AlarmInfo",
  type?: AlarmType | null,
  value?: string | null,
};

export type ListServicePipelineResponse = {
  __typename: "ListServicePipelineResponse",
  pipelines?:  Array<ServicePipeline | null > | null,
  total?: number | null,
};

export type ServicePipeline = {
  __typename: "ServicePipeline",
  id: string,
  type: ServiceType,
  destinationType?: DestinationType | null,
  source?: string | null,
  target?: string | null,
  parameters?:  Array<Parameter | null > | null,
  createdAt?: string | null,
  status?: PipelineStatus | null,
  tags?:  Array<Tag | null > | null,
  error?: string | null,
  monitor?: MonitorDetail | null,
  osiParams?: OpenSearchIngestionParams | null,
  osiPipelineName?: string | null,
  processorLogGroupName?: string | null,
  helperLogGroupName?: string | null,
  logEventQueueName?: string | null,
  deliveryStreamName?: string | null,
  bufferResourceName?: string | null,
  stackId?: string | null,
  logSourceAccountId?: string | null,
  logSourceRegion?: string | null,
  engineType?: AnalyticEngineType | null,
  lightEngineParams?: LightEngineParameter | null,
};

export type Parameter = {
  __typename: "Parameter",
  parameterKey?: string | null,
  parameterValue?: string | null,
};

export enum PipelineStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  CREATING = "CREATING",
  DELETING = "DELETING",
  ERROR = "ERROR",
}


export type MonitorDetail = {
  __typename: "MonitorDetail",
  status?: PipelineMonitorStatus | null,
  backupBucketName?: string | null,
  errorLogPrefix?: string | null,
  pipelineAlarmStatus?: PipelineAlarmStatus | null,
  snsTopicName?: string | null,
  snsTopicArn?: string | null,
  emails?: string | null,
};

export type OpenSearchIngestionParams = {
  __typename: "OpenSearchIngestionParams",
  minCapacity?: number | null,
  maxCapacity?: number | null,
};

export enum AnalyticEngineType {
  OpenSearch = "OpenSearch",
  LightEngine = "LightEngine",
}


export type LightEngineParameter = {
  __typename: "LightEngineParameter",
  stagingBucketPrefix: string,
  centralizedBucketName: string,
  centralizedBucketPrefix: string,
  centralizedTableName: string,
  logProcessorSchedule: string,
  logMergerSchedule: string,
  logArchiveSchedule: string,
  logMergerAge: string,
  logArchiveAge: string,
  importDashboards: string,
  grafanaId?: string | null,
  recipients?: string | null,
  notificationService?: NotificationService | null,
  enrichmentPlugins?: string | null,
};

export enum NotificationService {
  SNS = "SNS",
  SES = "SES",
}


export type Resource = {
  __typename: "Resource",
  id: string,
  name: string,
  parentId?: string | null,
  description?: string | null,
};

export type ListLogConfigsResponse = {
  __typename: "ListLogConfigsResponse",
  logConfigs?:  Array<LogConfig | null > | null,
  total?: number | null,
};

export type LogConfig = {
  __typename: "LogConfig",
  id?: string | null,
  version?: number | null,
  createdAt?: string | null,
  name?: string | null,
  logType?: LogType | null,
  syslogParser?: SyslogParser | null,
  multilineLogParser?: MultiLineLogParser | null,
  iisLogParser?: IISlogParser | null,
  filterConfigMap?: ProcessorFilterRegex | null,
  regex?: string | null,
  jsonSchema?: string | null,
  regexFieldSpecs?:  Array<RegularSpec | null > | null,
  timeKey?: string | null,
  timeOffset?: string | null,
  timeKeyRegex?: string | null,
  userLogFormat?: string | null,
  userSampleLog?: string | null,
};

export type ProcessorFilterRegex = {
  __typename: "ProcessorFilterRegex",
  enabled?: boolean | null,
  filters?:  Array<LogConfFilter | null > | null,
};

export type LogConfFilter = {
  __typename: "LogConfFilter",
  key: string,
  condition: LogConfFilterCondition,
  value: string,
};

export type RegularSpec = {
  __typename: "RegularSpec",
  key: string,
  type: string,
  format?: string | null,
};

export type ListAppPipelineResponse = {
  __typename: "ListAppPipelineResponse",
  appPipelines?:  Array<AppPipeline | null > | null,
  total?: number | null,
};

export type AppPipeline = {
  __typename: "AppPipeline",
  pipelineId: string,
  bufferType?: BufferType | null,
  bufferParams?:  Array<BufferParameter | null > | null,
  parameters?:  Array<Parameter | null > | null,
  aosParams?: AOSParameter | null,
  lightEngineParams?: LightEngineParameter | null,
  createdAt?: string | null,
  status?: PipelineStatus | null,
  logConfigId?: string | null,
  logConfigVersionNumber?: number | null,
  logConfig?: LogConfig | null,
  bufferAccessRoleArn?: string | null,
  bufferAccessRoleName?: string | null,
  bufferResourceName?: string | null,
  bufferResourceArn?: string | null,
  processorLogGroupName?: string | null,
  helperLogGroupName?: string | null,
  logEventQueueName?: string | null,
  monitor?: MonitorDetail | null,
  osiParams?: OpenSearchIngestionParams | null,
  osiPipelineName?: string | null,
  minCapacity?: number | null,
  maxCapacity?: number | null,
  stackId?: string | null,
  error?: string | null,
  engineType?: AnalyticEngineType | null,
  logStructure?: LogStructure | null,
  tags?:  Array<Tag | null > | null,
};

export type BufferParameter = {
  __typename: "BufferParameter",
  paramKey?: string | null,
  paramValue?: string | null,
};

export type AOSParameter = {
  __typename: "AOSParameter",
  opensearchArn?: string | null,
  domainName?: string | null,
  indexPrefix?: string | null,
  warmLogTransition?: string | null,
  coldLogTransition?: string | null,
  logRetention?: string | null,
  rolloverSize?: string | null,
  codec?: Codec | null,
  indexSuffix?: IndexSuffix | null,
  refreshInterval?: string | null,
  shardNumbers?: number | null,
  replicaNumbers?: number | null,
  engine?: EngineType | null,
};

export type ListAppLogIngestionResponse = {
  __typename: "ListAppLogIngestionResponse",
  appLogIngestions?:  Array<AppLogIngestion | null > | null,
  total?: number | null,
};

export type AppLogIngestion = {
  __typename: "AppLogIngestion",
  id: string,
  stackId?: string | null,
  stackName?: string | null,
  appPipelineId?: string | null,
  logPath?: string | null,
  sourceId?: string | null,
  sourceType?: string | null,
  createdAt?: string | null,
  status?: string | null,
  tags?:  Array<Tag | null > | null,
  accountId?: string | null,
  region?: string | null,
};

export type ListInstanceIngestionDetailsResponse = {
  __typename: "ListInstanceIngestionDetailsResponse",
  instanceIngestionDetail?:  Array<InstanceIngestionDetail | null > | null,
  total?: number | null,
};

export type InstanceIngestionDetail = {
  __typename: "InstanceIngestionDetail",
  instanceId?: string | null,
  ssmCommandId?: string | null,
  ssmCommandStatus?: string | null,
  details?: string | null,
};

export type TagFilterInput = {
  Key?: string | null,
  Values?: Array< string | null > | null,
};

export type ListInstanceResponse = {
  __typename: "ListInstanceResponse",
  instances?:  Array<Instance | null > | null,
  nextToken?: string | null,
};

export type Instance = {
  __typename: "Instance",
  id: string,
  platformName?: string | null,
  platformType?: string | null,
  ipAddress?: string | null,
  computerName?: string | null,
  name?: string | null,
};

export enum LogAgentStatus {
  Online = "Online",
  Offline = "Offline",
  Installing = "Installing",
  Installed = "Installed",
  Not_Installed = "Not_Installed",
  Unknown = "Unknown",
}


export type InstanceAgentStatusResponse = {
  __typename: "InstanceAgentStatusResponse",
  commandId?: string | null,
  instanceAgentStatusList?:  Array<InstanceAgentStatus | null > | null,
};

export type InstanceAgentStatus = {
  __typename: "InstanceAgentStatus",
  instanceId?: string | null,
  status?: LogAgentStatus | null,
  invocationOutput?: string | null,
  curlOutput?: string | null,
};

export type LogSource = {
  __typename: "LogSource",
  sourceId: string,
  type?: LogSourceType | null,
  accountId?: string | null,
  region?: string | null,
  eks?: EKSSource | null,
  s3?: S3Source | null,
  ec2?: EC2Source | null,
  syslog?: SyslogSource | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  status?: PipelineStatus | null,
  tags?:  Array<Tag | null > | null,
};

export type EKSSource = {
  __typename: "EKSSource",
  eksClusterName?: string | null,
  eksClusterArn?: string | null,
  cri?: CRI | null,
  vpcId?: string | null,
  eksClusterSGId?: string | null,
  subnetIds?: Array< string | null > | null,
  oidcIssuer?: string | null,
  endpoint?: string | null,
  logAgentRoleArn?: string | null,
  deploymentKind?: EKSDeployKind | null,
};

export type S3Source = {
  __typename: "S3Source",
  mode?: IngestionMode | null,
  bucketName?: string | null,
  keyPrefix?: string | null,
  keySuffix?: string | null,
  compressionType?: CompressionType | null,
};

export type EC2Source = {
  __typename: "EC2Source",
  groupName: string,
  groupType: EC2GroupType,
  groupPlatform: EC2GroupPlatform,
  asgName?: string | null,
  instances?:  Array<EC2Instances | null > | null,
};

export type EC2Instances = {
  __typename: "EC2Instances",
  instanceId: string,
};

export type SyslogSource = {
  __typename: "SyslogSource",
  protocol?: ProtocolType | null,
  port?: number | null,
  nlbArn?: string | null,
  nlbDNSName?: string | null,
};

export type ListLogSourceResponse = {
  __typename: "ListLogSourceResponse",
  logSources?:  Array<LogSource | null > | null,
  total?: number | null,
};

export type CheckTimeFormatRes = {
  __typename: "CheckTimeFormatRes",
  isMatch?: boolean | null,
};

export type ListSubAccountLinkResponse = {
  __typename: "ListSubAccountLinkResponse",
  subAccountLinks?:  Array<SubAccountLink | null > | null,
  total?: number | null,
};

export type SubAccountLink = {
  __typename: "SubAccountLink",
  id?: string | null,
  subAccountId?: string | null,
  region?: string | null,
  subAccountName?: string | null,
  subAccountRoleArn?: string | null,
  agentInstallDoc?: string | null,
  agentConfDoc?: string | null,
  windowsAgentInstallDoc?: string | null,
  windowsAgentConfDoc?: string | null,
  agentStatusCheckDoc?: string | null,
  subAccountBucketName?: string | null,
  subAccountStackId?: string | null,
  subAccountKMSKeyArn?: string | null,
  subAccountVpcId?: string | null,
  subAccountPublicSubnetIds?: string | null,
  subAccountIamInstanceProfileArn?: string | null,
  subAccountFlbConfUploadingEventTopicArn?: string | null,
  createdAt?: string | null,
  status?: string | null,
  tags?:  Array<Tag | null > | null,
};

export type checkCustomPortResponse = {
  __typename: "checkCustomPortResponse",
  isAllowedPort?: boolean | null,
  msg?: string | null,
  recommendedPort?: number | null,
};

export type ListLogStreamsResponse = {
  __typename: "ListLogStreamsResponse",
  logStreams?:  Array<LogStream | null > | null,
  total?: number | null,
};

export type LogStream = {
  __typename: "LogStream",
  logStreamName?: string | null,
  creationTime?: string | null,
  firstEventTimestamp?: string | null,
  lastEventTimestamp?: string | null,
  lastIngestionTime?: string | null,
  uploadSequenceToken?: string | null,
  arn?: string | null,
  storedBytes?: number | null,
};

export type GetLogEventsResponse = {
  __typename: "GetLogEventsResponse",
  logEvents?:  Array<LogEvent | null > | null,
  nextForwardToken?: string | null,
  nextBackwardToken?: string | null,
};

export type LogEvent = {
  __typename: "LogEvent",
  timestamp?: string | null,
  message?: string | null,
  ingestionTime?: string | null,
};

export enum MetricName {
  TotalLogs = "TotalLogs",
  FailedLogs = "FailedLogs",
  ExcludedLogs = "ExcludedLogs",
  LoadedLogs = "LoadedLogs",
  SQSNumberOfMessagesSent = "SQSNumberOfMessagesSent",
  SQSNumberOfMessagesDeleted = "SQSNumberOfMessagesDeleted",
  SQSApproximateNumberOfMessagesVisible = "SQSApproximateNumberOfMessagesVisible",
  SQSApproximateAgeOfOldestMessage = "SQSApproximateAgeOfOldestMessage",
  ProcessorFnError = "ProcessorFnError",
  ProcessorFnConcurrentExecutions = "ProcessorFnConcurrentExecutions",
  ProcessorFnDuration = "ProcessorFnDuration",
  ProcessorFnThrottles = "ProcessorFnThrottles",
  ProcessorFnInvocations = "ProcessorFnInvocations",
  ReplicationFnError = "ReplicationFnError",
  ReplicationFnConcurrentExecutions = "ReplicationFnConcurrentExecutions",
  ReplicationFnDuration = "ReplicationFnDuration",
  ReplicationFnThrottles = "ReplicationFnThrottles",
  ReplicationFnInvocations = "ReplicationFnInvocations",
  KDFIncomingBytes = "KDFIncomingBytes",
  KDFIncomingRecords = "KDFIncomingRecords",
  KDFDeliveryToS3Bytes = "KDFDeliveryToS3Bytes",
  KDSIncomingBytes = "KDSIncomingBytes",
  KDSIncomingRecords = "KDSIncomingRecords",
  KDSPutRecordsBytes = "KDSPutRecordsBytes",
  KDSThrottledRecords = "KDSThrottledRecords",
  KDSWriteProvisionedThroughputExceeded = "KDSWriteProvisionedThroughputExceeded",
  SyslogNLBActiveFlowCount = "SyslogNLBActiveFlowCount",
  SyslogNLBProcessedBytes = "SyslogNLBProcessedBytes",
  FluentBitInputBytes = "FluentBitInputBytes",
  FluentBitInputRecords = "FluentBitInputRecords",
  FluentBitOutputDroppedRecords = "FluentBitOutputDroppedRecords",
  FluentBitOutputErrors = "FluentBitOutputErrors",
  FluentBitOutputRetriedRecords = "FluentBitOutputRetriedRecords",
  FluentBitOutputRetriesFailed = "FluentBitOutputRetriesFailed",
  FluentBitOutputRetries = "FluentBitOutputRetries",
  FluentBitOutputProcBytes = "FluentBitOutputProcBytes",
  FluentBitOutputProcRecords = "FluentBitOutputProcRecords",
  OSICPUUsage = "OSICPUUsage",
  OSIComputeUnits = "OSIComputeUnits",
  OSIMemoryUsage = "OSIMemoryUsage",
  OSIBufferUsage = "OSIBufferUsage",
  OSIBufferOverflowDrops = "OSIBufferOverflowDrops",
  OSIObjectsSucceeded = "OSIObjectsSucceeded",
  OSIS3ObjectsEvents = "OSIS3ObjectsEvents",
  OSIS3ObjectsEventsSum = "OSIS3ObjectsEventsSum",
  OSISqsMessagesReceived = "OSISqsMessagesReceived",
  OSISqsMessagesDeleted = "OSISqsMessagesDeleted",
  OSISqsMessagesFailed = "OSISqsMessagesFailed",
  OSISqsMessageDelayCount = "OSISqsMessageDelayCount",
  OSISqsMessageDelaySum = "OSISqsMessageDelaySum",
  OSIBytesTransmitted = "OSIBytesTransmitted",
  OSIDocumentsWritten = "OSIDocumentsWritten",
  OSIDocumentsFailedWrite = "OSIDocumentsFailedWrite",
  OSIDocumentsRetriedWrite = "OSIDocumentsRetriedWrite",
  OSIDLQS3RecordsSuccess = "OSIDLQS3RecordsSuccess",
  OSIDLQS3RecordsFailed = "OSIDLQS3RecordsFailed",
}


export type MetricHistoryData = {
  __typename: "MetricHistoryData",
  series?:  Array<DataSerie | null > | null,
  xaxis?: GraphXaxis | null,
};

export type DataSerie = {
  __typename: "DataSerie",
  name?: string | null,
  data?: Array< number | null > | null,
};

export type GraphXaxis = {
  __typename: "GraphXaxis",
  categories?: Array< number | null > | null,
};

export enum AlarmMetricName {
  OLDEST_MESSAGE_AGE_ALARM = "OLDEST_MESSAGE_AGE_ALARM",
  PROCESSOR_ERROR_INVOCATION_ALARM = "PROCESSOR_ERROR_INVOCATION_ALARM",
  PROCESSOR_ERROR_RECORD_ALARM = "PROCESSOR_ERROR_RECORD_ALARM",
  PROCESSOR_DURATION_ALARM = "PROCESSOR_DURATION_ALARM",
  KDS_THROTTLED_RECORDS_ALARM = "KDS_THROTTLED_RECORDS_ALARM",
  FLUENTBIT_OUTPUT_RETRIED_RECORDS_ALARM = "FLUENTBIT_OUTPUT_RETRIED_RECORDS_ALARM",
}


export type PipelineAlarm = {
  __typename: "PipelineAlarm",
  alarms?:  Array<AlarmMetricDetail | null > | null,
};

export type AlarmMetricDetail = {
  __typename: "AlarmMetricDetail",
  name?: AlarmMetricName | null,
  status?: AlarmMetricStatus | null,
  resourceId?: string | null,
};

export enum AlarmMetricStatus {
  ALARM = "ALARM",
  OK = "OK",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
  LOADING = "LOADING",
}


export type DomainStatusCheckResponse = {
  __typename: "DomainStatusCheckResponse",
  status?: DomainStatusCheckType | null,
  details?:  Array<DomainStatusCheckDetail | null > | null,
  multiAZWithStandbyEnabled?: boolean | null,
};

export enum DomainStatusCheckType {
  FAILED = "FAILED",
  PASSED = "PASSED",
  WARNING = "WARNING",
  CHECKING = "CHECKING",
  NOT_STARTED = "NOT_STARTED",
}


export type DomainStatusCheckDetail = {
  __typename: "DomainStatusCheckDetail",
  name?: string | null,
  values?: Array< string | null > | null,
  errorCode?: ErrorCode | null,
  status?: DomainStatusCheckType | null,
};

export type ListGrafanasResponse = {
  __typename: "ListGrafanasResponse",
  grafanas?:  Array<Grafana | null > | null,
  total?: number | null,
};

export type Grafana = {
  __typename: "Grafana",
  id: string,
  name: string,
  url: string,
  createdAt?: string | null,
  tags?:  Array<Tag | null > | null,
};

export type GrafanaStatusCheckResponse = {
  __typename: "GrafanaStatusCheckResponse",
  status?: DomainStatusCheckType | null,
  details?:  Array<DomainStatusCheckDetail | null > | null,
};

export enum ScheduleType {
  LogProcessor = "LogProcessor",
  LogMerger = "LogMerger",
  LogArchive = "LogArchive",
  LogMergerForMetrics = "LogMergerForMetrics",
  LogArchiveForMetrics = "LogArchiveForMetrics",
}


export enum ExecutionStatus {
  Running = "Running",
  Succeeded = "Succeeded",
  Failed = "Failed",
  Timed_out = "Timed_out",
  Aborted = "Aborted",
}


export type LightEnginePipelineExecutionLogsResponse = {
  __typename: "LightEnginePipelineExecutionLogsResponse",
  items?:  Array<LightEnginePipelineExecutionLog | null > | null,
  lastEvaluatedKey?: string | null,
};

export type LightEnginePipelineExecutionLog = {
  __typename: "LightEnginePipelineExecutionLog",
  executionName?: string | null,
  executionArn?: string | null,
  taskId?: string | null,
  startTime?: string | null,
  endTime?: string | null,
  status?: ExecutionStatus | null,
};

export type LightEnginePipelineDetailResponse = {
  __typename: "LightEnginePipelineDetailResponse",
  analyticsEngine?: AnalyticsEngine | null,
  schedules?:  Array<Schedule | null > | null,
};

export type AnalyticsEngine = {
  __typename: "AnalyticsEngine",
  engineType: AnalyticEngineType,
  table?: LightEngineTableMetadata | null,
  metric?: LightEngineTableMetadata | null,
};

export type LightEngineTableMetadata = {
  __typename: "LightEngineTableMetadata",
  databaseName: string,
  tableName: string,
  location: string,
  classification: string,
  dashboardName?: string | null,
  dashboardLink?: string | null,
};

export type Schedule = {
  __typename: "Schedule",
  type: ScheduleType,
  stateMachine: StateMachine,
  scheduler: Scheduler,
};

export type StateMachine = {
  __typename: "StateMachine",
  arn: string,
  name: string,
};

export type Scheduler = {
  __typename: "Scheduler",
  type: SchedulerType,
  group: string,
  name: string,
  expression: string,
  age?: number | null,
};

export enum SchedulerType {
  EventBridgeScheduler = "EventBridgeScheduler",
  EventBridgeEvents = "EventBridgeEvents",
}


export type ImportDomainMutationVariables = {
  domainName: string,
  region?: string | null,
  vpc?: VPCInput | null,
  tags?: Array< TagInput | null > | null,
};

export type ImportDomainMutation = {
  // Import an OpenSearch Domain
  importDomain?:  {
    __typename: "ImportDomainResponse",
    id?: string | null,
    resources?:  Array< {
      __typename: "DomainRelevantResource",
      name?: string | null,
      values?: Array< string | null > | null,
      status?: ResourceStatus | null,
    } | null > | null,
  } | null,
};

export type RemoveDomainMutationVariables = {
  id: string,
  isReverseConf?: boolean | null,
};

export type RemoveDomainMutation = {
  // Remove an OpenSearch Domain by ID V2
  removeDomain?:  {
    __typename: "RemoveDomainResponse",
    error?: string | null,
    errorCode?: ErrorCode | null,
    resources?:  Array< {
      __typename: "DomainRelevantResource",
      name?: string | null,
      values?: Array< string | null > | null,
      status?: ResourceStatus | null,
    } | null > | null,
  } | null,
};

export type CreateServicePipelineMutationVariables = {
  type: ServiceType,
  source?: string | null,
  target?: string | null,
  parameters?: Array< ParameterInput | null > | null,
  tags?: Array< TagInput | null > | null,
  logSourceAccountId?: string | null,
  logSourceRegion?: string | null,
  destinationType: DestinationType,
  osiParams?: OpenSearchIngestionInput | null,
  monitor?: MonitorInput | null,
  logProcessorConcurrency: string,
};

export type CreateServicePipelineMutation = {
  // Create a new service pipeline
  createServicePipeline?: string | null,
};

export type CreateLightEngineServicePipelineMutationVariables = {
  type: ServiceType,
  parameters?: Array< ParameterInput | null > | null,
  ingestion: LightEngineIngestion,
  tags?: Array< TagInput | null > | null,
  source?: string | null,
  logSourceAccountId?: string | null,
  logSourceRegion?: string | null,
  monitor?: MonitorInput | null,
};

export type CreateLightEngineServicePipelineMutation = {
  // Create a new service pipeline with light engine
  createLightEngineServicePipeline?: string | null,
};

export type UpdateServicePipelineMutationVariables = {
  id: string,
  monitor?: MonitorInput | null,
};

export type UpdateServicePipelineMutation = {
  // Update a service pipeline
  updateServicePipeline?: string | null,
};

export type DeleteServicePipelineMutationVariables = {
  id: string,
};

export type DeleteServicePipelineMutation = {
  // Remove a service pipeline
  deleteServicePipeline?: string | null,
};

export type CreateProxyForOpenSearchMutationVariables = {
  id: string,
  input: ProxyInput,
};

export type CreateProxyForOpenSearchMutation = {
  // Create an nginx proxy stack for OpenSearch
  createProxyForOpenSearch?: string | null,
};

export type CreateAlarmForOpenSearchMutationVariables = {
  id: string,
  input: AlarmStackInput,
};

export type CreateAlarmForOpenSearchMutation = {
  // Create an alarm stack for OpenSearch
  createAlarmForOpenSearch?: string | null,
};

export type DeleteProxyForOpenSearchMutationVariables = {
  id: string,
};

export type DeleteProxyForOpenSearchMutation = {
  // Delete an nginx proxy stack for OpenSearch
  deleteProxyForOpenSearch?: string | null,
};

export type DeleteAlarmForOpenSearchMutationVariables = {
  id: string,
};

export type DeleteAlarmForOpenSearchMutation = {
  // Delete an alarm stack for OpenSearch domain
  deleteAlarmForOpenSearch?: string | null,
};

export type PutResourceLoggingBucketMutationVariables = {
  type: ResourceType,
  resourceName: string,
  accountId?: string | null,
  region?: string | null,
};

export type PutResourceLoggingBucketMutation = {
  // Put logging bucket for a type of resource by resource name or id
  putResourceLoggingBucket?:  {
    __typename: "LoggingBucket",
    enabled?: boolean | null,
    bucket?: string | null,
    prefix?: string | null,
    source?: LoggingBucketSource | null,
  } | null,
};

export type PutResourceLogConfigMutationVariables = {
  type: ResourceType,
  resourceName: string,
  accountId?: string | null,
  region?: string | null,
  destinationType: DestinationType,
  destinationName: string,
  LogFormat?: string | null,
};

export type PutResourceLogConfigMutation = {
  // Add logging configuration to resources.
  // Log Format is only requried if the format can be customized.
  putResourceLogConfig?:  {
    __typename: "ResourceLogConf",
    destinationType: DestinationType,
    destinationName: string,
    name?: string | null,
    logFormat?: string | null,
    region?: string | null,
  } | null,
};

export type CreateLogConfigMutationVariables = {
  name: string,
  logType: LogType,
  syslogParser?: SyslogParser | null,
  multilineLogParser?: MultiLineLogParser | null,
  iisLogParser?: IISlogParser | null,
  filterConfigMap?: ProcessorFilterRegexInput | null,
  regex?: string | null,
  jsonSchema?: string | null,
  regexFieldSpecs?: Array< RegularSpecInput | null > | null,
  timeKey?: string | null,
  timeOffset?: string | null,
  timeKeyRegex?: string | null,
  userLogFormat?: string | null,
  userSampleLog?: string | null,
};

export type CreateLogConfigMutation = {
  // *The following belongs to applog* #
  // Create a logging conf v2
  createLogConfig?: string | null,
};

export type DeleteLogConfigMutationVariables = {
  id: string,
};

export type DeleteLogConfigMutation = {
  // Remove a logging conf v2
  deleteLogConfig?: string | null,
};

export type UpdateLogConfigMutationVariables = {
  id: string,
  version?: number | null,
  name: string,
  logType: LogType,
  syslogParser?: SyslogParser | null,
  multilineLogParser?: MultiLineLogParser | null,
  iisLogParser?: IISlogParser | null,
  filterConfigMap?: ProcessorFilterRegexInput | null,
  regex?: string | null,
  jsonSchema?: string | null,
  regexFieldSpecs?: Array< RegularSpecInput | null > | null,
  timeKey?: string | null,
  timeOffset?: string | null,
  timeKeyRegex?: string | null,
  userLogFormat?: string | null,
  userSampleLog?: string | null,
};

export type UpdateLogConfigMutation = {
  // Update a logging conf v2
  updateLogConfig?: string | null,
};

export type CreateAppPipelineMutationVariables = {
  bufferType: BufferType,
  bufferParams?: Array< BufferInput | null > | null,
  parameters?: Array< ParameterInput | null > | null,
  aosParams: AOSParameterInput,
  logConfigId: string,
  logConfigVersionNumber: number,
  monitor?: MonitorInput | null,
  force?: boolean | null,
  osiParams?: OpenSearchIngestionInput | null,
  tags?: Array< TagInput | null > | null,
  logProcessorConcurrency: string,
};

export type CreateAppPipelineMutation = {
  createAppPipeline?: string | null,
};

export type CreateLightEngineAppPipelineMutationVariables = {
  params: LightEngineParameterInput,
  bufferParams?: Array< BufferInput | null > | null,
  logConfigId: string,
  logConfigVersionNumber: number,
  monitor?: MonitorInput | null,
  force?: boolean | null,
  tags?: Array< TagInput | null > | null,
  logStructure?: LogStructure | null,
};

export type CreateLightEngineAppPipelineMutation = {
  createLightEngineAppPipeline?: string | null,
};

export type UpdateAppPipelineMutationVariables = {
  id: string,
  monitor?: MonitorInput | null,
};

export type UpdateAppPipelineMutation = {
  // Update a app pipeline
  updateAppPipeline?: string | null,
};

export type DeleteAppPipelineMutationVariables = {
  id: string,
};

export type DeleteAppPipelineMutation = {
  // Remove a app pipeline
  deleteAppPipeline?: string | null,
};

export type CreateAppLogIngestionMutationVariables = {
  sourceId: string,
  appPipelineId: string,
  tags?: Array< TagInput | null > | null,
  logPath?: string | null,
  autoAddPermission: boolean,
};

export type CreateAppLogIngestionMutation = {
  // Create a new app logging ingestion
  createAppLogIngestion?: string | null,
};

export type DeleteAppLogIngestionMutationVariables = {
  ids: Array< string >,
};

export type DeleteAppLogIngestionMutation = {
  // Remove a app logging ingestion
  deleteAppLogIngestion?: string | null,
};

export type RequestInstallLogAgentMutationVariables = {
  instanceIdSet: Array< string >,
  accountId?: string | null,
  region?: string | null,
};

export type RequestInstallLogAgentMutation = {
  // request to install logging agent
  requestInstallLogAgent?: string | null,
};

export type CreateLogSourceMutationVariables = {
  type: LogSourceType,
  region?: string | null,
  accountId?: string | null,
  ec2?: EC2SourceInput | null,
  syslog?: SyslogSourceInput | null,
  eks?: EKSSourceInput | null,
  s3?: S3SourceInput | null,
  tags?: Array< TagInput | null > | null,
};

export type CreateLogSourceMutation = {
  createLogSource?: string | null,
};

export type UpdateLogSourceMutationVariables = {
  type: LogSourceType,
  sourceId: string,
  action: LogSourceUpdateAction,
  ec2?: EC2SourceUpdateInput | null,
};

export type UpdateLogSourceMutation = {
  updateLogSource?: string | null,
};

export type DeleteLogSourceMutationVariables = {
  type: LogSourceType,
  sourceId: string,
};

export type DeleteLogSourceMutation = {
  deleteLogSource?: string | null,
};

export type CreateSubAccountLinkMutationVariables = {
  subAccountId: string,
  region?: string | null,
  subAccountName: string,
  subAccountRoleArn: string,
  agentInstallDoc: string,
  agentConfDoc: string,
  windowsAgentInstallDoc: string,
  windowsAgentConfDoc: string,
  agentStatusCheckDoc: string,
  subAccountBucketName: string,
  subAccountStackId: string,
  subAccountKMSKeyArn: string,
  subAccountIamInstanceProfileArn: string,
  subAccountFlbConfUploadingEventTopicArn: string,
  tags?: Array< TagInput | null > | null,
};

export type CreateSubAccountLinkMutation = {
  // *The following belongs to cross account* #
  // Create a new cross account link
  createSubAccountLink?: string | null,
};

export type UpdateSubAccountLinkMutationVariables = {
  subAccountId: string,
  region?: string | null,
  subAccountFlbConfUploadingEventTopicArn: string,
  windowsAgentInstallDoc: string,
  windowsAgentConfDoc: string,
  agentStatusCheckDoc: string,
  agentInstallDoc: string,
};

export type UpdateSubAccountLinkMutation = {
  // update a  cross account link
  updateSubAccountLink?: string | null,
};

export type DeleteSubAccountLinkMutationVariables = {
  subAccountId: string,
  region?: string | null,
};

export type DeleteSubAccountLinkMutation = {
  // Remove a cross account link
  deleteSubAccountLink?: string | null,
};

export type CreatePipelineAlarmMutationVariables = {
  pipelineId: string,
  pipelineType: PipelineType,
  snsTopicArn?: string | null,
  emails?: string | null,
  snsTopicName?: string | null,
};

export type CreatePipelineAlarmMutation = {
  // Create the alarm config of a specific Pipeline, including App and Service
  createPipelineAlarm?: string | null,
};

export type UpdatePipelineAlarmMutationVariables = {
  pipelineId: string,
  pipelineType: PipelineType,
  snsTopicArn?: string | null,
  emails?: string | null,
};

export type UpdatePipelineAlarmMutation = {
  // Update the alarm config of a specific Pipeline, including App and Service
  updatePipelineAlarm?: string | null,
};

export type DeletePipelineAlarmMutationVariables = {
  pipelineId: string,
  pipelineType: PipelineType,
};

export type DeletePipelineAlarmMutation = {
  // Delete the alarm config of a specific Pipeline, including App and Service
  deletePipelineAlarm?: string | null,
};

export type CreateGrafanaMutationVariables = {
  name: string,
  url: string,
  token: string,
  tags?: Array< TagInput | null > | null,
};

export type CreateGrafanaMutation = {
  createGrafana?: string | null,
};

export type UpdateGrafanaMutationVariables = {
  id: string,
  url?: string | null,
  token?: string | null,
};

export type UpdateGrafanaMutation = {
  updateGrafana?: string | null,
};

export type DeleteGrafanaMutationVariables = {
  id: string,
};

export type DeleteGrafanaMutation = {
  deleteGrafana?: string | null,
};

export type LatestVersionQuery = {
  latestVersion: string,
};

export type ListDomainNamesQueryVariables = {
  region?: string | null,
};

export type ListDomainNamesQuery = {
  // List OpenSearch Domain names in a region
  listDomainNames?:  {
    __typename: "DomainNames",
    domainNames?:  Array< {
      __typename: "DomainNameAndStatus",
      domainName?: string | null,
      status?: DomainImportStatus | null,
    } > | null,
  } | null,
};

export type GetDomainVpcQueryVariables = {
  domainName: string,
  region?: string | null,
};

export type GetDomainVpcQuery = {
  // Get OpenSearch domain vpc info
  getDomainVpc?:  {
    __typename: "ESVPCInfo",
    vpcId: string,
    subnetIds?: Array< string > | null,
    availabilityZones?: Array< string | null > | null,
    securityGroupIds?: Array< string | null > | null,
  } | null,
};

export type ListImportedDomainsQueryVariables = {
  metrics?: boolean | null,
  includeFailed?: boolean | null,
};

export type ListImportedDomainsQuery = {
  // List imported domain details.
  listImportedDomains?:  Array< {
    __typename: "ImportedDomain",
    id: string,
    domainName: string,
    engine?: EngineType | null,
    version: string,
    endpoint: string,
    metrics?:  {
      __typename: "DomainMetrics",
      searchableDocs?: number | null,
      freeStorageSpace?: number | null,
      health?: DomainHealth | null,
    } | null,
  } | null > | null,
};

export type GetDomainDetailsQueryVariables = {
  id: string,
  metrics?: boolean | null,
};

export type GetDomainDetailsQuery = {
  // Get Domain Detail by ID
  getDomainDetails?:  {
    __typename: "DomainDetails",
    id: string,
    domainArn: string,
    domainName: string,
    engine?: EngineType | null,
    version: string,
    endpoint: string,
    region?: string | null,
    accountId?: string | null,
    vpc?:  {
      __typename: "VPCInfo",
      vpcId: string,
      privateSubnetIds?: string | null,
      publicSubnetIds?: string | null,
      securityGroupId?: string | null,
    } | null,
    esVpc?:  {
      __typename: "ESVPCInfo",
      vpcId: string,
      subnetIds?: Array< string > | null,
      availabilityZones?: Array< string | null > | null,
      securityGroupIds?: Array< string | null > | null,
    } | null,
    nodes?:  {
      __typename: "Node",
      instanceType: string,
      instanceCount?: number | null,
      dedicatedMasterEnabled?: boolean | null,
      zoneAwarenessEnabled?: boolean | null,
      dedicatedMasterType?: string | null,
      dedicatedMasterCount?: number | null,
      warmEnabled?: boolean | null,
      warmType?: string | null,
      warmCount?: number | null,
      coldEnabled?: boolean | null,
    } | null,
    storageType: StorageType,
    volume?:  {
      __typename: "Volume",
      type: string,
      size: number,
    } | null,
    cognito?:  {
      __typename: "Cognito",
      enabled?: boolean | null,
      userPoolId?: string | null,
      domain?: string | null,
      identityPoolId?: string | null,
      roleArn?: string | null,
    } | null,
    tags?:  Array< {
      __typename: "Tag",
      key?: string | null,
      value?: string | null,
    } | null > | null,
    proxyStatus?: StackStatus | null,
    proxyALB?: string | null,
    proxyError?: string | null,
    proxyInput?:  {
      __typename: "ProxyInfo",
      vpc?:  {
        __typename: "VPCInfo",
        vpcId: string,
        privateSubnetIds?: string | null,
        publicSubnetIds?: string | null,
        securityGroupId?: string | null,
      } | null,
      certificateArn?: string | null,
      keyName?: string | null,
      customEndpoint?: string | null,
      cognitoEndpoint?: string | null,
    } | null,
    alarmStatus?: StackStatus | null,
    alarmError?: string | null,
    alarmInput?:  {
      __typename: "AlarmStackInfo",
      alarms?:  Array< {
        __typename: "AlarmInfo",
        type?: AlarmType | null,
        value?: string | null,
      } | null > | null,
      email?: string | null,
      phone?: string | null,
    } | null,
    metrics?:  {
      __typename: "DomainMetrics",
      searchableDocs?: number | null,
      freeStorageSpace?: number | null,
      health?: DomainHealth | null,
    } | null,
    status?: string | null,
    resources?:  Array< {
      __typename: "DomainRelevantResource",
      name?: string | null,
      values?: Array< string | null > | null,
      status?: ResourceStatus | null,
    } | null > | null,
  } | null,
};

export type ListServicePipelinesQueryVariables = {
  page?: number | null,
  count?: number | null,
};

export type ListServicePipelinesQuery = {
  // List service logging pipeline info
  listServicePipelines?:  {
    __typename: "ListServicePipelineResponse",
    pipelines?:  Array< {
      __typename: "ServicePipeline",
      id: string,
      type: ServiceType,
      destinationType?: DestinationType | null,
      source?: string | null,
      target?: string | null,
      parameters?:  Array< {
        __typename: "Parameter",
        parameterKey?: string | null,
        parameterValue?: string | null,
      } | null > | null,
      createdAt?: string | null,
      status?: PipelineStatus | null,
      tags?:  Array< {
        __typename: "Tag",
        key?: string | null,
        value?: string | null,
      } | null > | null,
      error?: string | null,
      monitor?:  {
        __typename: "MonitorDetail",
        status?: PipelineMonitorStatus | null,
        backupBucketName?: string | null,
        errorLogPrefix?: string | null,
        pipelineAlarmStatus?: PipelineAlarmStatus | null,
        snsTopicName?: string | null,
        snsTopicArn?: string | null,
        emails?: string | null,
      } | null,
      osiParams?:  {
        __typename: "OpenSearchIngestionParams",
        minCapacity?: number | null,
        maxCapacity?: number | null,
      } | null,
      osiPipelineName?: string | null,
      processorLogGroupName?: string | null,
      helperLogGroupName?: string | null,
      logEventQueueName?: string | null,
      deliveryStreamName?: string | null,
      bufferResourceName?: string | null,
      stackId?: string | null,
      logSourceAccountId?: string | null,
      logSourceRegion?: string | null,
      engineType?: AnalyticEngineType | null,
      lightEngineParams?:  {
        __typename: "LightEngineParameter",
        stagingBucketPrefix: string,
        centralizedBucketName: string,
        centralizedBucketPrefix: string,
        centralizedTableName: string,
        logProcessorSchedule: string,
        logMergerSchedule: string,
        logArchiveSchedule: string,
        logMergerAge: string,
        logArchiveAge: string,
        importDashboards: string,
        grafanaId?: string | null,
        recipients?: string | null,
        notificationService?: NotificationService | null,
        enrichmentPlugins?: string | null,
      } | null,
    } | null > | null,
    total?: number | null,
  } | null,
};

export type GetServicePipelineQueryVariables = {
  id: string,
};

export type GetServicePipelineQuery = {
  // Get service logging pipeline info by ID
  getServicePipeline?:  {
    __typename: "ServicePipeline",
    id: string,
    type: ServiceType,
    destinationType?: DestinationType | null,
    source?: string | null,
    target?: string | null,
    parameters?:  Array< {
      __typename: "Parameter",
      parameterKey?: string | null,
      parameterValue?: string | null,
    } | null > | null,
    createdAt?: string | null,
    status?: PipelineStatus | null,
    tags?:  Array< {
      __typename: "Tag",
      key?: string | null,
      value?: string | null,
    } | null > | null,
    error?: string | null,
    monitor?:  {
      __typename: "MonitorDetail",
      status?: PipelineMonitorStatus | null,
      backupBucketName?: string | null,
      errorLogPrefix?: string | null,
      pipelineAlarmStatus?: PipelineAlarmStatus | null,
      snsTopicName?: string | null,
      snsTopicArn?: string | null,
      emails?: string | null,
    } | null,
    osiParams?:  {
      __typename: "OpenSearchIngestionParams",
      minCapacity?: number | null,
      maxCapacity?: number | null,
    } | null,
    osiPipelineName?: string | null,
    processorLogGroupName?: string | null,
    helperLogGroupName?: string | null,
    logEventQueueName?: string | null,
    deliveryStreamName?: string | null,
    bufferResourceName?: string | null,
    stackId?: string | null,
    logSourceAccountId?: string | null,
    logSourceRegion?: string | null,
    engineType?: AnalyticEngineType | null,
    lightEngineParams?:  {
      __typename: "LightEngineParameter",
      stagingBucketPrefix: string,
      centralizedBucketName: string,
      centralizedBucketPrefix: string,
      centralizedTableName: string,
      logProcessorSchedule: string,
      logMergerSchedule: string,
      logArchiveSchedule: string,
      logMergerAge: string,
      logArchiveAge: string,
      importDashboards: string,
      grafanaId?: string | null,
      recipients?: string | null,
      notificationService?: NotificationService | null,
      enrichmentPlugins?: string | null,
    } | null,
  } | null,
};

export type ListResourcesQueryVariables = {
  type: ResourceType,
  parentId?: string | null,
  accountId?: string | null,
  region?: string | null,
};

export type ListResourcesQuery = {
  // List Common AWS Resources
  listResources?:  Array< {
    __typename: "Resource",
    id: string,
    name: string,
    parentId?: string | null,
    description?: string | null,
  } | null > | null,
};

export type GetResourceLoggingBucketQueryVariables = {
  type: ResourceType,
  resourceName: string,
  accountId?: string | null,
  region?: string | null,
};

export type GetResourceLoggingBucketQuery = {
  // Get logging bucket for a type of resource by resource name or id
  getResourceLoggingBucket?:  {
    __typename: "LoggingBucket",
    enabled?: boolean | null,
    bucket?: string | null,
    prefix?: string | null,
    source?: LoggingBucketSource | null,
  } | null,
};

export type GetResourceLogConfigsQueryVariables = {
  type: ResourceType,
  resourceName: string,
  accountId?: string | null,
  region?: string | null,
};

export type GetResourceLogConfigsQuery = {
  // Get a list of logging configurations for AWS Resource
  getResourceLogConfigs?:  Array< {
    __typename: "ResourceLogConf",
    destinationType: DestinationType,
    destinationName: string,
    name?: string | null,
    logFormat?: string | null,
    region?: string | null,
  } | null > | null,
};

export type ListLogConfigsQueryVariables = {
  page: number,
  count: number,
};

export type ListLogConfigsQuery = {
  // List logging conf info v2
  listLogConfigs?:  {
    __typename: "ListLogConfigsResponse",
    logConfigs?:  Array< {
      __typename: "LogConfig",
      id?: string | null,
      version?: number | null,
      createdAt?: string | null,
      name?: string | null,
      logType?: LogType | null,
      syslogParser?: SyslogParser | null,
      multilineLogParser?: MultiLineLogParser | null,
      iisLogParser?: IISlogParser | null,
      filterConfigMap?:  {
        __typename: "ProcessorFilterRegex",
        enabled?: boolean | null,
        filters?:  Array< {
          __typename: "LogConfFilter",
          key: string,
          condition: LogConfFilterCondition,
          value: string,
        } | null > | null,
      } | null,
      regex?: string | null,
      jsonSchema?: string | null,
      regexFieldSpecs?:  Array< {
        __typename: "RegularSpec",
        key: string,
        type: string,
        format?: string | null,
      } | null > | null,
      timeKey?: string | null,
      timeOffset?: string | null,
      timeKeyRegex?: string | null,
      userLogFormat?: string | null,
      userSampleLog?: string | null,
    } | null > | null,
    total?: number | null,
  } | null,
};

export type GetLogConfigQueryVariables = {
  id: string,
  version?: number | null,
};

export type GetLogConfigQuery = {
  // Get logging conf v2 info by ID
  getLogConfig?:  {
    __typename: "LogConfig",
    id?: string | null,
    version?: number | null,
    createdAt?: string | null,
    name?: string | null,
    logType?: LogType | null,
    syslogParser?: SyslogParser | null,
    multilineLogParser?: MultiLineLogParser | null,
    iisLogParser?: IISlogParser | null,
    filterConfigMap?:  {
      __typename: "ProcessorFilterRegex",
      enabled?: boolean | null,
      filters?:  Array< {
        __typename: "LogConfFilter",
        key: string,
        condition: LogConfFilterCondition,
        value: string,
      } | null > | null,
    } | null,
    regex?: string | null,
    jsonSchema?: string | null,
    regexFieldSpecs?:  Array< {
      __typename: "RegularSpec",
      key: string,
      type: string,
      format?: string | null,
    } | null > | null,
    timeKey?: string | null,
    timeOffset?: string | null,
    timeKeyRegex?: string | null,
    userLogFormat?: string | null,
    userSampleLog?: string | null,
  } | null,
};

export type ListAppPipelinesQueryVariables = {
  page?: number | null,
  count?: number | null,
};

export type ListAppPipelinesQuery = {
  // List app pipeline info
  listAppPipelines?:  {
    __typename: "ListAppPipelineResponse",
    appPipelines?:  Array< {
      __typename: "AppPipeline",
      pipelineId: string,
      bufferType?: BufferType | null,
      bufferParams?:  Array< {
        __typename: "BufferParameter",
        paramKey?: string | null,
        paramValue?: string | null,
      } | null > | null,
      parameters?:  Array< {
        __typename: "Parameter",
        parameterKey?: string | null,
        parameterValue?: string | null,
      } | null > | null,
      aosParams?:  {
        __typename: "AOSParameter",
        opensearchArn?: string | null,
        domainName?: string | null,
        indexPrefix?: string | null,
        warmLogTransition?: string | null,
        coldLogTransition?: string | null,
        logRetention?: string | null,
        rolloverSize?: string | null,
        codec?: Codec | null,
        indexSuffix?: IndexSuffix | null,
        refreshInterval?: string | null,
        shardNumbers?: number | null,
        replicaNumbers?: number | null,
        engine?: EngineType | null,
      } | null,
      lightEngineParams?:  {
        __typename: "LightEngineParameter",
        stagingBucketPrefix: string,
        centralizedBucketName: string,
        centralizedBucketPrefix: string,
        centralizedTableName: string,
        logProcessorSchedule: string,
        logMergerSchedule: string,
        logArchiveSchedule: string,
        logMergerAge: string,
        logArchiveAge: string,
        importDashboards: string,
        grafanaId?: string | null,
        recipients?: string | null,
        notificationService?: NotificationService | null,
        enrichmentPlugins?: string | null,
      } | null,
      createdAt?: string | null,
      status?: PipelineStatus | null,
      logConfigId?: string | null,
      logConfigVersionNumber?: number | null,
      logConfig?:  {
        __typename: "LogConfig",
        id?: string | null,
        version?: number | null,
        createdAt?: string | null,
        name?: string | null,
        logType?: LogType | null,
        syslogParser?: SyslogParser | null,
        multilineLogParser?: MultiLineLogParser | null,
        iisLogParser?: IISlogParser | null,
        filterConfigMap?:  {
          __typename: "ProcessorFilterRegex",
          enabled?: boolean | null,
          filters?:  Array< {
            __typename: "LogConfFilter",
            key: string,
            condition: LogConfFilterCondition,
            value: string,
          } | null > | null,
        } | null,
        regex?: string | null,
        jsonSchema?: string | null,
        regexFieldSpecs?:  Array< {
          __typename: "RegularSpec",
          key: string,
          type: string,
          format?: string | null,
        } | null > | null,
        timeKey?: string | null,
        timeOffset?: string | null,
        timeKeyRegex?: string | null,
        userLogFormat?: string | null,
        userSampleLog?: string | null,
      } | null,
      bufferAccessRoleArn?: string | null,
      bufferAccessRoleName?: string | null,
      bufferResourceName?: string | null,
      bufferResourceArn?: string | null,
      processorLogGroupName?: string | null,
      helperLogGroupName?: string | null,
      logEventQueueName?: string | null,
      monitor?:  {
        __typename: "MonitorDetail",
        status?: PipelineMonitorStatus | null,
        backupBucketName?: string | null,
        errorLogPrefix?: string | null,
        pipelineAlarmStatus?: PipelineAlarmStatus | null,
        snsTopicName?: string | null,
        snsTopicArn?: string | null,
        emails?: string | null,
      } | null,
      osiParams?:  {
        __typename: "OpenSearchIngestionParams",
        minCapacity?: number | null,
        maxCapacity?: number | null,
      } | null,
      osiPipelineName?: string | null,
      minCapacity?: number | null,
      maxCapacity?: number | null,
      stackId?: string | null,
      error?: string | null,
      engineType?: AnalyticEngineType | null,
      logStructure?: LogStructure | null,
      tags?:  Array< {
        __typename: "Tag",
        key?: string | null,
        value?: string | null,
      } | null > | null,
    } | null > | null,
    total?: number | null,
  } | null,
};

export type GetAppPipelineQueryVariables = {
  id: string,
};

export type GetAppPipelineQuery = {
  // Get app pipeline info by ID
  getAppPipeline?:  {
    __typename: "AppPipeline",
    pipelineId: string,
    bufferType?: BufferType | null,
    bufferParams?:  Array< {
      __typename: "BufferParameter",
      paramKey?: string | null,
      paramValue?: string | null,
    } | null > | null,
    parameters?:  Array< {
      __typename: "Parameter",
      parameterKey?: string | null,
      parameterValue?: string | null,
    } | null > | null,
    aosParams?:  {
      __typename: "AOSParameter",
      opensearchArn?: string | null,
      domainName?: string | null,
      indexPrefix?: string | null,
      warmLogTransition?: string | null,
      coldLogTransition?: string | null,
      logRetention?: string | null,
      rolloverSize?: string | null,
      codec?: Codec | null,
      indexSuffix?: IndexSuffix | null,
      refreshInterval?: string | null,
      shardNumbers?: number | null,
      replicaNumbers?: number | null,
      engine?: EngineType | null,
    } | null,
    lightEngineParams?:  {
      __typename: "LightEngineParameter",
      stagingBucketPrefix: string,
      centralizedBucketName: string,
      centralizedBucketPrefix: string,
      centralizedTableName: string,
      logProcessorSchedule: string,
      logMergerSchedule: string,
      logArchiveSchedule: string,
      logMergerAge: string,
      logArchiveAge: string,
      importDashboards: string,
      grafanaId?: string | null,
      recipients?: string | null,
      notificationService?: NotificationService | null,
      enrichmentPlugins?: string | null,
    } | null,
    createdAt?: string | null,
    status?: PipelineStatus | null,
    logConfigId?: string | null,
    logConfigVersionNumber?: number | null,
    logConfig?:  {
      __typename: "LogConfig",
      id?: string | null,
      version?: number | null,
      createdAt?: string | null,
      name?: string | null,
      logType?: LogType | null,
      syslogParser?: SyslogParser | null,
      multilineLogParser?: MultiLineLogParser | null,
      iisLogParser?: IISlogParser | null,
      filterConfigMap?:  {
        __typename: "ProcessorFilterRegex",
        enabled?: boolean | null,
        filters?:  Array< {
          __typename: "LogConfFilter",
          key: string,
          condition: LogConfFilterCondition,
          value: string,
        } | null > | null,
      } | null,
      regex?: string | null,
      jsonSchema?: string | null,
      regexFieldSpecs?:  Array< {
        __typename: "RegularSpec",
        key: string,
        type: string,
        format?: string | null,
      } | null > | null,
      timeKey?: string | null,
      timeOffset?: string | null,
      timeKeyRegex?: string | null,
      userLogFormat?: string | null,
      userSampleLog?: string | null,
    } | null,
    bufferAccessRoleArn?: string | null,
    bufferAccessRoleName?: string | null,
    bufferResourceName?: string | null,
    bufferResourceArn?: string | null,
    processorLogGroupName?: string | null,
    helperLogGroupName?: string | null,
    logEventQueueName?: string | null,
    monitor?:  {
      __typename: "MonitorDetail",
      status?: PipelineMonitorStatus | null,
      backupBucketName?: string | null,
      errorLogPrefix?: string | null,
      pipelineAlarmStatus?: PipelineAlarmStatus | null,
      snsTopicName?: string | null,
      snsTopicArn?: string | null,
      emails?: string | null,
    } | null,
    osiParams?:  {
      __typename: "OpenSearchIngestionParams",
      minCapacity?: number | null,
      maxCapacity?: number | null,
    } | null,
    osiPipelineName?: string | null,
    minCapacity?: number | null,
    maxCapacity?: number | null,
    stackId?: string | null,
    error?: string | null,
    engineType?: AnalyticEngineType | null,
    logStructure?: LogStructure | null,
    tags?:  Array< {
      __typename: "Tag",
      key?: string | null,
      value?: string | null,
    } | null > | null,
  } | null,
};

export type ListAppLogIngestionsQueryVariables = {
  page?: number | null,
  count?: number | null,
  appPipelineId?: string | null,
  sourceId?: string | null,
  region?: string | null,
  accountId?: string | null,
};

export type ListAppLogIngestionsQuery = {
  // List app logging ingestion info
  listAppLogIngestions?:  {
    __typename: "ListAppLogIngestionResponse",
    appLogIngestions?:  Array< {
      __typename: "AppLogIngestion",
      id: string,
      stackId?: string | null,
      stackName?: string | null,
      appPipelineId?: string | null,
      logPath?: string | null,
      sourceId?: string | null,
      sourceType?: string | null,
      createdAt?: string | null,
      status?: string | null,
      tags?:  Array< {
        __typename: "Tag",
        key?: string | null,
        value?: string | null,
      } | null > | null,
      accountId?: string | null,
      region?: string | null,
    } | null > | null,
    total?: number | null,
  } | null,
};

export type ListInstanceIngestionDetailsQueryVariables = {
  page?: number | null,
  count?: number | null,
  ingestionId?: string | null,
  instanceId?: string | null,
};

export type ListInstanceIngestionDetailsQuery = {
  // List instance ingestion ssm detail
  listInstanceIngestionDetails?:  {
    __typename: "ListInstanceIngestionDetailsResponse",
    instanceIngestionDetail?:  Array< {
      __typename: "InstanceIngestionDetail",
      instanceId?: string | null,
      ssmCommandId?: string | null,
      ssmCommandStatus?: string | null,
      details?: string | null,
    } | null > | null,
    total?: number | null,
  } | null,
};

export type GetAppLogIngestionQueryVariables = {
  id: string,
};

export type GetAppLogIngestionQuery = {
  // Get app logging ingestion info by ID
  getAppLogIngestion?:  {
    __typename: "AppLogIngestion",
    id: string,
    stackId?: string | null,
    stackName?: string | null,
    appPipelineId?: string | null,
    logPath?: string | null,
    sourceId?: string | null,
    sourceType?: string | null,
    createdAt?: string | null,
    status?: string | null,
    tags?:  Array< {
      __typename: "Tag",
      key?: string | null,
      value?: string | null,
    } | null > | null,
    accountId?: string | null,
    region?: string | null,
  } | null,
};

export type GetK8sDeploymentContentWithSidecarQueryVariables = {
  id: string,
};

export type GetK8sDeploymentContentWithSidecarQuery = {
  // Get k8s deployment YAML with Sidecar by ID
  getK8sDeploymentContentWithSidecar?: string | null,
};

export type GetK8sDeploymentContentWithDaemonSetQueryVariables = {
  sourceId: string,
};

export type GetK8sDeploymentContentWithDaemonSetQuery = {
  // Get k8s deployment YAML with DaemonSet by sourceId
  getK8sDeploymentContentWithDaemonSet?: string | null,
};

export type ListInstancesQueryVariables = {
  maxResults?: number | null,
  nextToken?: string | null,
  instanceSet?: Array< string | null > | null,
  tags?: Array< TagFilterInput | null > | null,
  region?: string | null,
  accountId?: string | null,
  platformType?: EC2GroupPlatform | null,
};

export type ListInstancesQuery = {
  // List AWS Instance
  listInstances?:  {
    __typename: "ListInstanceResponse",
    instances?:  Array< {
      __typename: "Instance",
      id: string,
      platformName?: string | null,
      platformType?: string | null,
      ipAddress?: string | null,
      computerName?: string | null,
      name?: string | null,
    } | null > | null,
    nextToken?: string | null,
  } | null,
};

export type GetLogAgentStatusQueryVariables = {
  instanceId: string,
  region?: string | null,
  accountId?: string | null,
};

export type GetLogAgentStatusQuery = {
  // Get logging Agent Status by instanceId
  getLogAgentStatus?: LogAgentStatus | null,
};

export type GetInstanceAgentStatusQueryVariables = {
  instanceIds: Array< string | null >,
  region?: string | null,
  accountId?: string | null,
  commandId?: string | null,
};

export type GetInstanceAgentStatusQuery = {
  // Get log Agent Status by instanceId
  getInstanceAgentStatus?:  {
    __typename: "InstanceAgentStatusResponse",
    commandId?: string | null,
    instanceAgentStatusList?:  Array< {
      __typename: "InstanceAgentStatus",
      instanceId?: string | null,
      status?: LogAgentStatus | null,
      invocationOutput?: string | null,
      curlOutput?: string | null,
    } | null > | null,
  } | null,
};

export type ValidateVpcCidrQueryVariables = {
  domainName: string,
  region?: string | null,
};

export type ValidateVpcCidrQuery = {
  // Verify if CIDR Conflict
  validateVpcCidr?: string | null,
};

export type GetLogSourceQueryVariables = {
  type: LogSourceType,
  sourceId: string,
};

export type GetLogSourceQuery = {
  // Get logging source info by ID
  getLogSource?:  {
    __typename: "LogSource",
    sourceId: string,
    type?: LogSourceType | null,
    accountId?: string | null,
    region?: string | null,
    eks?:  {
      __typename: "EKSSource",
      eksClusterName?: string | null,
      eksClusterArn?: string | null,
      cri?: CRI | null,
      vpcId?: string | null,
      eksClusterSGId?: string | null,
      subnetIds?: Array< string | null > | null,
      oidcIssuer?: string | null,
      endpoint?: string | null,
      logAgentRoleArn?: string | null,
      deploymentKind?: EKSDeployKind | null,
    } | null,
    s3?:  {
      __typename: "S3Source",
      mode?: IngestionMode | null,
      bucketName?: string | null,
      keyPrefix?: string | null,
      keySuffix?: string | null,
      compressionType?: CompressionType | null,
    } | null,
    ec2?:  {
      __typename: "EC2Source",
      groupName: string,
      groupType: EC2GroupType,
      groupPlatform: EC2GroupPlatform,
      asgName?: string | null,
      instances?:  Array< {
        __typename: "EC2Instances",
        instanceId: string,
      } | null > | null,
    } | null,
    syslog?:  {
      __typename: "SyslogSource",
      protocol?: ProtocolType | null,
      port?: number | null,
      nlbArn?: string | null,
      nlbDNSName?: string | null,
    } | null,
    createdAt?: string | null,
    updatedAt?: string | null,
    status?: PipelineStatus | null,
    tags?:  Array< {
      __typename: "Tag",
      key?: string | null,
      value?: string | null,
    } | null > | null,
  } | null,
};

export type GetAutoScalingGroupConfQueryVariables = {
  groupId: string,
};

export type GetAutoScalingGroupConfQuery = {
  getAutoScalingGroupConf?: string | null,
};

export type ListLogSourcesQueryVariables = {
  type: LogSourceType,
  page: number,
  count: number,
};

export type ListLogSourcesQuery = {
  listLogSources?:  {
    __typename: "ListLogSourceResponse",
    logSources?:  Array< {
      __typename: "LogSource",
      sourceId: string,
      type?: LogSourceType | null,
      accountId?: string | null,
      region?: string | null,
      eks?:  {
        __typename: "EKSSource",
        eksClusterName?: string | null,
        eksClusterArn?: string | null,
        cri?: CRI | null,
        vpcId?: string | null,
        eksClusterSGId?: string | null,
        subnetIds?: Array< string | null > | null,
        oidcIssuer?: string | null,
        endpoint?: string | null,
        logAgentRoleArn?: string | null,
        deploymentKind?: EKSDeployKind | null,
      } | null,
      s3?:  {
        __typename: "S3Source",
        mode?: IngestionMode | null,
        bucketName?: string | null,
        keyPrefix?: string | null,
        keySuffix?: string | null,
        compressionType?: CompressionType | null,
      } | null,
      ec2?:  {
        __typename: "EC2Source",
        groupName: string,
        groupType: EC2GroupType,
        groupPlatform: EC2GroupPlatform,
        asgName?: string | null,
        instances?:  Array< {
          __typename: "EC2Instances",
          instanceId: string,
        } | null > | null,
      } | null,
      syslog?:  {
        __typename: "SyslogSource",
        protocol?: ProtocolType | null,
        port?: number | null,
        nlbArn?: string | null,
        nlbDNSName?: string | null,
      } | null,
      createdAt?: string | null,
      updatedAt?: string | null,
      status?: PipelineStatus | null,
      tags?:  Array< {
        __typename: "Tag",
        key?: string | null,
        value?: string | null,
      } | null > | null,
    } | null > | null,
    total?: number | null,
  } | null,
};

export type CheckTimeFormatQueryVariables = {
  timeStr: string,
  formatStr: string,
};

export type CheckTimeFormatQuery = {
  // Check Time format
  checkTimeFormat?:  {
    __typename: "CheckTimeFormatRes",
    isMatch?: boolean | null,
  } | null,
};

export type ListSubAccountLinksQueryVariables = {
  page?: number | null,
  count?: number | null,
};

export type ListSubAccountLinksQuery = {
  // List sub account info
  listSubAccountLinks?:  {
    __typename: "ListSubAccountLinkResponse",
    subAccountLinks?:  Array< {
      __typename: "SubAccountLink",
      id?: string | null,
      subAccountId?: string | null,
      region?: string | null,
      subAccountName?: string | null,
      subAccountRoleArn?: string | null,
      agentInstallDoc?: string | null,
      agentConfDoc?: string | null,
      windowsAgentInstallDoc?: string | null,
      windowsAgentConfDoc?: string | null,
      agentStatusCheckDoc?: string | null,
      subAccountBucketName?: string | null,
      subAccountStackId?: string | null,
      subAccountKMSKeyArn?: string | null,
      subAccountVpcId?: string | null,
      subAccountPublicSubnetIds?: string | null,
      subAccountIamInstanceProfileArn?: string | null,
      subAccountFlbConfUploadingEventTopicArn?: string | null,
      createdAt?: string | null,
      status?: string | null,
      tags?:  Array< {
        __typename: "Tag",
        key?: string | null,
        value?: string | null,
      } | null > | null,
    } | null > | null,
    total?: number | null,
  } | null,
};

export type GetSubAccountLinkQueryVariables = {
  subAccountId: string,
  region?: string | null,
};

export type GetSubAccountLinkQuery = {
  // Get sub account info
  getSubAccountLink?:  {
    __typename: "SubAccountLink",
    id?: string | null,
    subAccountId?: string | null,
    region?: string | null,
    subAccountName?: string | null,
    subAccountRoleArn?: string | null,
    agentInstallDoc?: string | null,
    agentConfDoc?: string | null,
    windowsAgentInstallDoc?: string | null,
    windowsAgentConfDoc?: string | null,
    agentStatusCheckDoc?: string | null,
    subAccountBucketName?: string | null,
    subAccountStackId?: string | null,
    subAccountKMSKeyArn?: string | null,
    subAccountVpcId?: string | null,
    subAccountPublicSubnetIds?: string | null,
    subAccountIamInstanceProfileArn?: string | null,
    subAccountFlbConfUploadingEventTopicArn?: string | null,
    createdAt?: string | null,
    status?: string | null,
    tags?:  Array< {
      __typename: "Tag",
      key?: string | null,
      value?: string | null,
    } | null > | null,
  } | null,
};

export type CheckCustomPortQueryVariables = {
  sourceType?: LogSourceType | null,
  syslogProtocol: ProtocolType,
  syslogPort: number,
};

export type CheckCustomPortQuery = {
  checkCustomPort?:  {
    __typename: "checkCustomPortResponse",
    isAllowedPort?: boolean | null,
    msg?: string | null,
    recommendedPort?: number | null,
  } | null,
};

export type ListLogStreamsQueryVariables = {
  logGroupName: string,
  logStreamNamePrefix?: string | null,
  page?: number | null,
  count?: number | null,
};

export type ListLogStreamsQuery = {
  // Get the list of log group by log group name
  listLogStreams?:  {
    __typename: "ListLogStreamsResponse",
    logStreams?:  Array< {
      __typename: "LogStream",
      logStreamName?: string | null,
      creationTime?: string | null,
      firstEventTimestamp?: string | null,
      lastEventTimestamp?: string | null,
      lastIngestionTime?: string | null,
      uploadSequenceToken?: string | null,
      arn?: string | null,
      storedBytes?: number | null,
    } | null > | null,
    total?: number | null,
  } | null,
};

export type GetLogEventsQueryVariables = {
  logGroupName: string,
  logStreamName: string,
  startTime?: number | null,
  endTime?: number | null,
  filterPattern?: string | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type GetLogEventsQuery = {
  // Get the log events by log group name and log stream name
  getLogEvents?:  {
    __typename: "GetLogEventsResponse",
    logEvents?:  Array< {
      __typename: "LogEvent",
      timestamp?: string | null,
      message?: string | null,
      ingestionTime?: string | null,
    } | null > | null,
    nextForwardToken?: string | null,
    nextBackwardToken?: string | null,
  } | null,
};

export type GetMetricHistoryDataQueryVariables = {
  pipelineId: string,
  pipelineType: PipelineType,
  metricNames?: Array< MetricName | null > | null,
  startTime?: number | null,
  endTime?: number | null,
};

export type GetMetricHistoryDataQuery = {
  // Get the log metric history data
  getMetricHistoryData?:  {
    __typename: "MetricHistoryData",
    series?:  Array< {
      __typename: "DataSerie",
      name?: string | null,
      data?: Array< number | null > | null,
    } | null > | null,
    xaxis?:  {
      __typename: "GraphXaxis",
      categories?: Array< number | null > | null,
    } | null,
  } | null,
};

export type GetPipelineAlarmQueryVariables = {
  pipelineId: string,
  pipelineType: PipelineType,
  alarmName: AlarmMetricName,
};

export type GetPipelineAlarmQuery = {
  // Get the pipeline alarm status of a specific metric alarm
  getPipelineAlarm?:  {
    __typename: "PipelineAlarm",
    alarms?:  Array< {
      __typename: "AlarmMetricDetail",
      name?: AlarmMetricName | null,
      status?: AlarmMetricStatus | null,
      resourceId?: string | null,
    } | null > | null,
  } | null,
};

export type DomainStatusCheckQueryVariables = {
  domainName: string,
  region?: string | null,
};

export type DomainStatusCheckQuery = {
  // Check the networking requirements and any other requirements for a AOS domain
  domainStatusCheck?:  {
    __typename: "DomainStatusCheckResponse",
    status?: DomainStatusCheckType | null,
    details?:  Array< {
      __typename: "DomainStatusCheckDetail",
      name?: string | null,
      values?: Array< string | null > | null,
      errorCode?: ErrorCode | null,
      status?: DomainStatusCheckType | null,
    } | null > | null,
    multiAZWithStandbyEnabled?: boolean | null,
  } | null,
};

export type CheckOSIAvailabilityQuery = {
  // Check if OSI is available in the current region
  checkOSIAvailability?: boolean | null,
};

export type GetAccountUnreservedConurrencyQuery = {
  // Get account unreserved concurrency limit
  getAccountUnreservedConurrency?: number | null,
};

export type ListGrafanasQueryVariables = {
  page?: number | null,
  count?: number | null,
};

export type ListGrafanasQuery = {
  listGrafanas?:  {
    __typename: "ListGrafanasResponse",
    grafanas?:  Array< {
      __typename: "Grafana",
      id: string,
      name: string,
      url: string,
      createdAt?: string | null,
      tags?:  Array< {
        __typename: "Tag",
        key?: string | null,
        value?: string | null,
      } | null > | null,
    } | null > | null,
    total?: number | null,
  } | null,
};

export type GetGrafanaQueryVariables = {
  id: string,
};

export type GetGrafanaQuery = {
  getGrafana?:  {
    __typename: "Grafana",
    id: string,
    name: string,
    url: string,
    createdAt?: string | null,
    tags?:  Array< {
      __typename: "Tag",
      key?: string | null,
      value?: string | null,
    } | null > | null,
  } | null,
};

export type CheckGrafanaQueryVariables = {
  id?: string | null,
  url?: string | null,
  token?: string | null,
};

export type CheckGrafanaQuery = {
  checkGrafana?:  {
    __typename: "GrafanaStatusCheckResponse",
    status?: DomainStatusCheckType | null,
    details?:  Array< {
      __typename: "DomainStatusCheckDetail",
      name?: string | null,
      values?: Array< string | null > | null,
      errorCode?: ErrorCode | null,
      status?: DomainStatusCheckType | null,
    } | null > | null,
  } | null,
};

export type GetLightEngineAppPipelineExecutionLogsQueryVariables = {
  pipelineId: string,
  stateMachineName: string,
  type: ScheduleType,
  status?: ExecutionStatus | null,
  startTime?: string | null,
  endTime?: string | null,
  lastEvaluatedKey?: string | null,
  limit?: number | null,
};

export type GetLightEngineAppPipelineExecutionLogsQuery = {
  // Get Light Engine Application pipeline execution.
  getLightEngineAppPipelineExecutionLogs?:  {
    __typename: "LightEnginePipelineExecutionLogsResponse",
    items?:  Array< {
      __typename: "LightEnginePipelineExecutionLog",
      executionName?: string | null,
      executionArn?: string | null,
      taskId?: string | null,
      startTime?: string | null,
      endTime?: string | null,
      status?: ExecutionStatus | null,
    } | null > | null,
    lastEvaluatedKey?: string | null,
  } | null,
};

export type GetLightEngineAppPipelineDetailQueryVariables = {
  pipelineId: string,
};

export type GetLightEngineAppPipelineDetailQuery = {
  // Get Light Engine Application pipeline details.
  getLightEngineAppPipelineDetail?:  {
    __typename: "LightEnginePipelineDetailResponse",
    analyticsEngine?:  {
      __typename: "AnalyticsEngine",
      engineType: AnalyticEngineType,
      table?:  {
        __typename: "LightEngineTableMetadata",
        databaseName: string,
        tableName: string,
        location: string,
        classification: string,
        dashboardName?: string | null,
        dashboardLink?: string | null,
      } | null,
      metric?:  {
        __typename: "LightEngineTableMetadata",
        databaseName: string,
        tableName: string,
        location: string,
        classification: string,
        dashboardName?: string | null,
        dashboardLink?: string | null,
      } | null,
    } | null,
    schedules?:  Array< {
      __typename: "Schedule",
      type: ScheduleType,
      stateMachine:  {
        __typename: "StateMachine",
        arn: string,
        name: string,
      },
      scheduler:  {
        __typename: "Scheduler",
        type: SchedulerType,
        group: string,
        name: string,
        expression: string,
        age?: number | null,
      },
    } | null > | null,
  } | null,
};

export type GetLightEngineServicePipelineExecutionLogsQueryVariables = {
  pipelineId: string,
  stateMachineName: string,
  type: ScheduleType,
  status?: ExecutionStatus | null,
  startTime?: string | null,
  endTime?: string | null,
  lastEvaluatedKey?: string | null,
  limit?: number | null,
};

export type GetLightEngineServicePipelineExecutionLogsQuery = {
  // Get Light Engine Service pipeline execution.
  getLightEngineServicePipelineExecutionLogs?:  {
    __typename: "LightEnginePipelineExecutionLogsResponse",
    items?:  Array< {
      __typename: "LightEnginePipelineExecutionLog",
      executionName?: string | null,
      executionArn?: string | null,
      taskId?: string | null,
      startTime?: string | null,
      endTime?: string | null,
      status?: ExecutionStatus | null,
    } | null > | null,
    lastEvaluatedKey?: string | null,
  } | null,
};

export type GetLightEngineServicePipelineDetailQueryVariables = {
  pipelineId: string,
};

export type GetLightEngineServicePipelineDetailQuery = {
  // Get Light Engine Service pipeline details.
  getLightEngineServicePipelineDetail?:  {
    __typename: "LightEnginePipelineDetailResponse",
    analyticsEngine?:  {
      __typename: "AnalyticsEngine",
      engineType: AnalyticEngineType,
      table?:  {
        __typename: "LightEngineTableMetadata",
        databaseName: string,
        tableName: string,
        location: string,
        classification: string,
        dashboardName?: string | null,
        dashboardLink?: string | null,
      } | null,
      metric?:  {
        __typename: "LightEngineTableMetadata",
        databaseName: string,
        tableName: string,
        location: string,
        classification: string,
        dashboardName?: string | null,
        dashboardLink?: string | null,
      } | null,
    } | null,
    schedules?:  Array< {
      __typename: "Schedule",
      type: ScheduleType,
      stateMachine:  {
        __typename: "StateMachine",
        arn: string,
        name: string,
      },
      scheduler:  {
        __typename: "Scheduler",
        type: SchedulerType,
        group: string,
        name: string,
        expression: string,
        age?: number | null,
      },
    } | null > | null,
  } | null,
};
