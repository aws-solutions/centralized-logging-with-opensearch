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
import React, { useState, useEffect } from "react";
import { RouteComponentProps, useHistory } from "react-router-dom";
import SideMenu from "components/SideMenu";
import Breadcrumb from "components/Breadcrumb";
import PagePanel from "components/PagePanel";
import Button from "components/Button";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import LoadingText from "components/LoadingText";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { getLogConf } from "graphql/queries";
import { deleteLogConf } from "graphql/mutations";
import Modal from "components/Modal";
import { DEFAULT_AGENT_VERSION, ResourceStatus } from "assets/js/const";
import { formatLocalTime } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import ConfigDetailComps from "./ConfigDetailComps";
import { Alert } from "assets/js/alert";
import { ExLogConf } from "../common/LogConfigComp";

interface MatchParams {
  id: string;
  name: string;
}

const ConfigDetail: React.FC<RouteComponentProps<MatchParams>> = (
  props: RouteComponentProps<MatchParams>
) => {
  const id: string = props.match.params.id;
  const history = useHistory();
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
    { name: curLogConfig?.confName || "" },
  ];

  // Show Remove Log Config Dialog
  const removeLogConfig = async () => {
    setOpenDeleteModel(true);
  };

  // Confirm to Remove Log Config By Id
  const confimRemoveLogConfig = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(deleteLogConf, {
        id: curLogConfig?.id,
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      history.push({
        pathname: `/resources/log-config`,
      });
    } catch (error) {
      setLoadingDelete(false);
      console.error(error);
    }
  };

  const getLogConfigById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getLogConf, {
        id: id,
      });
      console.info("resData:", resData);
      const dataLogConfig: ExLogConf = resData.data.getLogConf;
      if (dataLogConfig.status === ResourceStatus.INACTIVE) {
        Alert(t("resource:config.detail.notExist"));
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
  }, []);

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
                  title={curLogConfig?.confName || ""}
                  actions={
                    <div>
                      <Button
                        onClick={() => {
                          console.info("edit click");
                          history.push({
                            pathname:
                              "/resources/log-config/detail/" + id + "/edit",
                          });
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
                  }
                >
                  <HeaderPanel title={t("resource:config.detail.general")}>
                    <div className="flex value-label-span">
                      <div className="flex-1">
                        <ValueWithLabel
                          label={t("resource:config.detail.name")}
                        >
                          <div>{curLogConfig?.confName}</div>
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
                          label={t("resource:config.detail.agent")}
                        >
                          <div>{DEFAULT_AGENT_VERSION}</div>
                        </ValueWithLabel>
                      </div>
                      <div className="flex-1 border-left-c">
                        <ValueWithLabel
                          label={t("resource:config.detail.created")}
                        >
                          <div>
                            {formatLocalTime(curLogConfig?.createdDt || "")}
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
                  // setOpenDeleteModel(false);
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
            <b>{`${curLogConfig?.confName}`}</b> {"?"}
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ConfigDetail;
