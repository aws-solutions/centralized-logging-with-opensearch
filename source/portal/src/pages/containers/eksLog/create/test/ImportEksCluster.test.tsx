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
import ImportEksCluster from "../ImportEksCluster";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { screen, act, fireEvent, within } from "@testing-library/react";
import { MockEKSData, MockEKSList } from "test/applog.mock";
import { AppStoreMockData } from "test/store.mock";

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

describe("ImportEksCluster", () => {
  it("renders without errors", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listLogSources: {
          logSources: [
            {
              MockEKSData,
            },
          ],
        },
        listResources: MockEKSList,
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { createLogSource: "OK" },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ImportEksCluster />
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

    // click create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-create-button"));
    });

    // select eks cluster
    const selectEKSCluster = screen.getByRole("button", {
      name: /ekslog:create.eksSource.chooseEksCluster/i,
    });
    await act(async () => {
      fireEvent.mouseDown(selectEKSCluster);
    });
    const listEKS = within(document.body).getByRole("listbox");
    const eksId = await within(listEKS).findByText(/eks-1/i);
    fireEvent.click(eksId);

    // click create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-create-button"));
    });

    // click cancel button
    await act(async () => {
      fireEvent.click(screen.getByTestId("eks-cancel-button"));
    });
  });
});
