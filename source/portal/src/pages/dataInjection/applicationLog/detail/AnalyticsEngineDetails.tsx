/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
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
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { AmplifyConfigType } from "types";
import { getParamValueByKey } from "assets/js/applog";
import { RootState } from "reducer/reducers";
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
      <HeaderPanel title={t("applog:detail.analyticsEngine")}>
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("resource:config.detail.type")}>
              <div>{curPipeline?.aosParams?.engine}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("applog:detail.domain")}>
              <ExtLink
                to={buildESLink(
                  amplifyConfig.aws_project_region,
                  curPipeline?.aosParams?.domainName || ""
                )}
              >
                {curPipeline?.aosParams?.domainName || "-"}
              </ExtLink>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("applog:detail.sampleDashboard")}>
              {getParamValueByKey(
                "createDashboard",
                curPipeline?.bufferParams
              ) || "-"}
            </ValueWithLabel>
          </div>
        </div>
      </HeaderPanel>
      <HeaderPanel title={t("applog:detail.indexSettings")}>
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("resource:config.detail.indexName")}>
              <div>{curPipeline?.aosParams?.indexPrefix || "-"}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("applog:detail.indexSuffix")}>
              <div>
                {curPipeline?.aosParams?.indexSuffix?.replaceAll("_", "-") ||
                  "-"}
              </div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("servicelog:cluster.replicaNum")}>
              <div>{curPipeline?.aosParams?.replicaNumbers}</div>
            </ValueWithLabel>
          </div>
        </div>
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("servicelog:cluster.shardNum")}>
              <div>{curPipeline?.aosParams?.shardNumbers || "-"}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("applog:detail.rolloverSize")}>
              <div>
                {curPipeline?.aosParams?.rolloverSize?.toUpperCase() || "-"}
              </div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c"></div>
        </div>
      </HeaderPanel>
      <HeaderPanel title={t("applog:detail.tab.lifecycle")}>
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("applog:detail.lifecycle.warmLog")}>
              <div>
                {(pipelineInfo?.aosParams?.warmLogTransition === "1s"
                  ? t("servicelog:cluster.warmImmediately")
                  : "") ||
                  (pipelineInfo?.aosParams?.warmLogTransition
                    ? pipelineInfo?.aosParams?.warmLogTransition?.replace(
                        "d",
                        ""
                      )
                    : "")}
              </div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("applog:detail.lifecycle.coldLog")}>
              <div>
                {pipelineInfo?.aosParams?.coldLogTransition?.replace("d", "") ||
                  "-"}
              </div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("applog:detail.lifecycle.logRetention")}>
              <div>
                {pipelineInfo?.aosParams?.logRetention?.replace("d", "") || "-"}
              </div>
            </ValueWithLabel>
          </div>
        </div>
      </HeaderPanel>
    </div>
  );
};

export default AnalyticsEngineDetails;
