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
import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { BreadcrumbType } from "components/Breadcrumb/breadcrumb";
import CommonLayout from "pages/layout/CommonLayout";
import TextInput from "components/TextInput";
import {
  LogConfFilterInput,
  LogConfig,
  LogType,
  ProcessorFilterRegexInput,
} from "API";
import {
  LogConfigState,
  configLogTypeChanged,
  configNameChanged,
  getCurrentParser,
  getFormatDescription,
  getFormatInfoType,
  getFormatInputType,
  getFormatPlaceholder,
  getFormatTitle,
  getRegexDescription,
  getRegexInfoType,
  getRegexTitle,
  iisLogParserChanged,
  isJSONType,
  isNginxOrApache,
  isWindowsEvent,
  multiLineParserChanged,
  regexChanged,
  setDescription,
  sysLogParserChanged,
  userLogFormatChanged,
  validateLogConfig,
  validateLogConfigParams,
  validateWindowsHasCookie,
} from "reducer/createLogConfig";
import { defaultStr, displayI18NMessage } from "assets/js/utils";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "reducer/store";
import Select from "components/Select";
import {
  IIS_LOG_PARSER_LIST,
  LOG_CONFIG_TYPE_LIST,
  MULTI_LINE_LOG_PARSER_LIST,
  SYS_LOG_PARSER_LIST,
} from "assets/js/const";
import { ActionType } from "reducer/appReducer";
import TextArea from "components/TextArea";
import Button from "components/Button";
import { useNavigate, useParams } from "react-router-dom";
import { handleErrorMessage } from "assets/js/alert";
import { appSyncRequestMutation } from "assets/js/request";
import { createLogConfig, updateLogConfig } from "graphql/mutations";
import cloneDeep from "lodash.clonedeep";
import SampleLogParsing from "./SampleLogParsing";
import ConfigFilter from "./ConfigFilter";
import Modal from "components/Modal";
import { RootState } from "reducer/reducers";

export interface ProcessorFilterRegexInputExt
  extends Omit<ProcessorFilterRegexInput, "filters"> {
  filters: LogConfFilterInput[];
}

export interface RegexListType {
  key: string;
  type: string;
  format: string;
  value: string;
  loadingCheck: boolean;
  showError: boolean;
  error: string;
  showSuccess: boolean;
}

export interface ExLogConf extends Omit<LogConfig, "filterConfigMap"> {
  sampleLogDateFormatStr?: string;
  filterConfigMap?: ProcessorFilterRegexInput;
}

export enum PageType {
  Edit = "Edit",
  New = "New",
}

interface LogConfigCompProps {
  loadingData?: boolean;
  breadCrumbList?: BreadcrumbType[];
  headerTitle: string;
  pageType: PageType;
  logConfig: LogConfigState;
}

