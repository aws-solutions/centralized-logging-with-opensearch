/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type VPCInput = {
  vpcId: string;
  publicSubnetIds?: string | null;
  privateSubnetIds?: string | null;
  securityGroupId: string;
};

export type TagInput = {
  key?: string | null;
  value?: string | null;
};

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
  parameterKey?: string | null;
  parameterValue?: string | null;
};

export type ProxyInput = {
  vpc: VPCInput;
  certificateArn: string;
  keyName: string;
  customEndpoint: string;
  cognitoEndpoint?: string | null;
};

export type AlarmStackInput = {
  alarms?: Array<AlarmInput | null> | null;
  email?: string | null;
  phone?: string | null;
};

export type AlarmInput = {
  type?: AlarmType | null;
  value?: string | null;
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
}

export type LoggingBucket = {
  __typename: "LoggingBucket";
  enabled?: boolean | null;
  bucket?: string | null;
  prefix?: string | null;
  source?: LoggingBucketSource | null;
};

export enum LoggingBucketSource {
  WAF = "WAF",
  KinesisDataFirehoseForWAF = "KinesisDataFirehoseForWAF",
}

export enum LogType {
  JSON = "JSON",
  Regex = "Regex",
  Nginx = "Nginx",
  Apache = "Apache",
  Syslog = "Syslog",
  SingleLineText = "SingleLineText",
  MultiLineText = "MultiLineText",
}

export enum MultiLineLogParser {
  JAVA_SPRING_BOOT = "JAVA_SPRING_BOOT",
  CUSTOM = "CUSTOM",
}

export enum SyslogParser {
  RFC5424 = "RFC5424",
  RFC3164 = "RFC3164",
  CUSTOM = "CUSTOM",
}

export type RegularSpecInput = {
  key: string;
  type: string;
  format?: string | null;
};

export type ProcessorFilterRegexInput = {
  enable: boolean;
  filters?: Array<LogConfFilterInput | null> | null;
};

export type LogConfFilterInput = {
  key: string;
  condition: LogConfFilterCondition;
  value: string;
};

export enum LogConfFilterCondition {
  Include = "Include",
  Exclude = "Exclude",
}

export enum BufferType {
  None = "None",
  KDS = "KDS",
  S3 = "S3",
  MSK = "MSK",
}

export type BufferInput = {
  paramKey?: string | null;
  paramValue?: string | null;
};

export type AOSParameterInput = {
  vpc: VPCInput;
  opensearchArn: string;
  opensearchEndpoint: string;
  domainName: string;
  indexPrefix: string;
  warmLogTransition: number;
  coldLogTransition: number;
  logRetention: number;
  shardNumbers: number;
  replicaNumbers: number;
  engine: EngineType;
  failedLogBucket: string;
};

export enum EngineType {
  Elasticsearch = "Elasticsearch",
  OpenSearch = "OpenSearch",
}

export enum LogSourceType {
  EC2 = "EC2",
  S3 = "S3",
  EKSCluster = "EKSCluster",
  Syslog = "Syslog",
  ASG = "ASG",
}

export type SourceInfoInput = {
  key?: string | null;
  value?: string | null;
};

export enum CRI {
  containerd = "containerd",
  docker = "docker",
}

export enum EKSDeployKind {
  DaemonSet = "DaemonSet",
  Sidecar = "Sidecar",
}

export enum ErrorCode {
  DuplicatedIndexPrefix = "DuplicatedIndexPrefix",
  DuplicatedWithInactiveIndexPrefix = "DuplicatedWithInactiveIndexPrefix",
  OverlapIndexPrefix = "OverlapIndexPrefix",
  OverlapWithInactiveIndexPrefix = "OverlapWithInactiveIndexPrefix",
  AccountNotFound = "AccountNotFound",
}

export type DomainNames = {
  __typename: "DomainNames";
  domainNames?: Array<string> | null;
};

export type ESVPCInfo = {
  __typename: "ESVPCInfo";
  vpcId: string;
  subnetIds?: Array<string> | null;
  availabilityZones?: Array<string | null> | null;
  securityGroupIds?: Array<string | null> | null;
};

export type ImportedDomain = {
  __typename: "ImportedDomain";
  id: string;
  domainName: string;
  engine?: EngineType | null;
  version: string;
  endpoint: string;
  metrics?: DomainMetrics | null;
};

export type DomainMetrics = {
  __typename: "DomainMetrics";
  searchableDocs?: number | null;
  freeStorageSpace?: number | null;
  health?: DomainHealth | null;
};

export enum DomainHealth {
  GREEN = "GREEN",
  RED = "RED",
  YELLOW = "YELLOW",
  UNKNOWN = "UNKNOWN",
}

export type DomainDetails = {
  __typename: "DomainDetails";
  id: string;
  domainArn: string;
  domainName: string;
  engine?: EngineType | null;
  version: string;
  endpoint: string;
  region?: string | null;
  accountId?: string | null;
  vpc?: VPCInfo | null;
  esVpc?: ESVPCInfo | null;
  nodes?: Node | null;
  storageType: StorageType;
  volume?: Volume | null;
  cognito?: Cognito | null;
  tags?: Array<Tag | null> | null;
  proxyStatus?: StackStatus | null;
  proxyALB?: string | null;
  proxyError?: string | null;
  proxyInput?: ProxyInfo | null;
  alarmStatus?: StackStatus | null;
  alarmError?: string | null;
  alarmInput?: AlarmStackInfo | null;
  metrics?: DomainMetrics | null;
  status?: string | null;
};

export type VPCInfo = {
  __typename: "VPCInfo";
  vpcId: string;
  privateSubnetIds?: string | null;
  publicSubnetIds?: string | null;
  securityGroupId?: string | null;
};

export type Node = {
  __typename: "Node";
  instanceType: string;
  instanceCount?: number | null;
  dedicatedMasterEnabled?: boolean | null;
  zoneAwarenessEnabled?: boolean | null;
  dedicatedMasterType?: string | null;
  dedicatedMasterCount?: number | null;
  warmEnabled?: boolean | null;
  warmType?: string | null;
  warmCount?: number | null;
  coldEnabled?: boolean | null;
};

export enum StorageType {
  EBS = "EBS",
  Instance = "Instance",
}

export type Volume = {
  __typename: "Volume";
  type: string;
  size: number;
};

export type Cognito = {
  __typename: "Cognito";
  enabled?: boolean | null;
  userPoolId?: string | null;
  domain?: string | null;
  identityPoolId?: string | null;
  roleArn?: string | null;
};

export type Tag = {
  __typename: "Tag";
  key?: string | null;
  value?: string | null;
};

export enum StackStatus {
  CREATING = "CREATING",
  DELETING = "DELETING",
  ERROR = "ERROR",
  ENABLED = "ENABLED",
  DISABLED = "DISABLED",
}

export type ProxyInfo = {
  __typename: "ProxyInfo";
  vpc?: VPCInfo | null;
  certificateArn?: string | null;
  keyName?: string | null;
  customEndpoint?: string | null;
  cognitoEndpoint?: string | null;
};

export type AlarmStackInfo = {
  __typename: "AlarmStackInfo";
  alarms?: Array<AlarmInfo | null> | null;
  email?: string | null;
  phone?: string | null;
};

export type AlarmInfo = {
  __typename: "AlarmInfo";
  type?: AlarmType | null;
  value?: string | null;
};

