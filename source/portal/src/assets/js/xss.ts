// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// No UpdateInstanceGroup, UpdateSubAccountLink function in UI
const NEED_ENCODE_PARAM_KEYS: string[] = [
  "CreateAlarmForOpenSearch:value",
  "CreateAppLogIngestion:stackId",
  "CreateAppLogIngestion:stackName",
  "CreateAppLogIngestion:key",
  "CreateAppLogIngestion:value",
  "CreateEKSClusterPodLogIngestion:opensearchEndpoint",
  "CreateEKSClusterPodLogIngestion:key",
  "CreateEKSClusterPodLogIngestion:value",
  "CreateEKSClusterPodLogWithoutDataBufferIngestion:opensearchEndpoint",
  "CreateEKSClusterPodLogWithoutDataBufferIngestion:key",
  "CreateEKSClusterPodLogWithoutDataBufferIngestion:value",
  "CreateAppPipeline:key",
  "CreateAppPipeline:value",
  "ImportDomain:key",
  "ImportDomain:value",
  "CreateSubAccountLink:agentInstallDoc",
  "CreateSubAccountLink:agentConfDoc",
  "ImportEKSCluster:key",
  "ImportEKSCluster:value",
  "CreateLogConf:confName",
  "CreateLogConfig:userLogFormat",
  "CreateLogConfig:userSampleLog",
  "CreateLogConfig:regex",
  "CreateLogConf:timeRegularExpression",
  "CreateLogConf:key",
  "CreateLogConf:type",
  "CreateLogConf:value",
  "UpdateLogConfig:confName",
  "UpdateLogConfig:userSampleLog",
  "UpdateLogConfig:userLogFormat",
  "UpdateLogConfig:regex",
  "UpdateLogConfig:timeKeyRegex",
  "UpdateLogConfig:key",
  "UpdateLogConfig:type",
  "UpdateLogConfig:value",
  "CreateLogSource:key",
  "CreateLogSource:value",
  "CreateLogSource:logPath",
  "CreateLogSource:s3Prefix",
  "CreateServicePipeline:key",
  "CreateServicePipeline:value",
];

const NEED_DECODE_PARAM_KEYS: string[] = [
  "GetAppLogIngestion:confName",
  "GetAppLogIngestion:logPath",
  "GetAppLogIngestion:key",
  "GetAppLogIngestion:value",
  "GetAppPipeline:key",
  "GetAppPipeline:value",
  "ListAppPipelines:key",
  "ListAppPipelines:value",
  "ListAppLogIngestions:confName",
  "ListAppLogIngestions:logPath",
  "ListAppLogIngestions:key",
  "ListAppLogIngestions:value",
  "getEKSDaemonSetConf:key",
  "getEKSDaemonSetConf:value",
  "GetDomainDetails:proxyError",
  "GetDomainDetails:alarmError",
  "GetDomainDetails:key",
  "GetDomainDetails:value",
  "GetSubAccountLink:agentInstallDoc",
  "GetSubAccountLink:agentConfDoc",
  "GetSubAccountLink:key",
  "GetSubAccountLink:value",
  "ListSubAccountLinks:agentInstallDoc",
  "ListSubAccountLinks:agentConfDoc",
  "ListSubAccountLinks:key",
  "ListSubAccountLinks:value",
  "GetEKSClusterDetails:subAccountStackId",
  "GetEKSClusterDetails:key",
  "GetEKSClusterDetails:value",
  "ListEKSClusterNames:nextToken",
  "ListImportedEKSClusters:key",
  "ListImportedEKSClusters:value",
  "GetInstanceMeta:agentName",
  "GetLogConfig:userSampleLog",
  "GetLogConfig:name",
  "GetLogConf:logPath",
  "GetLogConfig:userLogFormat",
  "GetLogConfig:regex",
  "GetLogConf:timeRegularExpression",
  "GetLogConf:key",
  "GetLogConf:value",
  "ListLogConfigs:name",
  "ListLogConfigs:userLogFormat",
  "ListLogConfigs:userSampleLog",
  "ListLogConfigs:regex",
  "ListLogConfs:logPath",
  "ListLogConfs:userLogFormat",
  "ListLogConfs:regularExpression",
  "ListLogConfs:timeRegularExpression",
  "GetLogSource:confName",
  "GetLogSource:logPath",
  "GetLogSource:key",
  "GetLogSource:value",
  "ListLogSources:confName",
  "ListLogSources:logPath",
  "ListLogSources:key",
  "ListLogSources:value",
  "GetServicePipeline:key",
  "GetServicePipeline:value",
  "ListServicePipelines:key",
  "ListServicePipelines:value",
];

// Encode for AppSync mutation methods
export const encodeParams = (statement: any, params: any) => {
  const recursiveEncodeParams = (recParams: any, mutationName: string) => {
    for (const [key, value] of Object.entries(recParams)) {
      if (
        typeof value === "string" &&
        NEED_ENCODE_PARAM_KEYS.includes(`${mutationName}:${key}`)
      ) {
        recParams[key] = encodeURIComponent(value);
      } else if (value && typeof value === "object") {
        recursiveEncodeParams(value, mutationName);
      }
    }
  };

  if (statement) {
    // get mutaion name for special handler
    const r = /mutation\s(\w+)\s*\(/g;
    const res: any = r.exec(statement);
    if (res) {
      const mutationName = res[1];
      if (mutationName === "SPECIAL_MUTATION_NAME") {
        // For Special Mutation Handeler
      } else {
        recursiveEncodeParams(params, mutationName);
      }
    }
  }
  return params;
};

// Decode for AppSync query methods
export const decodeResData = (statement: any, resData: any) => {
  if (!resData) {
    return null;
  }

  // Function to extract the query name from the statement
  const getQueryName = (statement: string): string | null => {
    const match = /query\s(\w+)\s*\(/.exec(statement);
    return match ? match[1] : null;
  };

  // Recursive function to decode parameters in the response data
  const recursiveDecodeParams = (data: any, queryName: string) => {
    for (const [key, value] of Object.entries(data)) {
      if (
        typeof value === "string" &&
        NEED_DECODE_PARAM_KEYS.includes(`${queryName}:${key}`)
      ) {
        data[key] = decodeURIComponent(value.replaceAll("+", " "));
      } else if (value && typeof value === "object") {
        recursiveDecodeParams(value, queryName);
      }
    }
  };

  // Extract query name from the statement
  const queryName = statement ? getQueryName(statement) : null;

  // If query name exists and is not the special query name, decode the response data
  if (queryName && queryName !== "SPECIAL_QUERY_NAME") {
    recursiveDecodeParams(resData, queryName);
  }

  return resData;
};