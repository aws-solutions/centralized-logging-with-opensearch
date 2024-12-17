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
import { ImportGrafana } from "./ImportGrafana";
import { DomainStatusCheckType } from "API";
import { cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("GrafanaCheckList", () => {
  it("init", () => {
    const { getByText } = renderWithProviders(
      <MemoryRouter initialEntries={["/grafana/import"]}>
        <ImportGrafana />
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

    fireEvent.click(getByText(/button.validateAndImport/i));
  });

  it("input change", () => {
    const { getByPlaceholderText } = renderWithProviders(
      <MemoryRouter initialEntries={["/grafana/import"]}>
        <ImportGrafana />
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

    fireEvent.change(getByPlaceholderText("clo-grafana"), {
      target: { value: "new value" },
    });
    fireEvent.change(
      getByPlaceholderText("http(s)://my-grafana.corporate.com:3000"),
      { target: { value: "new value" } }
    );
    fireEvent.change(
      getByPlaceholderText("glsa_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"),
      { target: { value: "new value" } }
    );
  });

  it("init2", () => {
    const { getByText } = renderWithProviders(
      <MemoryRouter initialEntries={["/grafana/import"]}>
        <ImportGrafana />
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

    fireEvent.click(getByText(/button.validateAndImport/i));
    cleanup(); // https://github.com/testing-library/react-testing-library/issues/1216#issuecomment-1595684566
  });
});
