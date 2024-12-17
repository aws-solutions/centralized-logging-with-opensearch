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
import CreateWAF from "../CreateWAF";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { mockOpenSearchStateData } from "test/domain.mock";
import {
  MockGrafanaData,
  MockLightEngineData,
  MockSelectProcessorState,
  MockWAFList,
} from "test/servicelog.mock";
import { screen, act, fireEvent } from "@testing-library/react";

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

describe("CreateWAF", () => {
  it("renders with data for openSearch sample rate", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: MockWAFList,
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
            "/log-pipeline/service-log/create/waf?engineType=OPENSEARCH&ingestLogType=SampledRequest",
          ]}
        >
          <CreateWAF />
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
      fireEvent.click(screen.getByTestId("waf-next-button"));
    });
  });

  it("renders with data for openSearch full request", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: MockWAFList,
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
            "/log-pipeline/service-log/create/waf?engineType=OPENSEARCH&ingestLogType=FullRequest",
          ]}
        >
          <CreateWAF />
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

    // input manual waf id
    const manualWAFId = screen.getByPlaceholderText("servicelog:waf.inputWAF");
    fireEvent.change(manualWAFId, {
      target: { value: "waf-1" },
    });

    // input s3 log bucket name
    const logBucketName = screen.getByPlaceholderText("s3://bucket/prefix");
    fireEvent.change(logBucketName, {
      target: { value: "s3://test-bucket/prefix" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("waf-next-button"));
    });

    // input shard number
    const shardNum = screen.getByPlaceholderText(
      "servicelog:cluster.inputShardNum"
    );
    fireEvent.change(shardNum, { target: { value: 1 } });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("waf-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("waf-next-button"));
    });

    // click create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("waf-create-button"));
    });
  });

  it("renders with data for light-engine", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: MockWAFList,
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
            "/log-pipeline/service-log/create/waf?engineType=LIGHT_ENGINE&&ingestLogType=FullRequest",
          ]}
        >
          <CreateWAF />
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

    // input manual waf id
    const manualWAFId = screen.getByPlaceholderText("servicelog:waf.inputWAF");
    fireEvent.change(manualWAFId, {
      target: { value: "waf-1" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("waf-next-button"));
    });

    // input s3 log bucket name
    const logBucketName = screen.getByPlaceholderText("s3://bucket/prefix");
    fireEvent.change(logBucketName, {
      target: { value: "s3://test-bucket/prefix" },
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("waf-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("waf-next-button"));
    });

    // click create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("waf-create-button"));
    });
  });
});
