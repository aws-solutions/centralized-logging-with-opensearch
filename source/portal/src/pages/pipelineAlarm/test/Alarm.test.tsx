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
import Alarm from "../Alarm";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { PipelineType } from "API";
import { AppStoreMockData } from "test/store.mock";
import { appSyncRequestQuery } from "assets/js/request";

jest.mock("assets/js/request", () => {
  return {
    appSyncRequestQuery: jest.fn(),
    refineErrorMessage: jest.fn(),
  };
});

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

describe("Alarm", () => {
  it("renders without errors", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listInstances: {
          instances: [],
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <Alarm pageType={"create"} type={PipelineType.APP} />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
  });
});
