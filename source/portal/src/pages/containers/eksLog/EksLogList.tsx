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
import { formatLocalTime } from "assets/js/utils";
import Breadcrumb from "components/Breadcrumb";
import Button from "components/Button";
import LoadingText from "components/LoadingText";
import SideMenu from "components/SideMenu";
import { SelectType, TablePanel } from "components/TablePanel";
import React, { useEffect, useState } from "react";
import RefreshIcon from "@material-ui/icons/Refresh";
import { useTranslation } from "react-i18next";
import { Link, useHistory } from "react-router-dom";
import Pagination from "@material-ui/lab/Pagination";
import Modal from "components/Modal";
import HelpPanel from "components/HelpPanel";
import { listImportedEKSClusters } from "graphql/queries";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { EKSClusterLogSource } from "API";
import { removeEKSCluster } from "graphql/mutations";

const PAGE_SIZE = 10;

const EksLogList: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("menu.eksLog") },
  ];

  const history = useHistory();
  const [loadingData, setLoadingData] = useState(false);
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [curEksLog, setCurEksLog] = useState<EKSClusterLogSource>();
  const [selectedEksLog, setSelectedEksLog] = useState<EKSClusterLogSource[]>(
    []
  );
  const [disabledDetail, setDisabledDetail] = useState(false);
  const [disabledDelete, setDisabledDelete] = useState(false);
  const [eksLogList, setEksLogList] = useState<EKSClusterLogSource[]>([]);
  const [totoalCount, setTotoalCount] = useState(0);
  const [curPage, setCurPage] = useState(1);

  // Get eks log List
  const getEksLogList = async () => {
    setSelectedEksLog([]);
    try {
      setLoadingData(true);
      setEksLogList([]);
      const resData: any = await appSyncRequestQuery(listImportedEKSClusters, {
        page: curPage,
        count: PAGE_SIZE,
      });
      console.info("resData:", resData);
      setTotoalCount(resData.data.listImportedEKSClusters.total || 0);
      setEksLogList(
        resData.data.listImportedEKSClusters.eksClusterLogSourceList || []
      );
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
      const removeRes = await appSyncRequestMutation(removeEKSCluster, {
        id: curEksLog?.id,
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      getEksLogList();
    } catch (error) {
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      console.error(error);
    }
  };

  // Click View Detail Button Redirect to detail page
  const clickToReviewDetail = () => {
    history.push({
      pathname: `/containers/eks-log/detail/${selectedEksLog[0]?.id}`,
    });
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

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />
            <div className="table-data">
              <TablePanel
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
                    cell: (e: EKSClusterLogSource) => {
                      return (
                        <Link to={`/containers/eks-log/detail/${e.id}`}>
                          {e.eksClusterName}
                        </Link>
                      );
                    },
                  },
                  {
                    id: "Account",
                    header: t("ekslog:list.account"),
                    cell: (e: EKSClusterLogSource) => {
                      return e.accountId || "-";
                    },
                  },
                  {
                    id: "Pattern",
                    header: t("ekslog:list.pattern"),
                    cell: (e: EKSClusterLogSource) => {
                      return e.deploymentKind;
                    },
                  },
                  {
                    id: "OpenSearch",
                    header: t("ekslog:list.os"),
                    cell: (e: EKSClusterLogSource) => {
                      return e.aosDomain?.domainName || "";
                    },
                  },
                  {
                    width: 170,
                    id: "created",
                    header: t("ekslog:list.created"),
                    cell: (e: EKSClusterLogSource) => {
                      return formatLocalTime(e?.createdDt || "");
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
                        removeEksLog();
                      }}
                    >
                      {t("button.delete")}
                    </Button>
                    <Button
                      btnType="primary"
                      onClick={() => {
                        history.push({
                          pathname: "/containers/eks-log/create",
                        });
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
              <b>{`${curEksLog?.eksClusterName}`}</b> {"?"}
            </div>
          </Modal>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default EksLogList;
