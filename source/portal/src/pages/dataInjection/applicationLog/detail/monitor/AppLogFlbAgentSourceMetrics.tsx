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
import { AppPipeline, PipelineType, MetricName } from "API";
import MonitorMetrics from "pages/comps/monitor/MonitorMetrics";

interface AppLogFlbAgentSourceMetricsProps {
  pipelineInfo?: AppPipeline;
  startDate: number;
  endDate: number;
  refreshCount: number;
}

const AppLogFlbAgentSourceMetrics: React.FC<
  AppLogFlbAgentSourceMetricsProps
> = (props: AppLogFlbAgentSourceMetricsProps) => {
  const { pipelineInfo, startDate, endDate, refreshCount } = props;
  const AppLogFLBAgentSourceMetricsChartList = [
    {
      title: MetricName.FluentBitOutputProcRecords,
      graphTitle: MetricName.FluentBitOutputProcRecords,
      yUnit: "Count",
    },
    {
      title: MetricName.FluentBitOutputProcBytes,
      graphTitle: MetricName.FluentBitOutputProcBytes,
      yUnit: "Bytes",
    },
    {
      title: MetricName.FluentBitOutputDroppedRecords,
      graphTitle: MetricName.FluentBitOutputDroppedRecords,
      yUnit: "Count",
    },
    {
      title: MetricName.FluentBitOutputErrors,
      graphTitle: MetricName.FluentBitOutputErrors,
      yUnit: "Count",
    },
    {
      title: MetricName.FluentBitOutputRetriedRecords,
      graphTitle: MetricName.FluentBitOutputRetriedRecords,
      yUnit: "Count",
    },
    {
      title: MetricName.FluentBitOutputRetriesFailed,
      graphTitle: MetricName.FluentBitOutputRetriesFailed,
      yUnit: "Count",
    },
    {
      title: MetricName.FluentBitOutputRetries,
      graphTitle: MetricName.FluentBitOutputRetries,
      yUnit: "Count",
    },
  ];
  return (
    <MonitorMetrics
      type={PipelineType.APP}
      taskId={pipelineInfo?.pipelineId || ""}
      metrics={AppLogFLBAgentSourceMetricsChartList}
      startTime={startDate}
      endTime={endDate}
      refreshCount={refreshCount}
    />
  );
};

export default AppLogFlbAgentSourceMetrics;
