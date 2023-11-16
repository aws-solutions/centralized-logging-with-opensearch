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
import { AppPipeline } from "API";
import { buildESLink } from "assets/js/utils";
import ExtLink from "components/ExtLink";
import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { AmplifyConfigType } from "types";
import { getParamValueByKey } from "assets/js/applog";
import { RootState } from "reducer/reducers";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
interface OverviewProps {
  pipelineInfo: AppPipeline | undefined;
}

const AnalyticsEngineDetails: React.FC<OverviewProps> = (
  props: OverviewProps
) => {
  const { pipelineInfo } = props;
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
            data: curPipeline?.aosParams?.engine ?? "-",
          },
          {
            label: t("applog:detail.domain"),
            data: (
              <ExtLink
                to={buildESLink(
                  amplifyConfig.aws_project_region,
                  curPipeline?.aosParams?.domainName || ""
                )}
              >
                {curPipeline?.aosParams?.domainName || "-"}
              </ExtLink>
            ),
          },
          {
            label: t("applog:detail.sampleDashboard"),
            data:
              getParamValueByKey(
                "createDashboard",
                curPipeline?.bufferParams
              ) || "-",
          },
        ]}
      />
      <HeaderWithValueLabel
        numberOfColumns={3}
        headerTitle={t("applog:detail.indexSettings")}
        dataList={[
          {
            label: t("servicelog:detail.index"),
            data: curPipeline?.aosParams?.indexPrefix ?? "-",
          },
          {
            label: t("applog:detail.indexSuffix"),
            data:
              curPipeline?.aosParams?.indexSuffix?.replaceAll("_", "-") ?? "-",
          },
          {
            label: t("servicelog:cluster.replicaNum"),
            data: curPipeline?.aosParams?.replicaNumbers ?? "-",
          },
          {
            label: t("servicelog:cluster.shardNum"),
            data: curPipeline?.aosParams?.shardNumbers ?? "-",
          },
          {
            label: t("applog:detail.rolloverSize"),
            data: curPipeline?.aosParams?.rolloverSize?.toUpperCase() ?? "-",
          },
        ]}
      />

      <HeaderWithValueLabel
        numberOfColumns={3}
        headerTitle={t("applog:detail.tab.lifecycle")}
        dataList={[
          {
            label: t("applog:detail.lifecycle.warmLog"),
            data:
              (pipelineInfo?.aosParams?.warmLogTransition === "1s"
                ? t("servicelog:cluster.warmImmediately")
                : "") ||
              (pipelineInfo?.aosParams?.warmLogTransition
                ? pipelineInfo?.aosParams?.warmLogTransition?.replace("d", "")
                : "-"),
          },
          {
            label: t("applog:detail.lifecycle.coldLog"),
            data:
              pipelineInfo?.aosParams?.coldLogTransition?.replace("d", "") ||
              "-",
          },
          {
            label: t("applog:detail.lifecycle.logRetention"),
            data:
              pipelineInfo?.aosParams?.logRetention?.replace("d", "") || "-",
          },
        ]}
      />
    </div>
  );
};

export default AnalyticsEngineDetails;
