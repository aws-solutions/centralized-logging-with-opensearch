// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { ExLogConf } from "pages/resources/common/LogConfigComp";

export const logConfigMockData = {
  id: "xxxx",
  version: 14,
  createdAt: "2024-05-09T08:34:13Z",
  name: "nginx-test",
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
    "%28%3F%3Cremote_addr%3E%5CS%2B%29%5Cs%2B-%5Cs%2B%28%3F%3Cremote_user%3E%5CS%2B%29%5Cs%2B%5C%5B%28%3F%3Ctime_local%3E%5Cd%2B%2F%5CS%2B%2F%5Cd%2B%3A%5Cd%2B%3A%5Cd%2B%3A%5Cd%2B%5Cs%2B%5CS%2B%29%5C%5D%5Cs%2B%22%28%3F%3Crequest_method%3E%5CS%2B%29%5Cs%2B%28%3F%3Crequest_uri%3E%5CS%2B%29%5Cs%2B%5CS%2B%22%5Cs%2B%28%3F%3Cstatus%3E%5CS%2B%29%5Cs%2B%28%3F%3Cbody_bytes_sent%3E%5CS%2B%29%5Cs%2B%22%28%3F%3Chttp_referer%3E%5B%5E%22%5D*%29%22%5Cs%2B%22%28%3F%3Chttp_user_agent%3E%5B%5E%22%5D*%29%22%5Cs%2B%22%28%3F%3Chttp_x_forwarded_for%3E%5B%5E%22%5D*%29%22.*",
  jsonSchema: null,
  regexFieldSpecs: [
    {
      key: "remote_addr",
      type: "ip",
      format: null,
      __typename: "RegularSpec",
    },
    {
      key: "remote_user",
      type: "text",
      format: null,
      __typename: "RegularSpec",
    },
    {
      key: "time_local",
      type: "date",
      format: "%d/%b/%Y:%H:%M:%S %z",
      __typename: "RegularSpec",
    },
    {
      key: "request_method",
      type: "keyword",
      format: null,
      __typename: "RegularSpec",
    },
    {
      key: "request_uri",
      type: "text",
      format: null,
      __typename: "RegularSpec",
    },
    {
      key: "status",
      type: "keyword",
      format: null,
      __typename: "RegularSpec",
    },
    {
      key: "body_bytes_sent",
      type: "long",
      format: null,
      __typename: "RegularSpec",
    },
    {
      key: "http_referer",
      type: "text",
      format: null,
      __typename: "RegularSpec",
    },
    {
      key: "http_user_agent",
      type: "text",
      format: null,
      __typename: "RegularSpec",
    },
    {
      key: "http_x_forwarded_for",
      type: "text",
      format: null,
      __typename: "RegularSpec",
    },
  ],
  timeKey: "",
  timeOffset: "",
  timeKeyRegex: "",
  userLogFormat:
    "log_format++main++%27%24remote_addr+-+%24remote_user+%5B%24time_local%5D+%22%24request%22+%27%0A%27%24status+%24body_bytes_sent+%22%24http_referer%22+%27%0A%27%22%24http_user_agent%22+%22%24http_x_forwarded_for%22%27%3B",
  userSampleLog:
    "127.0.0.1+-+-+%5B24%2FDec%2F2021%3A01%3A27%3A11+%2B0000%5D+%22GET+%2F+HTTP%2F1.1%22+200+3520+%22-%22+%22curl%2F7.79.1%22+%22-%22",
  description: "A new version of test mock",
  __typename: "LogConfig",
} as ExLogConf;
