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
import { MonitorInput, PipelineType } from "API";
import Alarm from "pages/pipelineAlarm/Alarm";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import { Dispatch } from "redux";
import {
  CreateAlarmActionTypes,
  CreateAlarmActions,
} from "reducer/createAlarm";

interface CreateAlarmsProps {
  type: PipelineType;
}

const CreateAlarms: React.FC<CreateAlarmsProps> = (
  props: CreateAlarmsProps
) => {
  const { type } = props;
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

  return (
    <div>
      <Alarm
        pageType="create"
        type={type}
        changeTopicName={(name) => {
          updateMonitorFields({ snsTopicName: name });
        }}
        changeEmails={(emails) => {
          updateMonitorFields({ emails: emails });
        }}
        changePipelineMonitor={(newMonitor) => {
          console.info("monitor:", monitor);
          console.info("newMonitor:", newMonitor);
          dispatch({
            type: CreateAlarmActionTypes.ON_ALARM_CHANGE,
            alarm: { ...monitor, ...newMonitor },
          });
        }}
      />
    </div>
  );
};

export default CreateAlarms;
