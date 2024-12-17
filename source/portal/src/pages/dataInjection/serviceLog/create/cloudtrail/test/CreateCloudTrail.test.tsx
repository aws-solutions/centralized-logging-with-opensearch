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
import CreateCloudTrail from "../CreateCloudTrail";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { screen, act, fireEvent, within } from "@testing-library/react";
import { mockOpenSearchStateData } from "test/domain.mock";
import {
  MockCloudTrailList,
  MockGrafanaData,
  MockLightEngineData,
  MockSelectProcessorState,
} from "test/servicelog.mock";

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

describe("CreateCloudTrail", () => {
  it("renders with data for openSearch", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: MockCloudTrailList,
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
            "/log-pipeline/service-log/create/cloudtrail?engineType=OPENSEARCH&ingestLogType=S3",
          ]}
        >
          <CreateCloudTrail />
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

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // change to manual mode
    const manualModeOption = screen.getByText("servicelog:create.manual");
    fireEvent.click(manualModeOption);

    // input manual distribution id
    const manualDistributionId = screen.getByPlaceholderText(
      "example-cloudtrail-name"
    );
    fireEvent.change(manualDistributionId, {
      target: { value: "cloudtrail-1" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // input s3 log bucket name
    const logBucketName = screen.getByPlaceholderText("s3://bucket/prefix");
    fireEvent.change(logBucketName, {
      target: { value: "s3://test-bucket/prefix" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // input shard number
    const shardNum = screen.getByPlaceholderText(
      "servicelog:cluster.inputShardNum"
    );
    fireEvent.change(shardNum, { target: { value: 1 } });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // click create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-create-button"));
    });
  });

  it("renders with data for openSearch cloudwatch no auto scaling", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: MockCloudTrailList,
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
            "/log-pipeline/service-log/create/cloudtrail?engineType=OPENSEARCH&ingestLogType=CloudWatch",
          ]}
        >
          <CreateCloudTrail />
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

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // change to manual mode
    const manualModeOption = screen.getByText("servicelog:create.manual");
    fireEvent.click(manualModeOption);

    // input manual distribution id
    const manualDistributionId = screen.getByPlaceholderText(
      "example-cloudtrail-name"
    );
    fireEvent.change(manualDistributionId, {
      target: { value: "cloudtrail-1" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // input s3 log group name
    const logBucketName = screen.getByPlaceholderText("log-group-name");
    fireEvent.change(logBucketName, {
      target: { value: "test-group" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // input shard number
    const shardNum = screen.getByPlaceholderText(
      "servicelog:cluster.inputShardNum"
    );
    fireEvent.change(shardNum, { target: { value: 1 } });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // click create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-create-button"));
    });
  });

  it("renders with data for openSearch cloudwatch enable auto scaling", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: MockCloudTrailList,
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
            "/log-pipeline/service-log/create/cloudtrail?engineType=OPENSEARCH&ingestLogType=CloudWatch",
          ]}
        >
          <CreateCloudTrail />
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

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // change to manual mode
    const manualModeOption = screen.getByText("servicelog:create.manual");
    fireEvent.click(manualModeOption);

    // input manual distribution id
    const manualDistributionId = screen.getByPlaceholderText(
      "example-cloudtrail-name"
    );
    fireEvent.change(manualDistributionId, {
      target: { value: "cloudtrail-1" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // input s3 log group name
    const logBucketName = screen.getByPlaceholderText("log-group-name");
    fireEvent.change(logBucketName, {
      target: { value: "test-group" },
    });

    // select auto scaling
    const autoScaling = screen.getByRole("button", {
      name: /no/i,
    });
    await act(async () => {
      fireEvent.mouseDown(autoScaling);
    });

    const autoScalingType = within(document.body).getByRole("listbox");
    const enableAutoScaling = await within(autoScalingType).findByText(/yes/i);
    fireEvent.click(enableAutoScaling);

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });
  });

  it("renders with data for light-engine", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: MockCloudTrailList,
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
            "/log-pipeline/service-log/create/cloudtrail?engineType=LIGHT_ENGINE&ingestLogType=S3",
          ]}
        >
          <CreateCloudTrail />
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

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // change to manual mode
    const manualModeOption = screen.getByText("servicelog:create.manual");
    fireEvent.click(manualModeOption);

    // input manual distribution id
    const manualDistributionId = screen.getByPlaceholderText(
      "example-cloudtrail-name"
    );
    fireEvent.change(manualDistributionId, {
      target: { value: "cloudtrail-1" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // input s3 log bucket name
    const logBucketName = screen.getByPlaceholderText("s3://bucket/prefix");
    fireEvent.change(logBucketName, {
      target: { value: "s3://test-bucket/prefix" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-next-button"));
    });

    // click create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-create-button"));
    });

    // click previous button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-previous-button"));
    });

    // click cancel button
    await act(async () => {
      fireEvent.click(screen.getByTestId("cloudtrail-cancel-button"));
    });
  });
});
