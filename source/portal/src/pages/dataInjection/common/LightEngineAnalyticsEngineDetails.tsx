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
import { AnalyticsEngine, AppPipeline, ServicePipeline } from "API";
import ExtLink from "components/ExtLink";
import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { AmplifyConfigType } from "types";
import { RootState } from "reducer/reducers";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import {
  buildGlueDatabaseLink,
  buildGlueTableLink,
  buildS3LinkFromS3URI,
} from "assets/js/utils";
interface OverviewProps {
  pipelineInfo?: AppPipeline | ServicePipeline;
  analyticsEngine?: AnalyticsEngine;
}

export const LightEngineAnalyticsEngineDetails: React.FC<OverviewProps> = (
  props: OverviewProps
) => {
  const { analyticsEngine } = props;
  const { t } = useTranslation();
  const curPipeline = props.pipelineInfo;
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  return (
    <div>
      <HeaderWithValueLabel
        numberOfColumns={3}
        headerTitle={t("applog:detail.analyticsEngine")}
        dataList={[
          {
            label: t("servicelog:detail.type"),
            data: analyticsEngine?.engineType ?? "-",
          },
          {
            label: t("applog:detail.grafanaDashboardDetail"),
            data: (
              <ExtLink to={analyticsEngine?.table?.dashboardLink ?? ""}>
                {analyticsEngine?.table?.dashboardName ?? "-"}
              </ExtLink>
            ),
          },
          {
            label: t("applog:detail.sampleDashboard"),
            data: curPipeline?.lightEngineParams?.importDashboards ?? "-",
          },
        ]}
      />
      <HeaderWithValueLabel
        numberOfColumns={3}
        headerTitle={t("applog:detail.tableSettings")}
        dataList={[
          {
            label: t("servicelog:detail.lightEngine.tableName"),
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
            label: t("servicelog:detail.lightEngine.database"),
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
            label: t("servicelog:detail.lightEngine.classification"),
            data: analyticsEngine?.table?.classification ?? "-",
          },
          {
            label: t("servicelog:overview.logLocation"),
            data: (
              <ExtLink
                to={buildS3LinkFromS3URI(
                  amplifyConfig.aws_project_region,
                  analyticsEngine?.table?.location,
                )}
              >
                {analyticsEngine?.table?.location ?? "-"}
              </ExtLink>
            ),
          },
        ]}
      />
      {analyticsEngine?.metric && (
        <HeaderWithValueLabel
          numberOfColumns={3}
          headerTitle={t("applog:detail.metricTableSettings")}
          dataList={[
            {
              label: t("servicelog:detail.lightEngine.tableName"),
              data: (
                <ExtLink
                  to={buildGlueTableLink(
                    amplifyConfig.aws_project_region,
                    analyticsEngine?.metric.databaseName,
                    analyticsEngine?.metric.tableName
                  )}
                >
                  {analyticsEngine?.metric.tableName}
                </ExtLink>
              ),
            },
            {
              label: t("servicelog:detail.lightEngine.database"),
              data: (
                <ExtLink
                  to={buildGlueDatabaseLink(
                    amplifyConfig.aws_project_region,
                    analyticsEngine?.metric.databaseName
                  )}
                >
                  {analyticsEngine?.metric.databaseName}
                </ExtLink>
              ),
            },
            {
              label: t("servicelog:detail.lightEngine.classification"),
              data: analyticsEngine?.metric.classification ?? "-",
            },
            {
              label: t("servicelog:overview.logLocation"),
              data: (
                <ExtLink
                  to={buildS3LinkFromS3URI(
                    amplifyConfig.aws_project_region,
                    analyticsEngine?.metric.location,
                  )}
                >
                  {analyticsEngine?.metric.location ?? "-"}
                </ExtLink>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};
