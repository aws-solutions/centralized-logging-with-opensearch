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

import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import Tiles from "components/Tiles";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AnalyticEngineTypes } from "../serviceLog/create/common/SpecifyAnalyticsEngine";
import { AppLogSourceType, ServiceLogType } from "assets/js/const";
import { PipelineType } from "API";
import { ServicePipelineDesc } from "../serviceLog/create/common/desc/ServicePipelineDesc";
import { AppPipelineDesc } from "../applicationLog/common/AppPipelineDesc";

const LIGHT_ENGINE_SUPPORTED_LOG_TYPES = [
  ServiceLogType.Amazon_WAF,
  ServiceLogType.Amazon_CloudFront,
  ServiceLogType.Amazon_ELB,
] as string[];

const LIGHT_ENGINE_SUPPORTED_APP_LOG_TYPES = [
  AppLogSourceType.EC2,
  AppLogSourceType.EKS,
] as string[];

export interface SelectAnalyticsEngineProps {
  pipelineType: PipelineType;
  engineType: AnalyticEngineTypes;
  svcLogType?: ServiceLogType;
  appLogType?: AppLogSourceType;
  setEngineType: (engineType: AnalyticEngineTypes) => void;
}

export const SelectAnalyticsEngine = ({
  engineType,
  setEngineType,
  pipelineType,
  svcLogType,
  appLogType,
}: SelectAnalyticsEngineProps) => {
  const { t } = useTranslation();
  const isLightEngineSupported = useMemo(
    () =>
      LIGHT_ENGINE_SUPPORTED_LOG_TYPES.includes(svcLogType ?? "") ||
      LIGHT_ENGINE_SUPPORTED_APP_LOG_TYPES.includes(appLogType ?? ""),
    [svcLogType, appLogType]
  );
  return (
    <HeaderPanel title={t("lightengine:engine.selectEngineSectionTitle")}>
      <FormItem>
        <Tiles
          value={engineType}
          onChange={(event) => {
            setEngineType(event.target.value as AnalyticEngineTypes);
          }}
          items={[
            {
              label: t("lightengine:engine.optionOpenSearch"),
              description: t("lightengine:engine.descOpenSearch"),
              value: AnalyticEngineTypes.OPENSEARCH,
            },
            ...(isLightEngineSupported
              ? [
                  {
                    label: t("lightengine:engine.optionLightEngine"),
                    description: t("lightengine:engine.descLightEngine"),
                    value: AnalyticEngineTypes.LIGHT_ENGINE,
                  },
                ]
              : []),
          ]}
        />
      </FormItem>
      {pipelineType === PipelineType.SERVICE ? (
        <ServicePipelineDesc
          logType={svcLogType ?? ServiceLogType.Amazon_CloudFront}
          engineType={engineType}
        />
      ) : (
        <AppPipelineDesc type={appLogType ?? AppLogSourceType.EC2} engineType={engineType} />
      )}
    </HeaderPanel>
  );
};
