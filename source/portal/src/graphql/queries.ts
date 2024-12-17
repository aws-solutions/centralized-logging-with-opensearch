/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const latestVersion = /* GraphQL */ `
  query LatestVersion {
    latestVersion
  }
`;
export const listDomainNames = /* GraphQL */ `
  query ListDomainNames($region: String) {
    listDomainNames(region: $region) {
      domainNames {
        domainName
        status
        __typename
      }
      __typename
    }
  }
`;
export const getDomainVpc = /* GraphQL */ `
  query GetDomainVpc($domainName: String!, $region: String) {
    getDomainVpc(domainName: $domainName, region: $region) {
      vpcId
      subnetIds
      availabilityZones
      securityGroupIds
      __typename
    }
  }
`;
export const listImportedDomains = /* GraphQL */ `
  query ListImportedDomains($metrics: Boolean, $includeFailed: Boolean) {
    listImportedDomains(metrics: $metrics, includeFailed: $includeFailed) {
      id
      domainName
      engine
      version
      endpoint
      metrics {
        searchableDocs
        freeStorageSpace
        health
        __typename
      }
      __typename
    }
  }
`;
export const getDomainDetails = /* GraphQL */ `
  query GetDomainDetails($id: ID!, $metrics: Boolean) {
    getDomainDetails(id: $id, metrics: $metrics) {
      id
      domainArn
      domainName
      engine
      version
      endpoint
      region
      accountId
      vpc {
        vpcId
        privateSubnetIds
        publicSubnetIds
        securityGroupId
        __typename
      }
      esVpc {
        vpcId
        subnetIds
        availabilityZones
        securityGroupIds
        __typename
      }
      nodes {
        instanceType
        instanceCount
        dedicatedMasterEnabled
        zoneAwarenessEnabled
        dedicatedMasterType
        dedicatedMasterCount
        warmEnabled
        warmType
        warmCount
        coldEnabled
        __typename
      }
      storageType
      volume {
        type
        size
        __typename
      }
      cognito {
        enabled
        userPoolId
        domain
        identityPoolId
        roleArn
        __typename
      }
      tags {
        key
        value
        __typename
      }
      proxyStatus
      proxyALB
      proxyError
      proxyInput {
        vpc {
          vpcId
          privateSubnetIds
          publicSubnetIds
          securityGroupId
          __typename
        }
        certificateArn
        keyName
        customEndpoint
        cognitoEndpoint
        proxyInstanceType
        proxyInstanceNumber
        __typename
      }
      alarmStatus
      alarmError
      alarmInput {
        alarms {
          type
          value
          __typename
        }
        email
        phone
        __typename
      }
      metrics {
        searchableDocs
        freeStorageSpace
        health
        __typename
      }
      status
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
export const listServicePipelines = /* GraphQL */ `
  query ListServicePipelines($page: Int, $count: Int) {
    listServicePipelines(page: $page, count: $count) {
      pipelines {
        id
        type
        destinationType
        source
        target
        parameters {
          parameterKey
          parameterValue
          __typename
        }
        createdAt
        status
        tags {
          key
          value
          __typename
        }
        error
        monitor {
          status
          backupBucketName
          errorLogPrefix
          pipelineAlarmStatus
          snsTopicName
          snsTopicArn
          emails
          __typename
        }
        osiParams {
          minCapacity
          maxCapacity
          __typename
        }
        osiPipelineName
        processorLogGroupName
        helperLogGroupName
        logEventQueueName
        logEventQueueType
        deliveryStreamName
        bufferResourceName
        stackId
        logSourceAccountId
        logSourceRegion
        engineType
        lightEngineParams {
          stagingBucketPrefix
          centralizedBucketName
          centralizedBucketPrefix
          centralizedTableName
          logProcessorSchedule
          logMergerSchedule
          logArchiveSchedule
          logMergerAge
          logArchiveAge
          importDashboards
          grafanaId
          recipients
          notificationService
          enrichmentPlugins
          __typename
        }
        logProcessorConcurrency
        __typename
      }
      total
      __typename
    }
  }
