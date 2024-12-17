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
import LogSourceAlarm from "../LogSourceAlarm";
import { MemoryRouter } from "react-router-dom";
import { renderWithProviders } from "test-utils";
import { AppStoreMockData } from "test/store.mock";
import { LogSourceType } from "API";

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
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("LogSourceAlarm", () => {
  it("renders without crashing esk", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSourceAlarm
          loadingData={false}
          flbSourceAlarmList={[
            {
              name: "test",
              sourceType: LogSourceType.EKSCluster,
              resourceId: "test",
              status: "",
            },
          ]}
        />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
  });

  it("renders without crashing ec2", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSourceAlarm
          loadingData={false}
          flbSourceAlarmList={[
            {
              name: "test",
              sourceType: LogSourceType.EC2,
              resourceId: "test",
              status: "",
            },
          ]}
        />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
  });

  it("renders without crashing s3", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSourceAlarm
          loadingData={false}
          flbSourceAlarmList={[
            {
              name: "test",
              sourceType: LogSourceType.S3,
              resourceId: "test",
              status: "",
            },
          ]}
        />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
  });

  it("renders without crashing syslog", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSourceAlarm
          loadingData={false}
          flbSourceAlarmList={[
            {
              name: "test",
              sourceType: LogSourceType.Syslog,
              resourceId: "test",
              status: "",
            },
          ]}
        />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
  });

  it("renders without crashing without type", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSourceAlarm
          loadingData={false}
          flbSourceAlarmList={[
            {
              name: "test",
              sourceType: "",
              resourceId: "test",
              status: "",
            },
          ]}
        />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
  });
});
