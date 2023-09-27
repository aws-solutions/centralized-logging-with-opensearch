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
/* eslint-disable react/display-name */
import React, { useState, useEffect } from "react";
import { SelectType, TablePanel } from "components/TablePanel";
import { Link } from "react-router-dom";
import { Pagination } from "@material-ui/lab";
import { EC2GroupType, LogSource, LogSourceType } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { listLogSources } from "graphql/queries";
import Button from "components/Button";
import { formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import ExtButton from "components/ExtButton";
import { Validator } from "pages/comps/Validator";
import { useAutoValidation } from "assets/js/hooks/useAutoValidation";
import ButtonRefresh from "components/ButtonRefresh";

const PAGE_SIZE = 10;

interface ChooseInstanceGroupTableProps {
  value: LogSource[];
  setValue: React.Dispatch<React.SetStateAction<LogSource[]>>;
  validator: Validator;
}

const ChooseInstanceGroupTable: React.FC<ChooseInstanceGroupTableProps> = (
  props: ChooseInstanceGroupTableProps
) => {
  const { t } = useTranslation();
  const [loadingData, setLoadingData] = useState(false);
  const [instanceGroupList, setInstanceGroupList] = useState<LogSource[]>([]);
  const [curPage, setCurPage] = useState(1);
  const [totoalCount, setTotoalCount] = useState(0);

  const handlePageChange = (event: any, value: number) => {
    console.info("event:", event);
    console.info("value:", value);
    setCurPage(value);
  };

  const getInstanceGroupList = async () => {
    try {
      setLoadingData(true);
      setInstanceGroupList([]);
      const resData: any = await appSyncRequestQuery(listLogSources, {
        page: curPage,
        count: PAGE_SIZE,
        type: LogSourceType.EC2,
      });
      console.info("resData:", resData);
      const dataInstanceGroupList: LogSource[] =
        resData.data.listLogSources.logSources;
      setTotoalCount(resData.data.listLogSources.total);
      setInstanceGroupList(dataInstanceGroupList);
      setLoadingData(false);
    } catch (error) {
      console.error(error);
    }
  };

  // Get instance group list when page rendered.
  useEffect(() => {
    getInstanceGroupList();
  }, [curPage]);

  useAutoValidation(props.validator, [props.value]);

  const renderGroupName = (data: LogSource) => {
    return (
      <Link to={`/resources/instance-group/detail/${data.sourceId}`}>
        {data.ec2?.groupName}
      </Link>
    );
  };

  return (
    <div className="mt-20 pb-20">
      <div className="table-data">
        <TablePanel
          trackId="sourceId"
          title={t("resource:group.name") + `(${instanceGroupList.length})`}
          desc={t("applog:logSourceDesc.ec2.step1.titleDesc") || ""}
          defaultSelectItem={[]}
          changeSelected={(item) => {
            props.setValue(item);
          }}
          errorText={props.validator.error}
          loading={loadingData}
          selectType={SelectType.RADIO}
          columnDefinitions={[
            {
              // width: 110,
              id: "Name",
              header: t("applog:ingestion.chooseInstanceGroup.list.name"),
              cell: (e: LogSource) => renderGroupName(e),
            },
            {
              id: "Account",
              header: t("resource:group.list.account"),
              cell: (e: LogSource) => {
                return e.accountId;
              },
            },
            {
              id: "Type",
              header: t("resource:group.list.type"),
              cell: (e: LogSource) => {
                return e.ec2?.groupType === EC2GroupType.ASG
                  ? "EC2/ASG"
                  : e.ec2?.groupType;
              },
            },
            {
              width: 170,
              id: "created",
              header: t("applog:ingestion.chooseInstanceGroup.list.created"),
              cell: (e: LogSource) => {
                return formatLocalTime(e?.createdAt || "");
              },
            },
          ]}
          items={instanceGroupList}
          actions={
            <div>
              <Button
                btnType="icon"
                disabled={loadingData}
                onClick={() => {
                  if (curPage === 1) {
                    getInstanceGroupList();
                  } else {
                    setCurPage(1);
                  }
                }}
              >
                <ButtonRefresh loading={loadingData} />
              </Button>
              <ExtButton to="/resources/instance-group/create">
                {t("button.createInstanceGroup")}
              </ExtButton>
            </div>
          }
          pagination={
            <Pagination
              count={Math.ceil(totoalCount / PAGE_SIZE)}
              page={curPage}
              onChange={handlePageChange}
              size="small"
            />
          }
        />
      </div>
    </div>
  );
};

export default ChooseInstanceGroupTable;
