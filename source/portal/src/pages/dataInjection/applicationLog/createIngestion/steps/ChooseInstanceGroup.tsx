/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
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
import RefreshIcon from "@material-ui/icons/Refresh";
import { Link } from "react-router-dom";
import { Pagination } from "@material-ui/lab";
import PagePanel from "components/PagePanel";
import { InstanceGroup, LogSourceType } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { listInstanceGroups } from "graphql/queries";
import { DEFAULT_PLATFORM } from "assets/js/const";
import Button from "components/Button";
import LoadingText from "components/LoadingText";
import { IngestionPropsType } from "../CreateIngestion";
import { formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 10;

interface ChooseInstanceGroupProps {
  ingestionInfo: IngestionPropsType;
  selectInstanceGroup: (groupList: InstanceGroup[]) => void;
}

const ChooseInstanceGroup: React.FC<ChooseInstanceGroupProps> = (
  props: ChooseInstanceGroupProps
) => {
  const { selectInstanceGroup, ingestionInfo } = props;
  const { t } = useTranslation();
  const [loadingData, setLoadingData] = useState(false);
  const [selectedInstanceGroup, setSelectedInstanceGroup] = useState<any[]>(
    ingestionInfo.chooseInstanceGroup || []
  );
  const [instanceGroupList, setInstanceGroupList] = useState<InstanceGroup[]>(
    []
  );
  const [curPage, setCurPage] = useState(1);
  const [totoalCount, setTotoalCount] = useState(0);

  const handlePageChange = (event: any, value: number) => {
    console.info("event:", event);
    console.info("value:", value);
    setCurPage(value);
  };

  // Get Instance Group List
  const getInstanceGroupList = async () => {
    if (ingestionInfo.chooseInstanceGroup.length <= 0) {
      setSelectedInstanceGroup([]);
    }
    try {
      setLoadingData(true);
      setInstanceGroupList([]);
      const resData: any = await appSyncRequestQuery(listInstanceGroups, {
        page: curPage,
        count: PAGE_SIZE,
      });
      console.info("resData:", resData);
      const dataInstanceGroupList: InstanceGroup[] =
        resData.data.listInstanceGroups.instanceGroups;
      setTotoalCount(resData.data.listInstanceGroups.total);
      // setInstanceGroupList(dataInstanceGroupList);
      const tmpGroupList: any[] = dataInstanceGroupList;
      const checkedId = ingestionInfo.createNewInstanceGroupId;
      // set checked when create new group
      if (checkedId) {
        tmpGroupList.forEach((element) => {
          element.isChecked = element.id === checkedId;
        });
      }
      setInstanceGroupList(tmpGroupList);
      setLoadingData(false);
    } catch (error) {
      console.error(error);
    }
  };

  // Get instance group list when page rendered.
  useEffect(() => {
    getInstanceGroupList();
  }, [curPage]);

  useEffect(() => {
    console.info("selectedInstanceGroup:", selectedInstanceGroup);
    selectInstanceGroup(selectedInstanceGroup);
  }, [selectedInstanceGroup]);

  return (
    <PagePanel
      title={t("applog:ingestion.chooseInstanceGroup.choose")}
      desc={t("applog:ingestion.chooseInstanceGroup.chooseDesc")}
    >
      <div className="mt-20 pb-20">
        <div className="table-data">
          <TablePanel
            title={t("applog:ingestion.chooseInstanceGroup.list.groups")}
            defaultSelectItem={ingestionInfo.chooseInstanceGroup}
            changeSelected={(item) => {
              console.info("changeSelected item:", item);
              setSelectedInstanceGroup(item);
            }}
            loading={loadingData}
            selectType={SelectType.CHECKBOX}
            columnDefinitions={[
              {
                id: "id",
                header: "ID",
                width: 320,
                cell: (e: InstanceGroup) => {
                  return (
                    <Link to={`/resources/instance-group/detail/${e.id}`}>
                      {e.id}
                    </Link>
                  );
                },
              },
              {
                // width: 110,
                id: "Name",
                header: t("applog:ingestion.chooseInstanceGroup.list.name"),
                cell: (e: InstanceGroup) => {
                  return e.groupName;
                },
              },
              {
                id: "Type",
                header: t("resource:group.list.type"),
                cell: (e: InstanceGroup) => {
                  return e.groupType === LogSourceType.ASG
                    ? "EC2/ASG"
                    : e.groupType;
                },
              },
              {
                id: "Platform",
                header: t("applog:ingestion.chooseInstanceGroup.list.platform"),
                cell: () => {
                  return DEFAULT_PLATFORM;
                },
              },
              {
                width: 170,
                id: "created",
                header: t("applog:ingestion.chooseInstanceGroup.list.created"),
                cell: (e: InstanceGroup) => {
                  return formatLocalTime(e?.createdDt || "");
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
                  {loadingData ? (
                    <LoadingText />
                  ) : (
                    <RefreshIcon fontSize="small" />
                  )}
                </Button>
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
    </PagePanel>
  );
};

export default ChooseInstanceGroup;
