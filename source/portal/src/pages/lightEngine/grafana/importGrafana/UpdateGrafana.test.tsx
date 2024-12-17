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
import { renderWithProviders } from "../../../../test-utils";
import { DomainStatusCheckType } from "API";
import { act, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UpdateGrafana } from "./UpdateGrafana";
import { useGrafana } from "assets/js/hooks/useGrafana";
import { appSyncRequestQuery } from "assets/js/request";

jest.mock("react-i18next", () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => {
    return {
      t: (str: string) => str,
      i18n: {
        changeLanguage: () => new Promise(() => {}),
      },
    };
  },
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

jest.mock("assets/js/request", () => ({
  appSyncRequestMutation: jest.fn(),
  appSyncRequestQuery: jest.fn(),
}));

jest.mock("assets/js/hooks/useGrafana", () => ({
  useGrafana: jest.fn(),
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe(__filename, () => {
  it("init", async () => {
    (useGrafana as any).mockReturnValue({
      loading: false,
      status: DomainStatusCheckType.PASSED,
      grafanaName: "1",
      grafanaNameError: "",
      grafanaUrl: "1",
      grafanaUrlError: "",
      grafanaToken: "1",
      grafanaTokenError: "",
      grafanaURLConnectivity: DomainStatusCheckType.CHECKING,
      grafanaTokenValidity: DomainStatusCheckType.NOT_STARTED,
      grafanaHasInstalledAthenaPlugin: DomainStatusCheckType.PASSED,
      grafanaDataSourcePermission: DomainStatusCheckType.CHECKING,
      grafanaFolderPermission: DomainStatusCheckType.WARNING,
      grafanaDashboardsPermission: DomainStatusCheckType.CHECKING,
    });

    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getGrafana: {
          id: "4a3a7e5c-xxx-xxx-xxx-xx",
          name: "test-grafana",
          url: "https://grafana-xx.example.com/",
          createdAt: "2024-07-18T07:32:21Z",
          tags: null,
          __typename: "Grafana",
        },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter
          initialEntries={[
            "/grafana/edit/7535518a-5a79-4fa3-b607-a5ba732a67a7",
          ]}
        >
          <UpdateGrafana />
        </MemoryRouter>,
        {
          preloadedState: {
            grafana: {
              loading: false,
              status: DomainStatusCheckType.PASSED,
              grafanaName: "1",
              grafanaNameError: "",
              grafanaUrl: "1",
              grafanaUrlError: "",
              grafanaToken: "1",
              grafanaTokenError: "",
              grafanaURLConnectivity: DomainStatusCheckType.CHECKING,
              grafanaTokenValidity: DomainStatusCheckType.NOT_STARTED,
              grafanaHasInstalledAthenaPlugin: DomainStatusCheckType.PASSED,
              grafanaDataSourcePermission: DomainStatusCheckType.CHECKING,
              grafanaFolderPermission: DomainStatusCheckType.WARNING,
              grafanaDashboardsPermission: DomainStatusCheckType.CHECKING,
            },
          },
        }
      );
    });
    fireEvent.click(screen.getByText("button.save"));
  });
});