export type ListServicePipelineResponse = {
  __typename: "ListServicePipelineResponse";
  pipelines?: Array<ServicePipeline | null> | null;
  total?: number | null;
};

export type ServicePipeline = {
  __typename: "ServicePipeline";
  id: string;
  type: ServiceType;
  source?: string | null;
  target?: string | null;
  parameters?: Array<Parameter | null> | null;
  createdDt?: string | null;
  status?: PipelineStatus | null;
  tags?: Array<Tag | null> | null;
  error?: string | null;
};

export type Parameter = {
  __typename: "Parameter";
  parameterKey?: string | null;
  parameterValue?: string | null;
};

export enum PipelineStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  CREATING = "CREATING",
  DELETING = "DELETING",
  ERROR = "ERROR",
}

export type Resource = {
  __typename: "Resource";
  id: string;
  name: string;
  parentId?: string | null;
  description?: string | null;
};

export type ListInstanceGroupResponse = {
  __typename: "ListInstanceGroupResponse";
  instanceGroups?: Array<InstanceGroup | null> | null;
  total?: number | null;
};

export type InstanceGroup = {
  __typename: "InstanceGroup";
  id: string;
  accountId?: string | null;
  region?: string | null;
  groupName?: string | null;
  groupType?: string | null;
  instanceSet?: Array<string | null> | null;
  createdDt?: string | null;
  status?: string | null;
};

export type ListLogConfResponse = {
  __typename: "ListLogConfResponse";
  logConfs?: Array<LogConf | null> | null;
  total?: number | null;
};

export type LogConf = {
  __typename: "LogConf";
  id: string;
  confName?: string | null;
  logType?: LogType | null;
  logPath?: string | null;
  timeKey?: string | null;
  timeOffset?: string | null;
  multilineLogParser?: MultiLineLogParser | null;
  syslogParser?: SyslogParser | null;
  createdDt?: string | null;
  userLogFormat?: string | null;
  userSampleLog?: string | null;
  regularExpression?: string | null;
  timeRegularExpression?: string | null;
  regularSpecs?: Array<RegularSpec | null> | null;
  processorFilterRegex?: ProcessorFilterRegex | null;
  status?: string | null;
};

export type RegularSpec = {
  __typename: "RegularSpec";
  key: string;
  type: string;
  format?: string | null;
};

export type ProcessorFilterRegex = {
  __typename: "ProcessorFilterRegex";
  enable: boolean;
  filters?: Array<LogConfFilter | null> | null;
};

export type LogConfFilter = {
  __typename: "LogConfFilter";
  key: string;
  condition: LogConfFilterCondition;
  value: string;
};

export type ListAppPipelineResponse = {
  __typename: "ListAppPipelineResponse";
  appPipelines?: Array<AppPipeline | null> | null;
  total?: number | null;
};

export type AppPipeline = {
  __typename: "AppPipeline";
  id: string;
  // kdsParas: KDSParameter
  bufferType?: BufferType | null;
  bufferParams?: Array<BufferParameter | null> | null;
  aosParams?: AOSParameter | null;
  createdDt?: string | null;
  status?: PipelineStatus | null;
  // kdsRoleArn: String
  bufferAccessRoleArn?: string | null;
  bufferAccessRoleName?: string | null;
  bufferResourceName?: string | null;
  bufferResourceArn?: string | null;
  // TODO: Check ec2RoleArn
  // ec2RoleArn: String
  tags?: Array<Tag | null> | null;
};

export type BufferParameter = {
  __typename: "BufferParameter";
  paramKey?: string | null;
  paramValue?: string | null;
};

export type AOSParameter = {
  __typename: "AOSParameter";
  opensearchArn?: string | null;
  domainName?: string | null;
  indexPrefix?: string | null;
  warmLogTransition?: number | null;
  coldLogTransition?: number | null;
  logRetention?: number | null;
  shardNumbers?: number | null;
  replicaNumbers?: number | null;
  engine?: EngineType | null;
};

export type ListAppLogIngestionResponse = {
  __typename: "ListAppLogIngestionResponse";
  appLogIngestions?: Array<AppLogIngestion | null> | null;
  total?: number | null;
};

export type AppLogIngestion = {
  __typename: "AppLogIngestion";
  id: string;
  confId?: string | null;
  confName?: string | null;
  sourceInfo?: LogSource | null;
  stackId?: string | null;
  stackName?: string | null;
  appPipelineId?: string | null;
  // kdsRoleArn: String
  // kdsRoleName: String
  // ec2RoleArn: String
  // ec2RoleName: String
  logPath?: string | null;
  sourceId?: string | null;
  sourceType?: string | null;
  accountId?: string | null;
  region?: string | null;
  createdDt?: string | null;
  status?: string | null;
  tags?: Array<Tag | null> | null;
};

export type LogSource = {
  __typename: "LogSource";
  sourceId: string;
  accountId?: string | null;
  region?: string | null;
  sourceName?: string | null;
  logPath?: string | null;
  sourceType?: LogSourceType | null;
  sourceInfo?: Array<SourceInfo | null> | null;
  s3Source?: S3Source | null;
  eksSource?: EKSClusterLogSource | null;
  createdDt?: string | null;
};

export type SourceInfo = {
  __typename: "SourceInfo";
  key?: string | null;
  value?: string | null;
};

export type S3Source = {
  __typename: "S3Source";
  s3Name?: string | null;
  s3Prefix?: string | null;
  archiveFormat?: string | null;
  defaultVpcId?: string | null;
  defaultSubnetIds?: string | null;
};

export type EKSClusterLogSource = {
  __typename: "EKSClusterLogSource";
  id?: string | null;
  aosDomain?: ImportedDomain | null;
  eksClusterName?: string | null;
  eksClusterArn?: string | null;
  cri?: CRI | null;
  vpcId?: string | null;
  eksClusterSGId?: string | null;
  subnetIds?: Array<string | null> | null;
  oidcIssuer?: string | null;
  endpoint?: string | null;
  createdDt?: string | null;
  accountId?: string | null;
  region?: string | null;
  logAgentRoleArn?: string | null;
  deploymentKind?: EKSDeployKind | null;
  tags?: Array<Tag | null> | null;
};

export type TagFilterInput = {
  Key?: string | null;
  Values?: Array<string | null> | null;
};

export type ListInstanceResponse = {
  __typename: "ListInstanceResponse";
  instances?: Array<Instance | null> | null;
  nextToken?: string | null;
};

export type Instance = {
  __typename: "Instance";
  id: string;
  platformName?: string | null;
  ipAddress?: string | null;
  computerName?: string | null;
  name?: string | null;
};

export type listAutoScalingGroupResponse = {
  __typename: "listAutoScalingGroupResponse";
  autoScalingGroups?: Array<AutoScalingGroup | null> | null;
  nextToken?: string | null;
};

export type AutoScalingGroup = {
  __typename: "AutoScalingGroup";
  autoScalingGroupName?: string | null;
  minSize?: number | null;
  maxSize?: number | null;
  desiredCapacity?: number | null;
  instances?: Array<string> | null;
};

export type InstanceMeta = {
  __typename: "InstanceMeta";
  id: string;
  logAgent?: Array<LogAgentParameter | null> | null;
  status?: LogAgentStatus | null;
};

export type LogAgentParameter = {
  __typename: "LogAgentParameter";
  agentName?: string | null;
  version?: string | null;
};

