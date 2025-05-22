// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const mockConfigData = {
  id: "xxxx",
  version: 1,
  createdAt: "2024-01-24T09:00:53Z",
  name: "test-json-config",
  logType: "JSON",
  syslogParser: null,
  multilineLogParser: null,
  iisLogParser: null,
  filterConfigMap: {
    enabled: false,
    filters: [],
    __typename: "ProcessorFilterRegex",
  },
  regex: "",
  jsonSchema:
    '{"format":"","type":"object","properties":{"a":{"format":"","type":"integer"},"b":{"format":"","type":"string"},"c":{"format":"%Y","timeKey":true,"type":"date"}}}',
  regexFieldSpecs: [
    {
      key: "a",
      type: "integer",
      format: null,
      __typename: "RegularSpec",
    },
    {
      key: "b",
      type: "string",
      format: null,
      __typename: "RegularSpec",
    },
    {
      key: "c",
      type: "date",
      format: "%Y",
      __typename: "RegularSpec",
    },
  ],
  timeKey: "time",
  timeOffset: "-0800",
  timeKeyRegex: "",
  userLogFormat: "",
  userSampleLog: '{"a":"b"}',
  __typename: "LogConfig",
};

export const mockConfigListResource = [{ ...mockConfigData }];
