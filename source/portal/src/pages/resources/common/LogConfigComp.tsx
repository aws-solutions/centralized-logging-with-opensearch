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
import React from "react";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import Select from "components/Select";
import {
  LOG_CONFIG_TYPE_LIST,
  MULTI_LINE_LOG_PARSER_LIST,
} from "assets/js/const";
import { LogConf, LogType, MultiLineLogParser } from "API";
import TextArea from "components/TextArea";
import HeaderPanel from "components/HeaderPanel";
import SampleLogParsing from "./SampleLogParsing";
import { ActionType, InfoBarTypes } from "reducer/appReducer";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import LoadingText from "components/LoadingText";

export interface ExLogConf extends LogConf {
  userSampleLog?: string;
  smapleLogDateFormatStr?: string;
}

export enum PageType {
  Edit = "Edit",
  New = "New",
}

interface LogConfigProps {
  pageType: PageType;
  headerTitle: string;
  curConfig: LogConf | undefined;
  changeLogConfName?: (name: string) => void;
  changeLogType?: (type: LogType) => void;
  changeUserLogFormat?: (format: string) => void;
  changeRegExpSpecs?: (specs: any) => void;
  changeLogParser?: (parser: MultiLineLogParser) => void;
  changeUserSmapleLog?: (log: string) => void;
  showNameRequiredError?: boolean;
  showTypeRequiedError?: boolean;
  inputDisable?: boolean;
  userLogFormatError?: boolean;
  sampleLogRequiredError?: boolean;
  isLoading?: boolean;
  sampleLogInvalid: boolean;
  changeSampleLogInvalid?: (invalid: boolean) => void;
}

