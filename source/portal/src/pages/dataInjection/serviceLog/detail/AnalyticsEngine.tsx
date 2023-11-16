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
import { SvcDetailProps } from "../ServiceLogDetail";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import { useTranslation } from "react-i18next";
import ExtLink from "components/ExtLink";
import { buildESLink } from "assets/js/utils";

const AnalyticsEngine: React.FC<SvcDetailProps> = (props: SvcDetailProps) => {
  const { pipelineInfo, amplifyConfig } = props;
  const { t } = useTranslation();
  return (
    <div>
      <HeaderWithValueLabel
        numberOfColumns={3}
        headerTitle={t("servicelog:detail.analyticsEngine")}
        dataList={[
          {
            label: t("servicelog:detail.type"),
            data: t("servicelog:detail.aos"),
          },
          {
            label: t("servicelog:detail.aos"),
            data: (
              <ExtLink
                to={buildESLink(
                  amplifyConfig?.aws_project_region ?? "",
                  pipelineInfo?.esName ?? ""
                )}
              >
                {pipelineInfo?.esName}
              </ExtLink>
            ),
          },
          {
            label: t("servicelog:overview.createSample"),
            data: pipelineInfo?.createSampleData ?? "-",
          },
        ]}
      />
      <HeaderWithValueLabel
        numberOfColumns={3}
        headerTitle={t("servicelog:detail.indexSettings")}
        dataList={[
          {
            label: t("servicelog:detail.index"),
            data: pipelineInfo?.esIndex ?? "-",
          },
          {
            label: t("servicelog:detail.indexSuffix"),
            data: pipelineInfo?.indexSuffix ?? "-",
          },
          {
            label: t("servicelog:cluster.replicaNum"),
            data: pipelineInfo?.replicaNumbers ?? "-",
          },
          {
            label: t("servicelog:cluster.shardNum"),
            data: pipelineInfo?.shardNumbers ?? "-",
          },
          {
            label: t("servicelog:detail.rolloverSize"),
            data: pipelineInfo?.rolloverSize?.toUpperCase() ?? "-",
          },
          {
            label: t("servicelog:detail.compressionType"),
            data: pipelineInfo?.codec ?? "-",
          },
        ]}
      />
      <HeaderWithValueLabel
        numberOfColumns={3}
        headerTitle={t("servicelog:detail.lifecycleSettings")}
        dataList={[
          {
            label: t("servicelog:lifecycle.warmLog"),
            data:
              (pipelineInfo?.warmAge === "1s"
                ? t("servicelog:cluster.warmImmediately")
                : pipelineInfo?.warmAge?.toString().replace("d", "")) ||
              pipelineInfo?.warnRetention ||
              "-",
          },
          {
            label: t("servicelog:lifecycle.coldLog"),
            data:
              pipelineInfo?.coldAge?.toString().replace("d", "") ||
              pipelineInfo?.coldRetention ||
              "-",
          },
          {
            label: t("servicelog:lifecycle.retention"),
            data:
              pipelineInfo?.retainAge?.toString().replace("d", "") ||
              pipelineInfo?.logRetention ||
              "-",
          },
        ]}
      />
    </div>
  );
};

export default AnalyticsEngine;
