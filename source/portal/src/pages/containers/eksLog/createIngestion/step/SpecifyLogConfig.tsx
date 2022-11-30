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
import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import { useTranslation } from "react-i18next";
import { appSyncRequestQuery } from "assets/js/request";
import { getLogConf, listLogConfs } from "graphql/queries";
import Select, { SelectItem } from "components/Select/select";
import { EksIngestionPropsType } from "../EksLogIngest";
import ExtLink from "components/ExtLink";
import CreateSampleDashboard from "pages/dataInjection/applicationLog/common/CreateSampleDashboard";
import { InfoBarTypes } from "reducer/appReducer";
import TextInput from "components/TextInput";
import LoadingText from "components/LoadingText";
import ConfigDetailComps from "pages/resources/logConfig/ConfigDetailComps";

interface SpecifyLogConfigProp {
  eksIngestionInfo: EksIngestionPropsType;
  changeLogConfig: (configId: string) => void;
  changeSampleDashboard: (yesNo: string) => void;
  changeLogConfPath: (path: string) => void;
}

const SpecifyLogConfig: React.FC<SpecifyLogConfigProp> = (
  props: SpecifyLogConfigProp
) => {
  const { t } = useTranslation();
  const {
    eksIngestionInfo,
    changeLogConfig,
    changeSampleDashboard,
    changeLogConfPath,
  } = props;
  const [curConfig, setCurConfig] = useState<ExLogConf>();
  const [loadingData, setLoadingData] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [logConfigOptionList, setLogConfigOptionList] = useState<SelectItem[]>(
    []
  );
  const [selectedConfig, setSelectedConfig] = useState(eksIngestionInfo.confId);

  const getLogConfigById = async (confId: string) => {
    try {
      setLoadingConfig(true);
      const resData: any = await appSyncRequestQuery(getLogConf, {
        id: confId,
      });
      console.info("resData:", resData);
      const dataLogConfig: ExLogConf = resData.data.getLogConf;
      setCurConfig(dataLogConfig);
      setLoadingConfig(false);
    } catch (error) {
      setLoadingConfig(false);
      console.error(error);
    }
  };

  // Get Instance Group List
  const getLogConfigList = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(listLogConfs, {
        page: 1,
        count: 9999,
      });
      console.info("resData:", resData);
      const dataLogConfList: ExLogConf[] = resData.data.listLogConfs.logConfs;
      const tmpConfigOptList: SelectItem[] = [];
      if (dataLogConfList && dataLogConfList.length > 0) {
        dataLogConfList.forEach((element) => {
          tmpConfigOptList.push({
            name: element.confName || "",
            value: element.id,
          });
        });
      }
      setLogConfigOptionList(tmpConfigOptList);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    console.info("selectedConfig:", selectedConfig);
    if (selectedConfig) {
      changeLogConfig(selectedConfig);
      getLogConfigById(selectedConfig);
    }
  }, [selectedConfig]);

  useEffect(() => {
    getLogConfigList();
  }, []);

  return (
    <div>
      <PagePanel title={t("applog:ingestion.s3.step.specifyConfig")}>
        <HeaderPanel title={t("resource:config.common.logPath")}>
          <FormItem
            infoType={InfoBarTypes.LOG_CONFIG_PATH_EKS}
            optionTitle={t("resource:config.common.logPath")}
            optionDesc={t("resource:config.common.logPathDescEKS")}
            errorText={
              eksIngestionInfo.logPathEmptyError
                ? t("applog:ingestion.applyConfig.inputLogPath")
                : ""
            }
          >
            <div className="flex align-center m-w-75p">
              <div style={{ flex: 1 }}>
                <TextInput
                  value={eksIngestionInfo?.logPath || ""}
                  placeholder="/var/log/containers/<app-name><name-space>*"
                  onChange={(event) => {
                    changeLogConfPath(event.target.value);
                  }}
                />
              </div>
            </div>
          </FormItem>
        </HeaderPanel>

        <HeaderPanel title={t("applog:ingestion.s3.specifyConfig.logConfig")}>
          <FormItem
            optionTitle={t("applog:ingestion.s3.specifyConfig.logConfig")}
            optionDesc={
              <div>
                {t("applog:ingestion.s3.specifyConfig.configDesc")}{" "}
                <ExtLink to="/resources/log-config">
                  {t("ekslog:ingest.specifyLogConfig.config")}
                </ExtLink>
              </div>
            }
            errorText={
              eksIngestionInfo.configRequiredError
                ? t("applog:ingestion.applyConfig.configRequiredError")
                : ""
            }
          >
            <div className="pr">
              <Select
                loading={loadingData}
                className="m-w-45p"
                optionList={logConfigOptionList}
                value={selectedConfig}
                onChange={(event) => {
                  console.info("event:", event);
                  setSelectedConfig(event.target.value);
                }}
                placeholder={t("applog:ingestion.applyConfig.chooseConfig")}
                hasRefresh
                clickRefresh={() => {
                  getLogConfigList();
                }}
              />
            </div>
          </FormItem>

          <CreateSampleDashboard
            logType={curConfig?.logType}
            createDashboard={eksIngestionInfo.createDashboard}
            changeSampleDashboard={changeSampleDashboard}
          />
        </HeaderPanel>
        <>
          {curConfig && (
            <HeaderPanel title={t("applog:ingestion.applyConfig.config")}>
              {loadingConfig ? (
                <LoadingText />
              ) : (
                <div>
                  <ConfigDetailComps hideLogPath curLogConfig={curConfig} />
                </div>
              )}
            </HeaderPanel>
          )}
        </>
      </PagePanel>
    </div>
  );
};

export default SpecifyLogConfig;
