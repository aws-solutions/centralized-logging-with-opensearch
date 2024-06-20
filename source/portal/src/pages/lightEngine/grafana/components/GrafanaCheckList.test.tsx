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
import { GrafanaCheckList } from "./GrafanaCheckList";
import { DomainStatusCheckType } from "API";
import { renderWithProviders } from "../../../../test-utils";


jest.mock('react-i18next', () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => {
    return {
      t: (str: string) => str,
      i18n: {
        changeLanguage: () => new Promise(() => { }),
      },
    };
  },
  initReactI18next: {
    type: '3rdParty',
    init: () => { },
  }
}));


describe("GrafanaCheckList", () => {
  it("init", () => {
    const { queryByText } = renderWithProviders(<GrafanaCheckList />, {
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
        }
      },
    });

    expect(queryByText("lightengine:grafana.create.detail")).toBeInTheDocument();
  });

});
