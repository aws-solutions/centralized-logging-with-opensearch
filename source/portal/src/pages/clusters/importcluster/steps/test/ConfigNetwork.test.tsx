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
import ConfigNetwork from "../ConfigNetwork";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import {
  domainMockData,
  domainMockImportedCluster,
  mockDomainVpc,
  mockVPCResourceList,
} from "test/domain.mock";
import {
  screen,
  act,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { appSyncRequestQuery } from "assets/js/request";
import { CreateLogMethod } from "assets/js/const";

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

const mockChangeVpc = jest.fn();
const mockChangeSubnet = jest.fn();
const mockChangeSecurityGroup = jest.fn();
const mockChangeVPCList = jest.fn();
const mockChangeSubnetList = jest.fn();
const mockChangeSGList = jest.fn();
const mockChangeVPCAlert = jest.fn();
const mockChangeCreationMethod = jest.fn();

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("ConfigNetwork", () => {
  it("renders without errors", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ConfigNetwork
            importedCluster={{
              ...domainMockImportedCluster,
            }}
            changeVpc={mockChangeVpc}
            changeSubnet={mockChangeSubnet}
            changeSecurityGroup={mockChangeSecurityGroup}
            changeVPCList={mockChangeVPCList}
            changeSubnetList={mockChangeSubnetList}
            changeSGList={mockChangeSGList}
            changeVPCAlert={mockChangeVPCAlert}
            changeCreationMethod={mockChangeCreationMethod}
            esVPCInfo={{
              vpcId: "vpc-xxx",
              subnetIds: ["subnet-xxx"],
              availabilityZones: ["us-example-1a"],
              securityGroupIds: ["sg-xxx"],
              __typename: "ESVPCInfo",
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("should render network after get data", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: mockVPCResourceList,
        getDomainDetails: domainMockData,
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ConfigNetwork
            importedCluster={{
              ...domainMockImportedCluster,
            }}
            changeVpc={mockChangeVpc}
            changeSubnet={mockChangeSubnet}
            changeSecurityGroup={mockChangeSecurityGroup}
            changeVPCList={mockChangeVPCList}
            changeSubnetList={mockChangeSubnetList}
            changeSGList={mockChangeSGList}
            changeVPCAlert={mockChangeVPCAlert}
            changeCreationMethod={mockChangeCreationMethod}
            esVPCInfo={{
              vpcId: "vpc-xxx",
              subnetIds: ["subnet-xxx"],
              availabilityZones: ["us-example-1a"],
              securityGroupIds: ["sg-xxx"],
              __typename: "ESVPCInfo",
            }}
          />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("gsui-loading")).not.toBeInTheDocument();
    });
  });

  it("should change to manual creation method", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: mockVPCResourceList,
        getDomainVpc: mockDomainVpc,
        getDomainDetails: domainMockData,
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ConfigNetwork
            importedCluster={{
              ...domainMockImportedCluster,
              creationMethod: CreateLogMethod.Manual,
              logProcessVpcOptionList: [
                { name: "test-mock-vpc-xxx", value: "test-mock-vpc-xxx" },
              ],
              logProcessSubnetOptionList: [
                { name: "subnet-123(Subnet123)", value: "subnet-123" },
                { name: "subnet-234(Subnet234)", value: "subnet-234" },
              ],
              logProcessSecGroupList: [
                { name: "sg-123(SecurityGroup1)", value: "sg-123" },
              ],
            }}
            changeVpc={mockChangeVpc}
            changeSubnet={mockChangeSubnet}
            changeSecurityGroup={mockChangeSecurityGroup}
            changeVPCList={mockChangeVPCList}
            changeSubnetList={mockChangeSubnetList}
            changeSGList={mockChangeSGList}
            changeVPCAlert={mockChangeVPCAlert}
            changeCreationMethod={mockChangeCreationMethod}
            esVPCInfo={{
              vpcId: "vpc-xxx",
              subnetIds: ["subnet-xxx"],
              availabilityZones: ["us-example-1a"],
              securityGroupIds: ["sg-xxx"],
              __typename: "ESVPCInfo",
            }}
          />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
    });

    const manualRadio = screen.getByRole("radio", { name: /manual/i });

    await act(() => {
      fireEvent.click(manualRadio);
    });

    await waitFor(() => {
      expect(
        screen.queryByText("cluster:import.configNetwork.layerNetworkDesc")
      ).toBeInTheDocument();
    });

    // select vpc
    const selectVPC = screen.getByPlaceholderText(
      /cluster:import.configNetwork.chooseVPC/i
    );

    // click actual select button
    const previousSibling = selectVPC.previousSibling;
    if (previousSibling) fireEvent.mouseDown(previousSibling);

    await waitFor(() => {
      expect(screen.queryByText("test-mock-vpc-xxx")).toBeInTheDocument();
    });
    const listboxVPC = within(document.body).getByRole("listbox");
    const vpc1 = await within(listboxVPC).findByText("test-mock-vpc-xxx");
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
  });
});
