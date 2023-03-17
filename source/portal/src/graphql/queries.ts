/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const listDomainNames = /* GraphQL */ `
  query ListDomainNames($region: String) {
    listDomainNames(region: $region) {
      domainNames
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
  query ListImportedDomains($metrics: Boolean) {
    listImportedDomains(metrics: $metrics) {
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
        createdDt
        status
        tags {
          key
          value
        }
        error
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
      createdDt
      status
      tags {
        key
        value
      }
      error
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
export const listInstanceGroups = /* GraphQL */ `
  query ListInstanceGroups($page: Int, $count: Int) {
    listInstanceGroups(page: $page, count: $count) {
      instanceGroups {
        id
        accountId
        region
        groupName
        groupType
        instanceSet
        createdDt
        status
      }
      total
    }
  }
`;
export const getInstanceGroup = /* GraphQL */ `
  query GetInstanceGroup($id: ID!) {
    getInstanceGroup(id: $id) {
      id
      accountId
      region
      groupName
      groupType
      instanceSet
      createdDt
      status
    }
  }
`;
export const listLogConfs = /* GraphQL */ `
  query ListLogConfs($page: Int, $count: Int) {
    listLogConfs(page: $page, count: $count) {
      logConfs {
        id
        confName
        logType
        logPath
        timeKey
        timeOffset
        multilineLogParser
        syslogParser
        createdDt
        userLogFormat
        userSampleLog
        regularExpression
        timeRegularExpression
        regularSpecs {
          key
          type
          format
        }
        processorFilterRegex {
          enable
          filters {
            key
            condition
            value
          }
        }
        status
      }
      total
    }
  }
`;
export const getLogConf = /* GraphQL */ `
  query GetLogConf($id: ID!) {
    getLogConf(id: $id) {
      id
      confName
      logType
      logPath
      timeKey
      timeOffset
      multilineLogParser
      syslogParser
      createdDt
      userLogFormat
      userSampleLog
      regularExpression
      timeRegularExpression
      regularSpecs {
        key
        type
        format
      }
      processorFilterRegex {
        enable
        filters {
          key
          condition
          value
        }
      }
      status
    }
  }
