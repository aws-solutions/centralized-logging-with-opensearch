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
import React, { Ref } from "react";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import Select from "components/Select";
import {
  LOG_CONFIG_TYPE_LIST,
  MULTI_LINE_LOG_PARSER_LIST,
  SYSLOG_CONFIG_TYPE_LIST,
  SYS_LOG_PARSER_LIST,
} from "assets/js/const";
import {
  LogConfFilterInput,
  LogConfig,
  LogSourceType,
  LogType,
  MultiLineLogParser,
  ProcessorFilterRegexInput,
  SyslogParser,
} from "API";
import TextArea from "components/TextArea";
import HeaderPanel from "components/HeaderPanel";
import SampleLogParsing, {
  RegexListType,
  SampleLogParsingRefType,
} from "./SampleLogParsing";
import { ActionType, InfoBarTypes } from "reducer/appReducer";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import LoadingText from "components/LoadingText";
import ConfigFilter from "./ConfigFilter";
import { OptionType } from "components/AutoComplete/autoComplete";
import { ternary } from "assets/js/utils";

export interface ProcessorFilterRegexInputExt
  extends Omit<ProcessorFilterRegexInput, "filters"> {
  filters: LogConfFilterInput[];
}

export interface ExLogConf extends Omit<LogConfig, "filterConfigMap"> {
  smapleLogDateFormatStr?: string;
  regexKeyList?: RegexListType[];
  filterConfigMap?: ProcessorFilterRegexInput;
  selectKeyList?: OptionType[];
}

export enum PageType {
  Edit = "Edit",
  New = "New",
}

interface LogConfigProps {
  pageType: PageType;
  logSourceType?: LogSourceType;
  headerTitle: string;
  curConfig: ExLogConf | undefined;
  changeLogConfName: (name: string) => void;
  changeLogType: (type: LogType) => void;
  changeUserLogFormat: (format: string) => void;
  changeRegExpSpecs: (specs: any) => void;
  changeLogParser: (parser: MultiLineLogParser) => void;
  changeSyslogParser: (parser: SyslogParser) => void;
  changeUserSmapleLog: (log: string) => void;
  showNameRequiredError: boolean;
  showTypeRequiedError: boolean;
  userLogFormatError: boolean;
  userLogFormatErrorMsg?: string;
  syslogParserError?: boolean;
  regexErrorMsg?: string;
  sampleLogRequiredError: boolean;
  isLoading: boolean;
  sampleLogInvalid: boolean;
  changeSampleLogInvalid: (invalid: boolean) => void;
  changeTimeKey: (key: string) => void;
  changeRegexKeyList: (list: RegexListType[]) => void;
  changeFilterRegex: (filter: ProcessorFilterRegexInput) => void;
  changeSelectKeyList: (list: OptionType[]) => void;
  changeTimeOffset: (offset: string) => void;
  sampleLogParsingRef?: Ref<SampleLogParsingRefType>;
  changeJSONSchema?: (schema: any) => void;
}

