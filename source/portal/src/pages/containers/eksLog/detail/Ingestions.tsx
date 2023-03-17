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
import React, { useEffect, useState } from "react";
import RefreshIcon from "@material-ui/icons/Refresh";
import { useTranslation } from "react-i18next";
import {
  AppLogIngestion,
  AppPipeline,
  EKSClusterLogSource,
  LogSourceType,
} from "API";
import { SelectType, TablePanel } from "components/TablePanel";
import Button from "components/Button";
import LoadingText from "components/LoadingText";
import { Link, useHistory } from "react-router-dom";
import { formatLocalTime } from "assets/js/utils";
import Status, { StatusType } from "components/Status/Status";
import Modal from "components/Modal";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { deleteAppLogIngestion } from "graphql/mutations";
import { getAppPipeline, listAppLogIngestions } from "graphql/queries";
import { AUTO_REFRESH_INT } from "assets/js/const";

const PAGE_SIZE = 1000;
interface IngestionsProps {
  eksLogSourceInfo: EKSClusterLogSource | undefined;
}

interface EksIngestion {
  id: string; // AppLogIngestionId
  ingestion: AppLogIngestion;
  pipeline: AppPipeline;
}

const EksIngestions: React.FC<IngestionsProps> = (props: IngestionsProps) => {
  const { eksLogSourceInfo } = props;
  const { t } = useTranslation();

  const [loadingData, setLoadingData] = useState(false);
  const [ingestions, setIngestions] = useState<EksIngestion[]>([]);
  const [selectedIngestion, setSelectedIngestion] = useState<EksIngestion[]>(
    []
  );
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [disableDelete, setDisableDelete] = useState(true);
  const [openDeleteModel, setOpenDeleteModel] = useState(false);

  const history = useHistory();

  const getIngestions = async (hideLoading = false) => {
    try {
      if (!hideLoading) {
        setIngestions([]);
        setLoadingData(true);
      }
      const resData: any = await appSyncRequestQuery(listAppLogIngestions, {
        page: 1,
        count: PAGE_SIZE,
        sourceId: eksLogSourceInfo?.id,
        sourceType: LogSourceType.EKSCluster,
      });
      const appLogIngestions: AppLogIngestion[] =
        resData.data?.listAppLogIngestions?.appLogIngestions || [];
      const tmpEksIngestions: EksIngestion[] = await Promise.all(
        appLogIngestions.map(async (appLogIngestion: AppLogIngestion) => {
          const pipelineData = await appSyncRequestQuery(getAppPipeline, {
            id: appLogIngestion.appPipelineId,
          });
          return {
            id: appLogIngestion.id,
            ingestion: appLogIngestion,
            pipeline: pipelineData.data.getAppPipeline,
          };
        })
      );
      setIngestions(tmpEksIngestions);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  const confirmDeleteIngestion = async () => {
    const idsParams = {
      ids: selectedIngestion.map(
        (ingestion: EksIngestion) => ingestion.ingestion.id
      ),
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
      getIngestions();
      setSelectedIngestion([]);
    } catch (error) {
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      console.error(error);
    }
  };

  useEffect(() => {
    if (eksLogSourceInfo && eksLogSourceInfo.id) {
      getIngestions();
    }
  }, [eksLogSourceInfo]);

  useEffect(() => {
    if (selectedIngestion && selectedIngestion.length > 0) {
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

  // Auto Refresh List
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      getIngestions(true);
    }, AUTO_REFRESH_INT);
    return () => clearInterval(refreshInterval);
  }, []);

  return (
    <div>
      <TablePanel
        title={t("ekslog:detail.tab.ingestions")}
        loading={loadingData}
        actions={
          <div>
            <Button
              btnType="icon"
              disabled={loadingData}
              onClick={() => {
                getIngestions();
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
            <Button
              btnType="primary"
              disabled={loadingData}
              onClick={() => {
                history.push({
                  pathname: `/containers/eks-log/${eksLogSourceInfo?.id}/ingestion`,
                });
              }}
            >
              {t("button.createAnIngestion")}
            </Button>
          </div>
        }
        selectType={SelectType.CHECKBOX}
        columnDefinitions={[
          {
            id: "id",
            header: "ID",
            cell: (e: EksIngestion) => {
              return (
                <Link
                  to={`/containers/eks-log/${eksLogSourceInfo?.id}/ingestion/detail/${e?.ingestion?.id}`}
                >
                  {e?.ingestion?.id}
                </Link>
              );
            },
          },
          {
            id: "indexPrefix",
            header: t("ekslog:detail.ingestions.osIndex"),
            cell: (e: EksIngestion) => {
              return e?.pipeline?.aosParams?.indexPrefix;
            },
          },
          {
            id: "pipeline",
            header: t("ekslog:detail.ingestions.pipeline"),
            cell: (e: EksIngestion) => {
              return (
                <Link
                  to={`/log-pipeline/application-log/detail/${e?.pipeline.id}`}
                >
                  {e?.pipeline?.id}
                </Link>
              );
            },
          },
          {
            id: "logConfig",
            header: t("ekslog:detail.ingestions.logConfig"),
            cell: (e: EksIngestion) => {
              return (
                <Link
                  to={`/resources/log-config/detail/${e?.ingestion?.confId}`}
                >
                  {e?.ingestion?.confName}
                </Link>
              );
            },
          },
          {
            width: 170,
            id: "created",
            header: t("ekslog:detail.ingestions.created"),
            cell: (e: EksIngestion) => {
              return formatLocalTime(e?.ingestion?.createdDt || "");
            },
          },
          {
            width: 120,
            id: "status",
            header: t("ekslog:detail.ingestions.status"),
            cell: (e: EksIngestion) => {
              return (
                <Status
                  status={
                    e?.ingestion?.status?.toLocaleLowerCase() ===
                    StatusType.Active.toLocaleLowerCase()
                      ? StatusType.Created
                      : e?.ingestion?.status || ""
                  }
                />
              );
            },
          },
        ]}
        items={ingestions}
        pagination={<div></div>}
        changeSelected={(items) => {
          setSelectedIngestion(items);
        }}
      ></TablePanel>
      <Modal
        title={t("ekslog:detail.ingestions.delete")}
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
                confirmDeleteIngestion();
              }}
            >
              {t("button.delete")}
            </Button>
          </div>
        }
      >
        <div className="modal-content">
          {t("ekslog:detail.ingestions.deleteTips")}
          {JSON.parse(JSON.stringify(selectedIngestion)).map(
            (element: EksIngestion, index: number) => {
              return (
                <div key={index}>
                  <b>{element?.ingestion?.id}</b>
                </div>
              );
            }
          )}
        </div>
      </Modal>
    </div>
  );
};

export default EksIngestions;
