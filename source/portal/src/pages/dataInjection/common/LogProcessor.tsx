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
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  buildLambdaLink,
  buildOSILink,
  defaultStr,
  ternary,
} from "assets/js/utils";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";

const buildResourceLink = (
  type: "lambda" | "osi",
  region: string,
  sourceName: string
) => {
  if (type === "lambda") {
    return buildLambdaLink(region, defaultStr(sourceName.split("/").pop()));
  } else {
    return buildOSILink(region, sourceName);
  }
};

interface LogProcessorProps {
  amplifyConfig?: AmplifyConfigType;
  osiParams?: {
    minCapacity?: string | number | null;
    maxCapacity?: string | number | null;
  } | null;
  osiPipelineName?: string | null;
  processorLambda?: string | null;
  logProcessorConcurrency?: string | null;
}

const LogProcessor: React.FC<LogProcessorProps> = (
  props: LogProcessorProps
) => {
  const { t } = useTranslation();
  const {
    osiParams,
    osiPipelineName,
    processorLambda,
    amplifyConfig,
    logProcessorConcurrency,
  } = props;

  const buildSourceLink = (isOsi: boolean) => {
    if (!osiPipelineName && !processorLambda) {
      return "-";
    }
    return (
      <ExtLink
        to={buildResourceLink(
          ternary(isOsi, "osi", "lambda"),
          defaultStr(amplifyConfig?.aws_project_region),
          ternary(
            isOsi,
            defaultStr(osiPipelineName),
            defaultStr(processorLambda)
          )
        )}
      >
        {ternary(isOsi, osiPipelineName, processorLambda)}
      </ExtLink>
    );
  };

  const createDataList = (isOsi: boolean) => {
    // 基础的dataList数组
    const dataList = [
      {
        label: t("servicelog:detail.processor.type"),
        data: defaultStr(
          ternary(
            isOsi,
            t("servicelog:detail.processor.osi"),
            t("servicelog:detail.processor.lambda")
          )
        ),
      },
      {
        label: t("servicelog:detail.processor.resource"),
        data: buildSourceLink(isOsi),
      },
    ];

    // 如果是OSI类型，我们添加额外的信息
    if (isOsi) {
      dataList.push({
        label: t("servicelog:detail.processor.pipelineCapacity"),
        data: `${osiParams?.minCapacity} - ${osiParams?.maxCapacity} (${t(
          "servicelog:detail.processor.ingestionOCU"
        )})`,
      });
    } else {
      dataList.push({
        label: t("servicelog:detail.processor.concurrency"),
        data: defaultStr(logProcessorConcurrency, "-"),
      });
    }

    return dataList;
  };

  const isOsi = !!osiParams?.minCapacity;
  return (
    <HeaderWithValueLabel
      numberOfColumns={3}
      headerTitle={t("servicelog:tab.logProcessor")}
      dataList={createDataList(isOsi)}
    />
  );
};

export default LogProcessor;