`;
export const listAppPipelines = /* GraphQL */ `
  query ListAppPipelines($page: Int, $count: Int) {
    listAppPipelines(page: $page, count: $count) {
      appPipelines {
        id
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
        createdDt
        status
        bufferAccessRoleArn
        bufferAccessRoleName
        bufferResourceName
        bufferResourceArn
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
      id
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
      createdDt
      status
      bufferAccessRoleArn
      bufferAccessRoleName
      bufferResourceName
      bufferResourceArn
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
    $sourceType: LogSourceType
  ) {
    listAppLogIngestions(
      page: $page
      count: $count
      appPipelineId: $appPipelineId
      sourceId: $sourceId
      sourceType: $sourceType
    ) {
      appLogIngestions {
        id
        confId
        confName
        sourceInfo {
          sourceId
          accountId
          region
          sourceName
          logPath
          sourceType
          sourceInfo {
            key
            value
          }
          s3Source {
            s3Name
            s3Prefix
            archiveFormat
            defaultVpcId
            defaultSubnetIds
          }
          eksSource {
            id
            aosDomain {
              id
              domainName
              engine
              version
              endpoint
            }
            eksClusterName
            eksClusterArn
            cri
            vpcId
            eksClusterSGId
            subnetIds
            oidcIssuer
            endpoint
            createdDt
            accountId
            region
            logAgentRoleArn
            deploymentKind
            tags {
              key
              value
            }
          }
          createdDt
        }
        stackId
        stackName
        appPipelineId
        logPath
        sourceId
        sourceType
        accountId
        region
        createdDt
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
export const getAppLogIngestion = /* GraphQL */ `
  query GetAppLogIngestion($id: ID!) {
    getAppLogIngestion(id: $id) {
      id
      confId
      confName
      sourceInfo {
        sourceId
        accountId
        region
        sourceName
        logPath
        sourceType
        sourceInfo {
          key
          value
        }
        s3Source {
          s3Name
          s3Prefix
          archiveFormat
          defaultVpcId
          defaultSubnetIds
        }
        eksSource {
          id
          aosDomain {
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
          eksClusterName
          eksClusterArn
          cri
          vpcId
          eksClusterSGId
          subnetIds
          oidcIssuer
          endpoint
          createdDt
          accountId
          region
          logAgentRoleArn
          deploymentKind
          tags {
            key
            value
          }
        }
        createdDt
      }
      stackId
      stackName
      appPipelineId
      logPath
      sourceId
      sourceType
      accountId
      region
      createdDt
      status
      tags {
        key
        value
      }
    }
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
export const listAutoScalingGroups = /* GraphQL */ `
  query ListAutoScalingGroups(
    $maxResults: Int
    $nextToken: String
    $region: String
    $accountId: String
  ) {
    listAutoScalingGroups(
      maxResults: $maxResults
      nextToken: $nextToken
      region: $region
      accountId: $accountId
    ) {
      autoScalingGroups {
        autoScalingGroupName
        minSize
        maxSize
        desiredCapacity
        instances
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
export const validateVpcCidr = /* GraphQL */ `
  query ValidateVpcCidr($domainName: String!, $region: String) {
    validateVpcCidr(domainName: $domainName, region: $region)
  }
`;
export const getLogSource = /* GraphQL */ `
  query GetLogSource($sourceType: LogSourceType!, $id: ID!) {
    getLogSource(sourceType: $sourceType, id: $id) {
      sourceId
      accountId
      region
      sourceName
      logPath
      sourceType
      sourceInfo {
        key
        value
      }
      s3Source {
        s3Name
        s3Prefix
        archiveFormat
        defaultVpcId
        defaultSubnetIds
      }
      eksSource {
        id
        aosDomain {
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
        eksClusterName
        eksClusterArn
        cri
        vpcId
        eksClusterSGId
        subnetIds
        oidcIssuer
        endpoint
        createdDt
        accountId
        region
        logAgentRoleArn
        deploymentKind
        tags {
          key
          value
        }
      }
      createdDt
    }
  }
`;
export const getEKSClusterDetails = /* GraphQL */ `
  query GetEKSClusterDetails($eksClusterId: String!) {
    getEKSClusterDetails(eksClusterId: $eksClusterId) {
      id
      aosDomain {
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
      eksClusterName
      eksClusterArn
      cri
      vpcId
      eksClusterSGId
      subnetIds
      oidcIssuer
      endpoint
      createdDt
      accountId
      region
      logAgentRoleArn
      deploymentKind
      tags {
        key
        value
      }
    }
  }
`;
export const getEKSDaemonSetConf = /* GraphQL */ `
  query GetEKSDaemonSetConf($eksClusterId: String!) {
    getEKSDaemonSetConf(eksClusterId: $eksClusterId)
  }
`;
export const getEKSDeploymentConf = /* GraphQL */ `
  query GetEKSDeploymentConf(
    $eksClusterId: String!
    $ingestionId: String!
    $openExtraMetadataFlag: Boolean
  ) {
    getEKSDeploymentConf(
      eksClusterId: $eksClusterId
      ingestionId: $ingestionId
      openExtraMetadataFlag: $openExtraMetadataFlag
    )
  }
`;
export const getAutoScalingGroupConf = /* GraphQL */ `
  query GetAutoScalingGroupConf($groupId: String!) {
    getAutoScalingGroupConf(groupId: $groupId)
  }
`;
export const listEKSClusterNames = /* GraphQL */ `
  query ListEKSClusterNames(
    $accountId: String
    $region: String
    $nextToken: String!
    $isListAll: Boolean
  ) {
    listEKSClusterNames(
      accountId: $accountId
      region: $region
      nextToken: $nextToken
      isListAll: $isListAll
    ) {
      clusters
      nextToken
    }
  }
`;
export const listImportedEKSClusters = /* GraphQL */ `
  query ListImportedEKSClusters($page: Int, $count: Int) {
    listImportedEKSClusters(page: $page, count: $count) {
      eksClusterLogSourceList {
        id
        aosDomain {
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
        eksClusterName
        eksClusterArn
        cri
        vpcId
        eksClusterSGId
        subnetIds
        oidcIssuer
        endpoint
        createdDt
        accountId
        region
        logAgentRoleArn
        deploymentKind
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
        createdDt
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
  query GetSubAccountLink($id: ID!) {
    getSubAccountLink(id: $id) {
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
      createdDt
      status
      tags {
        key
        value
      }
    }
  }
`;
export const getSubAccountLinkByAccountIdRegion = /* GraphQL */ `
  query GetSubAccountLinkByAccountIdRegion(
    $accountId: String!
    $region: String
  ) {
    getSubAccountLinkByAccountIdRegion(accountId: $accountId, region: $region) {
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
      createdDt
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
