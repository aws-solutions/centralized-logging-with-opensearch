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
import { LogSourceType, LogType, MultiLineLogParser, SyslogParser } from "API";
import { CreationMethod } from "types";
import LogConfigComp, {
  ExLogConf,
  PageType,
} from "pages/resources/common/LogConfigComp";
import {
  INVALID,
  RFC3164_DEFAULT_REGEX,
  RFC5424_DEFAULT_REGEX,
} from "assets/js/const";
import { getRegexAndTimeByConfigAndFormat } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import CreateSampleDashboard from "pages/dataInjection/applicationLog/common/CreateSampleDashboard";
import { InfoBarTypes } from "reducer/appReducer";
import TextInput from "components/TextInput";
import ConfigDetailComps from "pages/resources/logConfig/ConfigDetailComps";
import LoadingText from "components/LoadingText";
import { IngestionPropsType } from "../createIngestion/CreateIngestion";
import { IngestionFromSysLogPropsType } from "../createSyslogIngestion/CreateSysLogIngestion";
import { IngestionFromEKSPropsType } from "../createEKSIngestion/CreateEKSIngestion";

interface ApplyConfigProps {
  hideLogPath: boolean;
  ingestionInfo:
    | IngestionPropsType
    | IngestionFromSysLogPropsType
    | IngestionFromEKSPropsType;
  logSourceType?: LogSourceType;
  changeCurLogConfig: (config: ExLogConf) => void;
  changeSampleDashboard: (yesNo: string) => void;
  hideNameError: () => void;
  hideTypeError: () => void;
  changeLoadingConfig: (loading: boolean) => void;
  changeLogCreationMethod: (method: string) => void;
  changeUserLogFormatError: (error: boolean) => void;
  changeSampleLogFormatInvalid: (invalid: boolean) => void;
  changeLogPath: (path: string) => void;
  changeExistsConfig: (configId: string) => void;
}