export enum LogAgentStatus {
  Online = "Online",
  Offline = "Offline",
  Installing = "Installing",
  Installed = "Installed",
  Not_Installed = "Not_Installed",
  Unknown = "Unknown",
}

export type ListLogSourceResponse = {
  __typename: "ListLogSourceResponse";
  LogSources?: Array<LogSource | null> | null;
  total?: number | null;
};

export type ListEKSClustersResponse = {
  __typename: "ListEKSClustersResponse";
  clusters?: Array<string | null> | null;
  nextToken?: string | null;
};

export type ListImportedEKSClustersResponse = {
  __typename: "ListImportedEKSClustersResponse";
  eksClusterLogSourceList?: Array<EKSClusterLogSource | null> | null;
  total?: number | null;
};

export type CheckTimeFormatRes = {
  __typename: "CheckTimeFormatRes";
  isMatch?: boolean | null;
};

export type ListSubAccountLinkResponse = {
  __typename: "ListSubAccountLinkResponse";
  subAccountLinks?: Array<SubAccountLink | null> | null;
  total?: number | null;
};

export type SubAccountLink = {
  __typename: "SubAccountLink";
  id: string;
  subAccountId?: string | null;
  region?: string | null;
  subAccountName?: string | null;
  subAccountRoleArn?: string | null;
  agentInstallDoc?: string | null;
  agentConfDoc?: string | null;
  subAccountBucketName?: string | null;
  subAccountStackId?: string | null;
  subAccountKMSKeyArn?: string | null;
  subAccountVpcId?: string | null;
  subAccountPublicSubnetIds?: string | null;
  createdDt?: string | null;
  status?: string | null;
  tags?: Array<Tag | null> | null;
};

export enum ProtocolType {
  TCP = "TCP",
  UDP = "UDP",
}

export type checkCustomPortResponse = {
  __typename: "checkCustomPortResponse";
  isAllowedPort?: boolean | null;
  msg?: string | null;
  recommendedPort?: number | null;
};

export type ImportDomainMutationVariables = {
  domainName: string;
  region?: string | null;
  vpc?: VPCInput | null;
  tags?: Array<TagInput | null> | null;
};

export type ImportDomainMutation = {
  // Import an OpenSearch Domain
  importDomain?: string | null;
};

export type RemoveDomainMutationVariables = {
  id: string;
};

export type RemoveDomainMutation = {
  // Remove an OpenSearch Domain by ID
  removeDomain?: string | null;
};

export type CreateServicePipelineMutationVariables = {
  type: ServiceType;
  source?: string | null;
  target?: string | null;
  parameters?: Array<ParameterInput | null> | null;
  tags?: Array<TagInput | null> | null;
  logSourceAccountId?: string | null;
  logSourceRegion?: string | null;
};

export type CreateServicePipelineMutation = {
  // Create a new service pipeline
  createServicePipeline?: string | null;
};

export type DeleteServicePipelineMutationVariables = {
  id: string;
};

export type DeleteServicePipelineMutation = {
  // Remove a service pipeline
  deleteServicePipeline?: string | null;
};

export type CreateProxyForOpenSearchMutationVariables = {
  id: string;
  input: ProxyInput;
};

export type CreateProxyForOpenSearchMutation = {
  // Create an nginx proxy stack for OpenSearch
  createProxyForOpenSearch?: string | null;
};

export type CreateAlarmForOpenSearchMutationVariables = {
  id: string;
  input: AlarmStackInput;
};

export type CreateAlarmForOpenSearchMutation = {
  // Create an alarm stack for OpenSearch
  createAlarmForOpenSearch?: string | null;
};

export type DeleteProxyForOpenSearchMutationVariables = {
  id: string;
};

export type DeleteProxyForOpenSearchMutation = {
  // Delete an nginx proxy stack for OpenSearch
  deleteProxyForOpenSearch?: string | null;
};

export type DeleteAlarmForOpenSearchMutationVariables = {
  id: string;
};

export type DeleteAlarmForOpenSearchMutation = {
  // Delete an alarm stack for OpenSearch domain
  deleteAlarmForOpenSearch?: string | null;
};

export type PutResourceLoggingBucketMutationVariables = {
  type: ResourceType;
  resourceName: string;
  accountId?: string | null;
  region?: string | null;
};

export type PutResourceLoggingBucketMutation = {
  // Put logging bucket for a type of resource by resource name or id
  putResourceLoggingBucket?: {
    __typename: "LoggingBucket";
    enabled?: boolean | null;
    bucket?: string | null;
    prefix?: string | null;
    source?: LoggingBucketSource | null;
  } | null;
};

export type CreateInstanceGroupMutationVariables = {
  accountId?: string | null;
  region?: string | null;
  groupName: string;
  groupType?: string | null;
  instanceSet: Array<string>;
};

export type CreateInstanceGroupMutation = {
  // *The following belongs to applog* #
  // Create a new instance group
  createInstanceGroup?: string | null;
};

export type CreateInstanceGroupBaseOnASGMutationVariables = {
  accountId?: string | null;
  region?: string | null;
  groupName: string;
  groupType?: string | null;
  autoScalingGroupName: string;
};

export type CreateInstanceGroupBaseOnASGMutation = {
  // Create a new instance group base on auto-scaling group
  createInstanceGroupBaseOnASG?: string | null;
};

export type DeleteInstanceGroupMutationVariables = {
  id: string;
};

export type DeleteInstanceGroupMutation = {
  // Remove a instance group
  deleteInstanceGroup?: string | null;
};

export type AddInstancesToInstanceGroupMutationVariables = {
  sourceId: string;
  instanceIdSet: Array<string>;
};

export type AddInstancesToInstanceGroupMutation = {
  // Update a instance group
  addInstancesToInstanceGroup?: string | null;
};

export type DeleteInstancesFromInstanceGroupMutationVariables = {
  sourceId: string;
  instanceIdSet: Array<string>;
};

export type DeleteInstancesFromInstanceGroupMutation = {
  deleteInstancesFromInstanceGroup?: string | null;
};

export type CreateLogConfMutationVariables = {
  confName: string;
  logType: LogType;
  timeKey?: string | null;
  timeOffset?: string | null;
  multilineLogParser?: MultiLineLogParser | null;
  syslogParser?: SyslogParser | null;
  userSampleLog?: string | null;
  userLogFormat?: string | null;
  regularExpression?: string | null;
  timeRegularExpression?: string | null;
  regularSpecs?: Array<RegularSpecInput | null> | null;
  processorFilterRegex?: ProcessorFilterRegexInput | null;
};

export type CreateLogConfMutation = {
  // Create a logging conf
  createLogConf?: string | null;
};

export type DeleteLogConfMutationVariables = {
  id: string;
};

export type DeleteLogConfMutation = {
  // Remove a logging conf
  deleteLogConf?: string | null;
};

export type UpdateLogConfMutationVariables = {
  id: string;
  confName: string;
  logType: LogType;
  timeKey?: string | null;
  timeOffset?: string | null;
  multilineLogParser?: MultiLineLogParser | null;
  syslogParser?: SyslogParser | null;
  userSampleLog?: string | null;
  userLogFormat?: string | null;
  regularExpression?: string | null;
  timeRegularExpression?: string | null;
  regularSpecs?: Array<RegularSpecInput | null> | null;
  processorFilterRegex?: ProcessorFilterRegexInput | null;
};

