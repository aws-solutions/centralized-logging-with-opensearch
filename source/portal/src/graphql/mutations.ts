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
    ) {
      id
      resources {
        name
        values
        status
        __typename
      }
      __typename
    }
  }
`;
export const removeDomain = /* GraphQL */ `
  mutation RemoveDomain($id: ID!, $isReverseConf: Boolean) {
    removeDomain(id: $id, isReverseConf: $isReverseConf) {
      error
      errorCode
      resources {
        name
        values
        status
        __typename
      }
      __typename
    }
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
    $destinationType: DestinationType!
    $osiParams: OpenSearchIngestionInput
    $monitor: MonitorInput
  ) {
    createServicePipeline(
      type: $type
      source: $source
      target: $target
      parameters: $parameters
      tags: $tags
      logSourceAccountId: $logSourceAccountId
      logSourceRegion: $logSourceRegion
      destinationType: $destinationType
      osiParams: $osiParams
      monitor: $monitor
    )
  }
`;
export const createLightEngineServicePipeline = /* GraphQL */ `
  mutation CreateLightEngineServicePipeline(
    $type: ServiceType!
    $parameters: [ParameterInput]
    $ingestion: LightEngineIngestion!
    $tags: [TagInput]
    $source: String
    $logSourceAccountId: String
    $logSourceRegion: String
    $monitor: MonitorInput
  ) {
    createLightEngineServicePipeline(
      type: $type
      parameters: $parameters
      ingestion: $ingestion
      tags: $tags
      source: $source
      logSourceAccountId: $logSourceAccountId
      logSourceRegion: $logSourceRegion
      monitor: $monitor
    )
  }
`;
export const updateServicePipeline = /* GraphQL */ `
  mutation UpdateServicePipeline($id: ID!, $monitor: MonitorInput) {
    updateServicePipeline(id: $id, monitor: $monitor)
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
      __typename
    }
  }
`;
export const putResourceLogConfig = /* GraphQL */ `
  mutation PutResourceLogConfig(
    $type: ResourceType!
    $resourceName: String!
    $accountId: String
    $region: String
    $destinationType: DestinationType!
    $destinationName: String!
    $LogFormat: String
  ) {
    putResourceLogConfig(
      type: $type
      resourceName: $resourceName
      accountId: $accountId
      region: $region
      destinationType: $destinationType
      destinationName: $destinationName
      LogFormat: $LogFormat
    ) {
      destinationType
      destinationName
      name
      logFormat
      region
      __typename
    }
  }
`;
export const createLogConfig = /* GraphQL */ `
  mutation CreateLogConfig(
    $name: String!
    $logType: LogType!
    $syslogParser: SyslogParser
    $multilineLogParser: MultiLineLogParser
    $filterConfigMap: ProcessorFilterRegexInput
    $regex: String
    $jsonSchema: AWSJSON
    $regexFieldSpecs: [RegularSpecInput]
    $timeKey: String
    $timeOffset: String
    $timeKeyRegex: String
    $userLogFormat: String
    $userSampleLog: String
  ) {
    createLogConfig(
      name: $name
      logType: $logType
      syslogParser: $syslogParser
      multilineLogParser: $multilineLogParser
      filterConfigMap: $filterConfigMap
      regex: $regex
      jsonSchema: $jsonSchema
      regexFieldSpecs: $regexFieldSpecs
      timeKey: $timeKey
      timeOffset: $timeOffset
      timeKeyRegex: $timeKeyRegex
      userLogFormat: $userLogFormat
      userSampleLog: $userSampleLog
    )
  }
`;
export const deleteLogConfig = /* GraphQL */ `
  mutation DeleteLogConfig($id: ID!) {
    deleteLogConfig(id: $id)
  }
`;
export const updateLogConfig = /* GraphQL */ `
  mutation UpdateLogConfig(
    $id: ID!
    $version: Int
    $name: String!
    $logType: LogType!
    $syslogParser: SyslogParser
    $multilineLogParser: MultiLineLogParser
    $filterConfigMap: ProcessorFilterRegexInput
    $regex: String
    $jsonSchema: AWSJSON
    $regexFieldSpecs: [RegularSpecInput]
    $timeKey: String
    $timeOffset: String
    $timeKeyRegex: String
    $userLogFormat: String
    $userSampleLog: String
  ) {
    updateLogConfig(
      id: $id
      version: $version
      name: $name
      logType: $logType
      syslogParser: $syslogParser
      multilineLogParser: $multilineLogParser
      filterConfigMap: $filterConfigMap
      regex: $regex
      jsonSchema: $jsonSchema
      regexFieldSpecs: $regexFieldSpecs
      timeKey: $timeKey
      timeOffset: $timeOffset
      timeKeyRegex: $timeKeyRegex
      userLogFormat: $userLogFormat
      userSampleLog: $userSampleLog
    )
  }
`;
export const createAppPipeline = /* GraphQL */ `
  mutation CreateAppPipeline(
    $bufferType: BufferType!
    $bufferParams: [BufferInput]
    $aosParams: AOSParameterInput!
    $logConfigId: ID!
    $logConfigVersionNumber: Int!
    $monitor: MonitorInput
    $force: Boolean
    $osiParams: OpenSearchIngestionInput
    $tags: [TagInput]
  ) {
    createAppPipeline(
      bufferType: $bufferType
      bufferParams: $bufferParams
      aosParams: $aosParams
      logConfigId: $logConfigId
      logConfigVersionNumber: $logConfigVersionNumber
      monitor: $monitor
      force: $force
      osiParams: $osiParams
      tags: $tags
    )
  }
