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
import { AnalyticEngineType, MetricName, PipelineType } from "API";
import { ServiceMetricProps } from "../Monitoring";
import MonitorMetrics from "pages/comps/monitor/MonitorMetrics";
import { LightEngineLambdaMetrics } from "pages/dataInjection/common/LightEngineMonitor";

export const ServiceLogLambdaBufferCommonMetrics = [
  {
    title: MetricName.TotalLogs,
    graphTitle: MetricName.TotalLogs,
    yUnit: "Count",
  },
  {
    title: MetricName.FailedLogs,
    graphTitle: MetricName.FailedLogs,
    yUnit: "Count",
  },
  {
    title: MetricName.ProcessorFnError,
    graphTitle: MetricName.ProcessorFnError,
    yUnit: "Count",
  },
  {
    title: MetricName.ProcessorFnConcurrentExecutions,
    graphTitle: MetricName.ProcessorFnConcurrentExecutions,
    yUnit: "Count",
  },
  {
    title: MetricName.ProcessorFnDuration,
    graphTitle: MetricName.ProcessorFnDuration,
    yUnit: "Millisecond",
  },
  {
    title: MetricName.ProcessorFnThrottles,
    graphTitle: MetricName.ProcessorFnThrottles,
    yUnit: "Count",
  },
  {
    title: MetricName.ProcessorFnInvocations,
    graphTitle: MetricName.ProcessorFnInvocations,
    yUnit: "Count",
  },
];

ServiceLogLambdaBufferCommonMetrics.splice(
  2,
  0,
  ...[
    {
      title: MetricName.ExcludedLogs,
      graphTitle: MetricName.ExcludedLogs,
      yUnit: "Count",
    },
    {
      title: MetricName.LoadedLogs,
      graphTitle: MetricName.LoadedLogs,
      yUnit: "Count",
    },
  ]
);

const ServiceLogProcessorMetric: React.FC<ServiceMetricProps> = (
  props: ServiceMetricProps
) => {
  const { pipelineInfo, startDate, endDate, refreshCount } = props;
  const metrics =
    pipelineInfo?.engineType === AnalyticEngineType.LightEngine
      ? LightEngineLambdaMetrics
      : ServiceLogLambdaBufferCommonMetrics;

  return (
    <MonitorMetrics
      type={PipelineType.SERVICE}
      taskId={pipelineInfo?.id || ""}
      metrics={metrics}
      startTime={startDate}
      endTime={endDate}
      refreshCount={refreshCount}
    />
  );
};

export default ServiceLogProcessorMetric;
