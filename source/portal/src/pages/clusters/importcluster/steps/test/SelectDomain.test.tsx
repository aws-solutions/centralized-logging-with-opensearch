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
import SelectDomain from "../SelectDomain";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import {
  domainMockImportedCluster,
  mockDomainNames,
  mockDomainStatusCheckData,
} from "test/domain.mock";
import { appSyncRequestQuery } from "assets/js/request";
import {
  act,
  waitFor,
  screen,
  fireEvent,
  within,
} from "@testing-library/react";
import { DomainStatusCheckType } from "API";

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
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("SelectDomain", () => {
  const mockChangeDomain = jest.fn();
  const mockChangeDomainStatus = jest.fn();
  it("renders without errors", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SelectDomain
            importedCluster={domainMockImportedCluster}
            changeDomain={mockChangeDomain}
            changeDomainStatus={mockChangeDomainStatus}
          />
        </MemoryRouter>
      );
    });
  });
  it("renders with domain success status", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        domainStatusCheck: mockDomainStatusCheckData,
        listDomainNames: {
          domainNames: mockDomainNames,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SelectDomain
            importedCluster={domainMockImportedCluster}
            changeDomain={mockChangeDomain}
            changeDomainStatus={mockChangeDomainStatus}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders with domain status checking", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        domainStatusCheck: {
          ...mockDomainStatusCheckData,
          status: DomainStatusCheckType.CHECKING,
        },
        listDomainNames: {
          domainNames: mockDomainNames,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SelectDomain
            importedCluster={domainMockImportedCluster}
            changeDomain={mockChangeDomain}
            changeDomainStatus={mockChangeDomainStatus}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders with domain status warning", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        domainStatusCheck: {
          ...mockDomainStatusCheckData,
          status: DomainStatusCheckType.WARNING,
        },
        listDomainNames: {
          domainNames: mockDomainNames,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SelectDomain
            importedCluster={domainMockImportedCluster}
            changeDomain={mockChangeDomain}
            changeDomainStatus={mockChangeDomainStatus}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders with domain status failed", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        domainStatusCheck: {
          ...mockDomainStatusCheckData,
          status: DomainStatusCheckType.FAILED,
        },
        listDomainNames: {
          domainNames: mockDomainNames,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SelectDomain
            importedCluster={domainMockImportedCluster}
            changeDomain={mockChangeDomain}
            changeDomainStatus={mockChangeDomainStatus}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders with select domain", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        domainStatusCheck: mockDomainStatusCheckData,
        listDomainNames: {
          domainNames: mockDomainNames,
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SelectDomain
            importedCluster={domainMockImportedCluster}
            changeDomain={mockChangeDomain}
            changeDomainStatus={mockChangeDomainStatus}
          />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("gsui-loading")).not.toBeInTheDocument();
    });

    // select domain
    const selectDomain = screen.getByPlaceholderText(
      "cluster:import.selectDomain.selectDomain"
    );
    // click actual select button
    const previousSibling = selectDomain.previousSibling;
    if (previousSibling) fireEvent.mouseDown(previousSibling);

    await waitFor(() => {
      expect(screen.queryByText("test-us-domain")).toBeInTheDocument();
    });

    const listboxVPC = within(document.body).getByRole("listbox");
    const domain1 = await within(listboxVPC).findByText("test-us-domain");
    fireEvent.click(domain1);
  });
});