`;
export const createLightEngineAppPipeline = /* GraphQL */ `
  mutation CreateLightEngineAppPipeline(
    $params: LightEngineParameterInput!
    $bufferParams: [BufferInput]
    $logConfigId: ID!
    $logConfigVersionNumber: Int!
    $monitor: MonitorInput
    $force: Boolean
    $tags: [TagInput]
  ) {
    createLightEngineAppPipeline(
      params: $params
      bufferParams: $bufferParams
      logConfigId: $logConfigId
      logConfigVersionNumber: $logConfigVersionNumber
      monitor: $monitor
      force: $force
      tags: $tags
    )
  }
`;
export const updateAppPipeline = /* GraphQL */ `
  mutation UpdateAppPipeline($id: ID!, $monitor: MonitorInput) {
    updateAppPipeline(id: $id, monitor: $monitor)
  }
`;
export const deleteAppPipeline = /* GraphQL */ `
  mutation DeleteAppPipeline($id: ID!) {
    deleteAppPipeline(id: $id)
  }
`;
export const createAppLogIngestion = /* GraphQL */ `
  mutation CreateAppLogIngestion(
    $sourceId: String!
    $appPipelineId: String!
    $tags: [TagInput]
    $logPath: String
    $autoAddPermission: Boolean!
  ) {
    createAppLogIngestion(
      sourceId: $sourceId
      appPipelineId: $appPipelineId
      tags: $tags
      logPath: $logPath
      autoAddPermission: $autoAddPermission
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
    $type: LogSourceType!
    $region: String
    $accountId: String
    $ec2: EC2SourceInput
    $syslog: SyslogSourceInput
    $eks: EKSSourceInput
    $s3: S3SourceInput
    $tags: [TagInput]
  ) {
    createLogSource(
      type: $type
      region: $region
      accountId: $accountId
      ec2: $ec2
      syslog: $syslog
      eks: $eks
      s3: $s3
      tags: $tags
    )
  }
`;
export const updateLogSource = /* GraphQL */ `
  mutation UpdateLogSource(
    $type: LogSourceType!
    $sourceId: ID!
    $action: LogSourceUpdateAction!
    $ec2: EC2SourceUpdateInput
  ) {
    updateLogSource(
      type: $type
      sourceId: $sourceId
      action: $action
      ec2: $ec2
    )
  }
`;
export const deleteLogSource = /* GraphQL */ `
  mutation DeleteLogSource($type: LogSourceType!, $sourceId: ID!) {
    deleteLogSource(type: $type, sourceId: $sourceId)
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
    $subAccountIamInstanceProfileArn: String!
    $subAccountFlbConfUploadingEventTopicArn: String!
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
      subAccountIamInstanceProfileArn: $subAccountIamInstanceProfileArn
      subAccountFlbConfUploadingEventTopicArn: $subAccountFlbConfUploadingEventTopicArn
      tags: $tags
    )
  }
`;
export const updateSubAccountLink = /* GraphQL */ `
  mutation UpdateSubAccountLink(
    $subAccountId: String!
    $region: String
    $subAccountFlbConfUploadingEventTopicArn: String!
  ) {
    updateSubAccountLink(
      subAccountId: $subAccountId
      region: $region
      subAccountFlbConfUploadingEventTopicArn: $subAccountFlbConfUploadingEventTopicArn
    )
  }
`;
export const deleteSubAccountLink = /* GraphQL */ `
  mutation DeleteSubAccountLink($subAccountId: String!, $region: String) {
    deleteSubAccountLink(subAccountId: $subAccountId, region: $region)
  }
`;
export const createPipelineAlarm = /* GraphQL */ `
  mutation CreatePipelineAlarm(
    $pipelineId: String!
    $pipelineType: PipelineType!
    $snsTopicArn: String
    $emails: String
    $snsTopicName: String
  ) {
    createPipelineAlarm(
      pipelineId: $pipelineId
      pipelineType: $pipelineType
      snsTopicArn: $snsTopicArn
      emails: $emails
      snsTopicName: $snsTopicName
    )
  }
`;
export const updatePipelineAlarm = /* GraphQL */ `
  mutation UpdatePipelineAlarm(
    $pipelineId: String!
    $pipelineType: PipelineType!
    $snsTopicArn: String
    $emails: String
  ) {
    updatePipelineAlarm(
      pipelineId: $pipelineId
      pipelineType: $pipelineType
      snsTopicArn: $snsTopicArn
      emails: $emails
    )
  }
`;
export const deletePipelineAlarm = /* GraphQL */ `
  mutation DeletePipelineAlarm(
    $pipelineId: String!
    $pipelineType: PipelineType!
  ) {
    deletePipelineAlarm(pipelineId: $pipelineId, pipelineType: $pipelineType)
  }
`;
export const createGrafana = /* GraphQL */ `
  mutation CreateGrafana(
    $name: String!
    $url: String!
    $token: String!
    $tags: [TagInput]
  ) {
    createGrafana(name: $name, url: $url, token: $token, tags: $tags)
  }
`;
export const updateGrafana = /* GraphQL */ `
  mutation UpdateGrafana($id: String!, $url: String, $token: String) {
    updateGrafana(id: $id, url: $url, token: $token)
  }
`;
export const deleteGrafana = /* GraphQL */ `
  mutation DeleteGrafana($id: String!) {
    deleteGrafana(id: $id)
  }
`;
