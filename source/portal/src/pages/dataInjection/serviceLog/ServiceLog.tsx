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
import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import Pagination from "@material-ui/lab/Pagination";
import RefreshIcon from "@material-ui/icons/Refresh";
import Button from "components/Button";
import { TablePanel } from "components/TablePanel";
import Status from "components/Status/Status";
import Breadcrumb from "components/Breadcrumb";
import { SelectType } from "components/TablePanel/tablePanel";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { listServicePipelines } from "graphql/queries";
import { PipelineStatus, ServicePipeline } from "API";
import Modal from "components/Modal";
import { deleteServicePipeline } from "graphql/mutations";
// import Tooltip from "@material-ui/core/Tooltip";
import LoadingText from "components/LoadingText";
import { ServiceTypeMap } from "assets/js/const";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 10;

const ServiceLog: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("servicelog:name") },
  ];

  const history = useHistory();
  const [loadingData, setLoadingData] = useState(false);
  const [serviceLogList, setServiceLogList] = useState<ServicePipeline[]>([]);
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [curTipsServiceLog, setCurTipsServiceLog] = useState<ServicePipeline>();
  const [selectedServiceLog, setSelectedServiceLog] = useState<any[]>([]);
  const [disabledDetail, setDisabledDetail] = useState(false);
  const [disabledDelete, setDisabledDelete] = useState(false);
  const [totoalCount, setTotoalCount] = useState(0);
  const [curPage, setCurPage] = useState(1);

  // Get Service Log List
  const getServiceLogList = async () => {
    setSelectedServiceLog([]);
    try {
      setLoadingData(true);
      setServiceLogList([]);
      const resData: any = await appSyncRequestQuery(listServicePipelines, {
        page: curPage,
        count: PAGE_SIZE,
      });
      const dataPipelineList: ServicePipeline[] =
        resData.data.listServicePipelines.pipelines;
      setTotoalCount(resData.data.listServicePipelines.total);
      setServiceLogList(dataPipelineList);
      setLoadingData(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePageChange = (event: any, value: number) => {
    console.info("event:", event);
    console.info("value:", value);
    setCurPage(value);
  };

  // Show Remove Service Log Dialog
  const removeServiceLog = async () => {
    setCurTipsServiceLog(selectedServiceLog[0]);
    setOpenDeleteModel(true);
  };

  // Confirm to Remove Service Log By Id
  const confimRemoveServiceLog = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(deleteServicePipeline, {
        id: curTipsServiceLog?.id,
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      getServiceLogList();
    } catch (error) {
      setLoadingDelete(false);
      console.error(error);
    }
  };

  // Click View Detail Button Redirect to detail page
  const clickToReviewDetail = () => {
    history.push({
      pathname: `/log-pipeline/service-log/detail/${selectedServiceLog[0]?.id}`,
    });
  };

  // Get Service log list when page rendered.
  useEffect(() => {
    getServiceLogList();
  }, [curPage]);

  // Disable delete button and view detail button when no row selected.
  useEffect(() => {
    console.info("selectedServiceLog:", selectedServiceLog);
    if (selectedServiceLog.length === 1) {
      setDisabledDetail(false);
    } else {
      setDisabledDetail(true);
    }
    if (selectedServiceLog.length > 0) {
      if (
        selectedServiceLog[0].status === PipelineStatus.ACTIVE ||
        selectedServiceLog[0].status === PipelineStatus.ERROR
      ) {
        setDisabledDelete(false);
      } else {
        setDisabledDelete(true);
      }
    } else {
      setDisabledDelete(true);
    }
  }, [selectedServiceLog]);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />
            <div className="table-data">
              <TablePanel
                title={t("servicelog:title")}
                changeSelected={(item) => {
                  console.info("item:", item);
                  setSelectedServiceLog(item);
                }}
                loading={loadingData}
                selectType={SelectType.RADIO}
                columnDefinitions={[
                  {
                    id: "id",
                    header: "ID",
                    width: 320,
                    cell: (e: ServicePipeline) => {
                      return (
                        <Link to={`/log-pipeline/service-log/detail/${e.id}`}>
                          {e.id}
                        </Link>
                      );
                    },
                  },
                  {
                    width: 110,
                    id: "type",
                    header: t("servicelog:list.type"),
                    cell: (e: ServicePipeline) => {
                      return ServiceTypeMap[e.type];
                    },
                  },
                  {
                    id: "source",
                    header: t("servicelog:list.source"),
                    cell: (e: ServicePipeline) => {
                      return e.source;
                    },
                  },
                  {
                    id: "cluster",
                    header: t("servicelog:list.domain"),
                    cell: (e: ServicePipeline) => {
                      return e.target;
                    },
                  },
                  {
                    width: 170,
                    id: "created",
                    header: t("servicelog:list.created"),
                    cell: (e: ServicePipeline) => {
                      return formatLocalTime(e?.createdDt || "");
                    },
                  },
                  {
                    width: 120,
                    id: "status",
                    header: t("servicelog:list.status"),
                    cell: (e: ServicePipeline) => {
                      return <Status status={e.status || ""} />;
                    },
                  },
                ]}
                items={serviceLogList}
                actions={
                  <div>
                    <Button
                      btnType="icon"
                      disabled={loadingData}
                      onClick={() => {
                        if (curPage === 1) {
                          getServiceLogList();
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
                        removeServiceLog();
                      }}
                    >
                      {t("button.delete")}
                    </Button>
                    <Button
                      btnType="primary"
                      onClick={() => {
                        history.push({
                          pathname: "/log-pipeline/service-log/create",
                        });
                      }}
                    >
                      {t("button.createIngestion")}
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
            title={t("servicelog:delete")}
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
                    confimRemoveServiceLog();
                  }}
                >
                  {t("button.delete")}
                </Button>
              </div>
            }
          >
            <div className="modal-content">
              {t("servicelog:deleteTips")}
              <b>{`${curTipsServiceLog?.id}`}</b> {"?"}
            </div>
          </Modal>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default ServiceLog;
