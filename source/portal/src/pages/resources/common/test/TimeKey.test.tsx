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
import TimeKey from "../TimeKey";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { INIT_CONFIG_DATA } from "reducer/createLogConfig";

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

describe("TimeKey", () => {
  it("renders without errors", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/resources/log-config-create"]}>
        <TimeKey />
      </MemoryRouter>
    );
  });

  it("render with regex key list", () => {
    renderWithProviders(
      <MemoryRouter>
        <TimeKey />
      </MemoryRouter>,
      {
        preloadedState: {
          logConfig: {
            ...INIT_CONFIG_DATA,
            regexKeyList: [
              {
                key: "time",
                type: "date",
                format: "",
                value: "",
                loadingCheck: false,
                showError: false,
                error: "",
                showSuccess: false,
              },
              {
                key: "text",
                type: "text",
                format: "",
                value: "",
                loadingCheck: true,
                showError: false,
                error: "",
                showSuccess: false,
              },
            ],
            data: {
              ...INIT_CONFIG_DATA.data,
              regexFieldSpecs: [
                { __typename: "RegularSpec", key: "time", type: "text" },
              ],
            },
          },
        },
      }
    );
  });

  it("should render with data", async () => {});
});
