/*
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 */
import { DomainStatusCheckType } from "API";
import ExpandableSection from "components/ExpandableSection";
import StatusIndicator from "components/StatusIndicator";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RootState } from "reducer/reducers";

enum HeaderPanelStatus {
  Loading = "loading",
  Success = "success",
  Error = "error",
  Normal = "normal",
  Pending = "pending",
}

const getHeaderPanelStatus = (
  status: DomainStatusCheckType | null | undefined
) => {
  switch (status) {
    case DomainStatusCheckType.CHECKING:
    case DomainStatusCheckType.NOT_STARTED:
      return HeaderPanelStatus.Loading;
    case DomainStatusCheckType.PASSED:
      return HeaderPanelStatus.Success;
    default:
      return HeaderPanelStatus.Error;
  }
};

export const GrafanaCheckList = () => {
  const grafanaState = useSelector((state: RootState) => state.grafana);
  const { t } = useTranslation();
  return (
    <>
      {grafanaState.status !== DomainStatusCheckType.NOT_STARTED && (
        <ExpandableSection headerText={t("lightengine:grafana.create.detail")}>
          <div>
            <div className="mb-10">
              <StatusIndicator
                type={getHeaderPanelStatus(grafanaState.grafanaURLConnectivity)}
              >
                {t("lightengine:grafana.create.checkUrlConnectivity")}
              </StatusIndicator>
            </div>
            <div className="mb-10">
              <StatusIndicator
                type={getHeaderPanelStatus(grafanaState.grafanaTokenValidity)}
              >
                {t("lightengine:grafana.create.checkTokenValidity")}
              </StatusIndicator>
            </div>
            <div className="mb-10">
              <StatusIndicator
                type={getHeaderPanelStatus(
                  grafanaState.grafanaHasInstalledAthenaPlugin
                )}
              >
                {t("lightengine:grafana.create.hasInstalledAthenaPlugin")}
              </StatusIndicator>
            </div>
            <div className="mb-10">
              <StatusIndicator
                type={getHeaderPanelStatus(
                  grafanaState.grafanaDataSourcePermission
                )}
              >
                <div className="inline-block">
                  {t("lightengine:grafana.create.dataSourcePermission")}
                </div>
              </StatusIndicator>
            </div>
            <div className="mb-10">
              <StatusIndicator
                type={getHeaderPanelStatus(
                  grafanaState.grafanaFolderPermission
                )}
              >
                <div className="inline-block">
                  {t("lightengine:grafana.create.folderPermission")}
                </div>
              </StatusIndicator>
            </div>
            <div className="mb-10">
              <StatusIndicator
                type={getHeaderPanelStatus(
                  grafanaState.grafanaDashboardsPermission
                )}
              >
                <div className="inline-block">
                  {t("lightengine:grafana.create.dashboardsPermission")}
                </div>
              </StatusIndicator>
            </div>
          </div>
        </ExpandableSection>
      )}
    </>
  );
};
