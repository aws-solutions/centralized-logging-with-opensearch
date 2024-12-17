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
