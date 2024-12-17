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
import EditLogConfig from "../EditLogConfig";
import { renderWithProviders } from "test-utils";
import { MemoryRouter, useParams } from "react-router-dom";
import { appSyncRequestQuery } from "assets/js/request";
import { mockConfigData } from "test/config.mock";
import { act } from "@testing-library/react";
import { LogConfFilterCondition } from "API";

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
}));

beforeEach(() => {
  const mockParams = { id: "xx-xx-xx" };
  // Make useParams return the mock parameters
  (useParams as any).mockReturnValue(mockParams);
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("EditLogConfig", () => {
  it("renders without errors", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/resources/log-config-create"]}>
        <EditLogConfig />
      </MemoryRouter>
    );
  });

  it("renders  with config  data", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getLogConfig: {
          ...mockConfigData,
          filterConfigMap: {
            enabled: true, // Add the 'enabled' property with a value of true
            filters: [
              {
                key: "field",
                condition: LogConfFilterCondition.Exclude,
                value: "value",
              },
            ],
          },
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter initialEntries={["/resources/log-config-create"]}>
          <EditLogConfig />
        </MemoryRouter>
      );
    });
  });
});
