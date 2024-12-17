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
import SelectLogProcessor from "../SelectLogProcessor";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { AppStoreMockData } from "test/store.mock";
import { LogProcessorType } from "reducer/selectProcessor";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { act } from "@testing-library/react";

jest.mock("react-i18next", () => ({
  Trans: ({ children }: any) => children,
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

describe("SelectLogProcessor", () => {
  it("renders without errors for lambda", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getAccountUnreservedConurrency: 800,
      },
    });
    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        checkOSIAvailability: true,
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SelectLogProcessor supportOSI={true} />
        </MemoryRouter>,
        {
          preloadedState: {
            app: {
              ...AppStoreMockData,
            },
            selectProcessor: {
              serviceAvailable: true,
              serviceAvailableChecked: true,
              serviceAvailableCheckedLoading: false,
              logProcessorType: LogProcessorType.LAMBDA,
              logProcessorConcurrency: "200",
              minOCU: "1",
              maxOCU: "4",
              logProcessorConcurrencyError: "",
              minOCUError: "1",
              maxOCUError: "10",
              unreservedAccountConcurrency: "10",
            },
          },
        }
      );
    });
  });

  it("renders without errors for osi", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SelectLogProcessor supportOSI={false} />
        </MemoryRouter>,
        {
          preloadedState: {
            app: {
              ...AppStoreMockData,
            },
            selectProcessor: {
              serviceAvailable: false,
              serviceAvailableChecked: false,
              serviceAvailableCheckedLoading: false,
              logProcessorType: LogProcessorType.OSI,
              logProcessorConcurrency: "200",
              minOCU: "1",
              maxOCU: "4",
              logProcessorConcurrencyError: "",
              minOCUError: "",
              maxOCUError: "",
              unreservedAccountConcurrency: "0",
            },
          },
        }
      );
    });
  });

  it("renders without errors for osi loading", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SelectLogProcessor supportOSI={true} enablePlugins={true} />
        </MemoryRouter>,
        {
          preloadedState: {
            app: {
              ...AppStoreMockData,
            },
            selectProcessor: {
              serviceAvailable: true,
              serviceAvailableChecked: true,
              serviceAvailableCheckedLoading: true,
              logProcessorType: LogProcessorType.LAMBDA,
              logProcessorConcurrency: "200",
              minOCU: "1",
              maxOCU: "4",
              logProcessorConcurrencyError: "",
              minOCUError: "",
              maxOCUError: "",
              unreservedAccountConcurrency: "0",
            },
          },
        }
      );
    });
  });
});