export type UpdateLogConfMutation = {
  // Update a logging conf
  updateLogConf?: string | null;
};

export type CreateAppPipelineMutationVariables = {
  bufferType: BufferType;
  bufferParams?: Array<BufferInput | null> | null;
  aosParams: AOSParameterInput;
  force?: boolean | null;
  tags?: Array<TagInput | null> | null;
};

export type CreateAppPipelineMutation = {
  // Create a new app pipeline
  createAppPipeline?: string | null;
};

export type DeleteAppPipelineMutationVariables = {
  id: string;
};

export type DeleteAppPipelineMutation = {
  // Remove a app pipeline
  deleteAppPipeline?: string | null;
};

export type UpgradeAppPipelineMutationVariables = {
  ids: Array<string>;
};

export type UpgradeAppPipelineMutation = {
  // Upgrade a app pipeline to v1.1
  upgradeAppPipeline?: string | null;
};

export type CreateAppLogIngestionMutationVariables = {
  confId: string;
  sourceIds?: Array<string> | null;
  sourceType: LogSourceType;
  appPipelineId: string;
  createDashboard?: string | null;
  tags?: Array<TagInput | null> | null;
  logPath?: string | null;
};

export type CreateAppLogIngestionMutation = {
  // Create a new app logging ingestion
  createAppLogIngestion?: string | null;
};

export type DeleteAppLogIngestionMutationVariables = {
  ids: Array<string>;
};

export type DeleteAppLogIngestionMutation = {
  // Remove a app logging ingestion
  deleteAppLogIngestion?: string | null;
};

export type RequestInstallLogAgentMutationVariables = {
  instanceIdSet: Array<string>;
  accountId?: string | null;
  region?: string | null;
};

export type RequestInstallLogAgentMutation = {
  // request to install logging agent
  requestInstallLogAgent?: string | null;
};

export type CreateLogSourceMutationVariables = {
  sourceType: LogSourceType;
  accountId?: string | null;
  region?: string | null;
  sourceInfo?: Array<SourceInfoInput | null> | null;
  tags?: Array<TagInput | null> | null;
};

export type CreateLogSourceMutation = {
  createLogSource?: string | null;
};

export type DeleteLogSourceMutationVariables = {
  id: string;
};

export type DeleteLogSourceMutation = {
  // Remove a logging source conf
  deleteLogSource?: string | null;
};

export type UpdateLogSourceMutationVariables = {
  id: string;
};

export type UpdateLogSourceMutation = {
  // Update a logging source conf
  updateLogSource?: string | null;
};

export type ImportEKSClusterMutationVariables = {
  aosDomainId: string;
  eksClusterName: string;
  cri?: CRI | null;
  accountId?: string | null;
  region?: string | null;
  deploymentKind: EKSDeployKind;
  tags?: Array<TagInput | null> | null;
};

export type ImportEKSClusterMutation = {
  // Import an EKS Cluster
  importEKSCluster?: string | null;
};

export type RemoveEKSClusterMutationVariables = {
  id: string;
};

export type RemoveEKSClusterMutation = {
  // Remove an EKS Cluster by ID
  removeEKSCluster?: string | null;
};

export type GenerateErrorCodeMutationVariables = {
  code?: ErrorCode | null;
};

export type GenerateErrorCodeMutation = {
  // create EKS Cluster Pod log pipeline & ingestion
  // createEKSClusterPodLogIngestion(
  // # kdsParas: KDSParameterInput!
  // aosParas: AOSParameterInput!
  // confId: String!
  // eksClusterId: String!
  // logPath: String!
  // createDashboard: String!
  // force: Boolean
  // tags: [TagInput]
  // ): String
  // create EKS Cluster Pod log pipeline & ingestion without data buffer
  // createEKSClusterPodLogWithoutDataBufferIngestion(
  // aosParas: AOSParameterInput!
  // confId: String!
  // eksClusterId: String!
  // logPath: String!
  // createDashboard: String!
  // force: Boolean
  // tags: [TagInput]
  // ): String
  // generate error code
  generateErrorCode?: string | null;
};

export type CreateSubAccountLinkMutationVariables = {
  subAccountId: string;
  region?: string | null;
  subAccountName: string;
  subAccountRoleArn: string;
  agentInstallDoc: string;
  agentConfDoc: string;
  subAccountBucketName: string;
  subAccountStackId: string;
  subAccountKMSKeyArn: string;
  tags?: Array<TagInput | null> | null;
};

export type CreateSubAccountLinkMutation = {
  // *The following belongs to cross account* #
  // Create a new cross account link
  createSubAccountLink?: string | null;
};

export type UpdateSubAccountLinkMutationVariables = {
  id: string;
  subAccountName: string;
  agentInstallDoc: string;
  agentConfDoc: string;
  subAccountBucketName: string;
  subAccountStackId: string;
  subAccountKMSKeyArn: string;
  subAccountVpcId?: string | null;
  subAccountPublicSubnetIds?: string | null;
};

export type UpdateSubAccountLinkMutation = {
  // Update a cross account link
  updateSubAccountLink?: string | null;
};

export type DeleteSubAccountLinkMutationVariables = {
  id: string;
};

export type DeleteSubAccountLinkMutation = {
  // Remove a cross account link
  deleteSubAccountLink?: string | null;
};

export type ListDomainNamesQueryVariables = {
  region?: string | null;
};

export type ListDomainNamesQuery = {
  // List OpenSearch Domain names in a region
  listDomainNames?: {
    __typename: "DomainNames";
    domainNames?: Array<string> | null;
  } | null;
};

export type GetDomainVpcQueryVariables = {
  domainName: string;
  region?: string | null;
};

export type GetDomainVpcQuery = {
  // Get OpenSearch domain vpc info
  getDomainVpc?: {
    __typename: "ESVPCInfo";
    vpcId: string;
    subnetIds?: Array<string> | null;
    availabilityZones?: Array<string | null> | null;
    securityGroupIds?: Array<string | null> | null;
  } | null;
};

export type ListImportedDomainsQueryVariables = {
  metrics?: boolean | null;
};

export type ListImportedDomainsQuery = {
  // List imported domain details.
  listImportedDomains?: Array<{
    __typename: "ImportedDomain";
    id: string;
    domainName: string;
    engine?: EngineType | null;
    version: string;
    endpoint: string;
    metrics?: {
      __typename: "DomainMetrics";
      searchableDocs?: number | null;
      freeStorageSpace?: number | null;
      health?: DomainHealth | null;
    } | null;
  } | null> | null;
};

export type GetDomainDetailsQueryVariables = {
  id: string;
  metrics?: boolean | null;
};