const ApplyLogConfig: React.FC<ApplyConfigProps> = (
  props: ApplyConfigProps
) => {
  const {
    hideLogPath,
    ingestionInfo,
    logSourceType,
    changeCurLogConfig,
    changeSampleDashboard,
    hideNameError,
    hideTypeError,
    changeLoadingConfig,
    changeLogCreationMethod,
    changeUserLogFormatError,
    changeSampleLogFormatInvalid,
    changeLogPath,
    changeExistsConfig,
  } = props;
  const { t } = useTranslation();

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [logConfigOptionList, setLogConfigOptionList] = useState<SelectItem[]>(
    []
  );

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
        // Only set config list with json and single line regex when ingest syslog
        if (logSourceType === LogSourceType.Syslog) {
          dataLogConfList.forEach((element) => {
            if (
              element.logType === LogType.JSON ||
              element.logType === LogType.SingleLineText ||
              element.logType === LogType.Syslog
            ) {
              tmpConfigOptList.push({
                name: element.confName || "",
                value: element.id,
              });
            }
          });
        } else {
          dataLogConfList.forEach((element) => {
            tmpConfigOptList.push({
              name: element.confName || "",
              value: element.id,
            });
          });
        }
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
    console.info(
      "ingestionInfo.curLogConfig?.id:",
      ingestionInfo.curLogConfig?.id
    );
    if (ingestionInfo.curLogConfig?.id) {
      getLogConfigById(ingestionInfo.curLogConfig?.id);
    }
  }, [ingestionInfo.curLogConfig?.id]);

  return (
    <div>
      <PagePanel
        title={t("applog:ingestion.applyConfig.name")}
        desc={t("applog:ingestion.applyConfig.nameDesc")}
      >
        <div className="mt-20">
          {!hideLogPath && (
            <HeaderPanel title={t("resource:config.common.logPath")}>
              <FormItem
                infoType={
                  logSourceType === LogSourceType.EKSCluster
                    ? InfoBarTypes.LOG_CONFIG_PATH_EKS
                    : InfoBarTypes.LOG_CONFIG_PATH
                }
                optionTitle={t("resource:config.common.logPath")}
                optionDesc={
                  logSourceType === LogSourceType.EKSCluster
                    ? t("resource:config.common.logPathDescEKS")
                    : t("resource:config.common.logPathDesc")
                }
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
                      placeholder={
                        logSourceType === LogSourceType.EKSCluster
                          ? "/var/log/containers/<app-name><name-space>*"
                          : "/var/log/app1/*.log, /var/log/app2/*.log"
                      }
                      onChange={(event) => {
                        changeLogPath(event.target.value);
                      }}
                    />
                  </div>
                </div>
              </FormItem>
            </HeaderPanel>
          )}

          <HeaderPanel title={t("applog:ingestion.applyConfig.logConfig")}>
            <div>
              <FormItem
                optionTitle={t("applog:ingestion.applyConfig.method")}
                optionDesc=""
              >
                <Tiles
                  value={ingestionInfo.logConfigMethod}
                  onChange={(event) => {
                    changeExistsConfig("");
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
                  optionDesc={
                    logSourceType === LogSourceType.Syslog
                      ? t("applog:ingestion.applyConfig.chooseExistsSyslog")
                      : t("applog:ingestion.applyConfig.chooseExists")
                  }
                  errorText={
                    ingestionInfo.showChooseExistsError
                      ? t("applog:ingestion.applyConfig.configRequiredError")
                      : ""
                  }
                >
                  <div className="pr">
                    <Select
                      disabled={loadingData}
                      loading={loadingConfig}
                      className="m-w-45p"
                      optionList={logConfigOptionList}
                      value={ingestionInfo.curLogConfig?.id || ""}
                      onChange={(event) => {
                        console.info("event:", event);
                        changeExistsConfig(event.target.value);
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

          {ingestionInfo.logConfigMethod === CreationMethod.New && (
            <LogConfigComp
              pageType={PageType.New}
              logSourceType={logSourceType}
              isLoading={loadingData}
              headerTitle={t("applog:ingestion.applyConfig.config")}
              curConfig={ingestionInfo.curLogConfig}
              showNameRequiredError={
                ingestionInfo.logConfigError.logConfigNameError
              }
              showTypeRequiedError={
                ingestionInfo.logConfigError.logConfigTypeError
              }
              userLogFormatError={
                ingestionInfo.logConfigError.showUserLogFormatError
              }
              sampleLogRequiredError={
                ingestionInfo.logConfigError.showSampleLogRequiredError
              }
              sampleLogInvalid={
                ingestionInfo.logConfigError.showSampleLogInvalidError
              }
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
                  regularExpression:
                    type === LogType.SingleLineText ? "(?<log>.+)" : "",
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
                  regularExpression:
                    parser === MultiLineLogParser.CUSTOM ? "(?<log>.+)" : "",
                  userSampleLog: "",
                  regularSpecs: [],
                };
                changeCurLogConfig(tmpConfig);
              }}
              changeSyslogParser={(parser) => {
                let tmpSyslogRegex = "";
                if (parser === SyslogParser.RFC3164) {
                  tmpSyslogRegex = RFC3164_DEFAULT_REGEX;
                } else if (parser === SyslogParser.RFC5424) {
                  tmpSyslogRegex = RFC5424_DEFAULT_REGEX;
                }
                const tmpConfig: any = {
                  ...ingestionInfo.curLogConfig,
                  syslogParser: parser,
                  userLogFormat: "",
                  regularExpression: tmpSyslogRegex,
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
              changeSelectKeyList={(keyList) => {
                const tmpConfig: any = {
                  ...ingestionInfo.curLogConfig,
                  selectKeyList: keyList,
                };
                changeCurLogConfig(tmpConfig);
              }}
              changeRegexKeyList={(list) => {
                const tmpConfig: any = {
                  ...ingestionInfo.curLogConfig,
                  regexKeyList: list,
                };
                changeCurLogConfig(tmpConfig);
              }}
              changeFilterRegex={(filter) => {
                const tmpConfig: any = {
                  ...ingestionInfo.curLogConfig,
                  processorFilterRegex: filter,
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
              changeTimeKey={(key) => {
                const tmpConfig: any = {
                  ...ingestionInfo.curLogConfig,
                  timeKey: key,
                };
                changeCurLogConfig(tmpConfig);
              }}
              changeTimeOffset={(offset) => {
                const tmpConfig: any = {
                  ...ingestionInfo.curLogConfig,
                  timeOffset: offset,
                };
                changeCurLogConfig(tmpConfig);
              }}
              changeUserLogFormat={(format) => {
                const { tmpExp, tmpTimeExp } = getRegexAndTimeByConfigAndFormat(
                  ingestionInfo?.curLogConfig,
                  format
                );
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
                  timeRegularExpression: tmpTimeExp,
                };
                changeCurLogConfig(tmpConfig);
              }}
            />
          )}

          {ingestionInfo.logConfigMethod === CreationMethod.Exists &&
            ingestionInfo.curLogConfig?.id && (
              <HeaderPanel title={t("applog:ingestion.applyConfig.config")}>
                {loadingData ? (
                  <LoadingText />
                ) : (
                  <div>
                    <ConfigDetailComps
                      hideLogPath
                      curLogConfig={ingestionInfo.curLogConfig}
                    />
                  </div>
                )}
              </HeaderPanel>
            )}
        </div>
      </PagePanel>
    </div>
  );
};

export default ApplyLogConfig;
