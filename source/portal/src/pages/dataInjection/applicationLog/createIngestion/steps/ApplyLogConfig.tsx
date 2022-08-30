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
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import Tiles from "components/Tiles";
import PagePanel from "components/PagePanel";
import Select from "components/Select";
import { getLogConf, listLogConfs } from "graphql/queries";
import { appSyncRequestQuery } from "assets/js/request";
import { SelectItem } from "components/Select/select";
import { LogType, MultiLineLogParser } from "API";
import { CreationMethod } from "types";
import { IngestionPropsType } from "../CreateIngestion";
import LogConfigComp, {
  ExLogConf,
  PageType,
} from "pages/resources/common/LogConfigComp";
import { INVALID } from "assets/js/const";
import {
  buildRegexFromApacheLog,
  buildRegexFromNginxLog,
  buildSpringBootRegExFromConfig,
} from "assets/js/utils";
import { useTranslation } from "react-i18next";
import CreateSampleDashboard from "pages/dataInjection/applicationLog/common/CreateSampleDashboard";
import { InfoBarTypes } from "reducer/appReducer";
import TextInput from "components/TextInput";

interface ApplyConfigProps {
  ingestionInfo: IngestionPropsType;
  changeCurLogConfig: (config: ExLogConf | undefined) => void;
  changeSampleDashboard: (yesNo: string) => void;
  hideNameError: () => void;
  hideTypeError: () => void;
  changeLoadingConfig: (loading: boolean) => void;
  changeLogCreationMethod: (method: string) => void;
  changeUserLogFormatError: (error: boolean) => void;
  changeSampleLogFormatInvalid: (invalid: boolean) => void;
  changeLogPath: (path: string) => void;
}

