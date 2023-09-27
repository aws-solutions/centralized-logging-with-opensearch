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
import React, { useState, useEffect } from "react";
import SideMenu from "components/SideMenu";
import Breadcrumb from "components/Breadcrumb";
import PagePanel from "components/PagePanel";
import Button from "components/Button";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import LoadingText from "components/LoadingText";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { getLogConfig } from "graphql/queries";
import { deleteLogConfig } from "graphql/mutations";
import Modal from "components/Modal";
import { formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import ConfigDetailComps from "./ConfigDetailComps";
import { Alert as AlertMsg } from "assets/js/alert";
import { ExLogConf } from "../common/LogConfigComp";
import { Link, useNavigate, useParams } from "react-router-dom";
import Alert from "components/Alert";

const ConfigDetail: React.FC = () => {
  const { id, version } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loadingData, setLoadingData] = useState(true);
  const [curLogConfig, setCurLogConfig] = useState<ExLogConf>();
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("resource:config.name"),
      link: "/resources/log-config",
    },
    { name: curLogConfig?.name || "" },
  ];

  // Show Remove Log Config Dialog
  const removeLogConfig = async () => {
    setOpenDeleteModel(true);
  };

  // Confirm to Remove Log Config By ID
  const confimRemoveLogConfig = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(deleteLogConfig, {
        id: curLogConfig?.id,
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
        id: id,
        version: version ? version : 0,
      });
      console.info("resData:", resData);
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

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />

            {loadingData ? (
              <LoadingText text="" />
            ) : (
              <div>
                <PagePanel
                  title={curLogConfig?.name || ""}
                  actions={
                    version ? undefined : (
                      <div>
                        <Button
                          onClick={() => {
                            console.info("edit click");
                            navigate(
                              "/resources/log-config/detail/" + id + "/edit"
                            );
                          }}
                        >
                          {t("button.edit")}
                        </Button>
                        <Button
                          onClick={() => {
                            removeLogConfig();
                          }}
                        >
                          {t("button.delete")}
                        </Button>
                      </div>
                    )
                  }
                >
                  <>
                    {version && (
                      <Alert
                        content={
                          <div>
                            {t("resource:config.detail.notSupportEdit")}
                            <Link
                              to={`/resources/log-config/detail/${curLogConfig?.id}`}
                            >
                              {curLogConfig?.name}
                            </Link>
                          </div>
                        }
                      />
                    )}
                  </>
                  <HeaderPanel title={t("resource:config.detail.general")}>
                    <div className="flex value-label-span">
                      <div className="flex-1">
                        <ValueWithLabel
                          label={t("resource:config.detail.name")}
                        >
                          <div>{curLogConfig?.name}</div>
                        </ValueWithLabel>
                      </div>
                      <div className="flex-1 border-left-c">
                        <ValueWithLabel
                          label={t("resource:config.detail.type")}
                        >
                          <div>{curLogConfig?.logType}</div>
                        </ValueWithLabel>
                      </div>
                      <div className="flex-1 border-left-c">
                        <ValueWithLabel
                          label={t("resource:config.detail.version")}
                        >
                          <div>{version ? version : "latest"}</div>
                        </ValueWithLabel>
                      </div>
                      <div className="flex-1 border-left-c">
                        <ValueWithLabel
                          label={t("resource:config.detail.created")}
                        >
                          <div>
                            {formatLocalTime(curLogConfig?.createdAt || "")}
                          </div>
                        </ValueWithLabel>
                      </div>
                    </div>
                  </HeaderPanel>

                  <HeaderPanel title={t("resource:config.detail.logConfig")}>
                    <ConfigDetailComps
                      hideBasicInfo
                      hideLogPath
                      curLogConfig={curLogConfig}
                    />
                  </HeaderPanel>
                </PagePanel>
              </div>
            )}
          </div>
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
                  confimRemoveLogConfig();
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
      </div>
    </div>
  );
};

export default ConfigDetail;