const LogConfigComp: React.FC<LogConfigProps> = (props: LogConfigProps) => {
  const {
    pageType,
    headerTitle,
    logSourceType,
    curConfig,
    changeLogConfName,
    changeLogType,
    changeUserLogFormat,
    changeRegExpSpecs,
    changeLogParser,
    changeSyslogParser,
    changeUserSmapleLog,
    showNameRequiredError,
    showTypeRequiedError,
    userLogFormatError,
    syslogParserError,
    sampleLogRequiredError,
    isLoading,
    sampleLogInvalid,
    changeSampleLogInvalid,
    changeTimeKey,
    changeRegexKeyList,
    changeFilterRegex,
    changeSelectKeyList,
    changeTimeOffset,
    changeJSONSchema,
  } = props;
  const { t } = useTranslation();
  const dispatch = useDispatch();

  return (
    <div>
      <HeaderPanel title={headerTitle}>
        {ternary(
          isLoading,
          <LoadingText />,
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
                disabled={pageType === PageType.Edit}
                className="m-w-75p"
                value={curConfig?.name || ""}
                onChange={(event) => {
                  changeLogConfName && changeLogConfName(event.target.value);
                }}
                placeholder="log-example-config"
              />
            </FormItem>

            <FormItem
              optionTitle={t("resource:config.common.logType")}
              optionDesc={
                logSourceType === LogSourceType.Syslog
                  ? t("resource:config.common.logTypeDescSyslog")
                  : t("resource:config.common.logTypeDesc")
              }
              errorText={
                showTypeRequiedError
                  ? t("resource:config.common.logTypeError")
                  : ""
              }
            >
              <Select
                isI18N
                disabled={pageType === PageType.Edit}
                className="m-w-45p"
                optionList={
                  logSourceType === LogSourceType.Syslog
                    ? SYSLOG_CONFIG_TYPE_LIST
                    : LOG_CONFIG_TYPE_LIST
                }
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

            {curConfig?.logType === LogType.Syslog && (
              <FormItem
                optionTitle={t("resource:config.common.parser")}
                optionDesc={t("resource:config.common.parserDesc")}
                errorText={
                  syslogParserError ? t("error.syslogParserError") : ""
                }
              >
                <Select
                  disabled={pageType === PageType.Edit}
                  className="m-w-45p"
                  optionList={SYS_LOG_PARSER_LIST}
                  value={curConfig?.syslogParser || ""}
                  onChange={(event) => {
                    changeSyslogParser &&
                      changeSyslogParser(event.target.value);
                  }}
                  placeholder={t("resource:config.common.chooseParser")}
                />
              </FormItem>
            )}

            {curConfig?.logType === LogType.Syslog &&
              curConfig?.syslogParser === SyslogParser.CUSTOM && (
                <div className="m-w-75p">
                  <FormItem
                    optionTitle={t("resource:config.common.syslogFormat")}
                    optionDesc={t("resource:config.common.syslogFormatDesc")}
                    errorText={props.regexErrorMsg}
                  >
                    <TextInput
                      placeholder="<%pri%>1 %timestamp:::date-rfc3339% %HOSTNAME% %app-name% %procid% %msgid% %msg%\n"
                      value={curConfig?.userLogFormat || ""}
                      onChange={(event) => {
                        changeUserLogFormat &&
                          changeUserLogFormat(event.target.value);
                      }}
                    />
                  </FormItem>
                  <div className="input-tip">
                    {t("resource:config.common.regName") + curConfig.regex}
                  </div>
                </div>
              )}

            {curConfig?.logType === LogType.MultiLineText && (
              <FormItem
                optionTitle={t("resource:config.common.parser")}
                optionDesc={t("resource:config.common.parserDesc")}
              >
                <Select
                  disabled={pageType === PageType.Edit}
                  className="m-w-45p"
                  optionList={MULTI_LINE_LOG_PARSER_LIST}
                  value={curConfig?.multilineLogParser || ""}
                  onChange={(event) => {
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
                    errorText={props.userLogFormatErrorMsg}
                  >
                    <TextInput
                      placeholder="%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"
                      value={curConfig?.userLogFormat || ""}
                      onChange={(event) => {
                        changeUserLogFormat &&
                          changeUserLogFormat(event.target.value);
                      }}
                    />
                  </FormItem>
                  <div className="input-tip">
                    {t("resource:config.common.regName") + curConfig.regex}
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
                    : props.userLogFormatErrorMsg
                }
              >
                <div className="m-w-75p">
                  <TextArea
                    value={curConfig.userLogFormat || ""}
                    placeholder="log_format main ..."
                    rows={4}
                    onChange={(event) => {
                      changeUserLogFormat &&
                        changeUserLogFormat(event.target.value);
                    }}
                  />
                  <div className="input-tip">
                    {t("resource:config.common.regName") + curConfig.regex}
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
                    : props.userLogFormatErrorMsg
                }
              >
                <div className="m-w-75p">
                  <TextArea
                    value={curConfig.userLogFormat || ""}
                    placeholder='LogFormat "%h %l ...'
                    rows={4}
                    onChange={(event) => {
                      changeUserLogFormat &&
                        changeUserLogFormat(event.target.value);
                    }}
                  />
                  <div className="input-tip">
                    {t("resource:config.common.regName") + curConfig.regex}
                  </div>
                </div>
              </FormItem>
            )}

            {curConfig?.logType === LogType.SingleLineText && (
              <FormItem
                infoType={InfoBarTypes.REGEX_LOG_FORMAT}
                optionTitle={t("resource:config.common.regexFormat")}
                optionDesc={t("resource:config.common.regexFormatDesc")}
                errorText={props.regexErrorMsg}
              >
                <div className="m-w-75p">
                  <TextArea
                    value={curConfig.regex || ""}
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

            {curConfig?.logType === LogType.Syslog &&
              (curConfig.syslogParser === SyslogParser.RFC5424 ||
                curConfig.syslogParser === SyslogParser.RFC3164) && (
                <FormItem
                  optionTitle={t("resource:config.common.regexFormat")}
                  optionDesc=""
                >
                  <div className="m-w-75p">
                    <TextArea
                      disabled={
                        curConfig.syslogParser === SyslogParser.RFC5424 ||
                        curConfig.syslogParser === SyslogParser.RFC3164
                      }
                      value={curConfig.regex || ""}
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
                  errorText={props.regexErrorMsg}
                >
                  <div className="m-w-75p">
                    <TextArea
                      value={curConfig.regex || ""}
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

      {(curConfig?.logType === LogType.JSON ||
        curConfig?.logType === LogType.Nginx ||
        curConfig?.logType === LogType.Apache ||
        curConfig?.logType === LogType.Syslog ||
        curConfig?.logType === LogType.SingleLineText ||
        (curConfig?.logType === LogType.MultiLineText &&
          curConfig?.multilineLogParser ===
            MultiLineLogParser.JAVA_SPRING_BOOT) ||
        (curConfig?.logType === LogType.MultiLineText &&
          curConfig?.multilineLogParser === MultiLineLogParser.CUSTOM)) && (
        <HeaderPanel title={t("resource:config.common.sampleParsing")}>
          <SampleLogParsing
            pageType={pageType}
            ref={props.sampleLogParsingRef}
            sampleLogInvalid={sampleLogInvalid}
            changeSampleLogInvalid={(invalid) => {
              changeSampleLogInvalid && changeSampleLogInvalid(invalid);
            }}
            changeSpecs={(specs) => {
              changeRegExpSpecs && changeRegExpSpecs(specs);
            }}
            changeSampleLog={(log) => {
              changeUserSmapleLog && changeUserSmapleLog(log);
            }}
            changeTimeKey={(key) => {
              changeTimeKey && changeTimeKey(key);
            }}
            changeRegExpList={(list) => {
              changeRegexKeyList && changeRegexKeyList(list);
            }}
            changeSelectKeyList={(keyList) => {
              changeSelectKeyList && changeSelectKeyList(keyList);
            }}
            changeTimeOffset={(offset) => {
              changeTimeOffset && changeTimeOffset(offset);
            }}
            changeJSONSchema={(schema) => {
              changeJSONSchema && changeJSONSchema(schema);
            }}
            logConfig={curConfig}
            logType={curConfig.logType}
            showSampleLogRequiredError={sampleLogRequiredError}
          />
        </HeaderPanel>
      )}

      {curConfig && (
        <ConfigFilter
          logConfig={curConfig}
          changeFilter={(filter) => {
            changeFilterRegex && changeFilterRegex(filter);
          }}
        />
      )}
    </div>
  );
};

export default LogConfigComp;
