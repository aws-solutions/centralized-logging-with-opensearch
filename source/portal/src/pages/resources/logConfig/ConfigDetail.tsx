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
import React, { useState, useEffect, useMemo } from "react";
import Button from "components/Button";
import HeaderPanel from "components/HeaderPanel";
import {
  ApiResponse,
  appSyncRequestMutation,
  appSyncRequestQuery,
} from "assets/js/request";
import { getLogConfig, listLogConfigVersions } from "graphql/queries";
import { deleteLogConfig } from "graphql/mutations";
import Modal from "components/Modal";
import { defaultStr, formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import ConfigDetailComps from "./ConfigDetailComps";
import { Alert as AlertMsg } from "assets/js/alert";
import { ExLogConf } from "../common/LogConfigComp";
import { Link, useNavigate, useParams } from "react-router-dom";
import Alert from "components/Alert";
import CommonLayout from "pages/layout/CommonLayout";
import { isWindowsEvent } from "reducer/createLogConfig";
import { useAsyncData } from "assets/js/useAsyncData";
import { ListLogConfigVersionsQueryVariables, LogConfig } from "API";
import { SelectType, TablePanel } from "components/TablePanel";
import Pagination from "@material-ui/lab/Pagination";
import ConfigGeneral from "./ConfigGeneral";

const PAGE_SIZE = 10;

const ConfigDetail: React.FC = () => {
  const { id, version } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loadingData, setLoadingData] = useState(true);
  const [curLogConfig, setCurLogConfig] = useState<ExLogConf>();
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [curPage, setCurPage] = useState(1);

  const handlePageChange = (event: any, value: number) => {
    console.info("event:", event);
    console.info("value:", value);
    setCurPage(value);
  };

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("resource:config.name"),
      link: "/resources/log-config",
    },
    { name: defaultStr(curLogConfig?.name) },
  ];

  // Show Remove Log Config Dialog
  const removeLogConfig = async () => {
    setOpenDeleteModel(true);
  };

  // Confirm to Remove Log Config By ID
  const confirmRemoveLogConfig = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(deleteLogConfig, {
        id: encodeURIComponent(defaultStr(curLogConfig?.id)),
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      navigate(`/resources/log-config`);
    } catch (error) {
      setLoadingDelete(false);
      console.error(error);
    }
  };

  const getLogConfigById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getLogConfig, {
        id: encodeURIComponent(defaultStr(id)),
        version: version ?? 0,
      });
      const dataLogConfig: ExLogConf = resData.data.getLogConfig;
      if (!dataLogConfig.id) {
        AlertMsg(t("resource:config.detail.notExist"));
        return;
      }
      setCurLogConfig(dataLogConfig);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getLogConfigById();
  }, [version]);

  const { data, isLoadingData: loadingRevision } = useAsyncData<
    ApiResponse<"listLogConfigVersions", LogConfig[]>
  >(
    () =>
      appSyncRequestQuery(listLogConfigVersions, {
        id: id,
      } as ListLogConfigVersionsQueryVariables),
    []
  );

  const revisions = useMemo(
    () =>
      (data?.data.listLogConfigVersions ?? [])
        .slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)
        .map((item) => {
          item.id = `${item.version}`;
          return item;
        }),
    [data, curPage]
  );

  return (
    <CommonLayout breadCrumbList={breadCrumbList} loadingData={loadingData}>
      <div>
        {version && (
          <Alert
            content={
              <div>
                {t("resource:config.detail.notSupportEdit")}
                <Link to={`/resources/log-config/detail/${curLogConfig?.id}`}>
                  {curLogConfig?.name}
                </Link>
              </div>
            }
          />
        )}
        <ConfigGeneral
          curLogConfig={curLogConfig}
          removeLogConfig={removeLogConfig}
        />
        <div className="mb-20">
          <TablePanel
            variant="header-panel"
            trackId="version"
            title={t("resource:config.detail.revisions")}
            changeSelected={(item) => {
              console.info("item:", item);
              setCurLogConfig(item[0]);
            }}
            loading={loadingRevision}
            selectType={SelectType.RADIO}
            defaultSelectItem={[{ id: `${curLogConfig?.version}` }]}
            columnDefinitions={[
              {
                id: "revision",
                header: t("resource:config.detail.revision"),
                cell: (e: LogConfig) => e.version,
              },
              {
                id: "description",
                header: t("resource:config.common.description"),
                cell: (e: LogConfig) => e.description,
              },
              {
                id: "created",
                header: t("resource:config.detail.created"),
                cell: (e: LogConfig) =>
                  formatLocalTime(defaultStr(e.createdAt)),
              },
            ]}
            items={revisions}
            actions={
              <Button
                onClick={() => {
                  navigate(
                    `/resources/log-config/detail/${id}/revision/${curLogConfig?.version}/edit`
                  );
                }}
              >
                {t("resource:config.detail.createRevision")}
              </Button>
            }
            pagination={
              <Pagination
                count={Math.ceil(
                  (data?.data.listLogConfigVersions?.length ?? 0) / PAGE_SIZE
                )}
                page={curPage}
                onChange={handlePageChange}
                size="small"
              />
            }
          />
        </div>

        {!isWindowsEvent(curLogConfig?.logType) && (
          <HeaderPanel title={t("resource:config.detail.logParser")}>
            <ConfigDetailComps hideBasicInfo curLogConfig={curLogConfig} />
          </HeaderPanel>
        )}
      </div>
      <Modal
        title={t("resource:config.delete")}
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
                confirmRemoveLogConfig();
              }}
            >
              {t("button.delete")}
            </Button>
          </div>
        }
      >
        <div className="modal-content">
          {t("resource:config.deleteTips")}
          <b>{`${curLogConfig?.name}`}</b> {"?"}
        </div>
      </Modal>
    </CommonLayout>
  );
};

export default ConfigDetail;
