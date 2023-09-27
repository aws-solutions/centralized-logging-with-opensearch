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
import { PipelineType } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import LoadingText from "components/LoadingText";
import Status, { StatusType } from "components/Status/Status";
import { getPipelineAlarm } from "graphql/queries";
import React, { useState, useEffect } from "react";

interface AlarmStatusProps {
  pipelineId: string;
  type: PipelineType;
  alarmName: string;
  refreshCount: number;
}

const AlarmStatus: React.FC<AlarmStatusProps> = (props: AlarmStatusProps) => {
  const { pipelineId, type, alarmName, refreshCount } = props;
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [status, setStatus] = useState("");
  const getAlarmStatus = async () => {
    try {
      setLoadingStatus(true);
      const statusRes: any = await appSyncRequestQuery(getPipelineAlarm, {
        alarmName: alarmName,
        pipelineId: pipelineId,
        pipelineType: type,
      });
      console.info("statusRes:", statusRes);
      setStatus(
        statusRes?.data?.getPipelineAlarm?.alarms?.[0]?.status ||
          StatusType.Unknown
      );
      setLoadingStatus(false);
    } catch (error) {
      console.error(error);
      setLoadingStatus(false);
    }
  };
  useEffect(() => {
    getAlarmStatus();
  }, [refreshCount]);

  return loadingStatus ? <LoadingText /> : <Status status={status} />;
};

export default AlarmStatus;