`;
export const getServicePipeline = /* GraphQL */ `
  query GetServicePipeline($id: ID!) {
    getServicePipeline(id: $id) {
      id
      type
      destinationType
      source
      target
      parameters {
        parameterKey
        parameterValue
        __typename
      }
      createdAt
      status
      tags {
        key
        value
        __typename
      }
      error
      monitor {
        status
        backupBucketName
        errorLogPrefix
        pipelineAlarmStatus
        snsTopicName
        snsTopicArn
        emails
        __typename
      }
      osiParams {
        minCapacity
        maxCapacity
        __typename
      }
      osiPipelineName
      processorLogGroupName
      helperLogGroupName
      logEventQueueName
      logEventQueueType
      deliveryStreamName
      bufferResourceName
      stackId
      logSourceAccountId
      logSourceRegion
      engineType
      lightEngineParams {
        stagingBucketPrefix
        centralizedBucketName
        centralizedBucketPrefix
        centralizedTableName
        logProcessorSchedule
        logMergerSchedule
        logArchiveSchedule
        logMergerAge
        logArchiveAge
        importDashboards
        grafanaId
        recipients
        notificationService
        enrichmentPlugins
        __typename
      }
      logProcessorConcurrency
      __typename
    }
  }
`;
export const listResources = /* GraphQL */ `
  query ListResources(
    $type: ResourceType!
    $parentId: String
    $accountId: String
    $region: String
  ) {
    listResources(
      type: $type
      parentId: $parentId
      accountId: $accountId
      region: $region
    ) {
      id
      name
      parentId
      description
      __typename
    }
  }
