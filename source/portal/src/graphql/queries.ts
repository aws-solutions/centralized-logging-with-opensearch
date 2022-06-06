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
    $region: String
  ) {
    listResources(type: $type, parentId: $parentId, region: $region) {
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
    $region: String
  ) {
    getResourceLoggingBucket(
      type: $type
      resourceName: $resourceName
      region: $region
    ) {
      enabled
      bucket
      prefix
    }
  }
`;
export const listInstanceGroups = /* GraphQL */ `
  query ListInstanceGroups($page: Int, $count: Int) {
    listInstanceGroups(page: $page, count: $count) {
      instanceGroups {
        id
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
        logPath
        logType
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
      logPath
      logType
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
  ) {
    listInstances(
      maxResults: $maxResults
      nextToken: $nextToken
      instanceSet: $instanceSet
      tags: $tags
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
  query GetLogAgentStatus($instanceId: String!) {
    getLogAgentStatus(instanceId: $instanceId)
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
  query GetEKSDeploymentConfig($eksClusterId: String!, $ingestionId: String!) {
    getEKSDeploymentConfig(
      eksClusterId: $eksClusterId
      ingestionId: $ingestionId
    )
  }
`;
export const listEKSClusterNames = /* GraphQL */ `
  query ListEKSClusterNames($nextToken: String!, $isListAll: Boolean) {
    listEKSClusterNames(nextToken: $nextToken, isListAll: $isListAll) {
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
