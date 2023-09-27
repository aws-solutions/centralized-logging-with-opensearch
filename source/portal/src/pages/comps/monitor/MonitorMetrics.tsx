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
import { MetricName, PipelineType } from "API";
import React from "react";
import LineChart from "./LineChart";

export interface MonitorMetricsType {
  title: string;
  graphTitle: MetricName;
  yUnit: string;
}

interface MonitorMetricsProps {
  type: PipelineType;
  taskId: string;
  metrics: MonitorMetricsType[];
  startTime: number;
  endTime: number;
  refreshCount: number;
}

const MonitorMetrics: React.FC<MonitorMetricsProps> = (
  props: MonitorMetricsProps
) => {
  const { type, taskId, metrics, startTime, endTime, refreshCount } = props;
  return (
    <div className="monitor-chart-list">
      {metrics.map((element) => {
        return (
          <div className="monitor-chart" key={`${element.graphTitle}`}>
            <LineChart
              type={type}
              taskId={taskId}
              graphTitle={element.title}
              yAxisUnit={element.yUnit}
              graphName={element.graphTitle}
              startTime={startTime}
              endTime={endTime}
              refreshCount={refreshCount}
            />
          </div>
        );
      })}
    </div>
  );
};

export default MonitorMetrics;
