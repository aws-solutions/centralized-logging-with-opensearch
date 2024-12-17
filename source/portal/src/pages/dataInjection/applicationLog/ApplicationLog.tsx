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
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Pagination from "@material-ui/lab/Pagination";
import Button from "components/Button";
import { TablePanel } from "components/TablePanel";
import { SelectType } from "components/TablePanel/tablePanel";
import {
  AnalyticEngineType,
  AppPipeline,
  BatchExportAppPipelinesQueryVariables,
  PipelineStatus,
  ResumePipelineMutationVariables,
} from "API";
import Modal from "components/Modal";
import { batchExportAppPipelines, listAppPipelines } from "graphql/queries";
import {
  ApiResponse,
  appSyncRequestMutation,
  appSyncRequestQuery,
} from "assets/js/request";
import { deleteAppPipeline, resumePipeline } from "graphql/mutations";
import {
  defaultStr,
  downloadFileByLink,
  formatLocalTime,
} from "assets/js/utils";
import { useTranslation } from "react-i18next";
import { AUTO_REFRESH_INT } from "assets/js/const";
import { handleErrorMessage } from "assets/js/alert";
import PipelineStatusComp from "../common/PipelineStatus";
import ButtonRefresh from "components/ButtonRefresh";
import CommonLayout from "pages/layout/CommonLayout";
import ButtonDropdown from "components/ButtonDropdown";
import MuiAlert from "@material-ui/lab/Alert";
import ExtButton from "components/ExtButton";
import { makeStyles } from "@material-ui/core";

const PAGE_SIZE = 10;

const useStyles = makeStyles(() => ({
  dropDown: {
    width: "110px",
    textAlign: "left",
  },
}));

interface ExtAppPipeline extends AppPipeline {
  id: string;
}

