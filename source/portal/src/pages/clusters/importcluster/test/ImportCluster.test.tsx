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
import ImportCluster from "../ImportCluster";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { AppStoreMockData } from "test/store.mock";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import {
  domainMockData,
  mockDomainNames,
  mockDomainStatusCheckData,
  mockDomainVpc,
  mockListResource,
} from "test/domain.mock";
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

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
  jest.spyOn(console, "warn").mockImplementation(jest.fn());
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("ImportCluster", () => {
  it("renders without errors", () => {
    renderWithProviders(
      <MemoryRouter>
        <ImportCluster />
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

  it("renders with load vpc with manual", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getDomainVpc: mockDomainVpc,
        getDomainDetails: domainMockData,
        listDomainNames: {
          domainNames: mockDomainNames,
        },
        domainStatusCheck: mockDomainStatusCheckData,
        listResources: mockListResource,
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        validateVpcCidr: "OK",
        importDomain: {
          id: "xxx",
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ImportCluster />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
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

    const listboxDomain = within(document.body).getByRole("listbox");
    const domain1 = await within(listboxDomain).findByText("test-us-domain");
    fireEvent.click(domain1);

    // wait for all loading indicators to be removed (check complete)
    await waitFor(() => {
      const loadingIndicators = screen.queryAllByTestId("gsui-loading");
      expect(loadingIndicators.length).toBe(0);
    });

    // click next button
    const nextButton = screen.getByTestId("test-next-button");

    fireEvent.click(nextButton);

    expect(
      screen.queryByText("cluster:import.configNetwork.osNetwork")
    ).toBeInTheDocument();

    const manualRadio = screen.getByRole("radio", { name: /manual/i });
    fireEvent.click(manualRadio);

    // select vpc
    const selectVPC = screen.getByPlaceholderText(
      /cluster:import.configNetwork.chooseVPC/i
    );

    // click actual select button
    const previousVpcSibling = selectVPC.previousSibling;
    if (previousVpcSibling) fireEvent.mouseDown(previousVpcSibling);

    await waitFor(() => {
      expect(screen.queryByText("vpc-1(Vpc1)")).toBeInTheDocument();
    });
    const listboxVPC = within(document.body).getByRole("listbox");
    const vpc1 = await within(listboxVPC).findByText("vpc-1(Vpc1)");
    fireEvent.click(vpc1);

    // select public subnets
    const selectSubnets = screen.getByRole("button", {
      name: /cluster:import.configNetwork.chooseSubnet/i,
    });
    await act(async () => {
      fireEvent.mouseDown(selectSubnets);
    });
    const listboxSubnets = within(document.body).getByRole("listbox");
    const subnet1 = await within(listboxSubnets).findByText(
      /subnet-123\(Subnet123\)/i
    );
    const subnet2 = await within(listboxSubnets).findByText(
      /subnet-234\(Subnet234\)/i
    );
    fireEvent.click(subnet1);
    fireEvent.click(subnet2);

    // Wait for the listbox to be removed, so it isn't visible in subsequent calls
    await waitFor(() => {
      fireEvent.click(screen.getByRole("presentation").firstChild as any);
    });
    await waitFor(() => {
      expect(
        document.body.querySelector("ul[role=listbox]")
      ).not.toBeInTheDocument();
    });

    // select security group
    const selectSG = screen.getByPlaceholderText(
      /cluster:import.configNetwork.chooseSG/i
    );

    // click actual select button
    const previousSGSibling = selectSG.previousSibling;
    if (previousSGSibling) fireEvent.mouseDown(previousSGSibling);

    const listboxSG = within(document.body).getByRole("listbox");
    const sg = await within(listboxSG).findByText(/sg-123\(SecurityGroup1\)/i);
    fireEvent.click(sg);

    fireEvent.click(nextButton);

    // click import button
    const importButton = screen.getByTestId("test-import-button");
    fireEvent.click(importButton);
  });

  it("renders with load vpc with automatic", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getDomainVpc: mockDomainVpc,
        getDomainDetails: domainMockData,
        listDomainNames: {
          domainNames: mockDomainNames,
        },
        domainStatusCheck: mockDomainStatusCheckData,
        listResources: mockListResource,
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        validateVpcCidr: "OK",
        importDomain: {
          id: "xxx",
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ImportCluster />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
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

    const listboxDomain = within(document.body).getByRole("listbox");
    const domain1 = await within(listboxDomain).findByText("test-us-domain");
    fireEvent.click(domain1);

    // wait for all loading indicators to be removed (check complete)
    await waitFor(() => {
      const loadingIndicators = screen.queryAllByTestId("gsui-loading");
      expect(loadingIndicators.length).toBe(0);
    });

    // click next button
    const nextButton = screen.getByTestId("test-next-button");
    fireEvent.click(nextButton);

    expect(
      screen.queryByText("cluster:import.configNetwork.osNetwork")
    ).toBeInTheDocument();

    fireEvent.click(nextButton);

    // click previous button
    const previousButton = screen.getByTestId("test-previous-button");
    fireEvent.click(previousButton);

    // click cancel button
    const cancelButton = screen.getByTestId("test-cancel-button");
    fireEvent.click(cancelButton);
  });
});
