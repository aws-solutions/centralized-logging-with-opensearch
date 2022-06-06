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
  WAF = "WAF"
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
  MASTER_JVM_MEMORY_PRESSURE = "MASTER_JVM_MEMORY_PRESSURE"
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
  WAF = "WAF"
}

export type LoggingBucket = {
  __typename: "LoggingBucket";
  enabled?: boolean | null;
  bucket?: string | null;
  prefix?: string | null;
};

export enum LogType {
  JSON = "JSON",
  Regex = "Regex",
  Nginx = "Nginx",
  Apache = "Apache",
  SingleLineText = "SingleLineText",
  MultiLineText = "MultiLineText"
}

export enum MultiLineLogParser {
  JAVA_SPRING_BOOT = "JAVA_SPRING_BOOT",
  CUSTOM = "CUSTOM"
}

export type RegularSpecInput = {
  key: string;
  type: string;
  format?: string | null;
};

export type KDSParameterInput = {
  kdsArn?: string | null;
  streamName?: string | null;
  enableAutoScaling: boolean;
  startShardNumber: number;
  maxShardNumber?: number | null;
  regionName?: string | null;
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
  OpenSearch = "OpenSearch"
}

export enum LogSourceType {
  EC2 = "EC2",
  S3 = "S3",
  EKSCluster = "EKSCluster"
}

export enum ArchiveFormat {
  gzip = "gzip",
  json = "json",
  text = "text"
}

export enum CRI {
  containerd = "containerd",
  docker = "docker"
}

export enum EKSDeployKind {
  DaemonSet = "DaemonSet",
  Sidecar = "Sidecar"
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
  UNKNOWN = "UNKNOWN"
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
  Instance = "Instance"
}

export type Volume = {
  __typename: "Volume";
  type: VolumeType;
  size: number;
};

// Volume Type
export enum VolumeType {
  gp2 = "gp2"
}

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
  DISABLED = "DISABLED"
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
  ERROR = "ERROR"
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
  groupName?: string | null;
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
  logPath?: string | null;
  logType?: LogType | null;
  multilineLogParser?: MultiLineLogParser | null;
  createdDt?: string | null;
  userLogFormat?: string | null;
  regularExpression?: string | null;
  regularSpecs?: Array<RegularSpec | null> | null;
  status?: string | null;
};

export type RegularSpec = {
  __typename: "RegularSpec";
  key: string;
  type: string;
  format?: string | null;
};

export type ListAppPipelineResponse = {
  __typename: "ListAppPipelineResponse";
  appPipelines?: Array<AppPipeline | null> | null;
  total?: number | null;
};

export type AppPipeline = {
  __typename: "AppPipeline";
  id: string;
  kdsParas?: KDSParameter | null;
  aosParas?: AOSParameter | null;
  createdDt?: string | null;
  status?: PipelineStatus | null;
  tags?: Array<Tag | null> | null;
};

export type KDSParameter = {
  __typename: "KDSParameter";
  kdsArn?: string | null;
  streamName?: string | null;
  enableAutoScaling?: boolean | null;
  startShardNumber?: number | null;
  openShardCount?: number | null;
  consumerCount?: number | null;
  maxShardNumber?: number | null;
  regionName?: string | null;
  osHelperFnArn?: string | null;
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
  createdDt?: string | null;
  status?: string | null;
  tags?: Array<Tag | null> | null;
};

export type LogSource = {
  __typename: "LogSource";
  sourceId: string;
  sourceName?: string | null;
  logPath?: string | null;
  sourceType?: LogSourceType | null;
  createdDt?: string | null;
  accountId?: string | null;
  region?: string | null;
  s3Source?: S3Source | null;
  eksSource?: EKSClusterLogSource | null;
};

export type S3Source = {
  __typename: "S3Source";
  s3Name?: string | null;
  s3Prefix?: string | null;
  archiveFormat?: string | null;
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
  Unknown = "Unknown"
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
  region?: string | null;
};

export type PutResourceLoggingBucketMutation = {
  // Put logging bucket for a type of resource by resource name or id
  putResourceLoggingBucket?: {
    __typename: "LoggingBucket";
    enabled?: boolean | null;
    bucket?: string | null;
    prefix?: string | null;
  } | null;
};

export type CreateInstanceGroupMutationVariables = {
  groupName: string;
  instanceSet: Array<string>;
};

export type CreateInstanceGroupMutation = {
  // *The following belongs to applog* #
  // Create a new instance group
  createInstanceGroup?: string | null;
};

export type DeleteInstanceGroupMutationVariables = {
  id: string;
};

export type DeleteInstanceGroupMutation = {
  // Remove a instance group
  deleteInstanceGroup?: string | null;
};

export type UpdateInstanceGroupMutationVariables = {
  id: string;
  groupName: string;
  instanceSet: Array<string>;
};

export type UpdateInstanceGroupMutation = {
  // Update a instance group
  updateInstanceGroup?: string | null;
};

export type CreateLogConfMutationVariables = {
  confName: string;
  logPath: string;
  logType: LogType;
  multilineLogParser?: MultiLineLogParser | null;
  userLogFormat?: string | null;
  regularExpression?: string | null;
  regularSpecs?: Array<RegularSpecInput | null> | null;
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
  logPath: string;
  logType: LogType;
  multilineLogParser?: MultiLineLogParser | null;
  userLogFormat?: string | null;
  regularExpression?: string | null;
  regularSpecs?: Array<RegularSpecInput | null> | null;
};

export type UpdateLogConfMutation = {
  // Update a logging conf
  updateLogConf?: string | null;
};

