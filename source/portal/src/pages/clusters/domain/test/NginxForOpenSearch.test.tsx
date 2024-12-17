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
import NginxForOpenSearch from "../NginxForOpenSearch";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { domainMockData, mockListResource } from "test/domain.mock";
import {
  screen,
  act,
  waitFor,
  fireEvent,
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

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({
    id: "mockedId",
    name: "mockedName",
  }),
  useNavigate: () => jest.fn(),
}));

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
  (appSyncRequestQuery as any).mockResolvedValue({
    data: {
      getDomainDetails: domainMockData,
      listResources: mockListResource,
    },
  });
  (appSyncRequestMutation as any).mockResolvedValue({
    data: {
      createProxyForOpenSearch: {
        success: true,
      },
    },
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("NginxForOpenSearch", () => {
  it("renders without errors", () => {
    renderWithProviders(
      <MemoryRouter>
        <NginxForOpenSearch />
      </MemoryRouter>
    );
  });

  it("renders with data", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <NginxForOpenSearch />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("sg-xxxxxxxx")).toBeInTheDocument();
    });

    // select public subnets
    const selectSubnets = screen.getByRole("button", {
      name: /cluster:proxy.chooseSubnet/i,
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
    const selectSG = screen.getByRole("button", {
      name: /cluster:proxy.chooseSG/i,
    });
    await act(async () => {
      fireEvent.mouseDown(selectSG);
    });
    const listboxSG = within(document.body).getByRole("listbox");
    const sg = await within(listboxSG).findByText(/sg-123\(SecurityGroup1\)/i);
    fireEvent.click(sg);

    // Wait for the listbox to be removed, so it isn't visible in subsequent calls
    await waitFor(() => {
      expect(
        document.body.querySelector("ul[role=listbox]")
      ).not.toBeInTheDocument();
    });

    // select security group
    const selectKey = screen.getByRole("button", {
      name: /cluster:proxy.chooseKeyName/i,
    });
    await act(async () => {
      fireEvent.mouseDown(selectKey);
    });
    const listboxKey = within(document.body).getByRole("listbox");
    const key1 = await within(listboxKey).findByText(/Key1\(key-123\)/i);
    fireEvent.click(key1);

    await act(async () => {
      fireEvent.click(screen.getByTestId("create-button"));
    });
  });

  it("renders with data without subnets", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <NginxForOpenSearch />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("sg-xxxxxxxx")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("create-button"));
    });
  });

  it("renders with data without security group", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <NginxForOpenSearch />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("sg-xxxxxxxx")).toBeInTheDocument();
    });

    // select public subnets
    const selectSubnets = screen.getByRole("button", {
      name: /cluster:proxy.chooseSubnet/i,
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

    await act(async () => {
      fireEvent.click(screen.getByTestId("create-button"));
    });
  });

  it("renders with data without key name", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <NginxForOpenSearch />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("sg-xxxxxxxx")).toBeInTheDocument();
    });

    // select public subnets
    const selectSubnets = screen.getByRole("button", {
      name: /cluster:proxy.chooseSubnet/i,
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
    const selectSG = screen.getByRole("button", {
      name: /cluster:proxy.chooseSG/i,
    });
    await act(async () => {
      fireEvent.mouseDown(selectSG);
    });
    const listboxSG = within(document.body).getByRole("listbox");
    const sg = await within(listboxSG).findByText(/sg-123\(SecurityGroup1\)/i);
    fireEvent.click(sg);

    await act(async () => {
      fireEvent.click(screen.getByTestId("create-button"));
    });
  });
});

describe("getResources for different resource types", () => {
  const testCases = [
    ["Vpc", [{ id: "vpc-123", name: "Vpc1" }]],
    ["SecurityGroup", [{ id: "sg-123", name: "SecurityGroup1" }]],
    ["Certificate", [{ id: "cert-456", name: "Certificate1" }]],
  ];

  test.each(testCases)(
    "should fetch and process data correctly for %s",
    async (resourceType, expected) => {
      (appSyncRequestQuery as any).mockResolvedValue({
        data: { listResources: expected, getDomainDetails: domainMockData },
      });

      await act(async () => {
        renderWithProviders(
          <MemoryRouter>
            <NginxForOpenSearch />
          </MemoryRouter>
        );
      });
    }
  );
});
