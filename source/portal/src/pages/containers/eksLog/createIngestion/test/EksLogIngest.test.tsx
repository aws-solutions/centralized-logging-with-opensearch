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
import EksLogIngest from "../EksLogIngest";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { AppStoreMockData } from "test/store.mock";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { screen, act, fireEvent } from "@testing-library/react";
import { mockOpenSearchStateData } from "test/domain.mock";
import { MockSelectProcessorState } from "test/servicelog.mock";
import { MockAppLogDetailData } from "test/applog.mock";
import { mockConfigListResource } from "test/config.mock";

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
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("EksLogIngest", () => {
  it("renders without errors", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listAppPipelines: {
          appPipelines: [{ ...MockAppLogDetailData }],
          listLogConfigs: { logConfigs: mockConfigListResource, total: 1 },
        },
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { createAppLogIngestion: "OK" },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <EksLogIngest />
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

    // select pipeline
    const autocomplete = screen.getByPlaceholderText(
      "ekslog:ingest.specifyPipeline.selectPipeline"
    );
    // const input = within(autocomplete).getByRole("textbox");
    autocomplete.focus();
    // the value here can be any string you want, so you may also consider to
    // wrapper it as a function and pass in inputValue as parameter
    fireEvent.change(autocomplete, { target: { value: "t" } });
    fireEvent.keyDown(autocomplete, { key: "ArrowDown" });
    fireEvent.keyDown(autocomplete, { key: "Enter" });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-log-ingest-next"));
    });

    // input path
    const inputPath = screen.getByPlaceholderText(
      "/var/log/containers/<application_name>-*_<namespace>_<container_name>-*"
    );
    fireEvent.change(inputPath, {
      target: { value: "/var/log/containers/test-*" },
    });

    // click create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-log-ingest-create"));
    });
  });
});
