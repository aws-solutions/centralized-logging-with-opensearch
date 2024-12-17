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
import { DomainStatusCheckType } from "API";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithProviders } from "test-utils";
import { GrafanaList } from "./grafana/GrafanaList";
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

function grafanaItem(name: string) {
  return {
    id: name,
    name: name,
    url: "https://************.us-west-2.elb.amazonaws.com/",
    createdAt: "2023-10-24T06:03:54Z",
    tags: [],
    __typename: "Grafana",
  };
}

describe(__filename, () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(jest.fn());
    (appSyncRequestQuery as any).mockReturnValue({
      data: {
        listGrafanas: {
          grafanas: [
            grafanaItem("a"),
            grafanaItem("b"),
            grafanaItem("c"),
            grafanaItem("d"),
            grafanaItem("e"),
            grafanaItem("f"),
            grafanaItem("g"),
            grafanaItem("h"),
            grafanaItem("i"),
            grafanaItem("j"),
            grafanaItem("k"),
            grafanaItem("l"),
            grafanaItem("m"),
          ],
          total: 13,
          __typename: "ListGrafanasResponse",
        },
      },
    });
  });

  it("click remove", async () => {
    const result = renderWithProviders(
      <MemoryRouter initialEntries={["/grafana/import"]}>
        <GrafanaList />
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
    await waitFor(() => {
      expect(result.getByText("a")).toBeTruthy();
      expect(result.getByText("b")).toBeTruthy();
      fireEvent.click(result.getByText("a"));
      fireEvent.click(result.getByText("button.remove"));
      fireEvent.click(result.getByText("button.delete"));
    });
    cleanup();
  });

  it("click grafana import", async () => {
    const result = renderWithProviders(
      <MemoryRouter initialEntries={["/grafana/import"]}>
        <GrafanaList />
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
    await waitFor(() => {
      expect(result.getByText("a")).toBeTruthy();
      expect(result.getByText("b")).toBeTruthy();
      fireEvent.click(result.getByText("a"));
      fireEvent.click(result.getByText("2"));
      fireEvent.click(result.getByText("lightengine:grafana.import"));
    });
    cleanup();
  });
});
