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
import {
  ServiceType,
  DestinationType,
  AnalyticsEngine as AnalyticsEngineType,
  AppPipeline,
  PipelineType,
} from "API";
import {
  defaultStr,
  buildGlueTableLink,
  buildCfnLink,
  buildESLink,
  formatLocalTime,
  ternary,
} from "assets/js/utils";
import ExtLink from "components/ExtLink";
import { t } from "i18next";
import HeaderWithValueLabel, {
  LabelValueDataItem,
} from "pages/comps/HeaderWithValueLabel";
import { ServiceLogDetailProps } from "pages/dataInjection/serviceLog/ServiceLogDetail";
import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import { AmplifyConfigType } from "types";
import PipelineStatusComp from "../PipelineStatus";

interface GeneralConfigProps {
  isLightEngine: boolean;
  servicePipeline?: ServiceLogDetailProps;
  analyticsEngine?: AnalyticsEngineType;
  appPipeline?: AppPipeline;
  pipelineType: PipelineType;
}

const GeneralConfig: React.FC<GeneralConfigProps> = ({
  isLightEngine,
  pipelineType,
  servicePipeline,
  appPipeline,
  analyticsEngine,
}) => {
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  // New Detail Logic
  const buildCloudFrontFields = (): LabelValueDataItem | undefined => {
    if (
      servicePipeline?.type === ServiceType.CloudFront &&
      servicePipeline.destinationType === DestinationType.KDS
    ) {
      return {
        label: t("servicelog:detail.fields"),
        data: servicePipeline?.fieldNames,
      };
    }
  };

  const buildOpenSearchIndexInfo = () => {
    const openSearchIndexInfo: LabelValueDataItem[] = [
      {
        label: t("pipeline.detail.openSearchIndex"),
        data:
          pipelineType === PipelineType.APP
            ? appPipeline?.aosParams?.indexPrefix
            : servicePipeline?.esIndex,
      },
    ];
    return [...openSearchIndexInfo];
  };

  const buildLightEngineTableInfo = () => [
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
  ];

  const buildGrafanaDashboardInfo = () => [
    {
      label: t("pipeline.detail.analyticsEngine"),
      data: t("pipeline.detail.lightEngine"),
    },
  ];

  const buildCFNStackInfo = () => {
    return [
      {
        label: t("pipeline.detail.cloudformationStack"),
        data:
          pipelineType === PipelineType.APP
            ? ternary(
                appPipeline?.stackId,
                <ExtLink
                  to={buildCfnLink(
                    amplifyConfig.aws_project_region,
                    defaultStr(appPipeline?.stackId, "")
                  )}
                >
                  {defaultStr(appPipeline?.stackId?.split("/")?.[1], "-")}
                </ExtLink>,
                <>-</>
              )
            : ternary(
                servicePipeline?.stackId,
                <ExtLink
                  to={buildCfnLink(
                    amplifyConfig.aws_project_region,
                    servicePipeline?.stackId ?? ""
                  )}
                >
                  {servicePipeline?.stackId?.match(/:stack\/(.*?)\//)?.[1]}
                </ExtLink>,
                <>-</>
              ),
      },
    ];
  };

  const buildOpenSearchInfo = () => {
    const openSearchInfo: LabelValueDataItem[] = [
      {
        label: t("pipeline.detail.analyticsEngine"),
        data:
          pipelineType === PipelineType.APP ? (
            <ExtLink
              to={buildESLink(
                amplifyConfig.aws_project_region,
                defaultStr(appPipeline?.aosParams?.domainName)
              )}
            >
              {defaultStr(appPipeline?.aosParams?.domainName, "-")}
            </ExtLink>
          ) : (
            <ExtLink
              to={buildESLink(
                amplifyConfig.aws_project_region,
                defaultStr(servicePipeline?.esName)
              )}
            >
              {servicePipeline?.esName}
            </ExtLink>
          ),
      },
    ];
    return [...openSearchInfo];
  };

  const buildPipelineStatusInfo = (): LabelValueDataItem[] => {
    return [
      {
        label: t("applog:list.status"),
        data:
          pipelineType === PipelineType.APP ? (
            <PipelineStatusComp
              status={defaultStr(appPipeline?.status)}
              error={appPipeline?.error}
              stackId={appPipeline?.stackId}
            />
          ) : (
            <PipelineStatusComp
              status={defaultStr(servicePipeline?.status)}
              error={servicePipeline?.error}
              stackId={servicePipeline?.stackId}
            />
          ),
      },
    ];
  };

  const buildCreateTimeInfo = (): LabelValueDataItem[] => {
    return [
      {
        label: t("pipeline.detail.created"),
        data:
          pipelineType === PipelineType.APP
            ? formatLocalTime(defaultStr(appPipeline?.createdAt))
            : formatLocalTime(defaultStr(servicePipeline?.createTime)),
      },
    ];
  };
  return (
    <HeaderWithValueLabel
      numberOfColumns={5}
      headerTitle={t("pipeline.detail.generalConfig")}
      fixedDataList={[
        isLightEngine
          ? buildLightEngineTableInfo()
          : buildOpenSearchIndexInfo(),
        buildCFNStackInfo(),
        isLightEngine ? buildGrafanaDashboardInfo() : buildOpenSearchInfo(),
        buildPipelineStatusInfo(),
        buildCreateTimeInfo(),
      ]}
      additionalData={buildCloudFrontFields()}
    />
  );
};

export default GeneralConfig;
