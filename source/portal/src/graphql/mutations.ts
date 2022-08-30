/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const importDomain = /* GraphQL */ `
  mutation ImportDomain(
    $domainName: String!
    $region: String
    $vpc: VPCInput
    $tags: [TagInput]
  ) {
    importDomain(
      domainName: $domainName
      region: $region
      vpc: $vpc
      tags: $tags
    )
  }
`;
export const removeDomain = /* GraphQL */ `
  mutation RemoveDomain($id: ID!) {
    removeDomain(id: $id)
  }
`;
export const createServicePipeline = /* GraphQL */ `
  mutation CreateServicePipeline(
    $type: ServiceType!
    $source: String
    $target: String
    $parameters: [ParameterInput]
    $tags: [TagInput]
    $logSourceAccountId: String
    $logSourceRegion: String
  ) {
    createServicePipeline(
      type: $type
      source: $source
      target: $target
      parameters: $parameters
      tags: $tags
      logSourceAccountId: $logSourceAccountId
      logSourceRegion: $logSourceRegion
    )
  }
`;
export const deleteServicePipeline = /* GraphQL */ `
  mutation DeleteServicePipeline($id: ID!) {
    deleteServicePipeline(id: $id)
  }
`;
export const createProxyForOpenSearch = /* GraphQL */ `
  mutation CreateProxyForOpenSearch($id: ID!, $input: ProxyInput!) {
    createProxyForOpenSearch(id: $id, input: $input)
  }
`;
export const createAlarmForOpenSearch = /* GraphQL */ `
  mutation CreateAlarmForOpenSearch($id: ID!, $input: AlarmStackInput!) {
    createAlarmForOpenSearch(id: $id, input: $input)
  }
`;
export const deleteProxyForOpenSearch = /* GraphQL */ `
  mutation DeleteProxyForOpenSearch($id: ID!) {
    deleteProxyForOpenSearch(id: $id)
  }
`;
export const deleteAlarmForOpenSearch = /* GraphQL */ `
  mutation DeleteAlarmForOpenSearch($id: ID!) {
    deleteAlarmForOpenSearch(id: $id)
  }
`;
export const putResourceLoggingBucket = /* GraphQL */ `
  mutation PutResourceLoggingBucket(
    $type: ResourceType!
    $resourceName: String!
    $accountId: String
    $region: String
  ) {
    putResourceLoggingBucket(
      type: $type
      resourceName: $resourceName
      accountId: $accountId
      region: $region
    ) {
      enabled
      bucket
      prefix
      source
    }
  }
`;
export const createInstanceGroup = /* GraphQL */ `
  mutation CreateInstanceGroup(
    $accountId: String
    $region: String
    $groupName: String!
    $instanceSet: [String!]!
  ) {
    createInstanceGroup(
      accountId: $accountId
      region: $region
      groupName: $groupName
      instanceSet: $instanceSet
    )
  }
`;
export const deleteInstanceGroup = /* GraphQL */ `
  mutation DeleteInstanceGroup($id: ID!) {
    deleteInstanceGroup(id: $id)
  }
`;
export const updateInstanceGroup = /* GraphQL */ `
  mutation UpdateInstanceGroup(
    $id: ID!
    $groupName: String!
    $instanceSet: [String!]!
    $accountId: String
    $region: String
  ) {
    updateInstanceGroup(
      id: $id
      groupName: $groupName
      instanceSet: $instanceSet
      accountId: $accountId
      region: $region
    )
  }
`;
export const createLogConf = /* GraphQL */ `
  mutation CreateLogConf(
    $confName: String!
    $logType: LogType!
    $multilineLogParser: MultiLineLogParser
    $userLogFormat: String
    $regularExpression: String
    $regularSpecs: [RegularSpecInput]
  ) {
    createLogConf(
      confName: $confName
      logType: $logType
      multilineLogParser: $multilineLogParser
      userLogFormat: $userLogFormat
      regularExpression: $regularExpression
      regularSpecs: $regularSpecs
    )
  }
`;
export const deleteLogConf = /* GraphQL */ `
  mutation DeleteLogConf($id: ID!) {
    deleteLogConf(id: $id)
  }
`;
export const updateLogConf = /* GraphQL */ `
  mutation UpdateLogConf(
    $id: ID!
    $confName: String!
    $logType: LogType!
    $multilineLogParser: MultiLineLogParser
    $userLogFormat: String
    $regularExpression: String
    $regularSpecs: [RegularSpecInput]
  ) {
    updateLogConf(
      id: $id
      confName: $confName
      logType: $logType
      multilineLogParser: $multilineLogParser
      userLogFormat: $userLogFormat
      regularExpression: $regularExpression
      regularSpecs: $regularSpecs
    )
  }
`;
export const createAppPipeline = /* GraphQL */ `
  mutation CreateAppPipeline(
    $kdsParas: KDSParameterInput!
    $aosParas: AOSParameterInput!
    $force: Boolean
    $tags: [TagInput]
  ) {
    createAppPipeline(
      kdsParas: $kdsParas
      aosParas: $aosParas
      force: $force
      tags: $tags
    )
  }
`;
export const deleteAppPipeline = /* GraphQL */ `
  mutation DeleteAppPipeline($id: ID!) {
    deleteAppPipeline(id: $id)
  }
`;
export const upgradeAppPipeline = /* GraphQL */ `
  mutation UpgradeAppPipeline($ids: [ID!]!) {
    upgradeAppPipeline(ids: $ids)
  }
`;
export const createAppLogIngestion = /* GraphQL */ `
  mutation CreateAppLogIngestion(
    $confId: String!
    $sourceIds: [String!]
    $sourceType: LogSourceType!
    $stackId: String
    $stackName: String
    $appPipelineId: String!
    $createDashboard: String!
    $force: Boolean
    $tags: [TagInput]
    $logPath: String!
  ) {
    createAppLogIngestion(
      confId: $confId
      sourceIds: $sourceIds
      sourceType: $sourceType
      stackId: $stackId
      stackName: $stackName
      appPipelineId: $appPipelineId
      createDashboard: $createDashboard
      force: $force
      tags: $tags
      logPath: $logPath
    )
  }
`;
export const deleteAppLogIngestion = /* GraphQL */ `
  mutation DeleteAppLogIngestion($ids: [ID!]!) {
    deleteAppLogIngestion(ids: $ids)
  }
`;
export const requestInstallLogAgent = /* GraphQL */ `
  mutation RequestInstallLogAgent(
    $instanceIdSet: [String!]!
    $accountId: String
    $region: String
  ) {
    requestInstallLogAgent(
      instanceIdSet: $instanceIdSet
      accountId: $accountId
      region: $region
    )
  }
`;
export const createLogSource = /* GraphQL */ `
  mutation CreateLogSource(
    $sourceType: LogSourceType!
    $logPath: String
    $s3Name: String
    $s3Prefix: String
    $accountId: String
    $region: String
    $archiveFormat: ArchiveFormat
    $subAccountVpcId: String
    $subAccountPublicSubnetIds: String
    $subAccountLinkId: String
    $tags: [TagInput]
  ) {
    createLogSource(
      sourceType: $sourceType
      logPath: $logPath
      s3Name: $s3Name
      s3Prefix: $s3Prefix
      accountId: $accountId
      region: $region
      archiveFormat: $archiveFormat
      subAccountVpcId: $subAccountVpcId
      subAccountPublicSubnetIds: $subAccountPublicSubnetIds
      subAccountLinkId: $subAccountLinkId
      tags: $tags
    )
  }
`;
export const deleteLogSource = /* GraphQL */ `
  mutation DeleteLogSource($id: ID!) {
    deleteLogSource(id: $id)
  }
`;
export const updateLogSource = /* GraphQL */ `
  mutation UpdateLogSource($id: ID!) {
    updateLogSource(id: $id)
  }
`;
export const importEKSCluster = /* GraphQL */ `
  mutation ImportEKSCluster(
    $aosDomainId: ID!
    $eksClusterName: String!
    $cri: CRI
    $accountId: String
    $region: String
    $deploymentKind: EKSDeployKind!
    $tags: [TagInput]
  ) {
    importEKSCluster(
      aosDomainId: $aosDomainId
      eksClusterName: $eksClusterName
      cri: $cri
      accountId: $accountId
      region: $region
      deploymentKind: $deploymentKind
      tags: $tags
    )
  }
`;
export const removeEKSCluster = /* GraphQL */ `
  mutation RemoveEKSCluster($id: ID!) {
    removeEKSCluster(id: $id)
  }
`;
export const createEKSClusterPodLogIngestion = /* GraphQL */ `
  mutation CreateEKSClusterPodLogIngestion(
    $kdsParas: KDSParameterInput!
    $aosParas: AOSParameterInput!
    $confId: String!
    $eksClusterId: String!
    $logPath: String!
    $createDashboard: String!
    $force: Boolean
    $tags: [TagInput]
  ) {
    createEKSClusterPodLogIngestion(
      kdsParas: $kdsParas
      aosParas: $aosParas
      confId: $confId
      eksClusterId: $eksClusterId
      logPath: $logPath
      createDashboard: $createDashboard
      force: $force
      tags: $tags
    )
  }
`;
export const createEKSClusterPodLogWithoutDataBufferIngestion = /* GraphQL */ `
  mutation CreateEKSClusterPodLogWithoutDataBufferIngestion(
    $aosParas: AOSParameterInput!
    $confId: String!
    $eksClusterId: String!
    $logPath: String!
    $createDashboard: String!
    $force: Boolean
    $tags: [TagInput]
  ) {
    createEKSClusterPodLogWithoutDataBufferIngestion(
      aosParas: $aosParas
      confId: $confId
      eksClusterId: $eksClusterId
      logPath: $logPath
      createDashboard: $createDashboard
      force: $force
      tags: $tags
    )
  }
`;
export const generateErrorCode = /* GraphQL */ `
  mutation GenerateErrorCode($code: ErrorCode) {
    generateErrorCode(code: $code)
  }
`;
export const createSubAccountLink = /* GraphQL */ `
  mutation CreateSubAccountLink(
    $subAccountId: String!
    $region: String
    $subAccountName: String!
    $subAccountRoleArn: String!
    $agentInstallDoc: String!
    $agentConfDoc: String!
    $subAccountBucketName: String!
    $subAccountStackId: String!
    $subAccountKMSKeyArn: String!
    $tags: [TagInput]
  ) {
    createSubAccountLink(
      subAccountId: $subAccountId
      region: $region
      subAccountName: $subAccountName
      subAccountRoleArn: $subAccountRoleArn
      agentInstallDoc: $agentInstallDoc
      agentConfDoc: $agentConfDoc
      subAccountBucketName: $subAccountBucketName
      subAccountStackId: $subAccountStackId
      subAccountKMSKeyArn: $subAccountKMSKeyArn
      tags: $tags
    )
  }
`;
export const updateSubAccountLink = /* GraphQL */ `
  mutation UpdateSubAccountLink(
    $id: ID!
    $subAccountName: String!
    $agentInstallDoc: String!
    $agentConfDoc: String!
    $subAccountBucketName: String!
    $subAccountStackId: String!
    $subAccountKMSKeyArn: String!
    $subAccountVpcId: String
    $subAccountPublicSubnetIds: String
  ) {
    updateSubAccountLink(
      id: $id
      subAccountName: $subAccountName
      agentInstallDoc: $agentInstallDoc
      agentConfDoc: $agentConfDoc
      subAccountBucketName: $subAccountBucketName
      subAccountStackId: $subAccountStackId
      subAccountKMSKeyArn: $subAccountKMSKeyArn
      subAccountVpcId: $subAccountVpcId
      subAccountPublicSubnetIds: $subAccountPublicSubnetIds
    )
  }
`;
export const deleteSubAccountLink = /* GraphQL */ `
  mutation DeleteSubAccountLink($id: ID!) {
    deleteSubAccountLink(id: $id)
  }
`;
