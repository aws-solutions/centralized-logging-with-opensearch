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
import Breadcrumb from "components/Breadcrumb";
import { SelectType } from "components/TablePanel/tablePanel";
import { AppPipeline, PipelineStatus } from "API";
import Modal from "components/Modal";
import LoadingText from "components/LoadingText";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { listAppPipelines } from "graphql/queries";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import Status from "components/Status/Status";
import { deleteAppPipeline } from "graphql/mutations";
import { formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 10;

const ApplicationLog: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("applog:name") },
  ];

  const history = useHistory();
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
  const getApplicationLogList = async () => {
    setSelectedApplicationLog([]);
    try {
      setLoadingData(true);
      setApplicationLogs([]);
      const resData: any = await appSyncRequestQuery(listAppPipelines, {
        page: curPage,
        count: PAGE_SIZE,
      });
      console.info("resData:", resData);
      const dataAppLogs: AppPipeline[] =
        resData.data.listAppPipelines.appPipelines;
      setTotoalCount(resData.data.listAppPipelines.total);
      setApplicationLogs(dataAppLogs);
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

  // Confirm to Remove Application Log By Id
  const confimRemoveApplicationLog = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(deleteAppPipeline, {
        id: curTipsApplicationLog?.id,
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      getApplicationLogList();
    } catch (error) {
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      console.error(error);
    }
  };

  // Click View Detail Button Redirect to detail page
  const clickToReviewDetail = () => {
    history.push({
      pathname: `/log-pipeline/application-log/detail/${selectedApplicationLog[0]?.id}`,
    });
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

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />
            <div className="table-data">
              <TablePanel
                title={t("applog:title")}
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
                    cell: (e: AppPipeline) => {
                      return (
                        <Link
                          to={`/log-pipeline/application-log/detail/${e.id}`}
                        >
                          {e.id}
                        </Link>
                      );
                    },
                  },
                  {
                    // width: 110,
                    id: "OpenSearch",
                    header: t("applog:list.os"),
                    cell: (e: AppPipeline) => {
                      return e.aosParas?.domainName || "";
                    },
                  },
                  {
                    id: "Indexname",
                    header: t("applog:list.indexName"),
                    cell: (e: AppPipeline) => {
                      return e.aosParas?.indexPrefix || "";
                    },
                  },
                  {
                    id: "streamName",
                    header: t("applog:list.streamName"),
                    cell: (e: AppPipeline) => {
                      return e?.kdsParas?.streamName || "-";
                    },
                  },
                  {
                    width: 170,
                    id: "created",
                    header: t("applog:list.created"),
                    cell: (e: AppPipeline) => {
                      return formatLocalTime(e?.createdDt || "");
                    },
                  },
                  {
                    width: 120,
                    id: "status",
                    header: t("applog:list.status"),
                    cell: (e: AppPipeline) => {
                      return <Status status={e.status || ""} />;
                    },
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
                        removeApplicationLog();
                      }}
                    >
                      {t("button.delete")}
                    </Button>
                    <Button
                      btnType="primary"
                      onClick={() => {
                        history.push({
                          pathname: "/log-pipeline/application-log/create",
                        });
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
                    // setOpenDeleteModel(false);
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
              <b>{`${curTipsApplicationLog?.id}`}</b> {"?"}
            </div>
          </Modal>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default ApplicationLog;