export type GetDomainDetailsQuery = {
  // Get Domain Detail by ID
  getDomainDetails?: {
    __typename: "DomainDetails";
    id: string;
    domainArn: string;
    domainName: string;
    engine?: EngineType | null;
    version: string;
    endpoint: string;
    region?: string | null;
    accountId?: string | null;
    vpc?: {
      __typename: "VPCInfo";
      vpcId: string;
      privateSubnetIds?: string | null;
      publicSubnetIds?: string | null;
      securityGroupId?: string | null;
    } | null;
    esVpc?: {
      __typename: "ESVPCInfo";
      vpcId: string;
      subnetIds?: Array<string> | null;
      availabilityZones?: Array<string | null> | null;
      securityGroupIds?: Array<string | null> | null;
    } | null;
    nodes?: {
      __typename: "Node";
      instanceType: string;
      instanceCount?: number | null;
      dedicatedMasterEnabled?: boolean | null;
      zoneAwarenessEnabled?: boolean | null;
      dedicatedMasterType?: string | null;
      dedicatedMasterCount?: number | null;
      warmEnabled?: boolean | null;
      warmType?: string | null;
      warmCount?: number | null;
      coldEnabled?: boolean | null;
    } | null;
    storageType: StorageType;
    volume?: {
      __typename: "Volume";
      type: string;
      size: number;
    } | null;
    cognito?: {
      __typename: "Cognito";
      enabled?: boolean | null;
      userPoolId?: string | null;
      domain?: string | null;
      identityPoolId?: string | null;
      roleArn?: string | null;
    } | null;
    tags?: Array<{
      __typename: "Tag";
      key?: string | null;
      value?: string | null;
    } | null> | null;
    proxyStatus?: StackStatus | null;
    proxyALB?: string | null;
    proxyError?: string | null;
    proxyInput?: {
      __typename: "ProxyInfo";
      vpc?: {
        __typename: "VPCInfo";
        vpcId: string;
        privateSubnetIds?: string | null;
        publicSubnetIds?: string | null;
        securityGroupId?: string | null;
      } | null;
      certificateArn?: string | null;
      keyName?: string | null;
      customEndpoint?: string | null;
      cognitoEndpoint?: string | null;
    } | null;
    alarmStatus?: StackStatus | null;
    alarmError?: string | null;
    alarmInput?: {
      __typename: "AlarmStackInfo";
      alarms?: Array<{
        __typename: "AlarmInfo";
        type?: AlarmType | null;
        value?: string | null;
      } | null> | null;
      email?: string | null;
      phone?: string | null;
    } | null;
    metrics?: {
      __typename: "DomainMetrics";
      searchableDocs?: number | null;
      freeStorageSpace?: number | null;
      health?: DomainHealth | null;
    } | null;
    status?: string | null;
  } | null;
};

export type ListServicePipelinesQueryVariables = {
  page?: number | null;
  count?: number | null;
};

export type ListServicePipelinesQuery = {
  // List service logging pipeline info
  listServicePipelines?: {
    __typename: "ListServicePipelineResponse";
    pipelines?: Array<{
      __typename: "ServicePipeline";
      id: string;
      type: ServiceType;
      source?: string | null;
      target?: string | null;
      parameters?: Array<{
        __typename: "Parameter";
        parameterKey?: string | null;
        parameterValue?: string | null;
      } | null> | null;
      createdDt?: string | null;
      status?: PipelineStatus | null;
      tags?: Array<{
        __typename: "Tag";
        key?: string | null;
        value?: string | null;
      } | null> | null;
      error?: string | null;
    } | null> | null;
    total?: number | null;
  } | null;
};

export type GetServicePipelineQueryVariables = {
  id: string;
};

export type GetServicePipelineQuery = {
  // Get service logging pipeline info by ID
  getServicePipeline?: {
    __typename: "ServicePipeline";
    id: string;
    type: ServiceType;
    source?: string | null;
    target?: string | null;
    parameters?: Array<{
      __typename: "Parameter";
      parameterKey?: string | null;
      parameterValue?: string | null;
    } | null> | null;
    createdDt?: string | null;
    status?: PipelineStatus | null;
    tags?: Array<{
      __typename: "Tag";
      key?: string | null;
      value?: string | null;
    } | null> | null;
    error?: string | null;
  } | null;
};

export type ListResourcesQueryVariables = {
  type: ResourceType;
  parentId?: string | null;
  accountId?: string | null;
  region?: string | null;
};

export type ListResourcesQuery = {
  // List Common AWS Resources
  listResources?: Array<{
    __typename: "Resource";
    id: string;
    name: string;
    parentId?: string | null;
    description?: string | null;
  } | null> | null;
};

export type CheckServiceExistingQueryVariables = {
  type: ResourceType;
  accountId?: string | null;
  region?: string | null;
};

export type CheckServiceExistingQuery = {
  // Verify that service already exists in the pipeline
  checkServiceExisting?: boolean | null;
};

export type GetResourceLoggingBucketQueryVariables = {
  type: ResourceType;
  resourceName: string;
  accountId?: string | null;
  region?: string | null;
};

export type GetResourceLoggingBucketQuery = {
  // Get logging bucket for a type of resource by resource name or id
  getResourceLoggingBucket?: {
    __typename: "LoggingBucket";
    enabled?: boolean | null;
    bucket?: string | null;
    prefix?: string | null;
    source?: LoggingBucketSource | null;
  } | null;
};

export type ListInstanceGroupsQueryVariables = {
  page?: number | null;
  count?: number | null;
};

export type ListInstanceGroupsQuery = {
  // *The following belongs to applog* #
  // List instance group info
  listInstanceGroups?: {
    __typename: "ListInstanceGroupResponse";
    instanceGroups?: Array<{
      __typename: "InstanceGroup";
      id: string;
      accountId?: string | null;
      region?: string | null;
      groupName?: string | null;
      groupType?: string | null;
      instanceSet?: Array<string | null> | null;
      createdDt?: string | null;
      status?: string | null;
    } | null> | null;
    total?: number | null;
  } | null;
};

export type GetInstanceGroupQueryVariables = {
  id: string;
};

export type GetInstanceGroupQuery = {
  // Get instance group info by ID
  getInstanceGroup?: {
    __typename: "InstanceGroup";
    id: string;
    accountId?: string | null;
    region?: string | null;
    groupName?: string | null;
    groupType?: string | null;
    instanceSet?: Array<string | null> | null;
    createdDt?: string | null;
    status?: string | null;
  } | null;
};

export type ListLogConfsQueryVariables = {
  page?: number | null;
  count?: number | null;
};

export type ListLogConfsQuery = {
  // List logging conf info
  listLogConfs?: {
    __typename: "ListLogConfResponse";
    logConfs?: Array<{
      __typename: "LogConf";
      id: string;
      confName?: string | null;
      logType?: LogType | null;
      logPath?: string | null;
      timeKey?: string | null;
      timeOffset?: string | null;
      multilineLogParser?: MultiLineLogParser | null;
      syslogParser?: SyslogParser | null;
      createdDt?: string | null;
      userLogFormat?: string | null;
      userSampleLog?: string | null;
      regularExpression?: string | null;
      timeRegularExpression?: string | null;
      regularSpecs?: Array<{
        __typename: "RegularSpec";
        key: string;
        type: string;
        format?: string | null;
      } | null> | null;
      processorFilterRegex?: {
        __typename: "ProcessorFilterRegex";
        enable: boolean;
        filters?: Array<{
          __typename: "LogConfFilter";
          key: string;
          condition: LogConfFilterCondition;
          value: string;
        } | null> | null;
      } | null;
      status?: string | null;
    } | null> | null;
    total?: number | null;
  } | null;
};

export type GetLogConfQueryVariables = {
  id: string;
};

