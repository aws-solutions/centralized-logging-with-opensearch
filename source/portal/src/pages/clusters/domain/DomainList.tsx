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
// import { DomainList, DomainListProps } from "mock/data";
import Status from "components/Status/Status";
import Breadcrumb from "components/Breadcrumb";
import { SelectType } from "components/TablePanel/tablePanel";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { listImportedDomains } from "graphql/queries";
import { removeDomain } from "graphql/mutations";
import { ImportedDomain } from "API";
import Modal from "components/Modal";
import { humanFileSize } from "assets/js/utils";
// import { useDispatch } from "react-redux";
// import { ActionType } from "reducer/appReducer";
import LoadingText from "components/LoadingText";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";

const ESDomainList: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("cluster:domain.domains"),
    },
  ];
  // const dispatch = useDispatch();
  const history = useHistory();
  const [domainList, setDomainList] = useState<ImportedDomain[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [disabledDetail, setDisabledDetail] = useState(false);
  const [disabledDelete, setDisabledDelete] = useState(false);
  const [curTipsDomain, setCurTipsDomain] = useState<ImportedDomain>();
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const getImportedESDomainList = async () => {
    setSelectedDomains([]);
    try {
      setLoadingData(true);
      setDomainList([]);
      const resData: any = await appSyncRequestQuery(listImportedDomains, {
        metrics: true,
      });
      console.info("listImportedDomains:", resData.data.listImportedDomains);
      const dataDomainList: ImportedDomain[] = resData.data.listImportedDomains;
      const tmpDomainMap: any = {};
      dataDomainList.forEach((element) => {
        if (element.domainName) {
          tmpDomainMap[element.domainName] = element;
        }
      });

      setDomainList(dataDomainList);
      setLoadingData(false);
    } catch (error) {
      console.error(error);
    }
  };

  const removeImportDomain = async () => {
    setCurTipsDomain(selectedDomains[0]);
    setOpenDeleteModel(true);
  };

  const clickToReviewDetail = () => {
    history.push({
      pathname: `/clusters/opensearch-domains/detail/${encodeURIComponent(
        selectedDomains[0].id
      )}`,
    });
  };

  const confimRemoveImportDomain = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(removeDomain, {
        id: curTipsDomain?.id,
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      getImportedESDomainList();
    } catch (error) {
      setLoadingDelete(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getImportedESDomainList();
  }, []);

  useEffect(() => {
    console.info("selectedDomains:", selectedDomains);
    if (selectedDomains.length === 1) {
      setDisabledDetail(false);
    } else {
      setDisabledDetail(true);
    }
    if (selectedDomains.length > 0) {
      setDisabledDelete(false);
    } else {
      setDisabledDelete(true);
    }
  }, [selectedDomains]);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />
            <div className="table-data">
              <TablePanel
                title={t("cluster:domain.domains")}
                selectType={SelectType.RADIO}
                loading={loadingData}
                changeSelected={(items: any) => {
                  setSelectedDomains(items);
                }}
                columnDefinitions={[
                  {
                    id: "domainName",
                    header: t("cluster:domain.domainName"),
                    cell: (e: ImportedDomain) => {
                      return (
                        <Link
                          to={`/clusters/opensearch-domains/detail/${encodeURIComponent(
                            e.id
                          )}`}
                        >
                          {e.domainName}
                        </Link>
                      );
                    },
                  },
                  {
                    id: "esVersion",
                    header: t("cluster:domain.version"),
                    cell: (e: ImportedDomain) => `${e.engine}_${e.version}`,
                  },
                  {
                    id: "searchableDocs",
                    header: t("cluster:domain.searchDocs"),
                    cell: (e: ImportedDomain) => e.metrics?.searchableDocs,
                  },
                  {
                    id: "freeSpace",
                    header: t("cluster:domain.freeSpace"),
                    cell: (e: ImportedDomain) =>
                      humanFileSize(
                        (e.metrics?.freeStorageSpace || 0) * 1024 * 1024
                      ),
                  },
                  {
                    id: "health",
                    header: t("cluster:domain.health"),
                    cell: (e: ImportedDomain) => {
                      return <Status status={e.metrics?.health || "-"} />;
                    },
                  },
                ]}
                items={domainList}
                actions={
                  <div>
                    <Button
                      disabled={loadingData}
                      btnType="icon"
                      onClick={() => {
                        getImportedESDomainList();
                      }}
                    >
                      {loadingData ? (
                        <LoadingText />
                      ) : (
                        <RefreshIcon fontSize="small" />
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        clickToReviewDetail();
                      }}
                      disabled={disabledDetail}
                    >
                      {t("button.viewDetail")}
                    </Button>
                    <Button
                      disabled={disabledDelete}
                      onClick={() => {
                        removeImportDomain();
                      }}
                    >
                      {t("button.remove")}
                    </Button>
                    <Button
                      btnType="primary"
                      onClick={() => {
                        history.push({
                          pathname: "/clusters/import-opensearch-cluster",
                        });
                      }}
                    >
                      {t("button.importDomain")}
                    </Button>
                  </div>
                }
                pagination={<Pagination count={1} size="small" />}
              />
            </div>
          </div>
          <Modal
            title={t("cluster:domain.remove")}
            fullWidth={false}
            isOpen={openDeleteModel}
            closeModal={() => {
              setOpenDeleteModel(false);
            }}
            actions={
              <div className="button-action no-pb text-right">
                <Button
                  disabled={loadingDelete}
                  btnType="text"
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
                    confimRemoveImportDomain();
                  }}
                >
                  {t("button.remove")}
                </Button>
              </div>
            }
          >
            <div className="modal-content">
              {t("cluster:domain.removeConfirm")}
              <b>{`${curTipsDomain?.domainName}`}</b>
              {"? "}
              <div>{t("cluster:domain.removeTips")}</div>
            </div>
          </Modal>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default ESDomainList;
