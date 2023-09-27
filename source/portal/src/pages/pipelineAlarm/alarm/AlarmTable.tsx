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
import { SelectType, TablePanel } from "components/TablePanel";
import React from "react";
import { useTranslation } from "react-i18next";
import AlarmStatus from "./AlarmStatus";
import { PipelineType } from "API";

interface AlarmTableProps {
  headerText: string;
  type: PipelineType;
  pipelineId: string;
  alarmList: any[];
  refreshCount: number;
}
const AlarmTable: React.FC<AlarmTableProps> = (props: AlarmTableProps) => {
  const { t } = useTranslation();
  const { headerText, pipelineId, type, alarmList, refreshCount } = props;
  const renderStatus = (data: any) => {
    return (
      <AlarmStatus
        pipelineId={pipelineId}
        type={type}
        alarmName={data.name}
        refreshCount={refreshCount}
      />
    );
  };
  return (
    <div>
      <TablePanel
        trackId="name"
        noPadding
        changeSelected={(e) => {
          console.info(e);
        }}
        selectType={SelectType.NONE}
        columnDefinitions={[
          {
            id: "bufferAlarm",
            header: headerText,
            cell: (e: any) => t(`alarm.list.${e.name}`),
          },
          {
            id: "status",
            header: t("common:alarm.status"),
            width: 200,
            cell: (e: any) => renderStatus(e),
          },
        ]}
        title=""
        actions={<></>}
        items={alarmList}
        pagination={<></>}
      />
    </div>
  );
};

export default AlarmTable;