const ApplyLogConfig: React.FC<ApplyConfigProps> = (
  props: ApplyConfigProps
) => {
  const {
    ingestionInfo,
    changeCurLogConfig,
    changeSampleDashboard,
    hideNameError,
    hideTypeError,
    changeLoadingConfig,
    changeLogCreationMethod,
    changeUserLogFormatError,
    changeSampleLogFormatInvalid,
    changeLogPath,
  } = props;
  const { t } = useTranslation();

  const [selectedConfig, setSelectedConfig] = useState(
    ingestionInfo.curLogConfig?.id || ""
  );
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [logConfigOptionList, setLogConfigOptionList] = useState<SelectItem[]>(
    []
  );
  // const [showUserLogFormatError, setShowUserLogFormatError] = useState(false);

  const getLogConfigById = async (confId: string) => {
    try {
      setLoadingData(true);
      changeLoadingConfig(true);
      const resData: any = await appSyncRequestQuery(getLogConf, {
        id: confId,
      });
      console.info("resData:", resData);
      const dataLogConfig: ExLogConf = resData.data.getLogConf;
      changeCurLogConfig(dataLogConfig);
      hideNameError();
      hideTypeError();
      setLoadingData(false);
      changeLoadingConfig(false);
    } catch (error) {
      setLoadingData(false);
      changeLoadingConfig(false);
      console.error(error);
    }
  };

  // Get Instance Group List
  const getLogConfigList = async () => {
    try {
      setLoadingConfig(true);
      changeLoadingConfig(true);
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
      setLoadingConfig(false);
      changeLoadingConfig(false);
    } catch (error) {
      setLoadingConfig(false);
      changeLoadingConfig(false);
      console.error(error);
    }
  };

  useEffect(() => {
    if (ingestionInfo.logConfigMethod === CreationMethod.Exists) {
      getLogConfigList();
      hideNameError();
      hideTypeError();
    }
  }, [ingestionInfo.logConfigMethod]);

  useEffect(() => {
    console.info("selectedConfig:", selectedConfig);
    if (selectedConfig) {
      getLogConfigById(selectedConfig);
    }
  }, [selectedConfig]);

  return (
    <div>
      <PagePanel
        title={t("applog:ingestion.applyConfig.name")}
        desc={t("applog:ingestion.applyConfig.nameDesc")}
      >
        <div className="mt-20">
          <HeaderPanel title={t("resource:config.common.logPath")}>
            <FormItem
              infoType={InfoBarTypes.LOG_CONFIG_PATH}
              optionTitle={t("resource:config.common.logPath")}
              optionDesc={t("resource:config.common.logPathDesc")}
              errorText={
                ingestionInfo.logPathEmptyError
                  ? t("applog:ingestion.applyConfig.inputLogPath")
                  : ""
              }
            >
              <div className="flex align-center m-w-75p">
                <div style={{ flex: 1 }}>
                  <TextInput
                    value={ingestionInfo.logPath}
                    placeholder="/var/log/app1/*.log, /var/log/app2/*.log"
                    onChange={(event) => {
                      changeLogPath(event.target.value);
                    }}
                  />
                </div>
              </div>
            </FormItem>
          </HeaderPanel>

          <HeaderPanel title={t("applog:ingestion.applyConfig.logConfig")}>
            <div>
              <FormItem
                optionTitle={t("applog:ingestion.applyConfig.method")}
                optionDesc=""
              >
                <Tiles
                  value={ingestionInfo.logConfigMethod}
                  onChange={(event) => {
                    setSelectedConfig("");
                    changeLogCreationMethod(event.target.value);
                  }}
                  items={[
                    {
                      label: t("applog:ingestion.applyConfig.new"),
                      description: t("applog:ingestion.applyConfig.newDesc"),
                      value: CreationMethod.New,
                    },
                    {
                      label: t("applog:ingestion.applyConfig.exists"),
                      description: t("applog:ingestion.applyConfig.existsDesc"),
                      value: CreationMethod.Exists,
                    },
                  ]}
                />
              </FormItem>

              {ingestionInfo.logConfigMethod === CreationMethod.Exists && (
                <FormItem
                  optionTitle={t("applog:ingestion.applyConfig.logConfig")}
                  optionDesc={t("applog:ingestion.applyConfig.chooseExists")}
                >
                  <div className="pr">
                    <Select
                      disabled={loadingData}
                      loading={loadingConfig}
                      className="m-w-45p"
                      optionList={logConfigOptionList}
                      value={selectedConfig}
                      onChange={(event) => {
                        console.info("event:", event);
                        setSelectedConfig(event.target.value);
                      }}
                      placeholder={t(
                        "applog:ingestion.applyConfig.chooseConfig"
                      )}
                    />
                  </div>
                </FormItem>
              )}
            </div>
            <CreateSampleDashboard
              logType={ingestionInfo.curLogConfig?.logType}
              createDashboard={ingestionInfo.createDashboard}
              changeSampleDashboard={changeSampleDashboard}
            />
          </HeaderPanel>

          <LogConfigComp
            isLoading={loadingData}
            pageType={
              ingestionInfo.logConfigMethod === CreationMethod.New
                ? PageType.New
                : PageType.Edit
            }
            headerTitle={t("applog:ingestion.applyConfig.config")}
            inputDisable={
              ingestionInfo.logConfigMethod === CreationMethod.Exists
            }
            curConfig={ingestionInfo.curLogConfig}
            showNameRequiredError={ingestionInfo.logConfigNameError}
            showTypeRequiedError={ingestionInfo.logConfigTypeError}
            sampleLogRequiredError={ingestionInfo.showSampleLogRequiredError}
            userLogFormatError={ingestionInfo.showUserLogFormatError}
            sampleLogInvalid={ingestionInfo.showSampleLogInvalidError}
            changeSampleLogInvalid={(invalid) => {
              changeSampleLogFormatInvalid(invalid);
            }}
            changeLogConfName={(name: string) => {
              hideNameError();
              const tmpConfig: any = {
                ...ingestionInfo.curLogConfig,
                confName: name,
              };
              changeCurLogConfig(tmpConfig);
            }}
            changeLogType={(type: LogType) => {
              hideTypeError();
              const tmpConfig: any = {
                ...ingestionInfo.curLogConfig,
                userLogFormat: "",
                regularExpression: "",
                multilineLogParser: undefined,
                userSampleLog: "",
                regularSpecs: [],
                logType: type,
              };
              changeCurLogConfig(tmpConfig);
            }}
            changeLogParser={(parser) => {
              const tmpConfig: any = {
                ...ingestionInfo.curLogConfig,
                multilineLogParser: parser,
                userLogFormat: "",
                regularExpression: "",
                userSampleLog: "",
                regularSpecs: [],
              };
              changeCurLogConfig(tmpConfig);
            }}
            changeRegExpSpecs={(spec) => {
              const tmpConfig: any = {
                ...ingestionInfo.curLogConfig,
                regularSpecs: spec,
              };
              changeCurLogConfig(tmpConfig);
            }}
            changeUserSmapleLog={(log) => {
              const tmpConfig: any = {
                ...ingestionInfo.curLogConfig,
                regularSpecs: [],
                userSampleLog: log,
              };
              changeCurLogConfig(tmpConfig);
            }}
            changeUserLogFormat={(format) => {
              let tmpExp = "";
              if (ingestionInfo.curLogConfig?.logType === LogType.Nginx) {
                tmpExp = buildRegexFromNginxLog(format, true);
              }
              if (ingestionInfo.curLogConfig?.logType === LogType.Apache) {
                tmpExp = buildRegexFromApacheLog(format);
              }
              if (
                ingestionInfo.curLogConfig?.logType ===
                  LogType.SingleLineText ||
                (ingestionInfo.curLogConfig?.logType ===
                  LogType.MultiLineText &&
                  ingestionInfo.curLogConfig?.multilineLogParser ===
                    MultiLineLogParser.CUSTOM)
              ) {
                tmpExp = format;
              }
              if (
                ingestionInfo.curLogConfig?.multilineLogParser ===
                MultiLineLogParser.JAVA_SPRING_BOOT
              ) {
                tmpExp = buildSpringBootRegExFromConfig(format);
              }
              if (ingestionInfo?.curLogConfig?.logType === LogType.Nginx) {
                if (tmpExp === INVALID) {
                  changeUserLogFormatError(true);
                } else {
                  changeUserLogFormatError(false);
                }
              }
              if (ingestionInfo?.curLogConfig?.logType === LogType.Apache) {
                if (tmpExp === INVALID) {
                  changeUserLogFormatError(true);
                } else {
                  changeUserLogFormatError(false);
                }
              }
              const tmpConfig: any = {
                ...ingestionInfo.curLogConfig,
                userLogFormat: format,
                regularExpression: tmpExp !== INVALID ? tmpExp : "",
              };
              changeCurLogConfig(tmpConfig);
            }}
          />
        </div>
      </PagePanel>
    </div>
  );
};

export default ApplyLogConfig;