const LogConfigComp: React.FC<LogConfigProps> = (props: LogConfigProps) => {
  const {
    headerTitle,
    curConfig,
    changeLogConfName,
    changeLogType,
    changeUserLogFormat,
    changeRegExpSpecs,
    changeLogParser,
    changeUserSmapleLog,
    showNameRequiredError,
    showTypeRequiedError,
    inputDisable,
    userLogFormatError,
    sampleLogRequiredError,
    isLoading,
    sampleLogInvalid,
    changeSampleLogInvalid,
  } = props;
  const { t } = useTranslation();
  const dispatch = useDispatch();

  return (
    <div>
      <HeaderPanel title={headerTitle}>
        {isLoading ? (
          <LoadingText />
        ) : (
          <div>
            <FormItem
              optionTitle={t("resource:config.common.configName")}
              optionDesc={t("resource:config.common.configNameDesc")}
              errorText={
                showNameRequiredError
                  ? t("resource:config.common.configNameError")
                  : ""
              }
            >
              <TextInput
                disabled={inputDisable}
                className="m-w-75p"
                value={curConfig?.confName || ""}
                onChange={(event) => {
                  changeLogConfName && changeLogConfName(event.target.value);
                }}
                placeholder="log-example-config"
              />
            </FormItem>

            <FormItem
              optionTitle={t("resource:config.common.logType")}
              optionDesc={t("resource:config.common.logTypeDesc")}
              errorText={
                showTypeRequiedError
                  ? t("resource:config.common.logTypeError")
                  : ""
              }
            >
              <Select
                isI18N
                disabled={inputDisable}
                className="m-w-45p"
                optionList={LOG_CONFIG_TYPE_LIST}
                value={curConfig?.logType || ""}
                onChange={(event) => {
                  dispatch({
                    type: ActionType.CLOSE_INFO_BAR,
                  });
                  changeUserLogFormat && changeUserLogFormat("");
                  changeLogType && changeLogType(event.target.value);
                }}
                placeholder={t("resource:config.common.chooseLogType")}
              />
            </FormItem>

            {curConfig?.logType === LogType.MultiLineText && (
              <FormItem
                optionTitle={t("resource:config.common.parser")}
                optionDesc={t("resource:config.common.parserDesc")}
              >
                <Select
                  className="m-w-45p"
                  disabled={inputDisable}
                  optionList={MULTI_LINE_LOG_PARSER_LIST}
                  value={curConfig?.multilineLogParser || ""}
                  onChange={(event) => {
                    console.info("event:", event);
                    changeLogParser && changeLogParser(event.target.value);
                  }}
                  placeholder={t("resource:config.common.chooseParser")}
                />
              </FormItem>
            )}

            {curConfig?.logType === LogType.MultiLineText &&
              curConfig?.multilineLogParser ===
                MultiLineLogParser.JAVA_SPRING_BOOT && (
                <div className="m-w-75p">
                  <FormItem
                    optionTitle={t(
                      "resource:config.common.springbootLogFormat"
                    )}
                    optionDesc={t(
                      "resource:config.common.springbootLogFormatDesc"
                    )}
                  >
                    <TextInput
                      disabled={inputDisable}
                      placeholder="%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} – %msg%n"
                      value={curConfig?.userLogFormat || ""}
                      onChange={(event) => {
                        changeUserLogFormat &&
                          changeUserLogFormat(event.target.value);
                      }}
                    />
                  </FormItem>
                  <div className="input-tip">
                    {t("resource:config.common.regName") +
                      curConfig.regularExpression}
                  </div>
                </div>
              )}

            {curConfig?.logType === LogType.Nginx && (
              <FormItem
                infoType={InfoBarTypes.NGINX_LOG_FORMAT}
                optionTitle={t("resource:config.common.nginxFormat")}
                optionDesc={t("resource:config.common.nginxFormatDesc")}
                errorText={
                  userLogFormatError
                    ? t("resource:config.common.nginxFormatInvalid")
                    : ""
                }
              >
                <div className="m-w-75p">
                  <TextArea
                    disabled={inputDisable}
                    value={curConfig.userLogFormat || ""}
                    placeholder="log_format main ..."
                    rows={4}
                    onChange={(event) => {
                      changeUserLogFormat &&
                        changeUserLogFormat(event.target.value);
                    }}
                  />
                  <div className="input-tip">
                    {t("resource:config.common.regName") +
                      curConfig.regularExpression}
                  </div>
                </div>
              </FormItem>
            )}

            {curConfig?.logType === LogType.Apache && (
              <FormItem
                infoType={InfoBarTypes.APACHE_LOG_FORMAT}
                optionTitle={t("resource:config.common.apacheFormat")}
                optionDesc={t("resource:config.common.apacheFormatDesc")}
                errorText={
                  userLogFormatError
                    ? t("resource:config.common.apacheFormatError")
                    : ""
                }
              >
                <div className="m-w-75p">
                  <TextArea
                    disabled={inputDisable}
                    value={curConfig.userLogFormat || ""}
                    placeholder='LogFormat "%h %l ...'
                    rows={4}
                    onChange={(event) => {
                      changeUserLogFormat &&
                        changeUserLogFormat(event.target.value);
                    }}
                  />
                  <div className="input-tip">
                    {t("resource:config.common.regName") +
                      curConfig.regularExpression}
                  </div>
                </div>
              </FormItem>
            )}

            {curConfig?.logType === LogType.SingleLineText && (
              <FormItem
                infoType={InfoBarTypes.REGEX_LOG_FORMAT}
                optionTitle={t("resource:config.common.regexFormat")}
                optionDesc={t("resource:config.common.regexFormatDesc")}
              >
                <div className="m-w-75p">
                  <TextArea
                    disabled={inputDisable}
                    value={curConfig.regularExpression || ""}
                    placeholder="\S\s+.*"
                    rows={4}
                    onChange={(event) => {
                      changeUserLogFormat &&
                        changeUserLogFormat(event.target.value);
                    }}
                  />
                </div>
              </FormItem>
            )}

            {curConfig?.logType === LogType.MultiLineText &&
              curConfig.multilineLogParser === MultiLineLogParser.CUSTOM && (
                <FormItem
                  infoType={InfoBarTypes.REGEX_LOG_FORMAT}
                  optionTitle={t("resource:config.common.firstLineRegEx")}
                  optionDesc={t("resource:config.common.firstLineRegExDesc")}
                >
                  <div className="m-w-75p">
                    <TextArea
                      disabled={inputDisable}
                      value={curConfig.regularExpression || ""}
                      placeholder="\S\s+.*"
                      rows={4}
                      onChange={(event) => {
                        changeUserLogFormat &&
                          changeUserLogFormat(event.target.value);
                      }}
                    />
                  </div>
                </FormItem>
              )}
          </div>
        )}
      </HeaderPanel>

      {!inputDisable &&
        (curConfig?.logType === LogType.JSON ||
          curConfig?.logType === LogType.Nginx ||
          curConfig?.logType === LogType.Apache ||
          curConfig?.logType === LogType.SingleLineText ||
          (curConfig?.logType === LogType.MultiLineText &&
            curConfig?.multilineLogParser ===
              MultiLineLogParser.JAVA_SPRING_BOOT) ||
          (curConfig?.logType === LogType.MultiLineText &&
            curConfig?.multilineLogParser === MultiLineLogParser.CUSTOM)) && (
          <HeaderPanel title={t("resource:config.common.sampleParsing")}>
            <SampleLogParsing
              sampleLogInvalid={sampleLogInvalid}
              changeSampleLogInvalid={(invalid) => {
                changeSampleLogInvalid && changeSampleLogInvalid(invalid);
              }}
              changeSpecs={(specs) => {
                console.info(specs);
                changeRegExpSpecs && changeRegExpSpecs(specs);
              }}
              changeSampleLog={(log) => {
                changeUserSmapleLog && changeUserSmapleLog(log);
              }}
              logConfig={curConfig}
              logType={curConfig.logType}
              showSampleLogRequiredError={sampleLogRequiredError}
            />
          </HeaderPanel>
        )}
    </div>
  );
};

export default LogConfigComp;
