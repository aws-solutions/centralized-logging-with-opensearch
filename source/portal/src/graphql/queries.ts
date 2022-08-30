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
export const checkServiceExisting = /* GraphQL */ `
  query CheckServiceExisting(
    $type: ResourceType!
    $accountId: String
    $region: String
  ) {
    checkServiceExisting(type: $type, accountId: $accountId, region: $region)
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
export const listInstanceGroups = /* GraphQL */ `
  query ListInstanceGroups($page: Int, $count: Int) {
    listInstanceGroups(page: $page, count: $count) {
      instanceGroups {
        id
        accountId
        region
        groupName
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
        multilineLogParser
        createdDt
        userLogFormat
        regularExpression
        regularSpecs {
          key
          type
          format
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
      multilineLogParser
      createdDt
      userLogFormat
      regularExpression
      regularSpecs {
        key
        type
        format
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
        kdsParas {
          kdsArn
          streamName
          enableAutoScaling
          startShardNumber
          openShardCount
          consumerCount
          maxShardNumber
          regionName
          osHelperFnArn
        }
        aosParas {
          opensearchArn
          domainName
          indexPrefix
          warmLogTransition
          coldLogTransition
          logRetention
          shardNumbers
          replicaNumbers
          engine
        }
        createdDt
        status
        kdsRoleArn
        ec2RoleArn
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
      kdsParas {
        kdsArn
        streamName
        enableAutoScaling
        startShardNumber
        openShardCount
        consumerCount
        maxShardNumber
        regionName
        osHelperFnArn
      }
      aosParas {
        opensearchArn
        domainName
        indexPrefix
        warmLogTransition
        coldLogTransition
        logRetention
        shardNumbers
        replicaNumbers
        engine
      }
      createdDt
      status
      kdsRoleArn
      ec2RoleArn
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
          sourceName
          logPath
          sourceType
          createdDt
          accountId
          region
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
        }
        stackId
        stackName
        appPipelineId
        kdsRoleArn
        kdsRoleName
        ec2RoleArn
        ec2RoleName
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
        sourceName
        logPath
        sourceType
        createdDt
        accountId
        region
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
      }
      stackId
      stackName
      appPipelineId
      kdsRoleArn
      kdsRoleName
      ec2RoleArn
      ec2RoleName
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
export const getInstanceMeta = /* GraphQL */ `
  query GetInstanceMeta($id: ID!) {
    getInstanceMeta(id: $id) {
      id
      logAgent {
        agentName
        version
      }
      status
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
      sourceName
      logPath
      sourceType
      createdDt
      accountId
      region
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
    }
  }
`;
export const listLogSources = /* GraphQL */ `
  query ListLogSources($page: Int, $count: Int) {
    listLogSources(page: $page, count: $count) {
      LogSources {
        sourceId
        sourceName
        logPath
        sourceType
        createdDt
        accountId
        region
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
      }
      total
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
export const getEKSDaemonSetConfig = /* GraphQL */ `
  query GetEKSDaemonSetConfig($eksClusterId: String!) {
    getEKSDaemonSetConfig(eksClusterId: $eksClusterId)
  }
`;
export const getEKSDeploymentConfig = /* GraphQL */ `
  query GetEKSDeploymentConfig(
    $eksClusterId: String!
    $ingestionId: String!
    $openExtraMetadataFlag: Boolean
  ) {
    getEKSDeploymentConfig(
      eksClusterId: $eksClusterId
      ingestionId: $ingestionId
      openExtraMetadataFlag: $openExtraMetadataFlag
    )
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
