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
import { MetricName, PipelineType } from "API";
import MonitorMetrics from "pages/comps/monitor/MonitorMetrics";
import ValueWithLabel from "components/ValueWithLabel";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { buildOSILink, defaultStr } from "assets/js/utils";
import { useTranslation } from "react-i18next";

export const OSIProcessorCommonMetrics = [
  {
    title: MetricName.OSIBytesTransmitted,
    graphTitle: MetricName.OSIBytesTransmitted,
    yUnit: "Count",
  },
  {
    title: MetricName.OSIDocumentsWritten,
    graphTitle: MetricName.OSIDocumentsWritten,
    yUnit: "Count",
  },
  {
    title: MetricName.OSIDocumentsFailedWrite,
    graphTitle: MetricName.OSIDocumentsFailedWrite,
    yUnit: "Count",
  },
  {
    title: MetricName.OSIDocumentsRetriedWrite,
    graphTitle: MetricName.OSIDocumentsRetriedWrite,
    yUnit: "Count",
  },
  {
    title: MetricName.OSIDLQS3RecordsSuccess,
    graphTitle: MetricName.OSIDLQS3RecordsSuccess,
    yUnit: "Count",
  },
  {
    title: MetricName.OSIDLQS3RecordsFailed,
    graphTitle: MetricName.OSIDLQS3RecordsFailed,
    yUnit: "Count",
  },
];

export interface OSIProcessorMetricProps {
  osiPipelineName?: string | null;
  amplifyConfig: AmplifyConfigType;
  type: PipelineType;
  pipelineId: string;
  startDate: number;
  endDate: number;
  refreshCount: number;
}

const OSIProcessorMetric: React.FC<OSIProcessorMetricProps> = (
  props: OSIProcessorMetricProps
) => {
  const { t } = useTranslation();
  const {
    amplifyConfig,
    osiPipelineName,
    type,
    pipelineId,
    startDate,
    endDate,
    refreshCount,
  } = props;
  return (
    <div>
      <div className="flex">
        <ValueWithLabel label={t("common:monitoring.osiProcessor")}>
          <ExtLink
            to={buildOSILink(
              amplifyConfig.aws_project_region,
              defaultStr(osiPipelineName)
            )}
          >
            {defaultStr(osiPipelineName)}
          </ExtLink>
        </ValueWithLabel>
      </div>
      <MonitorMetrics
        type={type}
        taskId={pipelineId}
        metrics={OSIProcessorCommonMetrics}
        startTime={startDate}
        endTime={endDate}
        refreshCount={refreshCount}
      />
    </div>
  );
};

export default OSIProcessorMetric;
