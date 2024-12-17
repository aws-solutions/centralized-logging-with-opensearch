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
import { Pagination } from "@material-ui/lab";
import {
  AppLogIngestion,
  AppPipeline,
  GetLogSourceQueryVariables,
  LogSource,
  LogSourceType,
  LogStructure,
  PipelineStatus,
} from "API";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { buildS3Link, defaultStr, formatLocalTime } from "assets/js/utils";
import Button from "components/Button";
import ButtonDropdown from "components/ButtonDropdown";
import Modal from "components/Modal";
import Status, { StatusType } from "components/Status/Status";
import { SelectType, TablePanel } from "components/TablePanel";
import { deleteAppLogIngestion } from "graphql/mutations";
import { getLogSource, listAppLogIngestions } from "graphql/queries";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";
import { useSelector } from "react-redux";
import { AmplifyConfigType, AnalyticEngineTypes } from "types";
import ExtLink from "components/ExtLink";
import { RootState } from "reducer/reducers";
import { identity } from "lodash";
import ButtonRefresh from "components/ButtonRefresh";

const PAGE_SIZE = 20;
interface OverviewProps {
  isRefreshing: boolean;
  pipelineInfo: AppPipeline | undefined;
  isLightEngine?: boolean;
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

export function isS3SourcePipeline(pipelineInfo: AppPipeline) {
  return pipelineInfo.logStructure === LogStructure.RAW;
}

const Ingestion: React.FC<OverviewProps> = (props: OverviewProps) => {
  const { isRefreshing, pipelineInfo } = props;
  const { t } = useTranslation();

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const [loadingData, setLoadingData] = useState(false);
  const [ingestionList, setIngestionList] = useState<AppIngestionItem[]>([]);
  const [selectedIngestion, setSelectedIngestion] = useState<
    AppIngestionItem[]
  >([]);
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [disableDelete, setDisableDelete] = useState(true);
  const [curPage, setCurPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [userSelectType, setUserSelectType] = useState<string>("");
  const location = useLocation();
  const navigate = useNavigate();

  const [hasRecentASG, setHasRecentASG] = useState(false);
  const [recentASGIngestList, setRecentASGIngestList] = useState<
    AppLogIngestion[]
  >([]);
  const [showASGModal, setShowASGModal] = useState(false);
  const [showEKSDaemonSetModal, setShowEKSDaemonSetModal] = useState(false);
  const [eksSourceId, setEksSourceId] = useState("");

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

  const getIngestionByAppPipelineId = async () => {
    try {
      if (!isRefreshing) {
        setLoadingData(true);
        setIngestionList([]);
        setSelectedIngestion([]);
      }
      const resData: any = await appSyncRequestQuery(listAppLogIngestions, {
        page: curPage,
        count: PAGE_SIZE,
        appPipelineId: pipelineInfo?.pipelineId,
      });
      console.info("ingestion resData:", resData);
      const dataIngestion: AppLogIngestion[] =
        resData.data.listAppLogIngestions.appLogIngestions;

      console.info("dataIngestion:dataIngestion:", dataIngestion);
      const tmpRecentASGIngestionList: AppLogIngestion[] = [];
      const creatingASGIngestionList: AppLogIngestion[] = [];

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
          const sourceData = await appSyncRequestQuery(getLogSource, {
            type: appLogIngestion.sourceType,
            sourceId: appLogIngestion.sourceId,
          } as GetLogSourceQueryVariables);

          return {
            id: appLogIngestion.id,
            ingestion: appLogIngestion,
            sourceData: sourceData.data.getLogSource,
          };
        })
      );

      setIngestionList(tmpAppIngestions);
      setTotalCount(resData.data?.listAppLogIngestions?.total || 0);
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
    if (pipelineInfo?.pipelineId) {
      getIngestionByAppPipelineId();
    }
  }, [pipelineInfo, curPage]);

  useEffect(() => {
    const state = location.state as {
      showEKSDaemonSetModal?: boolean;
      eksSourceId?: string;
    };
    setShowEKSDaemonSetModal(state?.showEKSDaemonSetModal ?? false);
    setEksSourceId(defaultStr(state?.eksSourceId));
  }, []);

  useEffect(() => {
    if (
      (pipelineInfo?.status === PipelineStatus.ACTIVE ||
        pipelineInfo?.status === PipelineStatus.ERROR) &&
      selectedIngestion?.length > 0
    ) {
      const statusArr = selectedIngestion.map((element) => {
        return element.ingestion.status;
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

  // Redirect create ingestion page by ingestion type
  const redirectToCreateIngestionPage = (type?: string, state?: unknown) => {
    const ingestionType = defaultStr(type, userSelectType);
    if (ingestionType === INGESTION_TYPE.INSTANCE) {
      navigate(
        `/log-pipeline/application-log/detail/${pipelineInfo?.pipelineId}/create-ingestion-instance`,
        { state: state }
      );
    }
    if (ingestionType === INGESTION_TYPE.S3) {
      if (props.isLightEngine) {
        navigate(
          `/log-pipeline/application-log/create/s3?engineType=${AnalyticEngineTypes.LIGHT_ENGINE}`,
          { state: state }
        );
      } else {
        navigate(`/log-pipeline/application-log/create/s3`, { state: state });
      }
    }
    if (ingestionType === INGESTION_TYPE.EKS) {
      navigate(
        `/log-pipeline/application-log/detail/${pipelineInfo?.pipelineId}/create-ingestion-eks`,
        { state: state }
      );
    }
    if (ingestionType === INGESTION_TYPE.SYSLOG) {
      navigate(
        `/log-pipeline/application-log/detail/${pipelineInfo?.pipelineId}/create-ingestion-syslog`
      );
    }
  };

  // go to instance group
  const goToInstanceGroup = () => {
    navigate(instanceGroupLink);
  };

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

  const renderEKSId = (data: AppIngestionItem) => {
    if (data.ingestion?.sourceType === LogSourceType.EKSCluster) {
      return (
        <Link
          to={`/containers/eks-log/${data.ingestion.sourceId}/ingestion/detail/${data.id}`}
        >
          {data.id}
        </Link>
      );
    }
    if (
      data.ingestion.sourceType === LogSourceType.EC2 ||
      data.ingestion.sourceType === LogSourceType.S3 ||
      data.ingestion.sourceType === LogSourceType.Syslog
    ) {
      return (
        <Link to={`/log-pipeline/application-log/ingestion/detail/${data.id}`}>
          {data.id}
        </Link>
      );
    }
    return data.id;
  };

  const renderEKSSource = (data: AppIngestionItem) => {
    if (data.ingestion?.sourceType === LogSourceType.EKSCluster) {
      return (
        <Link to={`/containers/eks-log/detail/${data.ingestion?.sourceId}`}>
          {data.sourceData?.eks?.eksClusterName}
        </Link>
      );
    } else if (data.ingestion?.sourceType === LogSourceType.Syslog) {
      return (
        data.sourceData?.syslog?.protocol + ":" + data.sourceData?.syslog?.port
      );
    } else if (data.ingestion?.sourceType === LogSourceType.S3) {
      return (
        <>
          <ExtLink
            to={buildS3Link(
              amplifyConfig.aws_project_region,
              data.sourceData?.s3?.bucketName ?? ""
            )}
          >
            {data.sourceData?.s3?.bucketName}
          </ExtLink>
          {data.sourceData?.s3?.compressionType
            ? `(${data.sourceData?.s3?.compressionType})`
            : ""}
        </>
      );
    } else if (data.ingestion?.sourceType === LogSourceType.EC2) {
      return (
        <Link
          to={`/resources/instance-group/detail/${data.ingestion?.sourceId}`}
        >
          {data.sourceData?.ec2?.groupName}
        </Link>
      );
    }
    return <></>;
  };

  const renderStatus = (data: AppIngestionItem) => {
    return (
      <Status
        status={(() => {
          if (pipelineInfo?.status === PipelineStatus.ERROR) {
            return StatusType.Error;
          }
          if (pipelineInfo?.status === PipelineStatus.CREATING) {
            return StatusType.Creating;
          }
          if (pipelineInfo?.status === PipelineStatus.UPDATING) {
            return StatusType.Updating;
          }
          return data.ingestion.status?.toLocaleLowerCase() ===
            StatusType.Active.toLocaleLowerCase()
            ? StatusType.Created
            : defaultStr(data.ingestion.status);
        })()}
      />
    );
  };

  return (
    <div>
      {!isS3SourcePipeline && (
        <Alert
          content={<div>{t("applog:detail.ingestion.permissionInfo")}</div>}
        />
      )}
      <TablePanel
        trackId="id"
        title={t("applog:detail.tab.logSources")}
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
            cell: (e: AppIngestionItem) => renderEKSId(e),
          },

          {
            id: "type",
            header: t("applog:ingestion.type"),
            width: 120,
            cell: (e: AppIngestionItem) => {
              return e.ingestion.sourceType === LogSourceType.EC2
                ? "EC2"
                : e.ingestion.sourceType;
            },
          },

          {
            id: "source",
            header: t("applog:ingestion.source"),
            cell: (e: AppIngestionItem) => renderEKSSource(e),
          },
          {
            id: "logPath",
            header: t("applog:list.logPath"),
            cell: (e: AppIngestionItem) => {
              return e.ingestion.logPath ? e.ingestion.logPath : "N/A";
            },
          },
          {
            width: 170,
            id: "created",
            header: t("applog:detail.ingestion.created"),
            cell: (e: AppIngestionItem) => {
              return formatLocalTime(defaultStr(e?.ingestion.createdAt));
            },
          },
          {
            width: 120,
            id: "status",
            header: t("applog:list.status"),
            cell: (e: AppIngestionItem) => renderStatus(e),
          },
        ]}
        items={ingestionList}
        actions={
          <div>
            <Button
              data-testid="app-ingestion-refresh-button"
              btnType="icon"
              disabled={loadingData}
              onClick={() => {
                getIngestionByAppPipelineId();
              }}
            >
              <ButtonRefresh loading={loadingData} fontSize="medium" />
            </Button>
            <Button
              data-testid="app-ingestion-delete-button"
              disabled={disableDelete}
              onClick={() => {
                setOpenDeleteModel(true);
              }}
            >
              {t("button.delete")}
            </Button>
            <ButtonDropdown
              isI18N
              items={(() => {
                const list = [
                  {
                    id: INGESTION_TYPE.INSTANCE,
                    text: "button.fromInstance",
                    disabled: pipelineInfo && isS3SourcePipeline(pipelineInfo),
                  },
                  {
                    id: INGESTION_TYPE.EKS,
                    text: "button.fromEKS",
                    disabled: pipelineInfo && isS3SourcePipeline(pipelineInfo),
                  },
                  {
                    id: INGESTION_TYPE.SYSLOG,
                    text: "button.fromSysLog",
                    disabled: pipelineInfo && isS3SourcePipeline(pipelineInfo),
                  },
                  {
                    id: INGESTION_TYPE.S3,
                    text: "button.fromOtherSourceS3",
                    disabled: !(
                      pipelineInfo && isS3SourcePipeline(pipelineInfo)
                    ),
                  },
                ];
                return list.filter((each) => !each.disabled);
              })()}
              className="drop-down"
              btnType="primary"
              disabled={pipelineInfo?.status !== PipelineStatus.ACTIVE}
              onItemClick={(item) => {
                setUserSelectType(item.id);
                redirectToCreateIngestionPage(item.id, pipelineInfo);
              }}
            >
              {t("button.createAnIngestion")}
            </ButtonDropdown>
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
              data-testid="app-ingestion-cancel-delete-button"
              btnType="text"
              disabled={loadingDelete}
              onClick={() => {
                setOpenDeleteModel(false);
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              data-testid="app-ingestion-confirm-delete-button"
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
                <div key={identity(index)}>
                  <b>{element.id}</b>
                </div>
              );
            }
          )}
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
            type={AlertType.Warning}
            content={<div>{t("applog:detail.ingestion.groupTips")}</div>}
          />
        </div>
      </Modal>

      <Modal
        title={t("applog:detail.ingestion.oneMoreStepEKS")}
        fullWidth={false}
        isOpen={showEKSDaemonSetModal}
        closeModal={() => {
          setShowEKSDaemonSetModal(false);
        }}
        actions={
          <div className="button-action no-pb text-right">
            <Button
              btnType="text"
              onClick={() => {
                setShowEKSDaemonSetModal(false);
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              btnType="primary"
              onClick={() => {
                setShowEKSDaemonSetModal(false);
                const newHistoryState = {
                  showEKSDaemonSetModal: false,
                  eksSourceId: "",
                };
                navigate(
                  `/log-pipeline/application-log/detail/${pipelineInfo?.pipelineId}`,
                  {
                    state: newHistoryState,
                  }
                );
              }}
            >
              {t("button.confirm")}
            </Button>
          </div>
        }
      >
        <div className="modal-content alert-content">
          <Alert
            noMargin
            type={AlertType.Warning}
            content={
              <div>
                <p>
                  <strong>
                    {t("applog:detail.ingestion.eksDeamonSetTips_0")}
                  </strong>
                </p>
                {t("applog:detail.ingestion.eksDeamonSetTips_1")}
                <Link to={`/containers/eks-log/detail/${eksSourceId}/guide`}>
                  {t("applog:detail.ingestion.eksDeamonSetLink")}
                </Link>
                {t("applog:detail.ingestion.eksDeamonSetTips_2")}
              </div>
            }
          />
        </div>
      </Modal>
    </div>
  );
};

export default Ingestion;
