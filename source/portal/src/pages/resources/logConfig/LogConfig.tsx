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
import { SelectType } from "components/TablePanel/tablePanel";
import { LogConfig as LogConf } from "API";
import Modal from "components/Modal";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { listLogConfigs } from "graphql/queries";
import { deleteLogConfig } from "graphql/mutations";
import { defaultStr, formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import ButtonRefresh from "components/ButtonRefresh";
import CommonLayout from "pages/layout/CommonLayout";

const PAGE_SIZE = 10;

const LogConfig: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("resource:config.name") },
  ];

  const navigate = useNavigate();
  const [loadingData, setLoadingData] = useState(false);
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [curTipsLogConfig, setCurTipsLogConfig] = useState<LogConf>();
  const [selectedLogConfig, setSelectedLogConfig] = useState<any[]>([]);
  const [disabledDelete, setDisabledDelete] = useState(false);
  const [logConfigList, setLogConfigList] = useState<LogConf[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [curPage, setCurPage] = useState(1);

  // Get Log Config List
  const getLogConfigList = async () => {
    setSelectedLogConfig([]);
    try {
      setLoadingData(true);
      setLogConfigList([]);
      const resData: any = await appSyncRequestQuery(listLogConfigs, {
        page: curPage,
        count: PAGE_SIZE,
      });
      console.info("resData:", resData);
      const dataLogConfigList: LogConf[] =
        resData.data.listLogConfigs.logConfigs;
      setTotalCount(resData.data.listLogConfigs.total);
      setLogConfigList(dataLogConfigList);
      setLoadingData(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePageChange = (event: any, value: number) => {
    setCurPage(value);
  };

  // Show Remove Log Config Dialog
  const removeLogConfig = async () => {
    setCurTipsLogConfig(selectedLogConfig[0]);
    setOpenDeleteModel(true);
  };

  // Confirm to Remove Log Config By Id
  const confirmRemoveLogConfig = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(deleteLogConfig, {
        id: curTipsLogConfig?.id,
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      getLogConfigList();
    } catch (error) {
      setLoadingDelete(false);
      console.error(error);
    }
  };

  // Get Log Config list when page rendered.
  useEffect(() => {
    getLogConfigList();
  }, [curPage]);

  // Disable delete button and view detail button when no row selected.
  useEffect(() => {
    if (selectedLogConfig.length > 0) {
      setDisabledDelete(false);
    } else {
      setDisabledDelete(true);
    }
  }, [selectedLogConfig]);

  const renderConfigName = (data: LogConf) => {
    return (
      <Link to={`/resources/log-config/detail/${data.id}`}>{data.name}</Link>
    );
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="table-data">
        <TablePanel
          trackId="id"
          title={t("resource:config.name")}
          changeSelected={(item) => {
            console.info("item:", item);
            setSelectedLogConfig(item);
          }}
          loading={loadingData}
          selectType={SelectType.RADIO}
          columnDefinitions={[
            {
              id: "Name",
              header: t("resource:config.list.name"),
              cell: (e: LogConf) => renderConfigName(e),
            },
            {
              id: "Type",
              header: t("resource:config.list.type"),
              cell: (e: LogConf) => {
                return e.logType;
              },
            },
            {
              width: 170,
              id: "created",
              header: t("resource:config.list.created"),
              cell: (e: LogConf) => {
                return formatLocalTime(defaultStr(e?.createdAt));
              },
            },
          ]}
          items={logConfigList}
          actions={
            <div>
              <Button
                data-testid="refresh-button"
                btnType="icon"
                disabled={loadingData}
                onClick={() => {
                  if (curPage === 1) {
                    getLogConfigList();
                  } else {
                    setCurPage(1);
                  }
                }}
              >
                <ButtonRefresh loading={loadingData} />
              </Button>
              <Button
                data-testid="delete-button"
                disabled={disabledDelete}
                onClick={() => {
                  removeLogConfig();
                }}
              >
                {t("button.delete")}
              </Button>
              <Button
                data-testid="create-button"
                btnType="primary"
                onClick={() => {
                  navigate("/resources/log-config/create");
                }}
              >
                {t("button.createLogConfig")}
              </Button>
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
          <b>{`${curTipsLogConfig?.name}`}</b> {"?"}
        </div>
      </Modal>
    </CommonLayout>
  );
};

export default LogConfig;