const ApplicationLog: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("applog:name") },
  ];

  const classes = useStyles();

  const navigate = useNavigate();
  const [loadingData, setLoadingData] = useState(false);
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [curTipsApplicationLog, setCurTipsApplicationLog] =
    useState<AppPipeline>();
  const [applicationLogs, setApplicationLogs] = useState<AppPipeline[]>([]);
  const [selectedApplicationLog, setSelectedApplicationLog] = useState<
    ExtAppPipeline[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [showExportAlert, setShowExportAlert] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportedFileUrl, setExportedFileUrl] = useState("");
  const [curPage, setCurPage] = useState(1);

  const exportPipelines = async () => {
    setExportedFileUrl("");
    setExportLoading(true);
    setShowExportAlert(true);
    try {
      const res: ApiResponse<"batchExportAppPipelines", string> =
        await appSyncRequestMutation(batchExportAppPipelines, {
          appPipelineIds: selectedIds,
        } as BatchExportAppPipelinesQueryVariables);
      const fileUrl = res.data.batchExportAppPipelines;
      setExportedFileUrl(res.data.batchExportAppPipelines);
      downloadFileByLink(fileUrl);
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setExportLoading(false);
    }
  };

  // Get Application Log List
  const getApplicationLogList = async (hideLoading = false) => {
    try {
      if (!hideLoading) {
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
      setTotalCount(resData.data.listAppPipelines.total);
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
  const confirmRemoveApplicationLog = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(deleteAppPipeline, {
        id: curTipsApplicationLog?.pipelineId,
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      getApplicationLogList();
      setSelectedApplicationLog(
        selectedApplicationLog.filter(
          ({ id }) => id !== curTipsApplicationLog?.pipelineId
        )
      );
      setSelectedIds(
        selectedIds.filter((id) => id !== curTipsApplicationLog?.pipelineId)
      );
    } catch (error: any) {
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  // Click Edit Button Redirect to edit page
  const clickToEdit = () => {
    navigate(`/log-pipeline/application-log/edit/${selectedIds[0]}`);
  };

  // Click View Detail Button Redirect to detail page
  const clickToReviewDetail = () => {
    navigate(`/log-pipeline/application-log/detail/${selectedIds[0]}`);
  };

  // Get Application log list when page rendered.
  useEffect(() => {
    getApplicationLogList();
  }, [curPage]);

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
        {defaultStr(data?.logConfig?.name)}
      </Link>
    );
  };

  const refreshList = () => {
    if (curPage === 1) {
      getApplicationLogList();
    } else {
      setCurPage(1);
    }
  };

  const handleResumePipeline = async () => {
    await appSyncRequestMutation(resumePipeline, {
      id: selectedIds[0],
    } as ResumePipelineMutationVariables);
    refreshList();
  };

  const isMultipleSelection = useMemo(
    () => selectedIds.length > 1,
    [selectedIds]
  );

  const deleteDisabled = useMemo(() => {
    return (
      (selectedApplicationLog[0]?.status !== PipelineStatus.ACTIVE &&
        selectedApplicationLog[0]?.status !== PipelineStatus.ERROR) ||
      isMultipleSelection
    );
  }, [selectedApplicationLog, isMultipleSelection]);

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      {showExportAlert ? (
        <MuiAlert
          elevation={6}
          variant="filled"
          severity={exportedFileUrl ? "success" : "info"}
          className="mb-20"
          action={
            <>
              <ExtButton
                to={exportedFileUrl}
                className="mr-10"
                loading={exportLoading}
                loadingColor="gray"
              >
                {t("button.download")}
              </ExtButton>
              <Button
                loadingColor="gray"
                onClick={() => setShowExportAlert(false)}
              >
                {t("button.close")}
              </Button>
            </>
          }
        >
          {exportedFileUrl
            ? t("applog:list.exported")
            : t("applog:list.exporting")}
        </MuiAlert>
      ) : (
        <></>
      )}
      <div className="table-data">
        <TablePanel
          trackId="pipelineId"
          title={t("applog:title")}
          defaultSelectItem={selectedApplicationLog}
          changeSelected={(item, ids) => {
            console.info("selected item:", item);
            setSelectedApplicationLog(item);
            console.info("selected ids:", ids);
            setSelectedIds(ids);
          }}
          loading={loadingData}
          selectType={SelectType.CHECKBOX}
          crossPageSelection
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
              id: "logConfig",
              header: t("applog:list.logConfig"),
              cell: (e: AppPipeline) => renderLogConfig(e),
            },
            {
              width: 170,
              id: "created",
              header: t("applog:list.created"),
              cell: (e: AppPipeline) => {
                return formatLocalTime(defaultStr(e?.createdAt));
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
                data-testid="refresh-button"
                btnType="icon"
                disabled={loadingData}
                onClick={refreshList}
              >
                <ButtonRefresh loading={loadingData} />
              </Button>
              <ButtonDropdown
                data-testid="app-log-actions"
                items={[
                  {
                    id: "edit",
                    text: t("button.edit"),
                    disabled:
                      selectedApplicationLog.length !== 1 ||
                      selectedApplicationLog[0].status !==
                        PipelineStatus.ACTIVE,
                    testId: "edit-button",
                  },
                  {
                    id: "delete",
                    text: t("button.delete"),
                    disabled: deleteDisabled,
                    testId: "delete-button",
                  },
                  {
                    id: "export",
                    text: t("button.export"),
                    disabled: exportLoading || selectedIds.length === 0,
                  },
                  {
                    id: "resume",
                    text: t("button.resume"),
                    disabled: (() => {
                      if (selectedApplicationLog.length === 1) {
                        return (
                          selectedApplicationLog[0].status !==
                          PipelineStatus.PAUSED
                        );
                      }
                      return true;
                    })(),
                  },
                ]}
                className={classes.dropDown}
                btnType="default"
                disabled={loadingData || selectedIds.length === 0}
                onItemClick={(item) => {
                  switch (item.id) {
                    case "edit":
                      return clickToEdit();
                    case "detail":
                      return clickToReviewDetail();
                    case "delete":
                      return removeApplicationLog();
                    case "export":
                      return exportPipelines();
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
                onClick={() => {
                  navigate("/log-pipeline/application-log/import");
                }}
              >
                {t("applog:import.import")}
              </Button>
              <Button
                data-testid="create-button"
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
              count={Math.ceil(totalCount / PAGE_SIZE)}
              page={curPage}
              onChange={handlePageChange}
              size="small"
            />
          }
        />
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
                confirmRemoveApplicationLog();
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
    </CommonLayout>
  );
};

export default ApplicationLog;
