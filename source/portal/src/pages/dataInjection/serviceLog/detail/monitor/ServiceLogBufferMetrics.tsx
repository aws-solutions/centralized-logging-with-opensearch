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
import { ServiceMetricProps } from "../Monitoring";
import MonitorMetrics from "pages/comps/monitor/MonitorMetrics";

const ServiceLogBufferMetrics: React.FC<ServiceMetricProps> = (
  props: ServiceMetricProps
) => {
  const { pipelineInfo, startDate, endDate, refreshCount } = props;
  const ServiceLogBufferMetricsChartList = [
    {
      title: MetricName.SQSNumberOfMessagesSent,
      graphTitle: MetricName.SQSNumberOfMessagesSent,
      yUnit: "Count",
    },
    {
      title: MetricName.SQSNumberOfMessagesDeleted,
      graphTitle: MetricName.SQSNumberOfMessagesDeleted,
      yUnit: "Count",
    },
    {
      title: MetricName.SQSApproximateNumberOfMessagesVisible,
      graphTitle: MetricName.SQSApproximateNumberOfMessagesVisible,
      yUnit: "Count",
    },
    {
      title: MetricName.SQSApproximateAgeOfOldestMessage,
      graphTitle: MetricName.SQSApproximateAgeOfOldestMessage,
      yUnit: "Count",
    },
  ];
  return (
    <MonitorMetrics
      type={PipelineType.SERVICE}
      taskId={pipelineInfo?.id || ""}
      metrics={ServiceLogBufferMetricsChartList}
      startTime={startDate}
      endTime={endDate}
      refreshCount={refreshCount}
    />
  );
};

export default ServiceLogBufferMetrics;
