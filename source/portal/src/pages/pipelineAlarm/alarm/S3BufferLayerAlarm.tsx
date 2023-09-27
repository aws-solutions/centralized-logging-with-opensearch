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
import AlarmTable from "./AlarmTable";
import { AlarmMetricName } from "API";
import { AlarmItemProps } from "../Alarm";
import { useTranslation } from "react-i18next";

const S3BufferLayerAlarm: React.FC<AlarmItemProps> = (
  props: AlarmItemProps
) => {
  const { pipelineId, type, refreshCount } = props;
  const { t } = useTranslation();
  const ALARM_LIST = [
    {
      name: AlarmMetricName.OLDEST_MESSAGE_AGE_ALARM,
    },
  ];
  return (
    <div>
      <AlarmTable
        type={type}
        headerText={t("common:alarm.bufferLayerAlarms")}
        pipelineId={pipelineId}
        alarmList={ALARM_LIST}
        refreshCount={refreshCount}
      />
    </div>
  );
};

export default S3BufferLayerAlarm;
