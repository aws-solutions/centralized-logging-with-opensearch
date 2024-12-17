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
import { AppPipeline, PipelineType, MetricName, LogEventQueueType } from "API";
import MonitorMetrics from "pages/comps/monitor/MonitorMetrics";
import { defaultStr } from "assets/js/utils";

interface AppLogBufferMetricsProps {
  pipelineInfo?: AppPipeline;
  startDate: number;
  endDate: number;
  refreshCount: number;
}

const AppLogSQSBufferMetrics: React.FC<AppLogBufferMetricsProps> = (
  props: AppLogBufferMetricsProps
) => {
  const { pipelineInfo, startDate, endDate, refreshCount } = props;
  let AppLogBufferMetricsChartList = [
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
  if (pipelineInfo?.logEventQueueType === LogEventQueueType.EventBridge) {
    AppLogBufferMetricsChartList = [
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
    ];
  }
  return (
    <MonitorMetrics
      type={PipelineType.APP}
      taskId={defaultStr(pipelineInfo?.pipelineId)}
      metrics={AppLogBufferMetricsChartList}
      startTime={startDate}
      endTime={endDate}
      refreshCount={refreshCount}
    />
  );
};

export default AppLogSQSBufferMetrics;
