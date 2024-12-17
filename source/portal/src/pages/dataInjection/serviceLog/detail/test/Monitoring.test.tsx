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
import { screen, act, fireEvent } from "@testing-library/react";
import Monitoring from "../Monitoring";
import { mockS3ServicePipelineData } from "test/servicelog.mock";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { DestinationType, ServiceType } from "API";

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

jest.mock("react-apexcharts", () => ({
  __esModule: true,
  default: () => <div />,
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("Monitoring", () => {
  it("renders without not active", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Monitoring
            pipelineInfo={{
              ...mockS3ServicePipelineData,
              status: "Inprogress",
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders without error with s3", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Monitoring pipelineInfo={mockS3ServicePipelineData} />
        </MemoryRouter>
      );
    });
    const refreshButton = screen.getByTestId("refresh-button");
    expect(refreshButton).toBeInTheDocument();
    fireEvent.click(refreshButton);
  });

  it("renders without error with rds", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Monitoring
            pipelineInfo={{
              ...mockS3ServicePipelineData,
              type: ServiceType.RDS,
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders without error with vpc", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Monitoring
            pipelineInfo={{
              ...mockS3ServicePipelineData,
              type: ServiceType.VPC,
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders without error with vpc cloudwatch", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Monitoring
            pipelineInfo={{
              ...mockS3ServicePipelineData,
              type: ServiceType.VPC,
              destinationType: DestinationType.CloudWatch,
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders without error with vpc cloudfront", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Monitoring
            pipelineInfo={{
              ...mockS3ServicePipelineData,
              type: ServiceType.CloudFront,
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders without error with vpc cloudfront kds", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Monitoring
            pipelineInfo={{
              ...mockS3ServicePipelineData,
              type: ServiceType.CloudFront,
              destinationType: DestinationType.KDS,
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders without error with lambda", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Monitoring
            pipelineInfo={{
              ...mockS3ServicePipelineData,
              type: ServiceType.Lambda,
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders without error with cloudtrail", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Monitoring
            pipelineInfo={{
              ...mockS3ServicePipelineData,
              type: ServiceType.CloudTrail,
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders without error with cloudtrail cloudwatch", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Monitoring
            pipelineInfo={{
              ...mockS3ServicePipelineData,
              type: ServiceType.CloudTrail,
              destinationType: DestinationType.CloudWatch,
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders without error with waf", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Monitoring
            pipelineInfo={{
              ...mockS3ServicePipelineData,
              type: ServiceType.WAF,
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders without error with waf sampled", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <Monitoring
            pipelineInfo={{
              ...mockS3ServicePipelineData,
              type: ServiceType.WAFSampled,
            }}
          />
        </MemoryRouter>
      );
    });
  });
});