const LogConfigComp = (props: LogConfigCompProps) => {
  const { loadingData, headerTitle, breadCrumbList, pageType, logConfig } =
    props;
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const logConfigState = useSelector((state: RootState) => state.logConfig);

  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [showCookieAlert, setShowCookieAlert] = useState(false);

  const mutationLogConfig = async (isForce = false) => {
    if (!validateLogConfigParams(logConfig)) {
      dispatch(validateLogConfig());
      return;
    }
    // validate cookie
    if (!isForce && validateWindowsHasCookie(logConfig)) {
      setShowCookieAlert(true);
      return;
    }
    const createLogConfigParam = cloneDeep(logConfig.data);

    // trim regular expression and user log format
    if (
      logConfig.data.logType === LogType.MultiLineText ||
      logConfig.data.logType === LogType.SingleLineText
    ) {
      createLogConfigParam.regex = logConfig.data.regex
        ?.trim()
        .replace(/[\n\t\r]/g, "");
      createLogConfigParam.userLogFormat = logConfig.data.userLogFormat
        ?.trim()
        .replace(/[\n\t\r]/g, "");
    }

    // convert json schema to string
    if (isJSONType(logConfig.data.logType)) {
      if (logConfig.data.jsonSchema) {
        createLogConfigParam.jsonSchema = JSON.stringify(
          logConfig.data.jsonSchema
        );
      }
    } else if (isWindowsEvent(logConfig.data.logType)) {
      createLogConfigParam.jsonSchema = logConfig.data.jsonSchema;
    } else {
      createLogConfigParam.jsonSchema = undefined;
    }

    // override description for new revision
    createLogConfigParam.description = logConfigState.description;

    try {
      setLoadingUpdate(true);
      if (pageType === PageType.New) {
        await appSyncRequestMutation(createLogConfig, createLogConfigParam);
      } else {
        await appSyncRequestMutation(updateLogConfig, createLogConfigParam);
      }
      dispatch({
        type: ActionType.CLOSE_INFO_BAR,
      });
      navigate("/resources/log-config");
      setLoadingUpdate(false);
      setShowCookieAlert(false);
    } catch (error: any) {
      setLoadingUpdate(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  return (
    <CommonLayout loadingData={loadingData} breadCrumbList={breadCrumbList}>
      <div className="m-w-1024">
        <HeaderPanel title={headerTitle}>
          <div>
            <FormItem
              optionTitle={t("resource:config.common.configName")}
              optionDesc={t("resource:config.common.configNameDesc")}
              errorText={displayI18NMessage(logConfig.nameError)}
            >
              <TextInput
                disabled={pageType === PageType.Edit}
                className="m-w-75p"
                value={defaultStr(logConfig.data.name)}
                onChange={(event) => {
                  dispatch(configNameChanged(event.target.value));
                }}
                placeholder="log-example-config"
              />
            </FormItem>

            <FormItem
              optionTitle={t("resource:config.common.description")}
              optionDesc={t("resource:config.common.descriptionDesc")}
            >
              <TextInput
                maxLength={120}
                className="m-w-75p"
                value={logConfigState.description}
                placeholder={t("resource:config.common.descriptionHint")}
                onChange={(event) => {
                  dispatch(setDescription(event.target.value));
                }}
              />
            </FormItem>

            <FormItem
              optionTitle={t("resource:config.common.logType")}
              optionDesc={t("resource:config.common.logTypeDesc")}
              errorText={displayI18NMessage(logConfig.logTypeError)}
            >
              <Select
                isI18N
                disabled={pageType === PageType.Edit}
                className="m-w-45p"
                optionList={LOG_CONFIG_TYPE_LIST}
                value={defaultStr(logConfig.data?.logType)}
                onChange={(event) => {
                  dispatch({
                    type: ActionType.CLOSE_INFO_BAR,
                  });
                  dispatch(configLogTypeChanged(event.target.value));
                }}
                placeholder={t("resource:config.common.chooseLogType")}
              />
            </FormItem>

            {logConfig.data?.logType === LogType.Syslog && (
              <FormItem
                optionTitle={t("resource:config.common.parser")}
                optionDesc={t("resource:config.common.parserDesc")}
                errorText={displayI18NMessage(logConfig.syslogParserError)}
              >
                <Select
                  disabled={pageType === PageType.Edit}
                  className="m-w-45p"
                  optionList={SYS_LOG_PARSER_LIST}
                  value={defaultStr(logConfig.data?.syslogParser)}
                  onChange={(event) => {
                    dispatch(sysLogParserChanged(event.target.value));
                  }}
                  placeholder={t("resource:config.common.chooseParser")}
                />
              </FormItem>
            )}

            {logConfig.data?.logType === LogType.IIS && (
              <FormItem
                optionTitle={t("resource:config.common.parser")}
                optionDesc={t("resource:config.common.parserDesc")}
                errorText={displayI18NMessage(logConfig.iisParserError)}
              >
                <Select
                  className="m-w-45p"
                  optionList={IIS_LOG_PARSER_LIST}
                  value={defaultStr(logConfig.data?.iisLogParser)}
                  onChange={(event) => {
                    dispatch(iisLogParserChanged(event.target.value));
                  }}
                  placeholder={t("resource:config.common.chooseParser")}
                />
              </FormItem>
            )}

            {logConfig.data?.logType === LogType.MultiLineText && (
              <FormItem
                optionTitle={t("resource:config.common.parser")}
                optionDesc={t("resource:config.common.parserDesc")}
                errorText={displayI18NMessage(logConfig.multiLineParserError)}
              >
                <Select
                  disabled={pageType === PageType.Edit}
                  className="m-w-45p"
                  optionList={MULTI_LINE_LOG_PARSER_LIST}
                  value={defaultStr(logConfig.data?.multilineLogParser)}
                  onChange={(event) => {
                    dispatch(multiLineParserChanged(event.target.value));
                  }}
                  placeholder={t("resource:config.common.chooseParser")}
                />
              </FormItem>
            )}

            {logConfig.data.logType && logConfig.showLogFormat && (
              <FormItem
                infoType={getFormatInfoType(logConfig.data.logType)}
                optionTitle={displayI18NMessage(
                  getFormatTitle(logConfig.data.logType)
                )}
                optionDesc={displayI18NMessage(
                  getFormatDescription(logConfig.data.logType)
                )}
                errorText={displayI18NMessage(logConfig.logFormatError)}
              >
                <div className="m-w-75p">
                  {getFormatInputType(logConfig.data.logType) ===
                    "textarea" && (
                    <TextArea
                      value={defaultStr(logConfig.data.userLogFormat)}
                      placeholder={getFormatPlaceholder(logConfig.data.logType)}
                      rows={4}
                      onChange={(
                        event: React.ChangeEvent<HTMLTextAreaElement>
                      ) => {
                        dispatch(userLogFormatChanged(event.target.value));
                      }}
                    />
                  )}
                  {getFormatInputType(logConfig.data.logType) === "input" && (
                    <TextInput
                      placeholder={getFormatPlaceholder(logConfig.data.logType)}
                      value={defaultStr(logConfig.data.userLogFormat)}
                      onChange={(event) => {
                        dispatch(userLogFormatChanged(event.target.value));
                      }}
                    />
                  )}
                  {!isNginxOrApache(logConfig.data.logType) && (
                    <div className="input-tip">
                      {t("resource:config.common.regName") +
                        logConfig.data.regex}
                    </div>
                  )}
                </div>
              </FormItem>
            )}

            {logConfig.data.logType && logConfig.showRegex && (
              <FormItem
                infoType={getRegexInfoType(
                  logConfig.data.logType,
                  getCurrentParser(
                    logConfig.data.logType,
                    logConfig.data.syslogParser,
                    logConfig.data.multilineLogParser,
                    logConfig.data.iisLogParser
                  )
                )}
                optionTitle={displayI18NMessage(
                  getRegexTitle(
                    logConfig.data.logType,
                    getCurrentParser(
                      logConfig.data.logType,
                      logConfig.data.syslogParser,
                      logConfig.data.multilineLogParser,
                      logConfig.data.iisLogParser
                    )
                  )
                )}
                optionDesc={displayI18NMessage(
                  getRegexDescription(
                    logConfig.data.logType,
                    getCurrentParser(
                      logConfig.data.logType,
                      logConfig.data.syslogParser,
                      logConfig.data.multilineLogParser,
                      logConfig.data.iisLogParser
                    )
                  )
                )}
                errorText={displayI18NMessage(logConfig.regexError)}
              >
                <div className="m-w-75p">
                  <TextArea
                    disabled={logConfig.regexDisabled}
                    value={defaultStr(logConfig.data.regex)}
                    placeholder="\S\s+.*"
                    rows={4}
                    onChange={(
                      event: React.ChangeEvent<HTMLTextAreaElement>
                    ) => {
                      dispatch(regexChanged(event.target.value));
                    }}
                  />
                </div>
              </FormItem>
            )}
          </div>
        </HeaderPanel>

        {!isWindowsEvent(logConfig.data.logType) && (
          <SampleLogParsing pageType={pageType} />
        )}

        {!isWindowsEvent(logConfig.data.logType) && logConfig.data.logType && (
          <ConfigFilter />
        )}

        <div className="button-action text-right">
          <Button
            data-testid="cancel-button"
            btnType="text"
            onClick={() => {
              if (pageType === PageType.New) {
                navigate("/resources/log-config");
              } else {
                navigate("/resources/log-config/detail/" + id);
              }
            }}
          >
            {t("button.cancel")}
          </Button>
          <Button
            data-testid="mutation-button"
            btnType="primary"
            loading={loadingUpdate}
            onClick={() => {
              mutationLogConfig();
            }}
          >
            {pageType === PageType.New ? t("button.create") : t("button.save")}
          </Button>
        </div>
        <Modal
          title={t("resource:config.alert")}
          fullWidth={false}
          isOpen={showCookieAlert}
          closeModal={() => {
            setShowCookieAlert(false);
          }}
          actions={
            <div className="button-action no-pb text-right">
              <Button
                disabled={loadingUpdate}
                onClick={() => {
                  setShowCookieAlert(false);
                }}
              >
                {t("button.close")}
              </Button>
            </div>
          }
        >
          <div className="modal-content">
            {t("resource:config.common.cookieAlert")}
          </div>
        </Modal>
      </div>
    </CommonLayout>
  );
};

export default LogConfigComp;
