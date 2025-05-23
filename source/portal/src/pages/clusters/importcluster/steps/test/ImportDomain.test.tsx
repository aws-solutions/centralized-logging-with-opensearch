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
import ImportDomain from "../ImportDomain";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { domainMockImportedCluster, mockImportResult } from "test/domain.mock";
import { act } from "@testing-library/react";
import { appSyncRequestMutation } from "assets/js/request";

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
  appSyncRequestMutation: jest.fn(),
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("ImportDomain", () => {
  it("renders without errors", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ImportDomain
            importedCluster={{
              ...domainMockImportedCluster,
            }}
            importedRes={[]}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders with imported result", async () => {
    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        importDomain: mockImportResult,
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ImportDomain
            importedCluster={{
              ...domainMockImportedCluster,
            }}
            importedRes={mockImportResult.resources as any}
          />
        </MemoryRouter>
      );
    });
  });
});
