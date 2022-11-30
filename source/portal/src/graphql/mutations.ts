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
    $groupType: String
    $instanceSet: [String!]!
  ) {
    createInstanceGroup(
      accountId: $accountId
      region: $region
      groupName: $groupName
      groupType: $groupType
      instanceSet: $instanceSet
    )
  }
`;
export const createInstanceGroupBaseOnASG = /* GraphQL */ `
  mutation CreateInstanceGroupBaseOnASG(
    $accountId: String
    $region: String
    $groupName: String!
    $groupType: String
    $autoScalingGroupName: String!
  ) {
    createInstanceGroupBaseOnASG(
      accountId: $accountId
      region: $region
      groupName: $groupName
      groupType: $groupType
      autoScalingGroupName: $autoScalingGroupName
    )
  }
`;
export const deleteInstanceGroup = /* GraphQL */ `
  mutation DeleteInstanceGroup($id: ID!) {
    deleteInstanceGroup(id: $id)
  }
`;
export const addInstancesToInstanceGroup = /* GraphQL */ `
  mutation AddInstancesToInstanceGroup(
    $sourceId: String!
    $instanceIdSet: [String!]!
  ) {
    addInstancesToInstanceGroup(
      sourceId: $sourceId
      instanceIdSet: $instanceIdSet
    )
  }
`;
export const deleteInstancesFromInstanceGroup = /* GraphQL */ `
  mutation DeleteInstancesFromInstanceGroup(
    $sourceId: String!
    $instanceIdSet: [String!]!
  ) {
    deleteInstancesFromInstanceGroup(
      sourceId: $sourceId
      instanceIdSet: $instanceIdSet
    )
  }
`;
export const createLogConf = /* GraphQL */ `
  mutation CreateLogConf(
    $confName: String!
    $logType: LogType!
    $timeKey: String
    $timeOffset: String
    $multilineLogParser: MultiLineLogParser
    $syslogParser: SyslogParser
    $userSampleLog: String
    $userLogFormat: String
    $regularExpression: String
    $timeRegularExpression: String
    $regularSpecs: [RegularSpecInput]
    $processorFilterRegex: ProcessorFilterRegexInput
  ) {
    createLogConf(
      confName: $confName
      logType: $logType
      timeKey: $timeKey
      timeOffset: $timeOffset
      multilineLogParser: $multilineLogParser
      syslogParser: $syslogParser
      userSampleLog: $userSampleLog
      userLogFormat: $userLogFormat
      regularExpression: $regularExpression
      timeRegularExpression: $timeRegularExpression
      regularSpecs: $regularSpecs
      processorFilterRegex: $processorFilterRegex
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
    $timeKey: String
    $timeOffset: String
    $multilineLogParser: MultiLineLogParser
    $syslogParser: SyslogParser
    $userSampleLog: String
    $userLogFormat: String
    $regularExpression: String
    $timeRegularExpression: String
    $regularSpecs: [RegularSpecInput]
    $processorFilterRegex: ProcessorFilterRegexInput
  ) {
    updateLogConf(
      id: $id
      confName: $confName
      logType: $logType
      timeKey: $timeKey
      timeOffset: $timeOffset
      multilineLogParser: $multilineLogParser
      syslogParser: $syslogParser
      userSampleLog: $userSampleLog
      userLogFormat: $userLogFormat
      regularExpression: $regularExpression
      timeRegularExpression: $timeRegularExpression
      regularSpecs: $regularSpecs
      processorFilterRegex: $processorFilterRegex
    )
  }
`;
export const createAppPipeline = /* GraphQL */ `
  mutation CreateAppPipeline(
    $bufferType: BufferType!
    $bufferParams: [BufferInput]
    $aosParams: AOSParameterInput!
    $force: Boolean
    $tags: [TagInput]
  ) {
    createAppPipeline(
      bufferType: $bufferType
      bufferParams: $bufferParams
      aosParams: $aosParams
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
    $appPipelineId: String!
    $createDashboard: String
    $tags: [TagInput]
    $logPath: String
  ) {
    createAppLogIngestion(
      confId: $confId
      sourceIds: $sourceIds
      sourceType: $sourceType
      appPipelineId: $appPipelineId
      createDashboard: $createDashboard
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
    $accountId: String
    $region: String
    $sourceInfo: [SourceInfoInput]
    $tags: [TagInput]
  ) {
    createLogSource(
      sourceType: $sourceType
      accountId: $accountId
      region: $region
      sourceInfo: $sourceInfo
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
