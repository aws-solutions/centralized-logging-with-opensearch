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
import {
  AnalyticEngineType,
  AppPipeline,
  BufferType,
  PipelineStatus,
} from "API";
import Modal from "components/Modal";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { listAppPipelines } from "graphql/queries";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { deleteAppPipeline } from "graphql/mutations";
import { formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import { AUTO_REFRESH_INT } from "assets/js/const";
import { getListBufferLayer } from "assets/js/applog";
import { handleErrorMessage } from "assets/js/alert";
import PipelineStatusComp from "../common/PipelineStatus";
import ButtonRefresh from "components/ButtonRefresh";

const PAGE_SIZE = 10;

const ApplicationLog: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("applog:name") },
  ];

  const navigate = useNavigate();
  const [loadingData, setLoadingData] = useState(false);
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [curTipsApplicationLog, setCurTipsApplicationLog] =
    useState<AppPipeline>();
  const [applicationLogs, setApplicationLogs] = useState<AppPipeline[]>([]);
  const [selectedApplicationLog, setSelectedApplicationLog] = useState<any[]>(
    []
  );
  const [disabledDetail, setDisabledDetail] = useState(false);
  const [disabledDelete, setDisabledDelete] = useState(false);
  const [totoalCount, setTotoalCount] = useState(0);
  const [curPage, setCurPage] = useState(1);

  // Get Application Log List
  const getApplicationLogList = async (hideLoading = false) => {
    try {
      if (!hideLoading) {
        setSelectedApplicationLog([]);
        setApplicationLogs([]);
        setLoadingData(true);
      }
      const resData: any = await appSyncRequestQuery(listAppPipelines, {
        page: curPage,
        count: PAGE_SIZE,
      });
      console.info("resData:", resData);
      const dataAppLogs: AppPipeline[] =
        resData.data.listAppPipelines.appPipelines;
      setTotoalCount(resData.data.listAppPipelines.total);
      setApplicationLogs(
        dataAppLogs.map((each) => ({ ...each, id: each.pipelineId }))
      );
      setLoadingData(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePageChange = (event: any, value: number) => {
    setCurPage(value);
  };

  // Show Remove Application Log Dialog
  const removeApplicationLog = async () => {
    setCurTipsApplicationLog(selectedApplicationLog[0]);
    setOpenDeleteModel(true);
  };

  // Confirm to Remove Application Log By ID
  const confimRemoveApplicationLog = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(deleteAppPipeline, {
        id: curTipsApplicationLog?.pipelineId,
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      getApplicationLogList();
      setSelectedApplicationLog([]);
    } catch (error: any) {
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  // Click View Detail Button Redirect to detail page
  const clickToReviewDetail = () => {
    navigate(
      `/log-pipeline/application-log/detail/${selectedApplicationLog[0]?.id}`
    );
  };

  // Get Application log list when page rendered.
  useEffect(() => {
    getApplicationLogList();
  }, [curPage]);

  // Disable delete button and view detail button when no row selected.
  useEffect(() => {
    console.info("selectedApplicationLog:", selectedApplicationLog);
    if (selectedApplicationLog.length === 1) {
      setDisabledDetail(false);
    } else {
      setDisabledDetail(true);
    }
    if (selectedApplicationLog.length > 0) {
      if (
        selectedApplicationLog[0].status === PipelineStatus.ACTIVE ||
        selectedApplicationLog[0].status === PipelineStatus.ERROR
      ) {
        setDisabledDelete(false);
      } else {
        setDisabledDelete(true);
      }
    } else {
      setDisabledDelete(true);
    }
  }, [selectedApplicationLog]);

  // Auto Refresh List
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      getApplicationLogList(true);
    }, AUTO_REFRESH_INT);
    return () => clearInterval(refreshInterval);
  }, [curPage]);

  const renderPipelineId = (data: AppPipeline) => {
    return (
      <Link to={`/log-pipeline/application-log/detail/${data.pipelineId}`}>
        {data.pipelineId}
      </Link>
    );
  };

  const renderBufferLayer = (data: AppPipeline) => {
    if (
      data.bufferType !== BufferType.None &&
      data.status === PipelineStatus.CREATING
    ) {
      return <i className="gray">({t("pendingCreation")})</i>;
    } else if (data.bufferType === BufferType.None) {
      return t("none");
    } else {
      return getListBufferLayer(data.bufferType, data.bufferResourceName || "");
    }
  };

  const renderStatus = (data: AppPipeline) => {
    return (
      <PipelineStatusComp
        status={data.status}
        stackId={data.stackId}
        error={data.error}
      />
    );
  };

  const renderLogConfig = (data: AppPipeline) => {
    return (
      <Link
        target="_blank"
        to={`/resources/log-config/detail/${data?.logConfig?.id}/${data?.logConfigVersionNumber}`}
      >
        {`${data?.logConfig?.name || ""}`}
      </Link>
    );
  };

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="application-log">
            <Breadcrumb list={breadCrumbList} />
            <div className="table-data">
              <TablePanel
                trackId="pipelineId"
                title={t("applog:title")}
                defaultSelectItem={selectedApplicationLog}
                changeSelected={(item) => {
                  console.info("item:", item);
                  setSelectedApplicationLog(item);
                }}
                loading={loadingData}
                selectType={SelectType.RADIO}
                columnDefinitions={[
                  {
                    id: "id",
                    header: "ID",
                    // width: 120,
                    cell: (e: AppPipeline) => renderPipelineId(e),
                  },
                  {
                    // width: 110,
                    id: "EngineType",
                    header: t("applog:list.engineType"),
                    cell: ({ aosParams, engineType }: AppPipeline) => {
                      return (
                        (engineType === AnalyticEngineType.LightEngine
                          ? t("applog:list.lightEngine")
                          : `${t("applog:list.os")}(${aosParams?.domainName})`) || "-"
                      );
                    },
                  },
                  {
                    id: "Indexname",
                    header: t("applog:list.indexTable"),
                    cell: (e: AppPipeline) => {
                      return (
                        e.aosParams?.indexPrefix ??
                        e.lightEngineParams?.centralizedTableName ??
                        "-"
                      );
                    },
                  },
                  {
                    id: "bufferLayer",
                    header: t("applog:list.bufferLayer"),
                    cell: (e: AppPipeline) => renderBufferLayer(e),
                  },
                  {
                    id: "logConfig",
                    header: t("applog:list.logConfig"),
                    cell: (e: AppPipeline) => renderLogConfig(e),
                  },
                  {
                    width: 170,
                    id: "created",
                    header: t("applog:list.created"),
                    cell: (e: AppPipeline) => {
                      return formatLocalTime(e?.createdAt || "");
                    },
                  },
                  {
                    width: 120,
                    id: "status",
                    header: t("applog:list.status"),
                    cell: (e: AppPipeline) => renderStatus(e),
                  },
                ]}
                items={applicationLogs}
                actions={
                  <div>
                    <Button
                      btnType="icon"
                      disabled={loadingData}
                      onClick={() => {
                        if (curPage === 1) {
                          getApplicationLogList();
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
                        removeApplicationLog();
                      }}
                    >
                      {t("button.delete")}
                    </Button>
                    <Button
                      btnType="primary"
                      onClick={() => {
                        navigate("/log-pipeline/application-log/create");
                      }}
                    >
                      {t("button.createPipeline")}
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
            title={t("applog:delete")}
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
                    confimRemoveApplicationLog();
                  }}
                >
                  {t("button.delete")}
                </Button>
              </div>
            }
          >
            <div className="modal-content">
              {t("applog:deleteTips")}
              <b>{`${curTipsApplicationLog?.pipelineId}`}</b> {"?"}
            </div>
          </Modal>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default ApplicationLog;
