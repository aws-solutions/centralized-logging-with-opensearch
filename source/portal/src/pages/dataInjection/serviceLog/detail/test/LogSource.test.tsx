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
import LogSource from "../LogSource";
import { MemoryRouter } from "react-router-dom";
import { renderWithProviders } from "test-utils";
import { AppStoreMockData } from "test/store.mock";
import { mockS3ServicePipelineData } from "test/servicelog.mock";
import { ServiceType } from "API";

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

describe("LogSource", () => {
  it("renders without error build s3", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSource
          pipelineInfo={mockS3ServicePipelineData}
          amplifyConfig={AppStoreMockData.amplifyConfig as any}
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

  it("renders without error build lambda", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSource
          pipelineInfo={{
            ...mockS3ServicePipelineData,
            type: ServiceType.Lambda,
          }}
          amplifyConfig={AppStoreMockData.amplifyConfig as any}
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

  it("renders without error build elb", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSource
          pipelineInfo={{
            ...mockS3ServicePipelineData,
            type: ServiceType.ELB,
          }}
          amplifyConfig={AppStoreMockData.amplifyConfig as any}
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

  it("renders without error build waf", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSource
          pipelineInfo={{
            ...mockS3ServicePipelineData,
            type: ServiceType.WAF,
          }}
          amplifyConfig={AppStoreMockData.amplifyConfig as any}
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

  it("renders without error build vpc", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSource
          pipelineInfo={{
            ...mockS3ServicePipelineData,
            type: ServiceType.VPC,
          }}
          amplifyConfig={AppStoreMockData.amplifyConfig as any}
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

  it("renders without error build cloudtrail", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSource
          pipelineInfo={{
            ...mockS3ServicePipelineData,
            type: ServiceType.CloudTrail,
          }}
          amplifyConfig={AppStoreMockData.amplifyConfig as any}
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

  it("renders without error build cloudfront", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSource
          pipelineInfo={{
            ...mockS3ServicePipelineData,
            type: ServiceType.CloudFront,
          }}
          amplifyConfig={AppStoreMockData.amplifyConfig as any}
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

  it("renders without error build config", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSource
          pipelineInfo={{
            ...mockS3ServicePipelineData,
            type: ServiceType.Config,
          }}
          amplifyConfig={AppStoreMockData.amplifyConfig as any}
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

  it("renders without error build rds", () => {
    renderWithProviders(
      <MemoryRouter>
        <LogSource
          pipelineInfo={{
            ...mockS3ServicePipelineData,
            type: ServiceType.RDS,
          }}
          amplifyConfig={AppStoreMockData.amplifyConfig as any}
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