export type GetLogConfQuery = {
  // Get logging conf info by ID
  getLogConf?: {
    __typename: "LogConf";
    id: string;
    confName?: string | null;
    logType?: LogType | null;
    logPath?: string | null;
    timeKey?: string | null;
    timeOffset?: string | null;
    multilineLogParser?: MultiLineLogParser | null;
    syslogParser?: SyslogParser | null;
    createdDt?: string | null;
    userLogFormat?: string | null;
    userSampleLog?: string | null;
    regularExpression?: string | null;
    timeRegularExpression?: string | null;
    regularSpecs?: Array<{
      __typename: "RegularSpec";
      key: string;
      type: string;
      format?: string | null;
    } | null> | null;
    processorFilterRegex?: {
      __typename: "ProcessorFilterRegex";
      enable: boolean;
      filters?: Array<{
        __typename: "LogConfFilter";
        key: string;
        condition: LogConfFilterCondition;
        value: string;
      } | null> | null;
    } | null;
    status?: string | null;
  } | null;
};

export type ListAppPipelinesQueryVariables = {
  page?: number | null;
  count?: number | null;
};

export type ListAppPipelinesQuery = {
  // List app pipeline info
  listAppPipelines?: {
    __typename: "ListAppPipelineResponse";
    appPipelines?: Array<{
      __typename: "AppPipeline";
      id: string;
      // kdsParas: KDSParameter
      bufferType?: BufferType | null;
      bufferParams?: Array<{
        __typename: "BufferParameter";
        paramKey?: string | null;
        paramValue?: string | null;
      } | null> | null;
      aosParams?: {
        __typename: "AOSParameter";
        opensearchArn?: string | null;
        domainName?: string | null;
        indexPrefix?: string | null;
        warmLogTransition?: number | null;
        coldLogTransition?: number | null;
        logRetention?: number | null;
        shardNumbers?: number | null;
        replicaNumbers?: number | null;
        engine?: EngineType | null;
      } | null;
      createdDt?: string | null;
      status?: PipelineStatus | null;
      // kdsRoleArn: String
      bufferAccessRoleArn?: string | null;
      bufferAccessRoleName?: string | null;
      bufferResourceName?: string | null;
      bufferResourceArn?: string | null;
      // TODO: Check ec2RoleArn
      // ec2RoleArn: String
      tags?: Array<{
        __typename: "Tag";
        key?: string | null;
        value?: string | null;
      } | null> | null;
    } | null> | null;
    total?: number | null;
  } | null;
};

export type GetAppPipelineQueryVariables = {
  id: string;
};

export type GetAppPipelineQuery = {
  // Get app pipeline info by ID
  getAppPipeline?: {
    __typename: "AppPipeline";
    id: string;
    // kdsParas: KDSParameter
    bufferType?: BufferType | null;
    bufferParams?: Array<{
      __typename: "BufferParameter";
      paramKey?: string | null;
      paramValue?: string | null;
    } | null> | null;
    aosParams?: {
      __typename: "AOSParameter";
      opensearchArn?: string | null;
      domainName?: string | null;
      indexPrefix?: string | null;
      warmLogTransition?: number | null;
      coldLogTransition?: number | null;
      logRetention?: number | null;
      shardNumbers?: number | null;
      replicaNumbers?: number | null;
      engine?: EngineType | null;
    } | null;
    createdDt?: string | null;
    status?: PipelineStatus | null;
    // kdsRoleArn: String
    bufferAccessRoleArn?: string | null;
    bufferAccessRoleName?: string | null;
    bufferResourceName?: string | null;
    bufferResourceArn?: string | null;
    // TODO: Check ec2RoleArn
    // ec2RoleArn: String
    tags?: Array<{
      __typename: "Tag";
      key?: string | null;
      value?: string | null;
    } | null> | null;
  } | null;
};

export type ListAppLogIngestionsQueryVariables = {
  page?: number | null;
  count?: number | null;
  appPipelineId?: string | null;
  sourceId?: string | null;
  sourceType?: LogSourceType | null;
};

export type ListAppLogIngestionsQuery = {
  // List app logging ingestion info
  listAppLogIngestions?: {
    __typename: "ListAppLogIngestionResponse";
    appLogIngestions?: Array<{
      __typename: "AppLogIngestion";
      id: string;
      confId?: string | null;
      confName?: string | null;
      sourceInfo?: {
        __typename: "LogSource";
        sourceId: string;
        accountId?: string | null;
        region?: string | null;
        sourceName?: string | null;
        logPath?: string | null;
        sourceType?: LogSourceType | null;
        sourceInfo?: Array<{
          __typename: "SourceInfo";
          key?: string | null;
          value?: string | null;
        } | null> | null;
        s3Source?: {
          __typename: "S3Source";
          s3Name?: string | null;
          s3Prefix?: string | null;
          archiveFormat?: string | null;
          defaultVpcId?: string | null;
          defaultSubnetIds?: string | null;
        } | null;
        eksSource?: {
          __typename: "EKSClusterLogSource";
          id?: string | null;
          aosDomain?: {
            __typename: "ImportedDomain";
            id: string;
            domainName: string;
            engine?: EngineType | null;
            version: string;
            endpoint: string;
          } | null;
          eksClusterName?: string | null;
          eksClusterArn?: string | null;
          cri?: CRI | null;
          vpcId?: string | null;
          eksClusterSGId?: string | null;
          subnetIds?: Array<string | null> | null;
          oidcIssuer?: string | null;
          endpoint?: string | null;
          createdDt?: string | null;
          accountId?: string | null;
          region?: string | null;
          logAgentRoleArn?: string | null;
          deploymentKind?: EKSDeployKind | null;
          tags?: Array<{
            __typename: "Tag";
            key?: string | null;
            value?: string | null;
          } | null> | null;
        } | null;
        createdDt?: string | null;
      } | null;
      stackId?: string | null;
      stackName?: string | null;
      appPipelineId?: string | null;
      // kdsRoleArn: String
      // kdsRoleName: String
      // ec2RoleArn: String
      // ec2RoleName: String
      logPath?: string | null;
      sourceId?: string | null;
      sourceType?: string | null;
      accountId?: string | null;
      region?: string | null;
      createdDt?: string | null;
      status?: string | null;
      tags?: Array<{
        __typename: "Tag";
        key?: string | null;
        value?: string | null;
      } | null> | null;
    } | null> | null;
    total?: number | null;
  } | null;
};

export type GetAppLogIngestionQueryVariables = {
  id: string;
};

