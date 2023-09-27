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
import { MetricName, AppPipeline, PipelineType } from "API";
import MonitorMetrics from "pages/comps/monitor/MonitorMetrics";

interface AppLogKDSBufferMetricsProps {
  pipelineInfo?: AppPipeline;
  startDate: number;
  endDate: number;
  refreshCount: number;
}

const AppLogKDSBufferMetrics: React.FC<AppLogKDSBufferMetricsProps> = (
  props: AppLogKDSBufferMetricsProps
) => {
  const { pipelineInfo, startDate, endDate, refreshCount } = props;
  const AppLogKDSBufferMetricsChartList = [
    {
      title: MetricName.KDSIncomingBytes,
      graphTitle: MetricName.KDSIncomingBytes,
      yUnit: "Bytes",
    },
    {
      title: MetricName.KDSIncomingRecords,
      graphTitle: MetricName.KDSIncomingRecords,
      yUnit: "Count",
    },
    {
      title: MetricName.KDSPutRecordsBytes,
      graphTitle: MetricName.KDSPutRecordsBytes,
      yUnit: "Bytes",
    },
    {
      title: MetricName.KDSThrottledRecords,
      graphTitle: MetricName.KDSThrottledRecords,
      yUnit: "Count",
    },
    {
      title: MetricName.KDSWriteProvisionedThroughputExceeded,
      graphTitle: MetricName.KDSWriteProvisionedThroughputExceeded,
      yUnit: "Bytes",
    },
  ];
  return (
    <MonitorMetrics
      type={PipelineType.APP}
      taskId={pipelineInfo?.pipelineId || ""}
      metrics={AppLogKDSBufferMetricsChartList}
      startTime={startDate}
      endTime={endDate}
      refreshCount={refreshCount}
    />
  );
};

export default AppLogKDSBufferMetrics;
