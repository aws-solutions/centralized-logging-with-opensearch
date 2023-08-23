/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const listDomainNames = /* GraphQL */ `
  query ListDomainNames($region: String) {
    listDomainNames(region: $region) {
      domainNames {
        domainName
        status
      }
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
      }
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
      }
      esVpc {
        vpcId
        subnetIds
        availabilityZones
        securityGroupIds
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
      }
      storageType
      volume {
        type
        size
      }
      cognito {
        enabled
        userPoolId
        domain
        identityPoolId
        roleArn
      }
      tags {
        key
        value
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
        }
        certificateArn
        keyName
        customEndpoint
        cognitoEndpoint
      }
      alarmStatus
      alarmError
      alarmInput {
        alarms {
          type
          value
        }
        email
        phone
      }
      metrics {
        searchableDocs
        freeStorageSpace
        health
      }
      status
      resources {
        name
        values
        status
      }
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
        }
        createdAt
        status
        tags {
          key
          value
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
        }
        processorLogGroupName
        helperLogGroupName
        logEventQueueName
        deliveryStreamName
        bufferResourceName
        stackId
      }
      total
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
      }
      createdAt
      status
      tags {
        key
        value
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
      }
      processorLogGroupName
      helperLogGroupName
      logEventQueueName
      deliveryStreamName
      bufferResourceName
      stackId
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
        filterConfigMap {
          enabled
          filters {
            key
            condition
            value
          }
        }
        regex
        regexFieldSpecs {
          key
          type
          format
        }
        timeKey
        timeOffset
        timeKeyRegex
        userLogFormat
        userSampleLog
      }
      total
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
      filterConfigMap {
        enabled
        filters {
          key
          condition
          value
        }
      }
      regex
      regexFieldSpecs {
        key
        type
        format
      }
      timeKey
      timeOffset
      timeKeyRegex
      userLogFormat
      userSampleLog
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
          filterConfigMap {
            enabled
            filters {
              key
              condition
              value
            }
          }
          regex
          regexFieldSpecs {
            key
            type
            format
          }
          timeKey
          timeOffset
          timeKeyRegex
          userLogFormat
          userSampleLog
        }
        bufferAccessRoleArn
        bufferAccessRoleName
        bufferResourceName
        bufferResourceArn
        processorLogGroupName
        helperLogGroupName
        logEventQueueName
        monitor {
          status
          backupBucketName
          errorLogPrefix
          pipelineAlarmStatus
          snsTopicName
          snsTopicArn
          emails
        }
        stackId
        error
        tags {
          key
          value
        }
      }
      total
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
        filterConfigMap {
          enabled
          filters {
            key
            condition
            value
          }
        }
        regex
        regexFieldSpecs {
          key
          type
          format
        }
        timeKey
        timeOffset
        timeKeyRegex
        userLogFormat
        userSampleLog
      }
      bufferAccessRoleArn
      bufferAccessRoleName
      bufferResourceName
      bufferResourceArn
      processorLogGroupName
      helperLogGroupName
      logEventQueueName
      monitor {
        status
        backupBucketName
        errorLogPrefix
        pipelineAlarmStatus
        snsTopicName
        snsTopicArn
        emails
      }
      stackId
      error
      tags {
        key
        value
      }
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
        }
        accountId
        region
      }
      total
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
      }
      accountId
      region
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
  ) {
    listInstances(
      maxResults: $maxResults
      nextToken: $nextToken
      instanceSet: $instanceSet
      tags: $tags
      region: $region
      accountId: $accountId
    ) {
      instances {
        id
        platformName
        ipAddress
        computerName
        name
      }
      nextToken
    }
  }
`;
export const getLogAgentStatus = /* GraphQL */ `
  query GetLogAgentStatus(
    $instanceId: String!
    $region: String
    $accountId: String
  ) {
    getLogAgentStatus(
      instanceId: $instanceId
      region: $region
      accountId: $accountId
    )
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
      }
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
      }
      s3 {
        mode
        bucketName
        keyPrefix
        keySuffix
        compressionType
      }
      ec2 {
        groupName
        groupType
        groupPlatform
        asgName
        instances {
          instanceId
        }
      }
      syslog {
        protocol
        port
        nlbArn
        nlbDNSName
      }
      createdAt
      updatedAt
      status
      tags {
        key
        value
      }
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
        }
        s3 {
          mode
          bucketName
          keyPrefix
          keySuffix
          compressionType
        }
        ec2 {
          groupName
          groupType
          groupPlatform
          asgName
          instances {
            instanceId
          }
        }
        syslog {
          protocol
          port
          nlbArn
          nlbDNSName
        }
        createdAt
        updatedAt
        status
        tags {
          key
          value
        }
      }
      total
    }
  }
`;
export const checkTimeFormat = /* GraphQL */ `
  query CheckTimeFormat($timeStr: String!, $formatStr: String!) {
    checkTimeFormat(timeStr: $timeStr, formatStr: $formatStr) {
      isMatch
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
        subAccountBucketName
        subAccountStackId
        subAccountKMSKeyArn
        subAccountVpcId
        subAccountPublicSubnetIds
        subAccountIamInstanceProfileArn
        createdAt
        status
        tags {
          key
          value
        }
      }
      total
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
      subAccountBucketName
      subAccountStackId
      subAccountKMSKeyArn
      subAccountVpcId
      subAccountPublicSubnetIds
      subAccountIamInstanceProfileArn
      createdAt
      status
      tags {
        key
        value
      }
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
      }
      total
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
      }
      nextForwardToken
      nextBackwardToken
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
      }
      xaxis {
        categories
      }
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
      }
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
      }
      multiAZWithStandbyEnabled
    }
  }
`;
