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

import HeaderPanel from "components/HeaderPanel";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PageType } from "./LogConfigComp";
import TextArea from "components/TextArea";
import Button from "components/Button";
import FormItem from "components/FormItem";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import { AppDispatch } from "reducer/store";
import { defaultStr, displayI18NMessage, ternary } from "assets/js/utils";
import {
  asyncParseRegex,
  convertJSONToKeyValueList,
  getSampleLogInfoType,
  isCustomRegexType,
  isCustomType,
  isMultilineCustom,
  isNginxOrApache,
  isSingleLineText,
  isSpringBootType,
  jsonSchemaChanged,
  parseLog,
  timeOffsetChanged,
  userSampleLogChanged,
} from "reducer/createLogConfig";
import { LogType } from "API";
import JSONInputRenderer from "./JSONInputRenderer";
import TimeKey from "./TimeKey";
import Select from "components/Select";
import { generateTimeZoneList } from "assets/js/const";
import { identity } from "lodash";
import RegexKeyItemList from "./RegexKeyItemList";

interface SampleLogParsingProps {
  pageType?: PageType;
}

const SampleLogParsing: React.FC<SampleLogParsingProps> = ({ pageType }) => {
  const { t } = useTranslation();
  const logConfig = useSelector((state: RootState) => state.logConfig);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    console.info("logConfig", logConfig);
  }, [logConfig]);

  const parseLogByLogType = () => {
    if (logConfig.data.logType === LogType.JSON) {
      dispatch(convertJSONToKeyValueList());
    } else if (
      isSingleLineText(logConfig.data.logType) ||
      isMultilineCustom(logConfig)
    ) {
      dispatch(asyncParseRegex(logConfig));
    } else {
      dispatch(parseLog());
    }
  };

  useEffect(() => {
    if (
      (logConfig.data.userSampleLog && pageType === PageType.New) ||
      (pageType === PageType.Edit &&
        isNginxOrApache(logConfig.data.logType) &&
        logConfig.data.userSampleLog)
    ) {
      if (
        isSingleLineText(logConfig.data.logType) ||
        isMultilineCustom(logConfig)
      ) {
        dispatch(asyncParseRegex(logConfig));
      } else {
        dispatch(parseLog());
      }
    }
  }, [logConfig.data.userSampleLog]);

  return (
    <>
      {logConfig.data.logType && (
        <HeaderPanel title={t("resource:config.common.sampleParsing")}>
          <>
            <FormItem
              infoType={getSampleLogInfoType(logConfig.data.logType)}
              optionTitle={`${t("resource:config.parsing.sampleLog")}${ternary(
                logConfig.data.logType === LogType.Nginx ||
                  logConfig.data.logType === LogType.Apache,
                " - " + t("optional"),
                ""
              )}`}
              optionDesc={ternary(
                logConfig.data.logType === LogType.JSON,
                t("resource:config.parsing.sampleLogJSONDesc"),
                t("resource:config.parsing.sampleLogDesc")
              )}
              successText={displayI18NMessage(logConfig.userSampleLogSuccess)}
              errorText={displayI18NMessage(logConfig.userSampleLogError)}
            >
              <div className="flex m-w-75p">
                <div style={{ flex: 1 }}>
                  <TextArea
                    value={defaultStr(logConfig.data.userSampleLog)}
                    placeholder=""
                    rows={3}
                    onChange={(
                      event: React.ChangeEvent<HTMLTextAreaElement>
                    ) => {
                      dispatch(userSampleLogChanged(event.target.value));
                    }}
                  />
                </div>
                <div className="ml-10">
                  <Button
                    onClick={() => {
                      parseLogByLogType();
                    }}
                  >
                    {t("button.parseLog")}
                  </Button>
                </div>
              </div>
            </FormItem>

            <FormItem
              optionTitle={t("resource:config.parsing.parseLog")}
              optionDesc={t("resource:config.parsing.parseLogDesc")}
            >
              <>
                {/* JSON Schema Render */}
                {logConfig.data.jsonSchema &&
                  logConfig.data.logType === LogType.JSON && (
                    <JSONInputRenderer
                      schema={logConfig.data.jsonSchema}
                      data={logConfig.data.userSampleLog}
                      changeSchema={(schema) => {
                        dispatch(jsonSchemaChanged(schema));
                      }}
                    />
                  )}

                {(logConfig.data.logType === LogType.Nginx ||
                  logConfig.data.logType === LogType.Apache) &&
                  Object.keys(logConfig.logResMap).map(
                    (item: any, index: number) => {
                      return (
                        <div
                          key={identity(index)}
                          className="flex show-tag-list no-stripe"
                        >
                          <div className="tag-key log">
                            <div>{item}</div>
                          </div>
                          <div className="tag-value flex-1">
                            {logConfig.logResMap[item]}
                          </div>
                        </div>
                      );
                    }
                  )}

                {isCustomRegexType(logConfig.data.logType) && (
                  <RegexKeyItemList />
                )}
              </>
            </FormItem>

            {logConfig.regexKeyList &&
              logConfig.regexKeyList?.length > 0 &&
              isCustomType(logConfig) && <TimeKey />}

            {(isCustomType(logConfig) || isSpringBootType(logConfig)) && (
              <FormItem
                optionTitle={t("resource:config.parsing.timezone")}
                optionDesc={t("resource:config.parsing.timezoneDesc")}
              >
                <Select
                  className="m-w-35p"
                  placeholder={t("resource:config.parsing.selectTimezone")}
                  optionList={generateTimeZoneList()}
                  value={defaultStr(logConfig.data.timeOffset)}
                  onChange={(event) => {
                    dispatch(timeOffsetChanged(event.target.value));
                  }}
                ></Select>
              </FormItem>
            )}
          </>
        </HeaderPanel>
      )}
    </>
  );
};

export default SampleLogParsing;
