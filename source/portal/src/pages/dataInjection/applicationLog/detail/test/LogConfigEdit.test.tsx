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
import { LogConfigEdit } from "../LogConfigEdit";
import { logConfigMockData } from "test/logConfig.mock";
import { fireEvent, waitFor } from "@testing-library/react";
import * as request from "assets/js/request";

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
  jest.spyOn(request, "appSyncRequestMutation").mockImplementation(jest.fn());
});

describe("LogConfigEdit", () => {
  it("renders without errors", () => {
    const { getByTestId } = renderWithProviders(
      <MemoryRouter>
        <LogConfigEdit logConfig={logConfigMockData} pipelineId="" />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(getByTestId("gsui-loading")).toBeInTheDocument();
  });

  // Clicking save button triggers updatePipeline function
  it("should trigger updatePipeline function when save button is clicked", async () => {
    const mockUpdatePipeline = jest.fn();
    (request.appSyncRequestMutation as any).mockResolvedValue({});
    const { getByText } = renderWithProviders(
      <MemoryRouter>
        <LogConfigEdit
          logConfig={logConfigMockData}
          pipelineId=""
          onRevisionChange={mockUpdatePipeline}
        />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    fireEvent.click(getByText("button.save"));
    await waitFor(() => {
      expect(mockUpdatePipeline).toHaveBeenCalled();
    });
  });
});
