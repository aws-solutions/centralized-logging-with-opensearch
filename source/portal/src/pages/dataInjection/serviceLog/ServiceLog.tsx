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
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { listServicePipelines } from "graphql/queries";
import {
  AnalyticEngineType,
  Parameter,
  PipelineStatus,
  ServicePipeline,
} from "API";
import Modal from "components/Modal";
import { deleteServicePipeline } from "graphql/mutations";
import { AUTO_REFRESH_INT, ServiceTypeMap } from "assets/js/const";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import PipelineStatusComp from "../common/PipelineStatus";
import ButtonRefresh from "components/ButtonRefresh";

const PAGE_SIZE = 10;

const ServiceLog: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("servicelog:name") },
  ];

  const navigate = useNavigate();
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
  const getServiceLogList = async (hideLoading = false) => {
    try {
      if (!hideLoading) {
        setServiceLogList([]);
        setSelectedServiceLog([]);
        setLoadingData(true);
      }
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
    setCurPage(value);
  };

  const getParamValueByKey = (
    params: Array<Parameter | null> | null | undefined,
    key: string
  ) => {
    if (params && key) {
      return (
        params.find((element) => element?.parameterKey === key)
          ?.parameterValue || "-"
      );
    }
    return "-";
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
      setSelectedServiceLog([]);
    } catch (error) {
      setLoadingDelete(false);
      console.error(error);
    }
  };

  // Click View Detail Button Redirect to detail page
  const clickToReviewDetail = () => {
    navigate(`/log-pipeline/service-log/detail/${selectedServiceLog[0]?.id}`);
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

  // Auto Refresh List
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      getServiceLogList(true);
    }, AUTO_REFRESH_INT);
    console.info("refreshInterval:", refreshInterval);
    return () => clearInterval(refreshInterval);
  }, [curPage]);

  const renderPipelineId = (data: ServicePipeline) => {
    return (
      <Link
      to={`/log-pipeline/service-log/detail/${data.id}`}
    >
      {data.id}
    </Link>
    );
  };

  const renderStatus = (data: ServicePipeline) => {
    return (
      <PipelineStatusComp
        status={data.status}
        stackId={data.stackId}
        error={data.error}
      />
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
                trackId="id"
                defaultSelectItem={selectedServiceLog}
                title={t("servicelog:title")}
                changeSelected={(item) => {
                  setSelectedServiceLog(item);
                }}
                loading={loadingData}
                selectType={SelectType.RADIO}
                columnDefinitions={[
                  {
                    id: "id",
                    header: "ID",
                    width: 320,
                    cell: (e: ServicePipeline) => renderPipelineId(e),
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
                    width: 110,
                    id: "account",
                    header: t("servicelog:list.account"),
                    cell: (e: ServicePipeline) => {
                      return (
                        e.logSourceAccountId ??
                        getParamValueByKey(e.parameters, "logSourceAccountId")
                      );
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
                    header: t("applog:list.engineType"),
                    cell: ({ target, engineType }: ServicePipeline) => {
                      return (
                        (engineType === AnalyticEngineType.LightEngine
                          ? t("applog:list.lightEngine")
                          : `${t("applog:list.os")}(${target})`) || "-"
                      );
                    },
                  },
                  {
                    width: 170,
                    id: "created",
                    header: t("servicelog:list.created"),
                    cell: (e: ServicePipeline) => {
                      return formatLocalTime(e?.createdAt || "");
                    },
                  },
                  {
                    width: 120,
                    id: "status",
                    header: t("servicelog:list.status"),
                    cell: (e: ServicePipeline) => renderStatus(e),
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
                        removeServiceLog();
                      }}
                    >
                      {t("button.delete")}
                    </Button>
                    <Button
                      btnType="primary"
                      onClick={() => {
                        navigate("/log-pipeline/service-log/create");
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
