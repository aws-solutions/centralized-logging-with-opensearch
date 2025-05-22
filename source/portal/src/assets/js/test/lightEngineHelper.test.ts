// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { createLightEngineApplicationPipeline } from "../helpers/lightEngineHelper";
import { appSyncRequestMutation } from "../request";
import { createLightEngineAppPipeline } from "graphql/mutations";

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
}));

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
}));

jest.mock("lodash", () => ({
  cloneDeep: jest.fn().mockImplementation((x) => x),
}));

describe("createLightEngineApplicationPipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call appSyncRequestMutation with the correct parameters", async () => {
    const lightEngine: any = {
      sampleDashboard: "Yes",
      grafanaId: "xxxx-xxxx",
      grafanaIdError: "",
      centralizedBucketName: "xxxx-xxxxxx",
      centralizedBucketNameError: "",
      logArchiveSchedule: "cron(0 2 * * ? *)",
      logArchiveScheduleError: "",
      logMergerSchedule: "cron(0 1 * * ? *)",
      logMergerScheduleError: "",
      logProcessorScheduleError: "",
      logArchiveAge: 180,
      logArchiveAgeError: "",
      logMergerAge: 7,
      logMergerAgeError: "",
      centralizedTableName: "test",
      centralizedTableNameError: "",
      logProcessorScheduleTime: 5,
      logProcessorScheduleScale: "minutes",
      logProcessorScheduleExpError: "",
    };
    const s3BufferData = {
      s3BufferBucketObj: {
        name: "xxxx-xxx",
        value: "xxxx-xxx",
      },
      logBucketError: "",
      logBucketPrefixError: "",
      bufferSizeError: "",
      bufferIntervalError: "",
      data: {
        logBucketName: "xxxx-xxx",
        logBucketPrefix: "",
        logBucketSuffix: "",
        defaultCmkArn: "arn:aws:kms:us-east-1:xxxxx:key/xxxxxx",
        maxFileSize: "50",
        uploadTimeout: "60",
        compressionType: "GZIP",
        s3StorageClass: "INTELLIGENT_TIERING",
      },
    };
    const logConfigObj: any = {
      id: "04fbb057-b5ee-4f82-887b-024c426556f3",
      version: 1,
      createdAt: "2024-01-23T09:30:46Z",
      name: "test-nginx-log",
      logType: "Nginx",
      syslogParser: null,
      multilineLogParser: null,
      iisLogParser: null,
      filterConfigMap: {
        enabled: false,
        filters: [],
        __typename: "ProcessorFilterRegex",
      },
      regex:
        '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+\\s+\\S+)\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
      jsonSchema: null,
      regexFieldSpecs: [],
      timeKey: "",
      timeOffset: "",
      timeKeyRegex: "",
      userLogFormat:
        'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n                      \'$status $body_bytes_sent "$http_referer" \'\n                      \'"$http_user_agent" "$http_x_forwarded_for"\';',
      userSampleLog:
        '127.0.0.1 - - [23/Jan/2024:09:29:30 +0000] "GET / HTTP/1.1" 200 615 "-" "curl/8.3.0" "-"',
      __typename: "LogConfig",
    };
    const monitor: any = {
      isConfirmed: false,
      snsObj: null,
      topicCheckOption: "chooseExistTopic",
      selectExistSNSError: "",
      snsTopicError: "",
      snsEmailError: "",
      monitor: {
        status: "ENABLED",
        pipelineAlarmStatus: "DISABLED",
        snsTopicName: "",
        snsTopicArn: "",
        emails: "",
      },
    };
    const tags = [{ key: "Environment", value: "Production" }];

    const expectedParams = {
      logConfigId: "04fbb057-b5ee-4f82-887b-024c426556f3",
      logConfigVersionNumber: 1,
      force: false,
      monitor: {
        status: "ENABLED",
        pipelineAlarmStatus: "DISABLED",
        snsTopicName: "",
        snsTopicArn: "",
        emails: "",
      },
      logStructure: "FLUENT_BIT_PARSED_JSON",
      tags: [
        {
          key: "Environment",
          value: "Production",
        },
      ],
      bufferParams: [
        {
          paramKey: "compressionType",
          paramValue: "GZIP",
        },
        {
          paramKey: "logBucketPrefix",
          paramValue: "LightEngine/AppLogs/test",
        },
      ],
      params: {
        centralizedBucketName: "xxxx-xxxxxx",
        centralizedBucketPrefix: "datalake",
        centralizedTableName: "test",
        logProcessorSchedule: "rate(5 minutes)",
        logMergerSchedule: "cron(0 1 * * ? *)",
        logArchiveSchedule: "cron(0 2 * * ? *)",
        logMergerAge: "7",
        logArchiveAge: "180",
        importDashboards: "true",
        grafanaId: "xxxx-xxxx",
        recipients: "",
      },
    };

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { createLightEngineAppPipeline: "success" },
    });

    await createLightEngineApplicationPipeline(
      lightEngine,
      s3BufferData,
      logConfigObj,
      monitor,
      tags
    );

    expect(appSyncRequestMutation).toHaveBeenCalledWith(
      createLightEngineAppPipeline,
      expectedParams
    );
  });
});
