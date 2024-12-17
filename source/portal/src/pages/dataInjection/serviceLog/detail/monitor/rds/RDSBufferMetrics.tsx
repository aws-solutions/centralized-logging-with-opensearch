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
import { LogEventQueueType, MetricName, PipelineType } from "API";
import { ServiceMetricProps } from "../../Monitoring";
import MonitorMetrics from "pages/comps/monitor/MonitorMetrics";

const RDSBufferMetrics: React.FC<ServiceMetricProps> = (
  props: ServiceMetricProps
) => {
  const { pipelineInfo, startDate, endDate, refreshCount, isLightEngine } =
    props;
  let RDSBufferMetricsChartList = [
    ...(isLightEngine
      ? [
          {
            title: MetricName.KDFIncomingBytes,
            graphTitle: MetricName.KDFIncomingBytes,
            yUnit: "Bytes",
          },
          {
            title: MetricName.KDFIncomingRecords,
            graphTitle: MetricName.KDFIncomingRecords,
            yUnit: "Count",
          },
          {
            title: MetricName.KDFDeliveryToS3Bytes,
            graphTitle: MetricName.KDFDeliveryToS3Bytes,
            yUnit: "Bytes",
          },
        ]
      : []),
  ];
  if (pipelineInfo?.logEventQueueType === LogEventQueueType.EventBridge) {
    RDSBufferMetricsChartList = RDSBufferMetricsChartList.concat([
      {
        title: MetricName.EvtMatchedEvents,
        graphTitle: MetricName.EvtMatchedEvents,
        yUnit: "Count",
      },
      {
        title: MetricName.EvtInvocations,
        graphTitle: MetricName.EvtInvocations,
        yUnit: "Count",
      },
      {
        title: MetricName.EvtTriggeredRules,
        graphTitle: MetricName.EvtTriggeredRules,
        yUnit: "Count",
      },
      {
        title: MetricName.EvtFailedInvocations,
        graphTitle: MetricName.EvtFailedInvocations,
        yUnit: "Count",
      },
    ]);
  } else {
    RDSBufferMetricsChartList = RDSBufferMetricsChartList.concat([
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
        yUnit: "Seconds",
      },
    ]);
  }

  return (
    <MonitorMetrics
      type={PipelineType.SERVICE}
      taskId={pipelineInfo?.id || ""}
      metrics={RDSBufferMetricsChartList}
      startTime={startDate}
      endTime={endDate}
      refreshCount={refreshCount}
    />
  );
};

export default RDSBufferMetrics;
