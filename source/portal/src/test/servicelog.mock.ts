/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { ServiceType } from "API";
import { CreateLogMethod } from "assets/js/const";
import { MONITOR_ALARM_INIT_DATA } from "assets/js/init";
import { S3SourceType } from "pages/dataInjection/serviceLog/create/cloudtrail/steps/comp/SourceType";
import { INIT_OPENSEARCH_DATA } from "reducer/createOpenSearch";
import { CloudFrontFieldType, YesNo } from "types";

export const cloudFrontMockData = {
  type: ServiceType.CloudFront,
  source: "",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: "",
  params: {
    logBucketName: "",
    cloudFrontObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketS3Path: "",
    manualBucketName: "",
    logBucketPrefix: "",

    geoPlugin: false,
    userAgentPlugin: false,

    userIsConfirmed: false,
    fieldType: CloudFrontFieldType.ALL,
    customFields: [],
    samplingRate: "1",
    shardCount: "1",
    minCapacity: "1",
    enableAutoScaling: YesNo.No,
    maxCapacity: "1",

    tmpFlowList: [],
    s3SourceType: S3SourceType.NONE,
    successTextType: "",
    ...INIT_OPENSEARCH_DATA,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
};
