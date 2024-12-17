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
import { MemoryRouter } from "react-router-dom";
import ServiceLog from "../ServiceLog";
import { screen, fireEvent, act } from "@testing-library/react";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { mockS3ServicePipelineData } from "test/servicelog.mock";

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

describe("ServiceLog", () => {
  it("renders without errors", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listServicePipelines: {
          pipelines: [{ ...mockS3ServicePipelineData }],
          total: 1,
        },
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { deleteServicePipeline: "OK" },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ServiceLog />
        </MemoryRouter>
      );
    });

    // click instance item
    await act(async () => {
      fireEvent.click(screen.getByTestId("table-item-xxxx"));
    });

    // click view detail button
    await act(async () => {
      fireEvent.click(screen.getByTestId("svc-log-actions"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("create-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-delete-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("cancel-delete-button"));
    });
  });

  it("renders without errors with refresh", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listServicePipelines: {
          pipelines: [{ ...mockS3ServicePipelineData }],
          total: 1,
        },
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { deleteServicePipeline: "OK" },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ServiceLog />
        </MemoryRouter>
      );
    });

    // click refresh button
    await act(async () => {
      fireEvent.click(screen.getByTestId("refresh-button"));
    });
  });
});
