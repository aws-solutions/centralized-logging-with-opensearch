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
import { AnalyticsEngine, AppPipeline, PipelineType } from "API";
import ExtLink from "components/ExtLink";
import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { AmplifyConfigType } from "types";
import { RootState } from "reducer/reducers";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import { buildGlueDatabaseLink, buildGlueTableLink } from "assets/js/utils";
import { ServiceLogDetailProps } from "../serviceLog/ServiceLogDetail";
import LifecycleLightEngine from "./details/LifecycleLightEngine";
interface OverviewProps {
  pipelineType: PipelineType;
  servicePipeline?: ServiceLogDetailProps;
  appPipeline?: AppPipeline;
  analyticsEngine?: AnalyticsEngine;
}

export const LightEngineAnalyticsEngineDetails: React.FC<OverviewProps> = (
  props: OverviewProps
) => {
  const { analyticsEngine, pipelineType, servicePipeline, appPipeline } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  return (
    <div>
      {analyticsEngine?.metric && (
        <HeaderWithValueLabel
          numberOfColumns={3}
          headerTitle={t("pipeline.detail.tableOverview")}
          dataList={[
            {
              label: t("applog:detail.grafanaDashboardDetail"),
              data: analyticsEngine?.metric?.dashboardLink ? (
                <ExtLink to={analyticsEngine?.metric?.dashboardLink ?? ""}>
                  {analyticsEngine?.metric?.dashboardName ?? "-"}
                </ExtLink>
              ) : (
                "-"
              ),
            },
            {
              label: t("pipeline.detail.table"),
              data: (
                <ExtLink
                  to={buildGlueTableLink(
                    amplifyConfig.aws_project_region,
                    analyticsEngine?.metric?.databaseName,
                    analyticsEngine?.metric?.tableName
                  )}
                >
                  {analyticsEngine?.metric?.tableName}
                </ExtLink>
              ),
            },
            {
              label: t("pipeline.detail.database"),
              data: (
                <ExtLink
                  to={buildGlueDatabaseLink(
                    amplifyConfig.aws_project_region,
                    analyticsEngine?.metric?.databaseName
                  )}
                >
                  {analyticsEngine?.metric?.databaseName}
                </ExtLink>
              ),
            },
            {
              label: t("servicelog:overview.logLocation"),
              data: analyticsEngine?.metric?.location,
            },
          ]}
        />
      )}

      {analyticsEngine?.table && (
        <HeaderWithValueLabel
          numberOfColumns={3}
          headerTitle={t("pipeline.detail.tableDetails")}
          dataList={[
            {
              label: t("applog:detail.grafanaDashboard"),
              data: analyticsEngine?.table?.dashboardLink ? (
                <ExtLink to={analyticsEngine?.table?.dashboardLink ?? ""}>
                  {analyticsEngine?.table?.dashboardName ?? "-"}
                </ExtLink>
              ) : (
                "-"
              ),
            },
            {
              label: t("pipeline.detail.table"),
              data: (
                <ExtLink
                  to={buildGlueTableLink(
                    amplifyConfig.aws_project_region,
                    analyticsEngine?.table?.databaseName,
                    analyticsEngine?.table?.tableName
                  )}
                >
                  {analyticsEngine?.table?.tableName}
                </ExtLink>
              ),
            },
            {
              label: t("pipeline.detail.database"),
              data: (
                <ExtLink
                  to={buildGlueDatabaseLink(
                    amplifyConfig.aws_project_region,
                    analyticsEngine?.table?.databaseName
                  )}
                >
                  {analyticsEngine?.table?.databaseName}
                </ExtLink>
              ),
            },
            {
              label: t("servicelog:overview.logLocation"),
              data: analyticsEngine?.table?.location ?? "-",
            },
          ]}
        />
      )}
      <LifecycleLightEngine
        pipelineType={pipelineType}
        servicePipeline={servicePipeline}
        appPipeline={appPipeline}
      />
    </div>
  );
};
