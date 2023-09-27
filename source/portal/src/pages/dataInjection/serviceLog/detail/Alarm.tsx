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
import { MonitorDetail, PipelineType } from "API";
import React from "react";
import { ServiceLogDetailProps } from "../ServiceLogDetail";
import PipelineAlarmTab from "pages/pipelineAlarm/alarm/PipelineAlarmTab";

export interface LogSourceAlarmType {
  name: string;
  sourceType: string;
  resourceId: string;
  status: string;
}

export interface AlarmItemProps {
  pipelineId: string;
}

interface MonitoringProps {
  pipelineInfo: ServiceLogDetailProps | undefined;
  changePipelineMonitor: (monitor?: MonitorDetail | null) => void;
}

const Alarm: React.FC<MonitoringProps> = (props: MonitoringProps) => {
  const { pipelineInfo, changePipelineMonitor } = props;

  return (
    <PipelineAlarmTab
      type={PipelineType.SERVICE}
      servicePipeline={pipelineInfo}
      changePipelineMonitor={(monitor) => {
        changePipelineMonitor(monitor);
      }}
    />
  );
};

export default Alarm;
