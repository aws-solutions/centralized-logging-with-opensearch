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
import { AppStoreMockData } from "test/store.mock";
import { MemoryRouter } from "react-router-dom";
import CreateCloudFront from "../CreateCloudFront";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import {
  MockCloudFrontList,
  MockGrafanaData,
  MockLightEngineData,
  MockSelectProcessorState,
} from "test/servicelog.mock";
import { screen, act, fireEvent } from "@testing-library/react";
import { mockOpenSearchStateData } from "test/domain.mock";

// Mock SelectLogProcessor
jest.mock("pages/comps/processor/SelectLogProcessor", () => {
  return {
    __esModule: true,
    default: () => <div>SelectLogProcessor</div>,
  };
});

jest.mock(
  "pages/dataInjection/serviceLog/create/common/ConfigLightEngine",
  () => {
    return {
      __esModule: true,
      default: () => <div>ConfigLightEngine</div>,
      covertSvcTaskToLightEngine: jest.fn(),
    };
  }
);

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
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
}));

describe("CreateCloudFront", () => {
  it("renders with data for openSearch", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: MockCloudFrontList,
        checkOSIAvailability: true,
        getAccountUnreservedConurrency: 1000,
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { createPipelineParams: "OK" },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter
          initialEntries={[
            "/log-pipeline/service-log/create/cloudfront?engineType=OPENSEARCH&ingestLogType=S3",
          ]}
        >
          <CreateCloudFront />
        </MemoryRouter>,
        {
          preloadedState: {
            app: {
              ...AppStoreMockData,
            },
            openSearch: {
              ...mockOpenSearchStateData,
            },
            selectProcessor: {
              ...MockSelectProcessorState,
            },
          },
        }
      );
    });

    // change to manual mode
    const manualModeOption = screen.getByText("servicelog:create.manual");
    fireEvent.click(manualModeOption);

    // input manual distribution id
    const manualDistributionId = screen.getByPlaceholderText(
      "servicelog:cloudfront.distributionIdPlace"
    );
    fireEvent.change(manualDistributionId, {
      target: { value: "cloudfront1" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudfront-next-button"));
    });

    // input s3 log bucket name
    const logBucketName = screen.getByPlaceholderText("s3://bucket/prefix");
    fireEvent.change(logBucketName, {
      target: { value: "s3://test-bucket/prefix" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudfront-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudfront-next-button"));
    });

    // input shard number
    const shardNum = screen.getByPlaceholderText(
      "servicelog:cluster.inputShardNum"
    );
    fireEvent.change(shardNum, { target: { value: 1 } });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudfront-next-button"));
    });

    // check enrich
    const enrich = screen.getByRole("checkbox", {
      name: /servicelog:cloudfront.location/i,
    });
    fireEvent.click(enrich);

    // check os agent
    const osAgent = screen.getByRole("checkbox", {
      name: /servicelog:cloudfront.osAgent/i,
    });
    fireEvent.click(osAgent);

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudfront-next-button"));
    });

    // click create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudfront-create-button"));
    });
  });

  it("renders with data for openSearch kds", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: MockCloudFrontList,
        checkOSIAvailability: true,
        getAccountUnreservedConurrency: 1000,
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { createPipelineParams: "OK" },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter
          initialEntries={[
            "/log-pipeline/service-log/create/cloudfront?engineType=OPENSEARCH&ingestLogType=KDS",
          ]}
        >
          <CreateCloudFront />
        </MemoryRouter>,
        {
          preloadedState: {
            app: {
              ...AppStoreMockData,
            },
            openSearch: {
              ...mockOpenSearchStateData,
            },
            selectProcessor: {
              ...MockSelectProcessorState,
            },
          },
        }
      );
    });

    // change to manual mode
    const manualModeOption = screen.getByText("servicelog:create.manual");
    fireEvent.click(manualModeOption);

    // input manual distribution id
    const manualDistributionId = screen.getByPlaceholderText(
      "servicelog:cloudfront.distributionIdPlace"
    );
    fireEvent.change(manualDistributionId, {
      target: { value: "cloudfront1" },
    });

    // input s3 log bucket name
    const logBucketName = screen.getByPlaceholderText("s3://bucket/prefix");
    fireEvent.change(logBucketName, {
      target: { value: "s3://test-bucket/prefix" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudfront-next-button"));
    });
  });

  it("renders with data for light-engine", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: MockCloudFrontList,
        checkOSIAvailability: true,
        getAccountUnreservedConurrency: 1000,
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { createLightEngineServicePipeline: "OK" },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter
          initialEntries={[
            "/log-pipeline/service-log/create/cloudfront?engineType=LIGHT_ENGINE",
          ]}
        >
          <CreateCloudFront />
        </MemoryRouter>,
        {
          preloadedState: {
            app: {
              ...AppStoreMockData,
            },
            openSearch: {
              ...mockOpenSearchStateData,
            },
            selectProcessor: {
              ...MockSelectProcessorState,
            },
            grafana: {
              ...MockGrafanaData,
            },
            createLightEngine: {
              ...MockLightEngineData,
            },
          },
        }
      );
    });

    // change to manual mode
    const manualModeOption = screen.getByText("servicelog:create.manual");
    fireEvent.click(manualModeOption);

    // input manual distribution id
    const manualDistributionId = screen.getByPlaceholderText(
      "servicelog:cloudfront.distributionIdPlace"
    );
    fireEvent.change(manualDistributionId, {
      target: { value: "cloudfront1" },
    });

    // input s3 log bucket name
    const logBucketName = screen.getByPlaceholderText("s3://bucket/prefix");
    fireEvent.change(logBucketName, {
      target: { value: "s3://test-bucket/prefix" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudfront-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudfront-next-button"));
    });

    // check enrich
    const enrich = screen.getByRole("checkbox", {
      name: /servicelog:cloudfront.location/i,
    });
    fireEvent.click(enrich);

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudfront-next-button"));
    });

    // click create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudfront-create-button"));
    });
  });
});
