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
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Pagination from "@material-ui/lab/Pagination";
import Button from "components/Button";
import { TablePanel } from "components/TablePanel";
import { SelectType } from "components/TablePanel/tablePanel";
import { EC2GroupPlatform, EC2GroupType, LogSource, LogSourceType } from "API";
import Modal from "components/Modal";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { listLogSources } from "graphql/queries";
import { deleteLogSource } from "graphql/mutations";
import { defaultStr, formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import { handleErrorMessage } from "assets/js/alert";
import ButtonRefresh from "components/ButtonRefresh";
import CommonLayout from "pages/layout/CommonLayout";

const PAGE_SIZE = 10;

const InstanceGroupList: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("resource:group.name") },
  ];

  const navigate = useNavigate();
  const [loadingData, setLoadingData] = useState(false);
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [curInstanceGroup, setCurInstanceGroup] = useState<LogSource>();
  const [selectedInstanceGroup, setSelectedInstanceGroup] = useState<any[]>([]);
  const [disabledDelete, setDisabledDelete] = useState(false);
  const [instanceGroupList, setInstanceGroupList] = useState<LogSource[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [curPage, setCurPage] = useState(1);

  // Get Instance Group List
  const getInstanceGroupList = async () => {
    setSelectedInstanceGroup([]);
    try {
      setLoadingData(true);
      setInstanceGroupList([]);
      const resData: any = await appSyncRequestQuery(listLogSources, {
        page: curPage,
        count: PAGE_SIZE,
        type: LogSourceType.EC2,
      });
      const dataInstanceGroupList: LogSource[] =
        resData.data.listLogSources.logSources;
      setTotalCount(resData.data.listLogSources.total);
      setInstanceGroupList(dataInstanceGroupList);
      setLoadingData(false);
    } catch (error: any) {
      console.error(error);
      handleErrorMessage(error.message);
    }
  };

  const handlePageChange = (event: any, value: number) => {
    console.info("event:", event);
    console.info("value:", value);
    setCurPage(value);
  };

  // Show Remove Instance Group Dialog
  const removeInstanceGroup = async () => {
    setCurInstanceGroup(selectedInstanceGroup[0]);
    setOpenDeleteModel(true);
  };

  // Confirm to Remove Instance GroupBy Id
  const confirmRemoveInstanceGroup = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(deleteLogSource, {
        type: LogSourceType.EC2,
        sourceId: curInstanceGroup?.sourceId,
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      getInstanceGroupList();
    } catch (error: any) {
      setLoadingDelete(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  // Get instance group list when page rendered.
  useEffect(() => {
    getInstanceGroupList();
  }, [curPage]);

  // Disable delete button and view detail button when no row selected.
  useEffect(() => {
    if (selectedInstanceGroup.length > 0) {
      setDisabledDelete(false);
    } else {
      setDisabledDelete(true);
    }
  }, [selectedInstanceGroup]);

  const renderGroupName = (data: LogSource) => {
    return (
      <Link to={`/resources/instance-group/detail/${data.sourceId}`}>
        {data.ec2?.groupName}
      </Link>
    );
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="table-data">
        <TablePanel
          trackId="sourceId"
          title={t("resource:group.groups")}
          changeSelected={(item) => {
            console.info("item:", item);
            setSelectedInstanceGroup(item);
          }}
          loading={loadingData}
          selectType={SelectType.RADIO}
          columnDefinitions={[
            {
              // width: 110,
              id: "Name",
              header: t("resource:group.list.name"),
              cell: (e: LogSource) => renderGroupName(e),
            },
            {
              id: "Account",
              header: t("resource:group.list.account"),
              cell: (e: LogSource) => {
                return e.accountId ?? "-";
              },
            },
            {
              id: "Type",
              header: t("resource:group.list.type"),
              cell: (e: LogSource) => {
                return e.ec2?.groupType === EC2GroupType.ASG
                  ? t("resource:group.asg")
                  : t("resource:group.manual");
              },
            },
            {
              id: "Platform",
              header: t("resource:group.list.platform"),
              cell: (e: LogSource) => {
                return e.ec2?.groupPlatform ?? EC2GroupPlatform.Linux;
              },
            },
            {
              width: 170,
              id: "created",
              header: t("resource:group.list.created"),
              cell: (e: LogSource) => {
                return formatLocalTime(defaultStr(e?.createdAt));
              },
            },
          ]}
          items={instanceGroupList}
          actions={
            <div>
              <Button
                data-testid="refresh-button"
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
              <Button
                data-testid="delete-button"
                disabled={disabledDelete}
                onClick={() => {
                  removeInstanceGroup();
                }}
              >
                {t("button.delete")}
              </Button>
              <Button
                data-testid="create-button"
                btnType="primary"
                onClick={() => {
                  navigate("/resources/instance-group/create");
                }}
              >
                {t("button.createInstanceGroup")}
              </Button>
            </div>
          }
          pagination={
            <Pagination
              count={Math.ceil(totalCount / PAGE_SIZE)}
              page={curPage}
              onChange={handlePageChange}
              size="small"
            />
          }
        />
      </div>
      <Modal
        title={t("resource:group.delete")}
        fullWidth={false}
        isOpen={openDeleteModel}
        closeModal={() => {
          setOpenDeleteModel(false);
        }}
        actions={
          <div className="button-action no-pb text-right">
            <Button
              data-testid="cancel-delete-button"
              btnType="text"
              disabled={loadingDelete}
              onClick={() => {
                setOpenDeleteModel(false);
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              data-testid="confirm-delete-button"
              loading={loadingDelete}
              btnType="primary"
              onClick={() => {
                confirmRemoveInstanceGroup();
              }}
            >
              {t("button.delete")}
            </Button>
          </div>
        }
      >
        <div className="modal-content">
          {t("resource:group.deleteTips")}
          <b>{`${curInstanceGroup?.ec2?.groupName}`}</b> {"?"}
        </div>
      </Modal>
    </CommonLayout>
  );
};

export default InstanceGroupList;
