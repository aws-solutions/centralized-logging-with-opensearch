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
import Status from "components/Status/Status";
import Breadcrumb from "components/Breadcrumb";
import { SelectType } from "components/TablePanel/tablePanel";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { getDomainDetails, listImportedDomains } from "graphql/queries";
import { removeDomain } from "graphql/mutations";
import { DomainRelevantResource, ImportedDomain } from "API";
import Modal from "components/Modal";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import {
  buildNaclLink,
  buildRouteTableLink,
  buildSGLink,
  buildVPCPeeringLink,
  humanFileSize,
} from "assets/js/utils";
import { handleErrorMessage } from "assets/js/alert";
import { RootState } from "reducer/reducers";
import ButtonRefresh from "components/ButtonRefresh";

interface ResourceListType {
  name: string;
  values: string[];
  status: string;
}

const ESDomainList: React.FC = () => {
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("cluster:domain.domains"),
    },
  ];
  const navigate = useNavigate();
  const [domainList, setDomainList] = useState<ImportedDomain[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [disabledDetail, setDisabledDetail] = useState(false);
  const [disabledDelete, setDisabledDelete] = useState(false);
  const [curTipsDomain, setCurTipsDomain] = useState<ImportedDomain>();
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [reverseOrKeep, setReverseOrKeep] = useState<string>("unset");
  const [removeCancel, setRemoveCancel] = useState(false);
  const [removeErrorMessage, setRemoveErrorMessage] = useState<string>();
  const [domainRelatedResources, setDomainRelatedResources] = useState<
    DomainRelevantResource[]
  >([]);

  const resourceNameMap: {
    [key: string]: string;
  } = {
    VPCPeering: t("cluster:imported.vpcPeering"),
    OpenSearchSecurityGroup: t("cluster:imported.openSearchSecurityGroup"),
    OpenSearchRouteTables: t("cluster:imported.openSearchRouteTables"),
    OpenSearchNetworkACL: t("cluster:imported.openSearchNetworkACL"),
    SolutionRouteTables: t("cluster:imported.SolutionRouteTables"),
  };

  const buildLinkMap: {
    [key: string]: any;
  } = {
    VPCPeering: buildVPCPeeringLink,
    OpenSearchSecurityGroup: buildSGLink,
    OpenSearchRouteTables: buildRouteTableLink,
    OpenSearchNetworkACL: buildNaclLink,
    SolutionRouteTables: buildRouteTableLink,
  };

  const getBuildLink = (name: string) => {
    return buildLinkMap[name] || buildVPCPeeringLink;
  };

  const getImportedESDomainList = async () => {
    setSelectedDomains([]);
    try {
      setLoadingData(true);
      setDomainList([]);
      const resData: any = await appSyncRequestQuery(listImportedDomains, {
        metrics: true,
        includeFailed: true,
      });
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

  const getDomainRelatedResources = async () => {
    setDomainRelatedResources([]);
    try {
      setLoadingResources(true);
      const resData: any = await appSyncRequestQuery(getDomainDetails, {
        id: curTipsDomain?.id,
      });
      const domainRelevantResource: DomainRelevantResource[] =
        resData.data.getDomainDetails.resources;
      console.info("domainRelevantResource: ", domainRelevantResource);
      setDomainRelatedResources(domainRelevantResource);
      setLoadingResources(false);
    } catch (error) {
      setLoadingResources(false);
      console.error(error);
    }
  };

  const removeImportDomain = async () => {
    setCurTipsDomain(selectedDomains[0]);
    setOpenDeleteModel(true);
    setRemoveCancel(false);
    // reset the remove error message before get the new one
    setRemoveErrorMessage(undefined);
  };

  const clickToReviewDetail = () => {
    navigate(
      `/clusters/opensearch-domains/detail/${encodeURIComponent(
        selectedDomains[0].id
      )}`
    );
  };

  const handleReverseChange = (event: {
    target: { value: React.SetStateAction<string> };
  }) => {
    setReverseOrKeep(event.target.value);
  };

  const confirmRemoveImportDomain = async () => {
    try {
      setLoadingDelete(true);
      const resData = await appSyncRequestMutation(removeDomain, {
        id: curTipsDomain?.id,
        isReverseConf: reverseOrKeep === "reverse" ? true : false,
      });
      console.info("removeRes:", resData);
      const _domainRelevantResources: DomainRelevantResource[] =
        resData.data.removeDomain.resources;
      setDomainRelatedResources(_domainRelevantResources);
      if (resData.data.removeDomain.error) {
        setRemoveErrorMessage(resData.data.removeDomain.error);
      }
      setLoadingDelete(false);
      setReverseOrKeep("unset");
      setRemoveCancel(true);
      getImportedESDomainList();
    } catch (error: any) {
      setLoadingDelete(false);
      setReverseOrKeep("unset");
      setOpenDeleteModel(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  useEffect(() => {
    getImportedESDomainList();
  }, []);

  useEffect(() => {
    if (curTipsDomain) {
      getDomainRelatedResources();
    }
  }, [curTipsDomain]);

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

  const renderDomainName = (data: ImportedDomain) => {
    return (
      <Link
        to={`/clusters/opensearch-domains/detail/${encodeURIComponent(
          data.id
        )}`}
      >
        {data.domainName}
      </Link>
    );
  };

  const renderDomainStatus = (data: ImportedDomain) => {
    return <Status status={data.metrics?.health || "-"} />;
  };

  const renderResourceList = (data: ResourceListType) => {
    return (
      <div style={{ whiteSpace: "pre-wrap" }}>
        {data.values.map((element) => {
          return (
            <div key={element} style={{ display: "inline-block" }}>
              <ExtLink
                to={getBuildLink(data.name)(
                  amplifyConfig.aws_project_region,
                  element
                )}
              >
                {`${element}`}
              </ExtLink>
            </div>
          );
        })}
      </div>
    );
  };

  const renderResourceStatus = (data: ResourceListType) => {
    return <Status status={data.status} />;
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
                trackId="domainName"
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
                    cell: (e: ImportedDomain) => renderDomainName(e),
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
                    cell: (e: ImportedDomain) => renderDomainStatus(e),
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
                      <ButtonRefresh loading={loadingData} />
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
                        navigate("/clusters/import-opensearch-cluster");
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
            width={600}
            fullWidth={false}
            isOpen={openDeleteModel}
            closeModal={() => {
              setOpenDeleteModel(false);
            }}
            actions={
              <div className="button-action no-pb text-right">
                {!removeCancel && (
                  <Button
                    disabled={loadingDelete}
                    btnType="text"
                    onClick={() => {
                      setOpenDeleteModel(false);
                    }}
                  >
                    {t("button.cancel")}
                  </Button>
                )}
                <Button
                  loading={loadingDelete}
                  btnType="primary"
                  disabled={
                    selectedDomains.length === 1 && reverseOrKeep === "unset"
                  }
                  onClick={() => {
                    if (!removeCancel) {
                      confirmRemoveImportDomain();
                    } else {
                      setOpenDeleteModel(false);
                    }
                  }}
                >
                  {removeCancel ? t("button.close") : t("button.remove")}
                </Button>
              </div>
            }
          >
            <div className="modal-content">
              <Alert
                type={AlertType.Warning}
                content={t("cluster:domain.removeTips")}
              />
              <TablePanel
                trackId="name"
                hideFilterAndPagination
                title=""
                loading={loadingResources}
                selectType={SelectType.NONE}
                changeSelected={(items: any) => {
                  console.info("items:", items);
                }}
                columnDefinitions={[
                  {
                    id: "resourceName",
                    header: t("cluster:domain.resourceName"),
                    cell: (e: ResourceListType) => {
                      const mappedName = resourceNameMap[e.name] || e.name;
                      return mappedName;
                    },
                  },
                  {
                    id: "resourceId",
                    header: t("cluster:domain.resourceID"),
                    cell: (e: ResourceListType) => renderResourceList(e),
                  },
                  {
                    id: "status",
                    header: t("cluster:domain.status"),
                    cell: (e: ResourceListType) => renderResourceStatus(e),
                  },
                ]}
                items={domainRelatedResources || []}
                actions={<></>}
                pagination={<></>}
              />
              {removeErrorMessage && (
                <div className="mt-20 error-message">
                  <Alert
                    type={AlertType.Error}
                    content={t("cluster:domain.removeErrorMessage", {
                      removeErrorMessage: removeErrorMessage,
                    })}
                  ></Alert>
                </div>
              )}
              <div className="mt-10">
                {/* For old version (v1.x), not allow customer to choose reverse changes */}
                {!removeCancel && domainRelatedResources && (
                  <div key="reverse">
                    <label>
                      <input
                        type="radio"
                        value="reverse"
                        checked={reverseOrKeep === "reverse"}
                        onChange={handleReverseChange}
                      />
                      &nbsp;{t("cluster:domain.chooseReverse")}
                    </label>
                  </div>
                )}
                {!removeCancel && (
                  <div key="keep">
                    <label>
                      <input
                        type="radio"
                        value="keep"
                        checked={reverseOrKeep === "keep"}
                        onChange={handleReverseChange}
                      />
                      &nbsp;{t("cluster:domain.chooseKeep")}
                    </label>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default ESDomainList;
