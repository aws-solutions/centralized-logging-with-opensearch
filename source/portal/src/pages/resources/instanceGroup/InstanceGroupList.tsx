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
import Breadcrumb from "components/Breadcrumb";
import { SelectType } from "components/TablePanel/tablePanel";
import { EC2GroupType, LogSource, LogSourceType } from "API";
import Modal from "components/Modal";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { listLogSources } from "graphql/queries";
import { deleteLogSource } from "graphql/mutations";
import { DEFAULT_PLATFORM } from "assets/js/const";
import { formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import { handleErrorMessage } from "assets/js/alert";
import ButtonRefresh from "components/ButtonRefresh";

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
  const [curInstanceGroup, setCurInstantceGroup] = useState<LogSource>();
  const [selectedInstanceGroup, setSelectedInstanceGroup] = useState<any[]>([]);
  const [disabledDetail, setDisabledDetail] = useState(false);
  const [disabledDelete, setDisabledDelete] = useState(false);
  const [instanceGroupList, setInstanceGroupList] = useState<LogSource[]>([]);
  const [totoalCount, setTotoalCount] = useState(0);
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
      console.info("resData:", resData);
      const dataInstanceGroupList: LogSource[] =
        resData.data.listLogSources.logSources;
      setTotoalCount(resData.data.listLogSources.total);
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
    setCurInstantceGroup(selectedInstanceGroup[0]);
    setOpenDeleteModel(true);
  };

  // Confirm to Remove Instance GroupBy Id
  const confimRemoveInstanceGroup = async () => {
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

  // Click View Detail Button Redirect to detail page
  const clickToReviewDetail = () => {
    navigate(
      `/resources/instance-group/detail/${selectedInstanceGroup[0]?.sourceId}`
    );
  };

  // Get instance group list when page rendered.
  useEffect(() => {
    getInstanceGroupList();
  }, [curPage]);

  // Disable delete button and view detail button when no row selected.
  useEffect(() => {
    if (selectedInstanceGroup.length === 1) {
      setDisabledDetail(false);
    } else {
      setDisabledDetail(true);
    }
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
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />
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
                    id: "Type",
                    header: t("resource:group.list.type"),
                    cell: (e: LogSource) => {
                      return e.ec2?.groupType === EC2GroupType.ASG
                        ? "EC2/Auto Scaling Group"
                        : e.ec2?.groupType;
                    },
                  },
                  {
                    id: "Platform",
                    header: t("resource:group.list.platform"),
                    cell: () => {
                      return DEFAULT_PLATFORM;
                    },
                  },
                  {
                    width: 170,
                    id: "created",
                    header: t("resource:group.list.created"),
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
                    <Button
                      disabled={disabledDetail}
                      onClick={() => {
                        clickToReviewDetail();
                      }}
                    >
                      {t("button.viewDetail")}
                    </Button>
                    <Button
                      disabled={disabledDelete}
                      onClick={() => {
                        removeInstanceGroup();
                      }}
                    >
                      {t("button.delete")}
                    </Button>
                    <Button
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
                    count={Math.ceil(totoalCount / PAGE_SIZE)}
                    page={curPage}
                    onChange={handlePageChange}
                    size="small"
                  />
                }
              />
            </div>
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
                  btnType="text"
                  disabled={loadingDelete}
                  onClick={() => {
                    setOpenDeleteModel(false);
                  }}
                >
                  {t("button.cancel")}
                </Button>
                <Button
                  loading={loadingDelete}
                  btnType="primary"
                  onClick={() => {
                    confimRemoveInstanceGroup();
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
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default InstanceGroupList;
