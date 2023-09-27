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
import { LogSourceType } from "API";
import { SelectType, TablePanel } from "components/TablePanel";
import React from "react";
import { Link } from "react-router-dom";
import { LogSourceAlarmType } from "../Alarm";
import { useTranslation } from "react-i18next";
import Status from "components/Status/Status";

interface LogSourceAlarmProps {
  loadingData: boolean;
  flbSourceAlarmList: LogSourceAlarmType[];
}

const LogSourceAlarm: React.FC<LogSourceAlarmProps> = (
  props: LogSourceAlarmProps
) => {
  const { t } = useTranslation();
  const { loadingData, flbSourceAlarmList } = props;

  const renderIngestionId = (data: any) => {
    if (data.sourceType === LogSourceType.EKSCluster) {
      return (
        <Link
          to={`/containers/eks-log/${data.sourceId}/ingestion/detail/${data.resourceId}`}
        >
          {data.resourceId}
        </Link>
      );
    }
    if (
      data.sourceType === LogSourceType.EC2 ||
      data.sourceType === LogSourceType.S3 ||
      data.sourceType === LogSourceType.Syslog
    ) {
      return (
        <Link
          to={`/log-pipeline/application-log/ingestion/detail/${data.resourceId}`}
        >
          {data.resourceId}
        </Link>
      );
    }
    return data.resourceId;
  };

  const renderStatus = (data: any) => {
    return <Status status={data.status || ""} />;
  };

  return (
    <div>
      <TablePanel
        trackId="name"
        noPadding
        changeSelected={(e) => {
          console.info(e);
        }}
        loading={loadingData}
        selectType={SelectType.NONE}
        columnDefinitions={[
          {
            id: "sourceAlarm",
            header: t("common:alarm.sourceAlarms"),
            cell: (e: any) => t(`alarm.list.${e.name}`),
          },
          {
            id: "ingestionId",
            header: t("common:alarm.ingestionId"),
            cell: (e: any) => renderIngestionId(e),
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
        items={flbSourceAlarmList}
        pagination={<></>}
      />
    </div>
  );
};

export default LogSourceAlarm;
