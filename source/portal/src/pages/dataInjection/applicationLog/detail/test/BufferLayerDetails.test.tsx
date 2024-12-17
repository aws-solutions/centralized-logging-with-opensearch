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
import { act } from "@testing-library/react";
import BufferLayerDetails from "../BufferLayerDetails";
import { mockS3ServicePipelineData } from "test/servicelog.mock";
import { MemoryRouter } from "react-router-dom";
import { renderWithProviders } from "test-utils";
import { appSyncRequestQuery } from "assets/js/request";
import { MockAppLogDetailData } from "test/applog.mock";

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
describe("BufferLayerDetails", () => {
  it("renders without crashing", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getAppPipeline: { ...MockAppLogDetailData },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <BufferLayerDetails pipelineInfo={{ ...mockS3ServicePipelineData }} />
        </MemoryRouter>
      );
    });
  });
});
