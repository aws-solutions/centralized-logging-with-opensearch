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
  ) {
    createServicePipeline(
      type: $type
      source: $source
      target: $target
      parameters: $parameters
      tags: $tags
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
    $region: String
  ) {
    putResourceLoggingBucket(
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
export const createInstanceGroup = /* GraphQL */ `
  mutation CreateInstanceGroup($groupName: String!, $instanceSet: [String!]!) {
    createInstanceGroup(groupName: $groupName, instanceSet: $instanceSet)
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
  ) {
    updateInstanceGroup(
      id: $id
      groupName: $groupName
      instanceSet: $instanceSet
    )
  }
`;
export const createLogConf = /* GraphQL */ `
  mutation CreateLogConf(
    $confName: String!
    $logPath: String!
    $logType: LogType!
    $multilineLogParser: MultiLineLogParser
    $userLogFormat: String
    $regularExpression: String
    $regularSpecs: [RegularSpecInput]
  ) {
    createLogConf(
      confName: $confName
      logPath: $logPath
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
    $logPath: String!
    $logType: LogType!
    $multilineLogParser: MultiLineLogParser
    $userLogFormat: String
    $regularExpression: String
    $regularSpecs: [RegularSpecInput]
  ) {
    updateLogConf(
      id: $id
      confName: $confName
      logPath: $logPath
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
    $tags: [TagInput]
  ) {
    createAppPipeline(kdsParas: $kdsParas, aosParas: $aosParas, tags: $tags)
  }
`;
export const deleteAppPipeline = /* GraphQL */ `
  mutation DeleteAppPipeline($id: ID!) {
    deleteAppPipeline(id: $id)
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
    $tags: [TagInput]
  ) {
    createAppLogIngestion(
      confId: $confId
      sourceIds: $sourceIds
      sourceType: $sourceType
      stackId: $stackId
      stackName: $stackName
      appPipelineId: $appPipelineId
      tags: $tags
    )
  }
`;
export const deleteAppLogIngestion = /* GraphQL */ `
  mutation DeleteAppLogIngestion($ids: [ID!]!) {
    deleteAppLogIngestion(ids: $ids)
  }
`;
export const requestInstallLogAgent = /* GraphQL */ `
  mutation RequestInstallLogAgent($instanceIdSet: [String!]!) {
    requestInstallLogAgent(instanceIdSet: $instanceIdSet)
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
    $tags: [TagInput]
  ) {
    createEKSClusterPodLogIngestion(
      kdsParas: $kdsParas
      aosParas: $aosParas
      confId: $confId
      eksClusterId: $eksClusterId
      tags: $tags
    )
  }
`;