`;
export const getResourceLoggingBucket = /* GraphQL */ `
  query GetResourceLoggingBucket(
    $type: ResourceType!
    $resourceName: String!
    $accountId: String
    $region: String
  ) {
    getResourceLoggingBucket(
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
export const getResourceLogConfigs = /* GraphQL */ `
  query GetResourceLogConfigs(
    $type: ResourceType!
    $resourceName: String!
    $accountId: String
    $region: String
  ) {
    getResourceLogConfigs(
      type: $type
      resourceName: $resourceName
      accountId: $accountId
      region: $region
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
export const listLogConfigs = /* GraphQL */ `
  query ListLogConfigs($page: Int!, $count: Int!) {
    listLogConfigs(page: $page, count: $count) {
      logConfigs {
        id
        version
        createdAt
        name
        logType
        syslogParser
        multilineLogParser
        iisLogParser
        filterConfigMap {
          enabled
          filters {
            key
            condition
            value
            __typename
          }
          __typename
        }
        regex
        jsonSchema
        regexFieldSpecs {
          key
          type
          format
          __typename
        }
        timeKey
        timeOffset
        timeKeyRegex
        userLogFormat
        userSampleLog
        description
        __typename
      }
      total
      __typename
    }
  }
`;
export const listLogConfigVersions = /* GraphQL */ `
  query ListLogConfigVersions($id: ID!) {
    listLogConfigVersions(id: $id) {
      id
      version
      createdAt
      name
      logType
      syslogParser
      multilineLogParser
      iisLogParser
      filterConfigMap {
        enabled
        filters {
          key
          condition
          value
          __typename
        }
        __typename
      }
      regex
      jsonSchema
      regexFieldSpecs {
        key
        type
        format
        __typename
      }
      timeKey
      timeOffset
      timeKeyRegex
      userLogFormat
      userSampleLog
      description
      __typename
    }
  }
`;
export const getLogConfig = /* GraphQL */ `
  query GetLogConfig($id: ID!, $version: Int) {
    getLogConfig(id: $id, version: $version) {
      id
      version
      createdAt
      name
      logType
      syslogParser
      multilineLogParser
      iisLogParser
      filterConfigMap {
        enabled
        filters {
          key
          condition
          value
          __typename
        }
        __typename
      }
      regex
      jsonSchema
      regexFieldSpecs {
        key
        type
        format
        __typename
      }
      timeKey
      timeOffset
      timeKeyRegex
      userLogFormat
      userSampleLog
      description
      __typename
    }
  }
`;
export const listAppPipelines = /* GraphQL */ `
  query ListAppPipelines($page: Int, $count: Int) {
    listAppPipelines(page: $page, count: $count) {
      appPipelines {
        pipelineId
        bufferType
        bufferParams {
          paramKey
          paramValue
          __typename
        }
        parameters {
          parameterKey
          parameterValue
          __typename
        }
        aosParams {
          opensearchArn
          domainName
          indexPrefix
          warmLogTransition
          coldLogTransition
          logRetention
          rolloverSize
          codec
          indexSuffix
          refreshInterval
          shardNumbers
          replicaNumbers
          engine
          __typename
        }
        lightEngineParams {
          stagingBucketPrefix
          centralizedBucketName
          centralizedBucketPrefix
          centralizedTableName
          logProcessorSchedule
          logMergerSchedule
          logArchiveSchedule
          logMergerAge
          logArchiveAge
          importDashboards
          grafanaId
          recipients
          notificationService
          enrichmentPlugins
          __typename
        }
        createdAt
        status
        logConfigId
        logConfigVersionNumber
        logConfig {
          id
          version
          createdAt
          name
          logType
          syslogParser
          multilineLogParser
          iisLogParser
          filterConfigMap {
            enabled
            filters {
              key
              condition
              value
              __typename
            }
            __typename
          }
          regex
          jsonSchema
          regexFieldSpecs {
            key
            type
            format
            __typename
          }
          timeKey
          timeOffset
          timeKeyRegex
          userLogFormat
          userSampleLog
          description
          __typename
        }
        bufferAccessRoleArn
        bufferAccessRoleName
        bufferResourceName
        bufferResourceArn
        processorLogGroupName
        helperLogGroupName
        logEventQueueName
        logEventQueueType
        logProcessorConcurrency
        monitor {
          status
          backupBucketName
          errorLogPrefix
          pipelineAlarmStatus
          snsTopicName
          snsTopicArn
          emails
          __typename
        }
        osiParams {
          minCapacity
          maxCapacity
          __typename
        }
        osiPipelineName
        minCapacity
        maxCapacity
        stackId
        error
        engineType
        logStructure
        tags {
          key
          value
          __typename
        }
        __typename
      }
      total
      __typename
    }
  }
`;
export const batchExportAppPipelines = /* GraphQL */ `
  query BatchExportAppPipelines($appPipelineIds: [ID!]!) {
    batchExportAppPipelines(appPipelineIds: $appPipelineIds)
  }
`;
export const batchImportAppPipelinesAnalyzer = /* GraphQL */ `
  query BatchImportAppPipelinesAnalyzer($contentString: String!) {
    batchImportAppPipelinesAnalyzer(contentString: $contentString) {
      findings {
        findingDetails
        findingType
        issueCode
        location {
          path
          __typename
        }
        __typename
      }
      resolvers {
        operationName
        variables
        __typename
      }
      __typename
    }
  }
`;
export const getAppPipeline = /* GraphQL */ `
  query GetAppPipeline($id: ID!) {
    getAppPipeline(id: $id) {
      pipelineId
      bufferType
      bufferParams {
        paramKey
        paramValue
        __typename
      }
      parameters {
        parameterKey
        parameterValue
        __typename
      }
      aosParams {
        opensearchArn
        domainName
        indexPrefix
        warmLogTransition
        coldLogTransition
        logRetention
        rolloverSize
        codec
        indexSuffix
        refreshInterval
        shardNumbers
        replicaNumbers
        engine
        __typename
      }
      lightEngineParams {
        stagingBucketPrefix
        centralizedBucketName
        centralizedBucketPrefix
        centralizedTableName
        logProcessorSchedule
        logMergerSchedule
        logArchiveSchedule
        logMergerAge
        logArchiveAge
        importDashboards
        grafanaId
        recipients
        notificationService
        enrichmentPlugins
        __typename
      }
      createdAt
      status
      logConfigId
      logConfigVersionNumber
      logConfig {
        id
        version
        createdAt
        name
        logType
        syslogParser
        multilineLogParser
        iisLogParser
        filterConfigMap {
          enabled
          filters {
            key
            condition
            value
            __typename
          }
          __typename
        }
        regex
        jsonSchema
        regexFieldSpecs {
          key
          type
          format
          __typename
        }
        timeKey
        timeOffset
        timeKeyRegex
        userLogFormat
        userSampleLog
        description
        __typename
      }
      bufferAccessRoleArn
      bufferAccessRoleName
      bufferResourceName
      bufferResourceArn
      processorLogGroupName
      helperLogGroupName
      logEventQueueName
      logEventQueueType
      logProcessorConcurrency
      monitor {
        status
        backupBucketName
        errorLogPrefix
        pipelineAlarmStatus
        snsTopicName
        snsTopicArn
        emails
        __typename
      }
      osiParams {
        minCapacity
        maxCapacity
        __typename
      }
      osiPipelineName
      minCapacity
      maxCapacity
      stackId
      error
      engineType
      logStructure
      tags {
        key
        value
        __typename
      }
      __typename
    }
  }
`;
export const listAppLogIngestions = /* GraphQL */ `
  query ListAppLogIngestions(
    $page: Int
    $count: Int
    $appPipelineId: String
    $sourceId: String
    $region: String
    $accountId: String
  ) {
    listAppLogIngestions(
      page: $page
      count: $count
      appPipelineId: $appPipelineId
      sourceId: $sourceId
      region: $region
      accountId: $accountId
    ) {
      appLogIngestions {
        id
        stackId
        stackName
        appPipelineId
        logPath
        sourceId
        sourceType
        createdAt
        status
        tags {
          key
          value
          __typename
        }
        accountId
        region
        __typename
      }
      total
      __typename
    }
  }
`;
export const getAppLogIngestion = /* GraphQL */ `
  query GetAppLogIngestion($id: ID!) {
    getAppLogIngestion(id: $id) {
      id
      stackId
      stackName
      appPipelineId
      logPath
      sourceId
      sourceType
      createdAt
      status
      tags {
        key
        value
        __typename
      }
      accountId
      region
      __typename
    }
  }
`;
export const getK8sDeploymentContentWithSidecar = /* GraphQL */ `
  query GetK8sDeploymentContentWithSidecar($id: ID!) {
    getK8sDeploymentContentWithSidecar(id: $id)
  }
`;
export const getK8sDeploymentContentWithDaemonSet = /* GraphQL */ `
  query GetK8sDeploymentContentWithDaemonSet($sourceId: ID!) {
    getK8sDeploymentContentWithDaemonSet(sourceId: $sourceId)
  }
`;
export const listInstances = /* GraphQL */ `
  query ListInstances(
    $maxResults: Int
    $nextToken: String
    $instanceSet: [String]
    $tags: [TagFilterInput]
    $region: String
    $accountId: String
    $platformType: EC2GroupPlatform
  ) {
    listInstances(
      maxResults: $maxResults
      nextToken: $nextToken
      instanceSet: $instanceSet
      tags: $tags
      region: $region
      accountId: $accountId
      platformType: $platformType
    ) {
      instances {
        id
        platformName
        platformType
        ipAddress
        computerName
        name
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getInstanceAgentStatus = /* GraphQL */ `
  query GetInstanceAgentStatus(
    $instanceIds: [String]!
    $region: String
    $accountId: String
    $commandId: String
  ) {
    getInstanceAgentStatus(
      instanceIds: $instanceIds
      region: $region
      accountId: $accountId
      commandId: $commandId
    ) {
      commandId
      instanceAgentStatusList {
        instanceId
        status
        invocationOutput
        curlOutput
        __typename
      }
      __typename
    }
  }
`;
export const validateVpcCidr = /* GraphQL */ `
  query ValidateVpcCidr($domainName: String!, $region: String) {
    validateVpcCidr(domainName: $domainName, region: $region)
  }
`;
export const getLogSource = /* GraphQL */ `
  query GetLogSource($type: LogSourceType!, $sourceId: ID!) {
    getLogSource(type: $type, sourceId: $sourceId) {
      sourceId
      name
      type
      accountId
      region
      eks {
        eksClusterName
        eksClusterArn
        cri
        vpcId
        eksClusterSGId
        subnetIds
        oidcIssuer
        endpoint
        logAgentRoleArn
        deploymentKind
        __typename
      }
      s3 {
        mode
        bucketName
        keyPrefix
        keySuffix
        compressionType
        __typename
      }
      ec2 {
        groupName
        groupType
        groupPlatform
        asgName
        instances {
          instanceId
          __typename
        }
        __typename
      }
      syslog {
        protocol
        port
        nlbArn
        nlbDNSName
        __typename
      }
      createdAt
      updatedAt
      status
      tags {
        key
        value
        __typename
      }
      __typename
    }
  }
`;
export const getAutoScalingGroupConf = /* GraphQL */ `
  query GetAutoScalingGroupConf($groupId: String!) {
    getAutoScalingGroupConf(groupId: $groupId)
  }
`;
export const listLogSources = /* GraphQL */ `
  query ListLogSources($type: LogSourceType!, $page: Int!, $count: Int!) {
    listLogSources(type: $type, page: $page, count: $count) {
      logSources {
        sourceId
        name
        type
        accountId
        region
        eks {
          eksClusterName
          eksClusterArn
          cri
          vpcId
          eksClusterSGId
          subnetIds
          oidcIssuer
          endpoint
          logAgentRoleArn
          deploymentKind
          __typename
        }
        s3 {
          mode
          bucketName
          keyPrefix
          keySuffix
          compressionType
          __typename
        }
        ec2 {
          groupName
          groupType
          groupPlatform
          asgName
          instances {
            instanceId
            __typename
          }
          __typename
        }
        syslog {
          protocol
          port
          nlbArn
          nlbDNSName
          __typename
        }
        createdAt
        updatedAt
        status
        tags {
          key
          value
          __typename
        }
        __typename
      }
      total
      __typename
    }
  }
`;
export const checkTimeFormat = /* GraphQL */ `
  query CheckTimeFormat($timeStr: String!, $formatStr: String!) {
    checkTimeFormat(timeStr: $timeStr, formatStr: $formatStr) {
      isMatch
      __typename
    }
  }
`;
export const listSubAccountLinks = /* GraphQL */ `
  query ListSubAccountLinks($page: Int, $count: Int) {
    listSubAccountLinks(page: $page, count: $count) {
      subAccountLinks {
        id
        subAccountId
        region
        subAccountName
        subAccountRoleArn
        agentInstallDoc
        agentConfDoc
        windowsAgentInstallDoc
        windowsAgentConfDoc
        agentStatusCheckDoc
        subAccountBucketName
        subAccountStackId
        subAccountKMSKeyArn
        subAccountVpcId
        subAccountPublicSubnetIds
        subAccountIamInstanceProfileArn
        subAccountFlbConfUploadingEventTopicArn
        createdAt
        status
        tags {
          key
          value
          __typename
        }
        __typename
      }
      total
      __typename
    }
  }
`;
export const getSubAccountLink = /* GraphQL */ `
  query GetSubAccountLink($subAccountId: String!, $region: String) {
    getSubAccountLink(subAccountId: $subAccountId, region: $region) {
      id
      subAccountId
      region
      subAccountName
      subAccountRoleArn
      agentInstallDoc
      agentConfDoc
      windowsAgentInstallDoc
      windowsAgentConfDoc
      agentStatusCheckDoc
      subAccountBucketName
      subAccountStackId
      subAccountKMSKeyArn
      subAccountVpcId
      subAccountPublicSubnetIds
      subAccountIamInstanceProfileArn
      subAccountFlbConfUploadingEventTopicArn
      createdAt
      status
      tags {
        key
        value
        __typename
      }
      __typename
    }
  }
`;
export const checkCustomPort = /* GraphQL */ `
  query CheckCustomPort(
    $sourceType: LogSourceType
    $syslogProtocol: ProtocolType!
    $syslogPort: Int!
  ) {
    checkCustomPort(
      sourceType: $sourceType
      syslogProtocol: $syslogProtocol
      syslogPort: $syslogPort
    ) {
      isAllowedPort
      msg
      recommendedPort
      __typename
    }
  }
`;
export const listLogStreams = /* GraphQL */ `
  query ListLogStreams(
    $logGroupName: String!
    $logStreamNamePrefix: String
    $page: Int
    $count: Int
  ) {
    listLogStreams(
      logGroupName: $logGroupName
      logStreamNamePrefix: $logStreamNamePrefix
      page: $page
      count: $count
    ) {
      logStreams {
        logStreamName
        creationTime
        firstEventTimestamp
        lastEventTimestamp
        lastIngestionTime
        uploadSequenceToken
        arn
        storedBytes
        __typename
      }
      total
      __typename
    }
  }
`;
export const getLogEvents = /* GraphQL */ `
  query GetLogEvents(
    $logGroupName: String!
    $logStreamName: String!
    $startTime: Int
    $endTime: Int
    $filterPattern: String
    $limit: Int
    $nextToken: String
  ) {
    getLogEvents(
      logGroupName: $logGroupName
      logStreamName: $logStreamName
      startTime: $startTime
      endTime: $endTime
      filterPattern: $filterPattern
      limit: $limit
      nextToken: $nextToken
    ) {
      logEvents {
        timestamp
        message
        ingestionTime
        __typename
      }
      nextForwardToken
      nextBackwardToken
      __typename
    }
  }
`;
export const getMetricHistoryData = /* GraphQL */ `
  query GetMetricHistoryData(
    $pipelineId: String!
    $pipelineType: PipelineType!
    $metricNames: [MetricName]
    $startTime: Int
    $endTime: Int
  ) {
    getMetricHistoryData(
      pipelineId: $pipelineId
      pipelineType: $pipelineType
      metricNames: $metricNames
      startTime: $startTime
      endTime: $endTime
    ) {
      series {
        name
        data
        __typename
      }
      xaxis {
        categories
        __typename
      }
      __typename
    }
  }
`;
export const getPipelineAlarm = /* GraphQL */ `
  query GetPipelineAlarm(
    $pipelineId: String!
    $pipelineType: PipelineType!
    $alarmName: AlarmMetricName!
  ) {
    getPipelineAlarm(
      pipelineId: $pipelineId
      pipelineType: $pipelineType
      alarmName: $alarmName
    ) {
      alarms {
        name
        status
        resourceId
        __typename
      }
      __typename
    }
  }
`;
export const domainStatusCheck = /* GraphQL */ `
  query DomainStatusCheck($domainName: String!, $region: String) {
    domainStatusCheck(domainName: $domainName, region: $region) {
      status
      details {
        name
        values
        errorCode
        status
        __typename
      }
      multiAZWithStandbyEnabled
      __typename
    }
  }
`;
export const checkOSIAvailability = /* GraphQL */ `
  query CheckOSIAvailability {
    checkOSIAvailability
  }
`;
export const getAccountUnreservedConurrency = /* GraphQL */ `
  query GetAccountUnreservedConurrency {
    getAccountUnreservedConurrency
  }
`;
export const listGrafanas = /* GraphQL */ `
  query ListGrafanas($page: Int, $count: Int) {
    listGrafanas(page: $page, count: $count) {
      grafanas {
        id
        name
        url
        createdAt
        tags {
          key
          value
          __typename
        }
        __typename
      }
      total
      __typename
    }
  }
`;
export const getGrafana = /* GraphQL */ `
  query GetGrafana($id: String!) {
    getGrafana(id: $id) {
      id
      name
      url
      createdAt
      tags {
        key
        value
        __typename
      }
      __typename
    }
  }
`;
export const checkGrafana = /* GraphQL */ `
  query CheckGrafana($id: String, $url: String, $token: String) {
    checkGrafana(id: $id, url: $url, token: $token) {
      status
      details {
        name
        values
        errorCode
        status
        __typename
      }
      __typename
    }
  }
`;
export const getLightEngineAppPipelineExecutionLogs = /* GraphQL */ `
  query GetLightEngineAppPipelineExecutionLogs(
    $pipelineId: String!
    $stateMachineName: String!
    $type: ScheduleType!
    $status: ExecutionStatus
    $startTime: String
    $endTime: String
    $lastEvaluatedKey: AWSJSON
    $limit: Int
  ) {
    getLightEngineAppPipelineExecutionLogs(
      pipelineId: $pipelineId
      stateMachineName: $stateMachineName
      type: $type
      status: $status
      startTime: $startTime
      endTime: $endTime
      lastEvaluatedKey: $lastEvaluatedKey
      limit: $limit
    ) {
      items {
        executionName
        executionArn
        taskId
        startTime
        endTime
        status
        __typename
      }
      lastEvaluatedKey
      __typename
    }
  }
`;
export const getLightEngineAppPipelineDetail = /* GraphQL */ `
  query GetLightEngineAppPipelineDetail($pipelineId: String!) {
    getLightEngineAppPipelineDetail(pipelineId: $pipelineId) {
      analyticsEngine {
        engineType
        table {
          databaseName
          tableName
          location
          classification
          dashboardName
          dashboardLink
          __typename
        }
        metric {
          databaseName
          tableName
          location
          classification
          dashboardName
          dashboardLink
          __typename
        }
        __typename
      }
      schedules {
        type
        stateMachine {
          arn
          name
          __typename
        }
        scheduler {
          type
          group
          name
          expression
          age
          __typename
        }
        __typename
      }
      __typename
    }
  }
`;
export const getLightEngineServicePipelineExecutionLogs = /* GraphQL */ `
  query GetLightEngineServicePipelineExecutionLogs(
    $pipelineId: String!
    $stateMachineName: String!
    $type: ScheduleType!
    $status: ExecutionStatus
    $startTime: String
    $endTime: String
    $lastEvaluatedKey: AWSJSON
    $limit: Int
  ) {
    getLightEngineServicePipelineExecutionLogs(
      pipelineId: $pipelineId
      stateMachineName: $stateMachineName
      type: $type
      status: $status
      startTime: $startTime
      endTime: $endTime
      lastEvaluatedKey: $lastEvaluatedKey
      limit: $limit
    ) {
      items {
        executionName
        executionArn
        taskId
        startTime
        endTime
        status
        __typename
      }
      lastEvaluatedKey
      __typename
    }
  }
`;
export const getLightEngineServicePipelineDetail = /* GraphQL */ `
  query GetLightEngineServicePipelineDetail($pipelineId: String!) {
    getLightEngineServicePipelineDetail(pipelineId: $pipelineId) {
      analyticsEngine {
        engineType
        table {
          databaseName
          tableName
          location
          classification
          dashboardName
          dashboardLink
          __typename
        }
        metric {
          databaseName
          tableName
          location
          classification
          dashboardName
          dashboardLink
          __typename
        }
        __typename
      }
      schedules {
        type
        stateMachine {
          arn
          name
          __typename
        }
        scheduler {
          type
          group
          name
          expression
          age
          __typename
        }
        __typename
      }
      __typename
    }
  }
`;
