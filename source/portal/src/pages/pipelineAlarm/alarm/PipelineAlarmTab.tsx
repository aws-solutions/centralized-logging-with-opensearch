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
import {
  AppPipeline,
  MonitorDetail,
  MonitorInput,
  PipelineType,
  ServiceType,
} from "API";
import { ServiceLogDetailProps } from "pages/dataInjection/serviceLog/ServiceLogDetail";
import Alert from "components/Alert";
import { useTranslation } from "react-i18next";
import {
  CreateAlarmActionTypes,
  CreateAlarmActions,
} from "reducer/createAlarm";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch } from "redux";
import { RootState } from "reducer/reducers";
import Alarm from "../Alarm";

interface AppPipelineAlarmProps {
  type: PipelineType;
  pipelineInfo?: AppPipeline;
  servicePipeline?: ServiceLogDetailProps;
  changePipelineMonitor: (monitor?: MonitorDetail | null) => void;
}

const PipelineAlarmTab: React.FC<AppPipelineAlarmProps> = (
  props: AppPipelineAlarmProps
) => {
  const { t } = useTranslation();
  const { type, pipelineInfo, servicePipeline, changePipelineMonitor } = props;
  const monitor = useSelector((state: RootState) => state.createAlarm.monitor);

  const dispatch = useDispatch<Dispatch<CreateAlarmActions>>();
  const updateMonitorFields = (fields: Partial<MonitorInput>) => {
    console.info("updateMonitorFields:fields:", fields);
    dispatch({
      type: CreateAlarmActionTypes.ON_ALARM_CHANGE,
      alarm: { ...monitor, ...fields },
    });
    dispatch({
      type: CreateAlarmActionTypes.VALIDATE_ALARM_INPUT,
    });
  };

  if (
    type === PipelineType.SERVICE &&
    servicePipeline?.type === ServiceType.WAFSampled
  ) {
    return <Alert content={t("alarm.notSupport")} />;
  }
  return (
    <Alarm
      servicePipeline={servicePipeline}
      pipelineInfo={pipelineInfo}
      pageType="detail"
      type={type}
      changeTopicName={(name) => {
        updateMonitorFields({ snsTopicName: name });
      }}
      changeEmails={(emails) => {
        updateMonitorFields({ emails: emails });
      }}
      changePipelineMonitor={(newMonitor) => {
        changePipelineMonitor(newMonitor);
      }}
    />
  );
};

export default PipelineAlarmTab;
