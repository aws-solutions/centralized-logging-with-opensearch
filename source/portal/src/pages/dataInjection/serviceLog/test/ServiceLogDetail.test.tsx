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
import { renderWithProviders } from "test-utils";
import { MemoryRouter, useParams } from "react-router-dom";
import ServiceLogDetail from "../ServiceLogDetail";
import { act } from "@testing-library/react";
import { appSyncRequestQuery } from "assets/js/request";
import { mockServiceLogDetailData } from "test/servicelog.mock";
import { DestinationType, ServiceType } from "API";

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

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
}));

beforeEach(() => {
  const mockParams = { id: "xxxx", version: "1" };
  // Make useParams return the mock parameters
  (useParams as any).mockReturnValue(mockParams);
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("ServiceLogDetail", () => {
  it("renders with data s3", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getServicePipeline: { ...mockServiceLogDetailData },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ServiceLogDetail />
        </MemoryRouter>
      );
    });
  });

  it("renders with data cloudtrail", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getServicePipeline: {
          ...mockServiceLogDetailData,
          type: ServiceType.CloudTrail,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ServiceLogDetail />
        </MemoryRouter>
      );
    });
  });

  it("renders with data cloudfront", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getServicePipeline: {
          ...mockServiceLogDetailData,
          type: ServiceType.CloudFront,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ServiceLogDetail />
        </MemoryRouter>
      );
    });
  });

  it("renders with data cloudfront kds", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getServicePipeline: {
          ...mockServiceLogDetailData,
          type: ServiceType.CloudFront,
          destinationType: DestinationType.KDS,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ServiceLogDetail />
        </MemoryRouter>
      );
    });
  });

  it("renders with data elb", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getServicePipeline: {
          ...mockServiceLogDetailData,
          type: ServiceType.ELB,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ServiceLogDetail />
        </MemoryRouter>
      );
    });
  });

  it("renders with data waf", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getServicePipeline: {
          ...mockServiceLogDetailData,
          type: ServiceType.WAF,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ServiceLogDetail />
        </MemoryRouter>
      );
    });
  });

  it("renders with data vpc", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getServicePipeline: {
          ...mockServiceLogDetailData,
          type: ServiceType.VPC,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ServiceLogDetail />
        </MemoryRouter>
      );
    });
  });

  it("renders with data config", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getServicePipeline: {
          ...mockServiceLogDetailData,
          type: ServiceType.Config,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ServiceLogDetail />
        </MemoryRouter>
      );
    });
  });

  it("renders with data rds", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getServicePipeline: {
          ...mockServiceLogDetailData,
          type: ServiceType.RDS,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ServiceLogDetail />
        </MemoryRouter>
      );
    });
  });

  it("renders with data lambda", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getServicePipeline: {
          ...mockServiceLogDetailData,
          type: ServiceType.Lambda,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ServiceLogDetail />
        </MemoryRouter>
      );
    });
  });
});
