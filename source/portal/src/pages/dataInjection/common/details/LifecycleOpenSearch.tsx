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
import { defaultStr, ternary } from "assets/js/utils";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import { ServiceLogDetailProps } from "pages/dataInjection/serviceLog/ServiceLogDetail";
import React from "react";
import { useTranslation } from "react-i18next";

interface LifecycleOpenSearchProps {
  pipelineType: PipelineType;
  servicePipeline?: ServiceLogDetailProps;
  appPipeline?: AppPipeline;
}
const LifecycleOpenSearch: React.FC<LifecycleOpenSearchProps> = ({
  pipelineType,
  servicePipeline,
  appPipeline,
}) => {
  const { t } = useTranslation();
  if (pipelineType === PipelineType.APP) {
    return (
      <HeaderWithValueLabel
        numberOfColumns={3}
        headerTitle={t("pipeline.detail.lifeCycle")}
        dataList={[
          {
            label: t("servicelog:lifecycle.warmLog"),
            data:
              (appPipeline?.aosParams?.warmLogTransition === "1s"
                ? t("servicelog:cluster.warmImmediately")
                : "") ||
              (appPipeline?.aosParams?.warmLogTransition
                ? appPipeline?.aosParams?.warmLogTransition?.replace("d", "")
                : "-"),
          },
          {
            label: t("servicelog:lifecycle.coldLog"),
            data: defaultStr(
              appPipeline?.aosParams?.coldLogTransition?.replace("d", ""),
              "-"
            ),
          },
          {
            label: t("servicelog:lifecycle.retention"),
            data: defaultStr(
              appPipeline?.aosParams?.logRetention?.replace("d", ""),
              "-"
            ),
          },
        ]}
      />
    );
  }
  return (
    <HeaderWithValueLabel
      numberOfColumns={3}
      headerTitle={t("pipeline.detail.lifeCycle")}
      dataList={[
        {
          label: t("servicelog:lifecycle.warmLog"),
          data:
            ternary(
              servicePipeline?.warmAge === "1s",
              t("servicelog:cluster.warmImmediately"),
              servicePipeline?.warmAge?.toString().replace("d", "")
            ) ||
            servicePipeline?.warnRetention ||
            "-",
        },
        {
          label: t("servicelog:lifecycle.coldLog"),
          data:
            servicePipeline?.coldAge?.toString().replace("d", "") ||
            servicePipeline?.coldRetention ||
            "-",
        },
        {
          label: t("servicelog:lifecycle.retention"),
          data:
            servicePipeline?.retainAge?.toString().replace("d", "") ||
            servicePipeline?.logRetention ||
            "-",
        },
      ]}
    />
  );
};

export default LifecycleOpenSearch;