export type GetAppLogIngestionQuery = {
  // Get app logging ingestion info by ID
  getAppLogIngestion?: {
    __typename: "AppLogIngestion";
    id: string;
    confId?: string | null;
    confName?: string | null;
    sourceInfo?: {
      __typename: "LogSource";
      sourceId: string;
      accountId?: string | null;
      region?: string | null;
      sourceName?: string | null;
      logPath?: string | null;
      sourceType?: LogSourceType | null;
      sourceInfo?: Array<{
        __typename: "SourceInfo";
        key?: string | null;
        value?: string | null;
      } | null> | null;
      s3Source?: {
        __typename: "S3Source";
        s3Name?: string | null;
        s3Prefix?: string | null;
        archiveFormat?: string | null;
        defaultVpcId?: string | null;
        defaultSubnetIds?: string | null;
      } | null;
      eksSource?: {
        __typename: "EKSClusterLogSource";
        id?: string | null;
        aosDomain?: {
          __typename: "ImportedDomain";
          id: string;
          domainName: string;
          engine?: EngineType | null;
          version: string;
          endpoint: string;
          metrics?: {
            __typename: "DomainMetrics";
            searchableDocs?: number | null;
            freeStorageSpace?: number | null;
            health?: DomainHealth | null;
          } | null;
        } | null;
        eksClusterName?: string | null;
        eksClusterArn?: string | null;
        cri?: CRI | null;
        vpcId?: string | null;
        eksClusterSGId?: string | null;
        subnetIds?: Array<string | null> | null;
        oidcIssuer?: string | null;
        endpoint?: string | null;
        createdDt?: string | null;
        accountId?: string | null;
        region?: string | null;
        logAgentRoleArn?: string | null;
        deploymentKind?: EKSDeployKind | null;
        tags?: Array<{
          __typename: "Tag";
          key?: string | null;
          value?: string | null;
        } | null> | null;
      } | null;
      createdDt?: string | null;
    } | null;
    stackId?: string | null;
    stackName?: string | null;
    appPipelineId?: string | null;
    // kdsRoleArn: String
    // kdsRoleName: String
    // ec2RoleArn: String
    // ec2RoleName: String
    logPath?: string | null;
    sourceId?: string | null;
    sourceType?: string | null;
    accountId?: string | null;
    region?: string | null;
    createdDt?: string | null;
    status?: string | null;
    tags?: Array<{
      __typename: "Tag";
      key?: string | null;
      value?: string | null;
    } | null> | null;
  } | null;
};

export type ListInstancesQueryVariables = {
  maxResults?: number | null;
  nextToken?: string | null;
  instanceSet?: Array<string | null> | null;
  tags?: Array<TagFilterInput | null> | null;
  region?: string | null;
  accountId?: string | null;
};

