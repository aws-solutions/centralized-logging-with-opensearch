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
import { AppPipeline, PipelineType } from "API";
import React from "react";
import { useTranslation } from "react-i18next";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import LifecycleOpenSearch from "pages/dataInjection/common/details/LifecycleOpenSearch";
import { ServiceLogDetailProps } from "pages/dataInjection/serviceLog/ServiceLogDetail";
import { defaultStr, ternary } from "assets/js/utils";
interface OverviewProps {
  appPipelineInfo?: AppPipeline;
  servicePipelineInfo?: ServiceLogDetailProps;
  pipelineType: PipelineType;
}

const AnalyticsEngineDetails: React.FC<OverviewProps> = (
  props: OverviewProps
) => {
  const { appPipelineInfo, servicePipelineInfo, pipelineType } = props;
  const { t } = useTranslation();
  return (
    <div>
      <HeaderWithValueLabel
        numberOfColumns={3}
        headerTitle={t("pipeline.detail.index")}
        dataList={[
          {
            label: t("servicelog:detail.indexSuffix"),
            data: defaultStr(
              ternary(
                pipelineType === PipelineType.APP,
                appPipelineInfo?.aosParams?.indexSuffix?.replaceAll("_", "-"),
                servicePipelineInfo?.indexSuffix
              ),
              "-"
            ),
          },
          {
            label: t("servicelog:cluster.shardNum"),
            data: defaultStr(
              ternary(
                pipelineType === PipelineType.APP,
                appPipelineInfo?.aosParams?.shardNumbers?.toString(),
                servicePipelineInfo?.shardNumbers?.toString()
              ),
              "-"
            ),
          },
          {
            label: t("servicelog:cluster.replicaNum"),
            data: defaultStr(
              ternary(
                pipelineType === PipelineType.APP,
                appPipelineInfo?.aosParams?.replicaNumbers?.toString(),
                servicePipelineInfo?.replicaNumbers?.toString()
              ),
              "-"
            ),
          },

          {
            label: t("applog:detail.rolloverSize"),
            data: defaultStr(
              ternary(
                pipelineType === PipelineType.APP,
                appPipelineInfo?.aosParams?.rolloverSize?.toUpperCase(),
                servicePipelineInfo?.rolloverSize?.toUpperCase()
              ),
              "-"
            ),
          },
          {
            label: t("pipeline.detail.compression"),
            data: defaultStr(
              ternary(
                pipelineType === PipelineType.APP,
                appPipelineInfo?.aosParams?.codec,
                servicePipelineInfo?.codec
              ),
              "-"
            ),
          },
        ]}
      />
      <LifecycleOpenSearch
        pipelineType={pipelineType}
        appPipeline={appPipelineInfo}
        servicePipeline={servicePipelineInfo}
      />
    </div>
  );
};

export default AnalyticsEngineDetails;
