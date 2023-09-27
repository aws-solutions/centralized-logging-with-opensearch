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
import { ServiceMetricProps } from "../../Monitoring";
import MonitorMetrics from "pages/comps/monitor/MonitorMetrics";

const CloudTrailCWLBufferMetrics: React.FC<ServiceMetricProps> = (
  props: ServiceMetricProps
) => {
  const { pipelineInfo, startDate, endDate, refreshCount } = props;
  const CloudTrailCWLBufferMetricsChartList = [
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
      type={PipelineType.SERVICE}
      taskId={pipelineInfo?.id || ""}
      metrics={CloudTrailCWLBufferMetricsChartList}
      startTime={startDate}
      endTime={endDate}
      refreshCount={refreshCount}
    />
  );
};

export default CloudTrailCWLBufferMetrics;