export type CreateAppPipelineMutationVariables = {
  kdsParas: KDSParameterInput;
  aosParas: AOSParameterInput;
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

export type CreateAppLogIngestionMutationVariables = {
  confId: string;
  sourceIds?: Array<string> | null;
  sourceType: LogSourceType;
  stackId?: string | null;
  stackName?: string | null;
  appPipelineId: string;
  tags?: Array<TagInput | null> | null;
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
};

export type RequestInstallLogAgentMutation = {
  // request to install logging agent
  requestInstallLogAgent?: string | null;
};

export type CreateLogSourceMutationVariables = {
  sourceType: LogSourceType;
  logPath?: string | null;
  s3Name?: string | null;
  s3Prefix?: string | null;
  accountId?: string | null;
  region?: string | null;
  archiveFormat?: ArchiveFormat | null;
  tags?: Array<TagInput | null> | null;
};

export type CreateLogSourceMutation = {
  // Create a logging source conf
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

export type CreateEKSClusterPodLogIngestionMutationVariables = {
  kdsParas: KDSParameterInput;
  aosParas: AOSParameterInput;
  confId: string;
  eksClusterId: string;
  tags?: Array<TagInput | null> | null;
};

export type CreateEKSClusterPodLogIngestionMutation = {
  // create EKS Cluster Pod log pipeline & ingestion
  createEKSClusterPodLogIngestion?: string | null;
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
      type: VolumeType;
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

export type GetResourceLoggingBucketQueryVariables = {
  type: ResourceType;
  resourceName: string;
  region?: string | null;
};

export type GetResourceLoggingBucketQuery = {
  // Get logging bucket for a type of resource by resource name or id
  getResourceLoggingBucket?: {
    __typename: "LoggingBucket";
    enabled?: boolean | null;
    bucket?: string | null;
    prefix?: string | null;
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
      groupName?: string | null;
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
    groupName?: string | null;
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
      logPath?: string | null;
      logType?: LogType | null;
      multilineLogParser?: MultiLineLogParser | null;
      createdDt?: string | null;
      userLogFormat?: string | null;
      regularExpression?: string | null;
      regularSpecs?: Array<{
        __typename: "RegularSpec";
        key: string;
        type: string;
        format?: string | null;
      } | null> | null;
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
    logPath?: string | null;
    logType?: LogType | null;
    multilineLogParser?: MultiLineLogParser | null;
    createdDt?: string | null;
    userLogFormat?: string | null;
    regularExpression?: string | null;
    regularSpecs?: Array<{
      __typename: "RegularSpec";
      key: string;
      type: string;
      format?: string | null;
    } | null> | null;
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
      kdsParas?: {
        __typename: "KDSParameter";
        kdsArn?: string | null;
        streamName?: string | null;
        enableAutoScaling?: boolean | null;
        startShardNumber?: number | null;
        openShardCount?: number | null;
        consumerCount?: number | null;
        maxShardNumber?: number | null;
        regionName?: string | null;
        osHelperFnArn?: string | null;
      } | null;
      aosParas?: {
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
    kdsParas?: {
      __typename: "KDSParameter";
      kdsArn?: string | null;
      streamName?: string | null;
      enableAutoScaling?: boolean | null;
      startShardNumber?: number | null;
      openShardCount?: number | null;
      consumerCount?: number | null;
      maxShardNumber?: number | null;
      regionName?: string | null;
      osHelperFnArn?: string | null;
    } | null;
    aosParas?: {
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
        sourceName?: string | null;
        logPath?: string | null;
        sourceType?: LogSourceType | null;
        createdDt?: string | null;
        accountId?: string | null;
        region?: string | null;
        s3Source?: {
          __typename: "S3Source";
          s3Name?: string | null;
          s3Prefix?: string | null;
          archiveFormat?: string | null;
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
      } | null;
      stackId?: string | null;
      stackName?: string | null;
      appPipelineId?: string | null;
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
      sourceName?: string | null;
      logPath?: string | null;
      sourceType?: LogSourceType | null;
      createdDt?: string | null;
      accountId?: string | null;
      region?: string | null;
      s3Source?: {
        __typename: "S3Source";
        s3Name?: string | null;
        s3Prefix?: string | null;
        archiveFormat?: string | null;
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
    } | null;
    stackId?: string | null;
    stackName?: string | null;
    appPipelineId?: string | null;
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
    sourceName?: string | null;
    logPath?: string | null;
    sourceType?: LogSourceType | null;
    createdDt?: string | null;
    accountId?: string | null;
    region?: string | null;
    s3Source?: {
      __typename: "S3Source";
      s3Name?: string | null;
      s3Prefix?: string | null;
      archiveFormat?: string | null;
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
      sourceName?: string | null;
      logPath?: string | null;
      sourceType?: LogSourceType | null;
      createdDt?: string | null;
      accountId?: string | null;
      region?: string | null;
      s3Source?: {
        __typename: "S3Source";
        s3Name?: string | null;
        s3Prefix?: string | null;
        archiveFormat?: string | null;
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

export type GetEKSDaemonSetConfigQueryVariables = {
  eksClusterId: string;
};

export type GetEKSDaemonSetConfigQuery = {
  // Get eks daemon set config by eks source id
  getEKSDaemonSetConfig?: string | null;
};

export type GetEKSDeploymentConfigQueryVariables = {
  eksClusterId: string;
  ingestionId: string;
};

export type GetEKSDeploymentConfigQuery = {
  // Get eks deployment configuration by eksClusterId and ingestion id
  getEKSDeploymentConfig?: string | null;
};

export type ListEKSClusterNamesQueryVariables = {
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
