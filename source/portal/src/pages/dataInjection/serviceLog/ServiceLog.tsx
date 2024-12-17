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
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { listServicePipelines } from "graphql/queries";
import {
  AnalyticEngineType,
  Parameter,
  PipelineStatus,
  ResumePipelineMutationVariables,
  ServicePipeline,
} from "API";
import Modal from "components/Modal";
import { deleteServicePipeline, resumePipeline } from "graphql/mutations";
import { AUTO_REFRESH_INT, ServiceTypeNameMap } from "assets/js/const";
import { defaultStr, formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import PipelineStatusComp from "../common/PipelineStatus";
import ButtonRefresh from "components/ButtonRefresh";
import CommonLayout from "pages/layout/CommonLayout";
import ButtonDropdown from "components/ButtonDropdown";
import { makeStyles } from "@material-ui/core";

const PAGE_SIZE = 10;

const useStyles = makeStyles(() => ({
  dropDown: {
    width: "110px",
    textAlign: "left",
  },
}));

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
  const [disabledDelete, setDisabledDelete] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
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
      setTotalCount(resData.data.listServicePipelines.total);
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
      return defaultStr(
        params.find((element) => element?.parameterKey === key)?.parameterValue,
        "-"
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
  const confirmRemoveServiceLog = async () => {
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

  const classes = useStyles();

  // Get Service log list when page rendered.
  useEffect(() => {
    getServiceLogList();
  }, [curPage]);

  // Disable delete button and view detail button when no row selected.
  useEffect(() => {
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
      <Link to={`/log-pipeline/service-log/detail/${data.id}`}>{data.id}</Link>
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

  const refreshList = () => {
    if (curPage === 1) {
      getServiceLogList();
    } else {
      setCurPage(1);
    }
  };

  const handleResumePipeline = async () => {
    await appSyncRequestMutation(resumePipeline, {
      id: selectedServiceLog[0].id,
    } as ResumePipelineMutationVariables);
    refreshList();
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
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
              id: "cluster",
              header: t("servicelog:list.engineType"),
              cell: ({ engineType }: ServicePipeline) => {
                return engineType === AnalyticEngineType.LightEngine
                  ? t("applog:list.lightEngine")
                  : `${t("applog:list.os")}`;
              },
            },
            {
              width: 110,
              id: "type",
              header: t("servicelog:list.type"),
              cell: (e: ServicePipeline) => {
                return t(ServiceTypeNameMap[e.type]);
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
              id: "target",
              header: t("servicelog:list.target"),
              cell: (e: ServicePipeline) => {
                return (
                  e.lightEngineParams?.centralizedTableName ||
                  getParamValueByKey(e.parameters, "indexPrefix") ||
                  "-"
                );
              },
            },
            {
              width: 170,
              id: "created",
              header: t("servicelog:list.created"),
              cell: (e: ServicePipeline) => {
                return formatLocalTime(defaultStr(e?.createdAt));
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
                data-testid="refresh-button"
                btnType="icon"
                disabled={loadingData}
                onClick={refreshList}
              >
                <ButtonRefresh loading={loadingData} />
              </Button>
              <ButtonDropdown
                data-testid="svc-log-actions"
                items={[
                  {
                    id: "resume",
                    text: t("button.resume"),
                    disabled: (() => {
                      if (selectedServiceLog.length === 1) {
                        return (
                          selectedServiceLog[0].status !== PipelineStatus.PAUSED
                        );
                      }
                      return true;
                    })(),
                  },
                ]}
                className={classes.dropDown}
                btnType="default"
                disabled={loadingData || selectedServiceLog.length === 0}
                onItemClick={(item) => {
                  switch (item.id) {
                    case "detail":
                      return clickToReviewDetail();
                    case "delete":
                      return removeServiceLog();
                    case "resume":
                      return handleResumePipeline();
                    default:
                      break;
                  }
                  console.log(item);
                }}
              >
                {t("button.actions")}
              </ButtonDropdown>
              <Button
                className="ml-10"
                data-testid="delete-button"
                disabled={disabledDelete}
                onClick={() => {
                  removeServiceLog();
                }}
              >
                {t("button.delete")}
              </Button>
              <Button
                data-testid="create-button"
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
              count={Math.ceil(totalCount / PAGE_SIZE)}
              page={curPage}
              onChange={handlePageChange}
              size="small"
            />
          }
        />
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
                confirmRemoveServiceLog();
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
    </CommonLayout>
  );
};

export default ServiceLog;
