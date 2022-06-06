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
  LogSourceType,
  PipelineStatus,
} from "API";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { listAppLogIngestions } from "graphql/queries";
import Modal from "components/Modal";
import { deleteAppLogIngestion } from "graphql/mutations";
import { buildS3Link, formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import Status, { StatusType } from "components/Status/Status";
import ButtonDropdown from "components/ButtonDropdown";
import { AmplifyConfigType } from "types";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";

const PAGE_SIZE = 10;
interface OverviewProps {
  pipelineInfo: AppPipeline | undefined;
}

const Ingestion: React.FC<OverviewProps> = (props: OverviewProps) => {
  console.info("props:", props);
  const { pipelineInfo } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const [loadingData, setLoadingData] = useState(false);
  const [ingestionList, setIngestionList] = useState<AppLogIngestion[]>([]);
  const [selectedIngestion, setSelectedIngestion] = useState<AppLogIngestion[]>(
    []
  );
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [disableDelete, setDisableDelete] = useState(true);
  const [curPage, setCurPage] = useState(1);
  const [totoalCount, setTotoalCount] = useState(0);
  const history = useHistory();

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
    setIngestionList([]);
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(listAppLogIngestions, {
        page: curPage,
        count: PAGE_SIZE,
        appPipelineId: pipelineInfo?.id,
      });
      console.info("ingestion resData:", resData);
      const dataIngestion: AppLogIngestion[] =
        resData.data.listAppLogIngestions.appLogIngestions;
      // setCurPipeline(dataPipelne);
      setIngestionList(dataIngestion);
      setTotoalCount(resData.data?.listAppLogIngestions?.total || 0);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  const handlePageChange = (event: any, value: number) => {
    console.info("event:", event);
    console.info("value:", value);
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

  return (
    <div>
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
            cell: (e: AppLogIngestion) => {
              if (e.sourceInfo?.sourceType === LogSourceType.EKSCluster) {
                return (
                  <Link
                    to={`/containers/eks-log/${e.sourceInfo.sourceId}/ingestion/detail/${e.id}`}
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
            header: "Type",
            width: 120,
            cell: (e: AppLogIngestion) => {
              return e.sourceInfo?.sourceType;
            },
          },

          {
            id: "source",
            header: "Source",
            cell: (e: AppLogIngestion) => {
              if (e.sourceInfo?.sourceType === LogSourceType.S3) {
                return (
                  <a
                    target="_blank"
                    href={buildS3Link(
                      e.sourceInfo?.s3Source?.s3Name || "",
                      amplifyConfig.aws_project_region,
                      e.sourceInfo.s3Source?.s3Prefix || ""
                    )}
                    rel="noreferrer"
                  >
                    {e.sourceInfo?.sourceName}
                  </a>
                );
              }
              if (e.sourceInfo?.sourceType === LogSourceType.EKSCluster) {
                return (
                  <Link
                    to={`/containers/eks-log/detail/${e.sourceInfo?.sourceId}`}
                  >
                    {e.sourceInfo.sourceName}
                  </Link>
                );
              }
              return (
                <Link
                  to={`/resources/instance-group/detail/${e.sourceInfo?.sourceId}`}
                >
                  {e.sourceInfo?.sourceName}
                </Link>
              );
            },
          },
          {
            // width: 110,
            id: "logCOnfig",
            header: t("applog:detail.ingestion.logConfig"),
            cell: (e: AppLogIngestion) => {
              return (
                <Link to={`/resources/log-config/detail/${e.confId}`}>
                  {e.confName}
                </Link>
              );
            },
          },
          {
            width: 170,
            id: "created",
            header: t("applog:detail.ingestion.created"),
            cell: (e: AppLogIngestion) => {
              return formatLocalTime(e?.createdDt || "");
            },
          },
          {
            width: 120,
            id: "status",
            header: t("applog:list.status"),
            cell: (e: AppLogIngestion) => {
              return (
                <Status
                  status={
                    e.status?.toLocaleLowerCase() ===
                    StatusType.Active.toLocaleLowerCase()
                      ? StatusType.Created
                      : e.status || ""
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
                { id: "instance", text: "button.fromInstance" },
                { id: "s3", text: "button.fromS3" },
              ]}
              className="drop-down"
              btnType="primary"
              disabled={pipelineInfo?.status !== PipelineStatus.ACTIVE}
              onItemClick={(item) => {
                if (item.id === "instance") {
                  history.push({
                    pathname: `/log-pipeline/application-log/detail/${pipelineInfo?.id}/create-ingestion-instance`,
                  });
                }
                if (item.id === "s3") {
                  history.push({
                    pathname: `/log-pipeline/application-log/detail/${pipelineInfo?.id}/create-ingestion-s3`,
                  });
                }
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
    </div>
  );
};

export default Ingestion;
