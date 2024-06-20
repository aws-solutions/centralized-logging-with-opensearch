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

import React from "react";
import ConfigDetailComps from "../ConfigDetailComps";
import { renderWithProviders } from "test-utils";
import { MemoryRouter, useParams } from "react-router-dom";
import { INIT_CONFIG_DATA } from "reducer/createLogConfig";
import { LogType, MultiLineLogParser, SyslogParser } from "API";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => {
    return {
      t: (key: any) => key,
      i18n: {
        changeLanguage: jest.fn(),
      },
    };
  },
  initReactI18next: {
    type: "3rdParty",
    init: jest.fn(),
  },
}));

beforeEach(() => {
  const mockParams = { id: "xx-xx-xx" };
  // Make useParams return the mock parameters
  (useParams as any).mockReturnValue(mockParams);
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("ConfigDetailComps", () => {
  it("renders without errors with init config", () => {
    const { getByText } = renderWithProviders(
      <MemoryRouter initialEntries={["/resources/log-config-create"]}>
        <ConfigDetailComps curLogConfig={{ ...INIT_CONFIG_DATA.data }} />
      </MemoryRouter>
    );
    expect(getByText(/resource:config.detail.sampleLog/i)).toBeInTheDocument();
  });

  it("renders without errors with json", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/resources/log-config-create"]}>
        <ConfigDetailComps
          curLogConfig={{
            ...INIT_CONFIG_DATA.data,
            userSampleLog: '{"a":1,"b":2}',
            logType: LogType.JSON,
          }}
        />
      </MemoryRouter>
    );
  });

  it("renders without errors with json and schema", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/resources/log-config-create"]}>
        <ConfigDetailComps
          curLogConfig={{
            ...INIT_CONFIG_DATA.data,
            userSampleLog: '{"a":1,"b":2}',
            logType: LogType.JSON,
            jsonSchema:
              '{"type":"object","properties":{"TimeWritten":{"type":"string"},"EventCategory":{"type":"number"},"TimeGenerated":{"format":"%Y-%m-%d %H:%M:%S %z","timeKey":true,"type":"string"},"Message":{"type":"string"},"EventType":{"type":"string"},"Channel":{"type":"string"},"SourceName":{"type":"string"},"Data":{"type":"string"},"Sid":{"type":"string"},"ComputerName":{"type":"string"},"StringInserts":{"type":"array","items":{"type":"string"}},"EventID":{"type":"number"},"Qualifiers":{"type":"number"},"RecordNumber":{"type":"number"}}}',
          }}
        />
      </MemoryRouter>
    );
  });

  it("renders without errors with apache", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/resources/log-config-create"]}>
        <ConfigDetailComps
          curLogConfig={{
            ...INIT_CONFIG_DATA.data,
            userSampleLog: '{"a":1,"b":2}',
            logType: LogType.JSON,
          }}
        />
      </MemoryRouter>
    );
  });

  it("renders without errors with Apache", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/resources/log-config-create"]}>
        <ConfigDetailComps
          curLogConfig={{
            ...INIT_CONFIG_DATA.data,
            logType: LogType.Apache,
          }}
        />
      </MemoryRouter>
    );
  });

  it("renders without errors with Nginx", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/resources/log-config-create"]}>
        <ConfigDetailComps
          curLogConfig={{
            ...INIT_CONFIG_DATA.data,
            logType: LogType.Nginx,
          }}
        />
      </MemoryRouter>
    );
  });

  it("renders without errors with springboot", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/resources/log-config-create"]}>
        <ConfigDetailComps
          curLogConfig={{
            ...INIT_CONFIG_DATA.data,
            logType: LogType.MultiLineText,
            multilineLogParser: MultiLineLogParser.JAVA_SPRING_BOOT,
          }}
        />
      </MemoryRouter>
    );
  });

  it("renders without errors with custom syslog", () => {
    const { getByText } = renderWithProviders(
      <MemoryRouter initialEntries={["/resources/log-config-create"]}>
        <ConfigDetailComps
          curLogConfig={{
            ...INIT_CONFIG_DATA.data,
            logType: LogType.Syslog,
            syslogParser: SyslogParser.CUSTOM,
          }}
        />
      </MemoryRouter>
    );
    expect(getByText(/resource:config.detail.sampleLog/i)).toBeInTheDocument();
    expect(
      getByText(/resource:config.detail.syslogFormat/i)
    ).toBeInTheDocument();
  });
});
