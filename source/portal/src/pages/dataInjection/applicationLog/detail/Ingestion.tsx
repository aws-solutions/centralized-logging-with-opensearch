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
import React, { useState, useEffect } from "react";
import RefreshIcon from "@material-ui/icons/Refresh";
import { SelectType, TablePanel } from "components/TablePanel";
import { Link, useHistory } from "react-router-dom";
import Button from "components/Button";
import { Pagination } from "@material-ui/lab";
import LoadingText from "components/LoadingText";
import {
  AppLogIngestion,
  AppPipeline,
  LogSource,
  LogSourceType,
  PipelineStatus,
} from "API";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { getLogSource, listAppLogIngestions } from "graphql/queries";
import Modal from "components/Modal";
import { deleteAppLogIngestion, upgradeAppPipeline } from "graphql/mutations";
import { formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import Status, { StatusType } from "components/Status/Status";
import ButtonDropdown from "components/ButtonDropdown";

import { AUTO_REFRESH_INT, buildLogHubDocsLink } from "assets/js/const";
import ExtLink from "components/ExtLink";
import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";
import { getSourceInfoValueByKey } from "assets/js/applog";

const PAGE_SIZE = 20;
const TIMP_SPAN = 2 * 60 * 1000;
interface OverviewProps {
  pipelineInfo: AppPipeline | undefined;
  upgradeToNewPipeline: () => void;
  changeTab: (index: number) => void;
}

enum INGESTION_TYPE {
  INSTANCE = "instance",
  S3 = "s3",
  SYSLOG = "syslog",
  EKS = "esk",
}

interface AppIngestionItem {
  id: string; // AppLogIngestionId
  ingestion: AppLogIngestion;
  sourceData: LogSource | null;
}

const Ingestion: React.FC<OverviewProps> = (props: OverviewProps) => {
  const { pipelineInfo, changeTab, upgradeToNewPipeline } = props;
  const { t, i18n } = useTranslation();

  const [loadingData, setLoadingData] = useState(false);
  const [ingestionList, setIngestionList] = useState<AppIngestionItem[]>([]);
  const [selectedIngestion, setSelectedIngestion] = useState<AppLogIngestion[]>(
    []
  );
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const [disableDelete, setDisableDelete] = useState(true);
  const [curPage, setCurPage] = useState(1);
  const [totoalCount, setTotoalCount] = useState(0);
  const [userSelectType, setUserSelectType] = useState<string>("");
  const [openNotice, setOpenNotice] = useState(false);
  const history = useHistory();

  const [hasRecentASG, setHasRecentASG] = useState(false);
  const [recentASGIngestList, setRecentASGIngestList] = useState<
    AppLogIngestion[]
  >([]);
  const [showASGModal, setShowASGModal] = useState(false);
  const [instanceGroupLink, setInstanceGroupLink] = useState(
    "/resources/instance-group"
  );
  const [groupButtonDisabled, setGroupButtonDisabled] = useState(true);

  const confirmRemoveLogIngestion = async () => {
    const idsParams = {
      ids: selectedIngestion.map((ingestion) => ingestion.id),
    };
    try {
      setLoadingDelete(true);
      const deleteRes = await appSyncRequestMutation(
        deleteAppLogIngestion,
        idsParams
      );
      console.info("deleteRes:", deleteRes);
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      getIngestionByAppPipelineId();
      setSelectedIngestion([]);
    } catch (error) {
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      console.error(error);
    }
  };

  const upgradePipeline = async () => {
    try {
      setLoadingUpgrade(true);
      const upgradeRes = await appSyncRequestMutation(upgradeAppPipeline, {
        ids: [pipelineInfo?.id],
      });
      console.info("upgradeRes:", upgradeRes);
      setLoadingUpgrade(false);
      setOpenNotice(false);
      upgradeToNewPipeline();
    } catch (error) {
      setLoadingUpgrade(false);
      console.error(error);
    }
  };

  const getIngestionByAppPipelineId = async (hideLoading = false) => {
    try {
      if (!hideLoading) {
        setLoadingData(true);
        setIngestionList([]);
      }
      const resData: any = await appSyncRequestQuery(listAppLogIngestions, {
        page: curPage,
        count: PAGE_SIZE,
        appPipelineId: pipelineInfo?.id,
      });
      console.info("ingestion resData:", resData);
      const dataIngestion: AppLogIngestion[] =
        resData.data.listAppLogIngestions.appLogIngestions;

      console.info("dataIngestion:dataIngestion:", dataIngestion);
      const tmpRecentASGIngestionList: AppLogIngestion[] = [];
      const creatingASGIngestionList: AppLogIngestion[] = [];
      dataIngestion.forEach((element) => {
        const timeSpan =
          new Date().getTime() - new Date(element?.createdDt || "").getTime();
        if (
          element.sourceInfo?.sourceType === LogSourceType.ASG &&
          timeSpan < TIMP_SPAN
        ) {
          tmpRecentASGIngestionList.push(element);
          if (element.status === PipelineStatus.CREATING) {
            creatingASGIngestionList.push(element);
          }
        }
      });

      if (creatingASGIngestionList.length > 0) {
        setGroupButtonDisabled(true);
      } else {
        setGroupButtonDisabled(false);
      }

      if (tmpRecentASGIngestionList.length > 0) {
        setHasRecentASG(true);
      } else {
        setHasRecentASG(false);
      }
      setRecentASGIngestList(tmpRecentASGIngestionList);

      const tmpAppIngestions: AppIngestionItem[] = await Promise.all(
        dataIngestion.map(async (appLogIngestion: AppLogIngestion) => {
          if (appLogIngestion.sourceType === LogSourceType.Syslog) {
            const sourceData = await appSyncRequestQuery(getLogSource, {
              sourceType: appLogIngestion.sourceType,
              id: appLogIngestion.sourceId,
            });

            return {
              id: appLogIngestion.id,
              ingestion: appLogIngestion,
              sourceData: sourceData.data.getLogSource,
            };
          } else {
            return {
              id: appLogIngestion.id,
              ingestion: appLogIngestion,
              sourceData: null,
            };
          }
        })
      );

      setIngestionList(tmpAppIngestions);
      setTotoalCount(resData.data?.listAppLogIngestions?.total || 0);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  const handlePageChange = (event: any, value: number) => {
    setCurPage(value);
  };

  useEffect(() => {
    if (pipelineInfo && pipelineInfo.id) {
      getIngestionByAppPipelineId();
    }
  }, [pipelineInfo, curPage]);

  useEffect(() => {
    console.info("selectedIngestion:", selectedIngestion);
    if (selectedIngestion && selectedIngestion.length > 0) {
      const statusArr = selectedIngestion.map((element) => {
        return element.status;
      });
      if (
        statusArr.includes(StatusType.Creating.toUpperCase()) ||
        statusArr.includes(StatusType.Deleting.toUpperCase())
      ) {
        setDisableDelete(true);
      } else {
        setDisableDelete(false);
      }
    } else {
      setDisableDelete(true);
    }
  }, [selectedIngestion]);

  // Check Assume Role
  const checkAssumeRoleAndRedirect = (type: string) => {
    setUserSelectType(type);
    if (!pipelineInfo?.bufferAccessRoleArn) {
      setOpenNotice(true);
    } else {
      redirectToCreateIngestionPage(type);
    }
  };

  // Redirect create ingestion page by ingestion type
  const redirectToCreateIngestionPage = (type?: string) => {
    const ingestionType = type || userSelectType;
    if (ingestionType === INGESTION_TYPE.INSTANCE) {
      history.push({
        pathname: `/log-pipeline/application-log/detail/${pipelineInfo?.id}/create-ingestion-instance`,
      });
    }
    if (ingestionType === INGESTION_TYPE.S3) {
      history.push({
        pathname: `/log-pipeline/application-log/detail/${pipelineInfo?.id}/create-ingestion-s3`,
      });
    }
    if (ingestionType === INGESTION_TYPE.EKS) {
      history.push({
        pathname: `/log-pipeline/application-log/detail/${pipelineInfo?.id}/create-ingestion-eks`,
      });
    }
    if (ingestionType === INGESTION_TYPE.SYSLOG) {
      history.push({
        pathname: `/log-pipeline/application-log/detail/${pipelineInfo?.id}/create-ingestion-syslog`,
      });
    }
  };

  // go to instance group
  const goToInstanceGroup = () => {
    history.push({
      pathname: instanceGroupLink,
    });
  };

  // Auto Refresh List
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      getIngestionByAppPipelineId(true);
    }, AUTO_REFRESH_INT);
    return () => clearInterval(refreshInterval);
  }, [curPage]);

  useEffect(() => {
    console.info("hasRecentASG:", hasRecentASG);
    if (hasRecentASG) {
      // show modal
      setShowASGModal(true);
    }
  }, [hasRecentASG]);

  useEffect(() => {
    if (recentASGIngestList.length === 1) {
      setInstanceGroupLink(
        `/resources/instance-group/detail/${recentASGIngestList[0].sourceId}`
      );
    } else {
      setInstanceGroupLink("/resources/instance-group");
    }
  }, [recentASGIngestList]);

  return (
    <div>
      {/** TODO  to check the pipeline is the EKS*/}
      {/* {pipelineInfo?.ec2RoleArn ? ( */}
      {/* {pipelineInfo ? (
        <Alert
          content={
            <div>
              {t("applog:detail.ingestion.eksTips1")}
              <Link to="/containers/eks-log">
                {t("applog:detail.ingestion.eksTips2")}
              </Link>{" "}
              {t("applog:detail.ingestion.eksTips3")}
            </div>
          }
        />
      ) : ( */}
      <Alert
        content={
          <div>
            {t("applog:detail.tip1")}
            <span
              onClick={() => {
                changeTab(1);
              }}
              className="link"
            >
              {t("applog:detail.tip2")}
            </span>
            {t("applog:detail.tip3")}
          </div>
        }
      />
      {/* )} */}

      <TablePanel
        title={t("applog:detail.tab.ingestion")}
        changeSelected={(item) => {
          console.info("item:", item);
          setSelectedIngestion(item);
        }}
        loading={loadingData}
        selectType={SelectType.CHECKBOX}
        columnDefinitions={[
          {
            id: "id",
            header: "ID",
            width: 320,
            cell: (e: AppIngestionItem) => {
              if (e.ingestion?.sourceType === LogSourceType.EKSCluster) {
                return (
                  <Link
                    to={`/containers/eks-log/${e.ingestion.sourceId}/ingestion/detail/${e.id}`}
                  >
                    {e.id}
                  </Link>
                );
              }
              if (
                e.ingestion.sourceType === LogSourceType.EC2 ||
                e.ingestion.sourceType === LogSourceType.S3 ||
                e.ingestion.sourceType === LogSourceType.Syslog
              ) {
                return (
                  <Link
                    to={`/log-pipeline/application-log/ingestion/detail/${e.id}`}
                  >
                    {e.id}
                  </Link>
                );
              }
              return e.id;
            },
          },

          {
            id: "type",
            header: t("applog:ingestion.type"),
            width: 120,
            cell: (e: AppIngestionItem) => {
              return e.ingestion.sourceType === LogSourceType.EC2
                ? e.ingestion.sourceInfo?.sourceType === LogSourceType.ASG
                  ? "EC2/ASG"
                  : "EC2"
                : e.ingestion.sourceType;
            },
          },

          {
            id: "source",
            header: t("applog:ingestion.source"),
            cell: (e: AppIngestionItem) => {
              if (e.ingestion?.sourceType === LogSourceType.EKSCluster) {
                return (
                  <Link
                    to={`/containers/eks-log/detail/${e.ingestion?.sourceId}`}
                  >
                    {e.ingestion.sourceInfo?.sourceName}
                  </Link>
                );
              }
              if (e.ingestion?.sourceType === LogSourceType.Syslog) {
                return (
                  getSourceInfoValueByKey(
                    "syslogProtocol",
                    e.sourceData?.sourceInfo
                  ) +
                  ":" +
                  getSourceInfoValueByKey(
                    "syslogPort",
                    e.sourceData?.sourceInfo
                  )
                );
              }
              return (
                <Link
                  to={`/resources/instance-group/detail/${e.ingestion?.sourceId}`}
                >
                  {e.ingestion?.sourceInfo?.sourceName}
                </Link>
              );
            },
          },
          {
            // width: 110,
            id: "logCOnfig",
            header: t("applog:detail.ingestion.logConfig"),
            cell: (e: AppIngestionItem) => {
              return (
                <Link to={`/resources/log-config/detail/${e.ingestion.confId}`}>
                  {e.ingestion.confName}
                </Link>
              );
            },
          },
          {
            width: 170,
            id: "created",
            header: t("applog:detail.ingestion.created"),
            cell: (e: AppIngestionItem) => {
              return formatLocalTime(e?.ingestion.createdDt || "");
            },
          },
          {
            width: 120,
            id: "status",
            header: t("applog:list.status"),
            cell: (e: AppIngestionItem) => {
              return (
                <Status
                  status={
                    e.ingestion.status?.toLocaleLowerCase() ===
                    StatusType.Active.toLocaleLowerCase()
                      ? StatusType.Created
                      : e.ingestion.status || ""
                  }
                />
              );
            },
          },
        ]}
        items={ingestionList}
        actions={
          <div>
            <Button
              btnType="icon"
              disabled={loadingData}
              onClick={() => {
                getIngestionByAppPipelineId();
              }}
            >
              {loadingData ? <LoadingText /> : <RefreshIcon fontSize="small" />}
            </Button>
            <Button
              disabled={disableDelete}
              onClick={() => {
                setOpenDeleteModel(true);
              }}
            >
              {t("button.delete")}
            </Button>
            <ButtonDropdown
              isI18N
              items={[
                { id: INGESTION_TYPE.INSTANCE, text: "button.fromInstance" },
                { id: INGESTION_TYPE.EKS, text: "button.fromEKS" },
                { id: INGESTION_TYPE.SYSLOG, text: "button.fromSysLog" },
              ]}
              className="drop-down"
              btnType="primary"
              disabled={pipelineInfo?.status !== PipelineStatus.ACTIVE}
              onItemClick={(item) => {
                checkAssumeRoleAndRedirect(item.id);
              }}
            >
              {t("button.createAnIngestion")}
            </ButtonDropdown>
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

      <Modal
        title={t("applog:detail.ingestion.delete")}
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
                confirmRemoveLogIngestion();
              }}
            >
              {t("button.delete")}
            </Button>
          </div>
        }
      >
        <div className="modal-content">
          {t("applog:detail.ingestion.deleteTips")}
          {JSON.parse(JSON.stringify(selectedIngestion)).map(
            (element: any, index: number) => {
              return (
                <div key={index}>
                  <b>{element.id}</b>
                </div>
              );
            }
          )}
        </div>
      </Modal>

      <Modal
        title={t("applog:detail.ingestion.upgradeNotice")}
        fullWidth={false}
        isOpen={openNotice}
        closeModal={() => {
          setOpenNotice(false);
        }}
        actions={
          <div className="button-action no-pb text-right">
            <Button
              btnType="text"
              onClick={() => {
                setOpenNotice(false);
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              loading={loadingUpgrade}
              btnType="primary"
              onClick={() => {
                upgradePipeline();
              }}
            >
              {t("button.upgrade")}
            </Button>
            <Button
              onClick={() => {
                redirectToCreateIngestionPage();
              }}
            >
              {t("button.createSameAccountIngestion")}
            </Button>
          </div>
        }
      >
        <div className="modal-content alert-content">
          <Alert
            noMargin
            type={AlertType.Error}
            content={
              <div>
                {t("applog:detail.ingestion.upgradeNoticeDesc")}
                <ExtLink
                  to={buildLogHubDocsLink(
                    i18n.language,
                    "implementation-guide/revisions/"
                  )}
                >
                  {t("applog:detail.ingestion.upgradeGuide")}
                </ExtLink>
              </div>
            }
          />
        </div>
      </Modal>

      <Modal
        title={t("applog:detail.ingestion.oneMoreStep")}
        fullWidth={false}
        isOpen={showASGModal}
        closeModal={() => {
          setShowASGModal(false);
        }}
        actions={
          <div className="button-action no-pb text-right">
            <Button
              btnType="text"
              onClick={() => {
                setShowASGModal(false);
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              disabled={groupButtonDisabled}
              btnType="primary"
              onClick={() => {
                goToInstanceGroup();
              }}
            >
              {t("button.gotoInstanceGroup")}
            </Button>
          </div>
        }
      >
        <div className="modal-content alert-content">
          <Alert
            noMargin
            type={AlertType.Error}
            content={<div>{t("applog:detail.ingestion.groupTips")}</div>}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Ingestion;
