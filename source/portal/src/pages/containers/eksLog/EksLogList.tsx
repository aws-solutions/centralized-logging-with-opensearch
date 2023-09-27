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
import { formatLocalTime } from "assets/js/utils";
import Breadcrumb from "components/Breadcrumb";
import Button from "components/Button";
import SideMenu from "components/SideMenu";
import { SelectType, TablePanel } from "components/TablePanel";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import Pagination from "@material-ui/lab/Pagination";
import Modal from "components/Modal";
import HelpPanel from "components/HelpPanel";
import { listLogSources } from "graphql/queries";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { LogSourceType, LogSource } from "API";
import { deleteLogSource } from "graphql/mutations";
import { handleErrorMessage } from "assets/js/alert";
import ButtonRefresh from "components/ButtonRefresh";

const PAGE_SIZE = 10;

const EksLogList: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("menu.eksLog") },
  ];

  const navigate = useNavigate();
  const [loadingData, setLoadingData] = useState(false);
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [curEksLog, setCurEksLog] = useState<LogSource>();
  const [selectedEksLog, setSelectedEksLog] = useState<LogSource[]>([]);
  const [disabledDetail, setDisabledDetail] = useState(false);
  const [disabledDelete, setDisabledDelete] = useState(false);
  const [eksLogList, setEksLogList] = useState<LogSource[]>([]);
  const [totoalCount, setTotoalCount] = useState(0);
  const [curPage, setCurPage] = useState(1);

  // Get eks log List
  const getEksLogList = async () => {
    setSelectedEksLog([]);
    try {
      setLoadingData(true);
      setEksLogList([]);
      const resData: any = await appSyncRequestQuery(listLogSources, {
        type: LogSourceType.EKSCluster,
        page: curPage,
        count: PAGE_SIZE,
      });
      setTotoalCount(resData.data.listLogSources.total || 0);
      setEksLogList(resData.data.listLogSources.logSources || []);
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

  // Show Remove EKS Log Dialog
  const removeEksLog = async () => {
    setCurEksLog(selectedEksLog[0]);
    setOpenDeleteModel(true);
  };

  // Confirm to Remove Instance GroupBy Id
  const confimRemoveEksLog = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(deleteLogSource, {
        type: LogSourceType.EKSCluster,
        sourceId: curEksLog?.sourceId,
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      getEksLogList();
    } catch (error: any) {
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  // Click View Detail Button Redirect to detail page
  const clickToReviewDetail = () => {
    navigate(`/containers/eks-log/detail/${selectedEksLog[0]?.sourceId}`);
  };

  // Get EKS Log list when page rendered.
  useEffect(() => {
    getEksLogList();
  }, [curPage]);

  // Disable delete button and view detail button when no row selected.
  useEffect(() => {
    if (selectedEksLog.length === 1) {
      setDisabledDetail(false);
    } else {
      setDisabledDetail(true);
    }
    if (selectedEksLog.length > 0) {
      setDisabledDelete(false);
    } else {
      setDisabledDelete(true);
    }
  }, [selectedEksLog]);

  const renderClusterName = (data: LogSource) => {
    return (
      <Link to={`/containers/eks-log/detail/${data.sourceId}`}>
        {data.eks?.eksClusterName}
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
                title={t("ekslog:clusters")}
                changeSelected={(item) => {
                  console.info("item:", item);
                  setSelectedEksLog(item);
                }}
                loading={loadingData}
                selectType={SelectType.RADIO}
                columnDefinitions={[
                  {
                    id: "ClusterName",
                    header: t("ekslog:list.clusterName"),
                    cell: (e: LogSource) => renderClusterName(e),
                  },
                  {
                    id: "Account",
                    header: t("ekslog:list.account"),
                    cell: (e: LogSource) => {
                      return e.accountId || "-";
                    },
                  },
                  {
                    id: "Pattern",
                    header: t("ekslog:list.pattern"),
                    cell: (e: LogSource) => {
                      return e.eks?.deploymentKind;
                    },
                  },
                  {
                    width: 170,
                    id: "createdTime",
                    header: t("ekslog:list.created"),
                    cell: (e: LogSource) => {
                      return formatLocalTime(e?.createdAt || "");
                    },
                  },
                ]}
                items={eksLogList}
                actions={
                  <div>
                    <Button
                      btnType="icon"
                      disabled={loadingData}
                      onClick={() => {
                        if (curPage === 1) {
                          getEksLogList();
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
                        removeEksLog();
                      }}
                    >
                      {t("button.remove")}
                    </Button>
                    <Button
                      btnType="primary"
                      onClick={() => {
                        navigate("/containers/eks-log/create");
                      }}
                    >
                      {t("button.importEksCluster")}
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
            title={t("ekslog:delete")}
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
                    confimRemoveEksLog();
                  }}
                >
                  {t("button.delete")}
                </Button>
              </div>
            }
          >
            <div className="modal-content">
              {t("ekslog:deleteTips")}
              <b>{`${curEksLog?.eks?.eksClusterName}`}</b> {"?"}
            </div>
          </Modal>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default EksLogList;