export type ListInstancesQuery = {
  // List AWS Instance
  listInstances?: {
    __typename: "ListInstanceResponse";
    instances?: Array<{
      __typename: "Instance";
      id: string;
      platformName?: string | null;
      ipAddress?: string | null;
      computerName?: string | null;
      name?: string | null;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type ListAutoScalingGroupsQueryVariables = {
  maxResults?: number | null;
  nextToken?: string | null;
  region?: string | null;
  accountId?: string | null;
};

export type ListAutoScalingGroupsQuery = {
  // List Auto-Scaling Groups
  listAutoScalingGroups?: {
    __typename: "listAutoScalingGroupResponse";
    autoScalingGroups?: Array<{
      __typename: "AutoScalingGroup";
      autoScalingGroupName?: string | null;
      minSize?: number | null;
      maxSize?: number | null;
      desiredCapacity?: number | null;
      instances?: Array<string> | null;
    } | null> | null;
    nextToken?: string | null;
  } | null;
};

export type GetInstanceMetaQueryVariables = {
  id: string;
};

export type GetInstanceMetaQuery = {
  // Get Instance Meta by ID
  getInstanceMeta?: {
    __typename: "InstanceMeta";
    id: string;
    logAgent?: Array<{
      __typename: "LogAgentParameter";
      agentName?: string | null;
      version?: string | null;
    } | null> | null;
    status?: LogAgentStatus | null;
  } | null;
};

export type GetLogAgentStatusQueryVariables = {
  instanceId: string;
  region?: string | null;
  accountId?: string | null;
};

export type GetLogAgentStatusQuery = {
  // Get logging Agent Status by instanceId
  getLogAgentStatus?: LogAgentStatus | null;
};

export type ValidateVpcCidrQueryVariables = {
  domainName: string;
  region?: string | null;
};

export type ValidateVpcCidrQuery = {
  // Verify if CIDR Conflict
  validateVpcCidr?: string | null;
};

export type GetLogSourceQueryVariables = {
  sourceType: LogSourceType;
  id: string;
};

export type GetLogSourceQuery = {
  // Get logging source info by ID
  getLogSource?: {
    __typename: "LogSource";
    sourceId: string;
    accountId?: string | null;
    region?: string | null;
    sourceName?: string | null;
    logPath?: string | null;
    sourceType?: LogSourceType | null;
    sourceInfo?: Array<{
      __typename: "SourceInfo";
      key?: string | null;
      value?: string | null;
    } | null> | null;
    s3Source?: {
      __typename: "S3Source";
      s3Name?: string | null;
      s3Prefix?: string | null;
      archiveFormat?: string | null;
      defaultVpcId?: string | null;
      defaultSubnetIds?: string | null;
    } | null;
    eksSource?: {
      __typename: "EKSClusterLogSource";
      id?: string | null;
      aosDomain?: {
        __typename: "ImportedDomain";
        id: string;
        domainName: string;
        engine?: EngineType | null;
        version: string;
        endpoint: string;
        metrics?: {
          __typename: "DomainMetrics";
          searchableDocs?: number | null;
          freeStorageSpace?: number | null;
          health?: DomainHealth | null;
        } | null;
      } | null;
      eksClusterName?: string | null;
      eksClusterArn?: string | null;
      cri?: CRI | null;
      vpcId?: string | null;
      eksClusterSGId?: string | null;
      subnetIds?: Array<string | null> | null;
      oidcIssuer?: string | null;
      endpoint?: string | null;
      createdDt?: string | null;
      accountId?: string | null;
      region?: string | null;
      logAgentRoleArn?: string | null;
      deploymentKind?: EKSDeployKind | null;
      tags?: Array<{
        __typename: "Tag";
        key?: string | null;
        value?: string | null;
      } | null> | null;
    } | null;
    createdDt?: string | null;
  } | null;
};

export type ListLogSourcesQueryVariables = {
  page?: number | null;
  count?: number | null;
};

export type ListLogSourcesQuery = {
  // List logging source conf info
  listLogSources?: {
    __typename: "ListLogSourceResponse";
    LogSources?: Array<{
      __typename: "LogSource";
      sourceId: string;
      accountId?: string | null;
      region?: string | null;
      sourceName?: string | null;
      logPath?: string | null;
      sourceType?: LogSourceType | null;
      sourceInfo?: Array<{
        __typename: "SourceInfo";
        key?: string | null;
        value?: string | null;
      } | null> | null;
      s3Source?: {
        __typename: "S3Source";
        s3Name?: string | null;
        s3Prefix?: string | null;
        archiveFormat?: string | null;
        defaultVpcId?: string | null;
        defaultSubnetIds?: string | null;
      } | null;
      eksSource?: {
        __typename: "EKSClusterLogSource";
        id?: string | null;
        aosDomain?: {
          __typename: "ImportedDomain";
          id: string;
          domainName: string;
          engine?: EngineType | null;
          version: string;
          endpoint: string;
          metrics?: {
            __typename: "DomainMetrics";
            searchableDocs?: number | null;
            freeStorageSpace?: number | null;
            health?: DomainHealth | null;
          } | null;
        } | null;
        eksClusterName?: string | null;
        eksClusterArn?: string | null;
        cri?: CRI | null;
        vpcId?: string | null;
        eksClusterSGId?: string | null;
        subnetIds?: Array<string | null> | null;
        oidcIssuer?: string | null;
        endpoint?: string | null;
        createdDt?: string | null;
        accountId?: string | null;
        region?: string | null;
        logAgentRoleArn?: string | null;
        deploymentKind?: EKSDeployKind | null;
        tags?: Array<{
          __typename: "Tag";
          key?: string | null;
          value?: string | null;
        } | null> | null;
      } | null;
      createdDt?: string | null;
    } | null> | null;
    total?: number | null;
  } | null;
};

export type GetEKSClusterDetailsQueryVariables = {
  eksClusterId: string;
};

export type GetEKSClusterDetailsQuery = {
  // Get imported EKS Cluster details by eksClusterId
  getEKSClusterDetails?: {
    __typename: "EKSClusterLogSource";
    id?: string | null;
    aosDomain?: {
      __typename: "ImportedDomain";
      id: string;
      domainName: string;
      engine?: EngineType | null;
      version: string;
      endpoint: string;
      metrics?: {
        __typename: "DomainMetrics";
        searchableDocs?: number | null;
        freeStorageSpace?: number | null;
        health?: DomainHealth | null;
      } | null;
    } | null;
    eksClusterName?: string | null;
    eksClusterArn?: string | null;
    cri?: CRI | null;
    vpcId?: string | null;
    eksClusterSGId?: string | null;
    subnetIds?: Array<string | null> | null;
    oidcIssuer?: string | null;
    endpoint?: string | null;
    createdDt?: string | null;
    accountId?: string | null;
    region?: string | null;
    logAgentRoleArn?: string | null;
    deploymentKind?: EKSDeployKind | null;
    tags?: Array<{
      __typename: "Tag";
      key?: string | null;
      value?: string | null;
    } | null> | null;
  } | null;
};

export type GetEKSDaemonSetConfQueryVariables = {
  eksClusterId: string;
};

export type GetEKSDaemonSetConfQuery = {
  // Get eks daemon set config by eks source id
  getEKSDaemonSetConf?: string | null;
};

export type GetEKSDeploymentConfQueryVariables = {
  eksClusterId: string;
  ingestionId: string;
  openExtraMetadataFlag?: boolean | null;
};

export type GetEKSDeploymentConfQuery = {
  // Get eks deployment configuration by eksClusterId and ingestion id
  getEKSDeploymentConf?: string | null;
};

export type GetAutoScalingGroupConfQueryVariables = {
  groupId: string;
};

export type GetAutoScalingGroupConfQuery = {
  getAutoScalingGroupConf?: string | null;
};

export type ListEKSClusterNamesQueryVariables = {
  accountId?: string | null;
  region?: string | null;
  nextToken: string;
  isListAll?: boolean | null;
};

export type ListEKSClusterNamesQuery = {
  // List EKS Cluster info
  listEKSClusterNames?: {
    __typename: "ListEKSClustersResponse";
    clusters?: Array<string | null> | null;
    nextToken?: string | null;
  } | null;
};

export type ListImportedEKSClustersQueryVariables = {
  page?: number | null;
  count?: number | null;
};

export type ListImportedEKSClustersQuery = {
  // List imported EKS Cluster info
  listImportedEKSClusters?: {
    __typename: "ListImportedEKSClustersResponse";
    eksClusterLogSourceList?: Array<{
      __typename: "EKSClusterLogSource";
      id?: string | null;
      aosDomain?: {
        __typename: "ImportedDomain";
        id: string;
        domainName: string;
        engine?: EngineType | null;
        version: string;
        endpoint: string;
        metrics?: {
          __typename: "DomainMetrics";
          searchableDocs?: number | null;
          freeStorageSpace?: number | null;
          health?: DomainHealth | null;
        } | null;
      } | null;
      eksClusterName?: string | null;
      eksClusterArn?: string | null;
      cri?: CRI | null;
      vpcId?: string | null;
      eksClusterSGId?: string | null;
      subnetIds?: Array<string | null> | null;
      oidcIssuer?: string | null;
      endpoint?: string | null;
      createdDt?: string | null;
      accountId?: string | null;
      region?: string | null;
      logAgentRoleArn?: string | null;
      deploymentKind?: EKSDeployKind | null;
      tags?: Array<{
        __typename: "Tag";
        key?: string | null;
        value?: string | null;
      } | null> | null;
    } | null> | null;
    total?: number | null;
  } | null;
};

export type CheckTimeFormatQueryVariables = {
  timeStr: string;
  formatStr: string;
};

export type CheckTimeFormatQuery = {
  // Check Time format
  checkTimeFormat?: {
    __typename: "CheckTimeFormatRes";
    isMatch?: boolean | null;
  } | null;
};

export type ListSubAccountLinksQueryVariables = {
  page?: number | null;
  count?: number | null;
};

export type ListSubAccountLinksQuery = {
  // *The following belongs to cross account* #
  // List sub account info
  listSubAccountLinks?: {
    __typename: "ListSubAccountLinkResponse";
    subAccountLinks?: Array<{
      __typename: "SubAccountLink";
      id: string;
      subAccountId?: string | null;
      region?: string | null;
      subAccountName?: string | null;
      subAccountRoleArn?: string | null;
      agentInstallDoc?: string | null;
      agentConfDoc?: string | null;
      subAccountBucketName?: string | null;
      subAccountStackId?: string | null;
      subAccountKMSKeyArn?: string | null;
      subAccountVpcId?: string | null;
      subAccountPublicSubnetIds?: string | null;
      createdDt?: string | null;
      status?: string | null;
      tags?: Array<{
        __typename: "Tag";
        key?: string | null;
        value?: string | null;
      } | null> | null;
    } | null> | null;
    total?: number | null;
  } | null;
};

export type GetSubAccountLinkQueryVariables = {
  id: string;
};

export type GetSubAccountLinkQuery = {
  // Get sub account info by ID
  getSubAccountLink?: {
    __typename: "SubAccountLink";
    id: string;
    subAccountId?: string | null;
    region?: string | null;
    subAccountName?: string | null;
    subAccountRoleArn?: string | null;
    agentInstallDoc?: string | null;
    agentConfDoc?: string | null;
    subAccountBucketName?: string | null;
    subAccountStackId?: string | null;
    subAccountKMSKeyArn?: string | null;
    subAccountVpcId?: string | null;
    subAccountPublicSubnetIds?: string | null;
    createdDt?: string | null;
    status?: string | null;
    tags?: Array<{
      __typename: "Tag";
      key?: string | null;
      value?: string | null;
    } | null> | null;
  } | null;
};

export type GetSubAccountLinkByAccountIdRegionQueryVariables = {
  accountId: string;
  region?: string | null;
};

export type GetSubAccountLinkByAccountIdRegionQuery = {
  // Get sub account info by Account Id and region
  getSubAccountLinkByAccountIdRegion?: {
    __typename: "SubAccountLink";
    id: string;
    subAccountId?: string | null;
    region?: string | null;
    subAccountName?: string | null;
    subAccountRoleArn?: string | null;
    agentInstallDoc?: string | null;
    agentConfDoc?: string | null;
    subAccountBucketName?: string | null;
    subAccountStackId?: string | null;
    subAccountKMSKeyArn?: string | null;
    subAccountVpcId?: string | null;
    subAccountPublicSubnetIds?: string | null;
    createdDt?: string | null;
    status?: string | null;
    tags?: Array<{
      __typename: "Tag";
      key?: string | null;
      value?: string | null;
    } | null> | null;
  } | null;
};

export type CheckCustomPortQueryVariables = {
  sourceType?: LogSourceType | null;
  syslogProtocol: ProtocolType;
  syslogPort: number;
};

export type CheckCustomPortQuery = {
  checkCustomPort?: {
    __typename: "checkCustomPortResponse";
    isAllowedPort?: boolean | null;
    msg?: string | null;
    recommendedPort?: number | null;
  } | null;
};
