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
import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  Ref,
} from "react";
import { LogType, MultiLineLogParser } from "API";
import Button from "components/Button";
import FormItem from "components/FormItem";
import TextArea from "components/TextArea";
import TextInput from "components/TextInput";
import { InfoBarTypes } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import Select from "components/Select";
import { FB_TYPE_LIST, generateTimeZoneList } from "assets/js/const";
import Alert from "components/Alert";
import { Alert as AlertInfo } from "assets/js/alert";
import { ExLogConf, PageType } from "./LogConfigComp";
import {
  getLogFormatByUserLogConfig,
  IsJsonString,
  replaceSpringbootTimeFormat,
  ternary,
  transformSchemaType,
} from "assets/js/utils";
import { appSyncRequestQuery } from "assets/js/request";
import { checkTimeFormat } from "graphql/queries";
import { OptionType } from "components/AutoComplete/autoComplete";
import { defaultTo, identity } from "lodash";
import { JsonSchemaInferrer } from "js-json-schema-inferrer";
import JSONInputRenderer from "./JSONInputRenderer";

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
interface SampleLogParsingProps {
  pageType: PageType;
  changeSpecs: (specs: any) => void;
  changeSampleLog: (log: string) => void;
  logConfig: ExLogConf;
  logType: LogType;
  showSampleLogRequiredError?: boolean;
  sampleLogInvalid: boolean;
  changeSampleLogInvalid: (valid: boolean) => void;
  changeTimeKey?: (key: string) => void;
  changeRegExpList?: (list: RegexListType[]) => void;
  changeSelectKeyList?: (list: OptionType[]) => void;
  changeTimeOffset?: (offset: string) => void;
  changeJSONSchema?: (schema: any) => void;
}

export interface SampleLogParsingRefType {
  validate: () => boolean;
}

function SampleLogParsing(
  props: SampleLogParsingProps,
  ref?: Ref<SampleLogParsingRefType>
) {
  const {
    pageType,
    logType,
    logConfig,
    showSampleLogRequiredError,
    changeSpecs,
    changeSampleLog,
    sampleLogInvalid,
    changeSampleLogInvalid,
    changeTimeKey,
    changeRegExpList,
    changeSelectKeyList,
    changeTimeOffset,
    changeJSONSchema,
  } = props;
  const { t } = useTranslation();
  const [logResMap, setLogResMap] = useState<any>({});

  const [showValidInfo, setShowValidInfo] = useState(false);
  const [timeFormatForSpringBoot, setTimeFormatForSpringBoot] = useState("");
  const [loadingCheckTimeKeyFormat, setLoadingCheckTimeKeyFormat] =
    useState(false);
  const [timeKeyFormatInvalid, setTimeKeyFormatInvalid] = useState(false);
  const [timeKeyFormatValid, setTimeKeyFormatValid] = useState(false);

  const isCustomType = () => {
    return (
      logType === LogType.JSON ||
      logType === LogType.SingleLineText ||
      logType === LogType.Syslog ||
      (logConfig.logType === LogType.MultiLineText &&
        logConfig.multilineLogParser === MultiLineLogParser.CUSTOM)
    );
  };

  const isSpringBootType = () => {
    return (
      logConfig.logType === LogType.MultiLineText &&
      logConfig.multilineLogParser === MultiLineLogParser.JAVA_SPRING_BOOT
    );
  };

  const getDefaultType = (key: string, value?: string): string => {
    if (key === "time") {
      return "date";
    }
    if (value) {
      if (typeof value === "number" && isFinite(value)) {
        if (Number.isInteger(value)) {
          return "integer";
        }
        return "";
      }
    }
    if (
      logConfig.logType === LogType.MultiLineText &&
      logConfig.multilineLogParser === MultiLineLogParser.JAVA_SPRING_BOOT
    ) {
      if (key === "level") {
        return "keyword";
      }
    }
    return "text";
  };

  const convertJSONToKeyValueList = () => {
    if (!logConfig?.userSampleLog) {
      AlertInfo(t("resource:config.parsing.inputJSON"));
      return;
    }
    if (!IsJsonString(logConfig?.userSampleLog || "")) {
      AlertInfo(t("resource:config.parsing.notJSONFormat"));
      return;
    }
    try {
      const defaultConfig = {
        type: true,
        string: {
          detectFormat: false,
        },
        object: {},
        array: {
          arrayInferMode: "first", // "tuple",
        },
        common: {},
      };
      const schema = JsonSchemaInferrer(
        JSON.parse(logConfig.userSampleLog),
        defaultConfig
      );
      if (schema) {
        changeJSONSchema?.(transformSchemaType(schema));
      }
    } catch (error) {
      console.error("Invalid JSON");
    }
  };

  const parseLog = () => {
    const regex = logConfig.regex || "";
    if (!regex.trim()) {
      return;
    }
    let isValid = true;
    try {
      new RegExp(regex);
    } catch (e) {
      isValid = false;
    }
    if (!isValid) {
      AlertInfo(t("resource:config.parsing.alert"));
      return;
    }
    const found: any = logConfig?.userSampleLog?.match(regex);
    if (logType === LogType.Nginx || logType === LogType.Apache) {
      if (found?.groups) {
        setShowValidInfo(true);
        changeSampleLogInvalid(false);
      } else {
        setShowValidInfo(false);
        changeSampleLogInvalid(true);
      }
      setLogResMap(found?.groups || {});
      if (found?.groups) {
        changeRegExpList?.(
          Object.entries(found.groups).map((key) => {
            return { key: key[0] } as any;
          })
        );
      }
    }
    if (
      logType === LogType.SingleLineText ||
      logType === LogType.Syslog ||
      logType === LogType.MultiLineText
    ) {
      const initArr: RegexListType[] = [];
      if (found?.groups) {
        setShowValidInfo(true);
        changeSampleLogInvalid(false);
        const foundObjectList = Object.entries(found.groups);
        if (foundObjectList.length) {
          foundObjectList.forEach((element: any) => {
            const type = getDefaultType(element[0], element[1]);
            // date format for SpringBoot is immutable, pre-assign the format
            const format =
              type === "date" && isSpringBootType()
                ? timeFormatForSpringBoot
                : "";
            initArr.push({
              key: element[0],
              type,
              format,
              value:
                element[1]?.length > 450
                  ? element[1].substr(0, 448) + "..."
                  : element[1],
              loadingCheck: false,
              showError: false,
              showSuccess: false,
              error: "",
            });
          });
        }
      } else {
        setShowValidInfo(false);
        changeSampleLogInvalid(true);
      }
      changeRegExpList?.(initArr);
    }
  };

  const validateTimeFormat = async (
    index: number,
    timeStr: string,
    formatStr: string
  ) => {
    if (logConfig.regexKeyList) {
      const tmpDataLoading: RegexListType[] = JSON.parse(
        JSON.stringify(logConfig.regexKeyList)
      );
      tmpDataLoading[index].loadingCheck = true;
      changeRegExpList?.(tmpDataLoading);
      const resData: any = await appSyncRequestQuery(checkTimeFormat, {
        timeStr: timeStr,
        formatStr: formatStr,
      });
      const tmpDataRes: RegexListType[] = JSON.parse(
        JSON.stringify(logConfig.regexKeyList)
      );
      tmpDataRes[index].loadingCheck = false;
      tmpDataRes[index].showSuccess =
        resData?.data?.checkTimeFormat?.isMatch || false;
      tmpDataRes[index].showError = !resData?.data?.checkTimeFormat?.isMatch;
      changeRegExpList?.(tmpDataRes);
    }
  };

  const validTimeKeyFormat = async () => {
    if (logConfig.regexKeyList) {
      const timeStr = logConfig.regexKeyList.find(
        (element) => element.key === logConfig.timeKey
      )?.value;
      const formatStr = logConfig.regexKeyList.find(
        (element) => element.key === logConfig.timeKey
      )?.format;
      setLoadingCheckTimeKeyFormat(true);
      const resData: any = await appSyncRequestQuery(checkTimeFormat, {
        timeStr: timeStr,
        formatStr: formatStr,
      });
      setLoadingCheckTimeKeyFormat(false);
      setTimeKeyFormatInvalid(
        resData?.data?.checkTimeFormat?.isMatch === false
      );
      setTimeKeyFormatValid(resData?.data?.checkTimeFormat?.isMatch === true);
    }
  };

  useEffect(() => {
    if (pageType === PageType.New) {
      setShowValidInfo(false);
      changeRegExpList?.([]);
      setLogResMap({});
      setTimeFormatForSpringBoot("");
    }
  }, [
    logConfig.logType,
    logConfig.multilineLogParser,
    logConfig.userLogFormat,
  ]);

  useEffect(() => {
    if (logConfig.userLogFormat) {
      if (isSpringBootType()) {
        let tmpTimeFormat = getLogFormatByUserLogConfig(
          logConfig.userLogFormat
        );
        tmpTimeFormat = replaceSpringbootTimeFormat(tmpTimeFormat);
        setTimeFormatForSpringBoot(tmpTimeFormat);
      }
    }
  }, [logConfig.userLogFormat]);

  useEffect(() => {
    // set format undefine when format is empty
    if (logConfig.regexKeyList && logConfig.regexKeyList.length > 0) {
      const tmpSpecList = logConfig.regexKeyList.map(
        ({ key, type, format }) => {
          if (isSpringBootType()) {
            return {
              key,
              type,
              format: ternary(
                key === "time",
                timeFormatForSpringBoot,
                undefined
              ),
            };
          }
          return {
            key,
            type,
            format: ternary(format, format, undefined),
          };
        }
      );
      changeSpecs(tmpSpecList);
    }

    // Set Time Key Option List
    const tmpTimeKeyList: OptionType[] = [
      {
        name: t("none"),
        value: "",
      },
    ];
    logConfig?.regexKeyList?.forEach((element) => {
      if (element.type === "date") {
        tmpTimeKeyList.push({
          name: element.key,
          value: element.key,
        });
      }
    });
    changeSelectKeyList?.(tmpTimeKeyList);
    setTimeKeyFormatInvalid(false);
    setTimeKeyFormatValid(false);
  }, [logConfig.regexKeyList, timeFormatForSpringBoot]);

  useEffect(() => {
    if (pageType === PageType.New) {
      if (logConfig.logType === LogType.JSON && logConfig.userSampleLog) {
        convertJSONToKeyValueList();
      } else {
        parseLog();
      }
    }
  }, [logConfig?.userSampleLog]);

  useImperativeHandle(ref, () => ({
    validate: () => {
      const list = logConfig.regexKeyList || [];
      let ret = true;
      for (const each of list) {
        if (each.type === "date") {
          if (each?.format?.trim()) {
            each.error = "";
          } else {
            each.error = t("error.timeFormatShouldNotBeEmpty");
            ret = false;
          }
        }
      }
      changeRegExpList?.(list);
      return ret;
    },
  }));

  return (
    <div>
      <FormItem
        infoType={defaultTo(
          ternary<InfoBarTypes | undefined>(
            logConfig.logType === LogType.Nginx,
            InfoBarTypes.NGINX_SAMPLE_LOG_PARSING,
            undefined
          ),
          ternary<InfoBarTypes | undefined>(
            logConfig.logType === LogType.Apache,
            InfoBarTypes.APACHE_SAMPLE_LOG_PARSING,
            undefined
          )
        )}
        optionTitle={`${t("resource:config.parsing.sampleLog")}${ternary(
          logConfig.logType === LogType.Nginx ||
            logConfig.logType === LogType.Apache,
          " - " + t("optional"),
          ""
        )}`}
        optionDesc={ternary(
          logConfig.logType === LogType.JSON,
          t("resource:config.parsing.sampleLogJSONDesc"),
          t("resource:config.parsing.sampleLogDesc")
        )}
        successText={ternary(
          showValidInfo && !sampleLogInvalid,
          t("resource:config.parsing.valid"),
          ""
        )}
        errorText={defaultTo(
          ternary(
            showSampleLogRequiredError,
            t("resource:config.parsing.sampleRequired"),
            undefined
          ),
          ternary(
            sampleLogInvalid,
            t("resource:config.parsing.invalid"),
            undefined
          )
        )}
      >
        <div className="flex m-w-75p">
          <div style={{ flex: 1 }}>
            <TextArea
              value={logConfig.userSampleLog || ""}
              placeholder=""
              rows={3}
              onChange={(event) => {
                changeSampleLogInvalid(false);
                setShowValidInfo(false);
                changeSampleLog(event.target.value);
                if (event.target.value) {
                  parseLog();
                }
              }}
            />
          </div>
          <div className="ml-10">
            <Button
              onClick={() => {
                if (logConfig.logType === LogType.JSON) {
                  convertJSONToKeyValueList();
                } else {
                  parseLog();
                }
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
        <div>
          {logType !== LogType.JSON && (
            <div className="flex show-tag-list">
              <div className="tag-key log">
                <b>{t("resource:config.parsing.key")}</b>
              </div>
              {(logType === LogType.SingleLineText ||
                logType === LogType.MultiLineText) && (
                <div className="tag-key log">
                  <b>{t("resource:config.parsing.type")}</b>
                </div>
              )}
              <div className="tag-value flex-1">
                <b>{t("resource:config.parsing.value")}</b>
              </div>
            </div>
          )}

          {(logType === LogType.Nginx || logType === LogType.Apache) &&
            Object.keys(logResMap).map((item: any, index: number) => {
              return (
                <div
                  key={identity(index)}
                  className="flex show-tag-list no-stripe"
                >
                  <div className="tag-key log">
                    <div>{item}</div>
                  </div>
                  <div className="tag-value flex-1">{logResMap[item]}</div>
                </div>
              );
            })}

          {(logType === LogType.Syslog ||
            logType === LogType.SingleLineText ||
            logType === LogType.MultiLineText) &&
            logConfig?.regexKeyList?.map((item: any, index: number) => {
              return (
                <div
                  key={identity(index)}
                  className="flex show-tag-list flex-start no-stripe has-border-bottom"
                >
                  <div className="tag-key log">
                    <div className="pr-20">
                      <TextInput
                        disabled={isSpringBootType() && item.key === "time"}
                        value={item.key}
                        onChange={(event) => {
                          const tmpArr = JSON.parse(
                            JSON.stringify(logConfig.regexKeyList)
                          );
                          tmpArr[index].key = event.target.value;
                          changeRegExpList?.(tmpArr);
                        }}
                      />
                    </div>
                  </div>
                  <div className="tag-key log">
                    <div className="pr-20">
                      {isSpringBootType() ? (
                        FB_TYPE_LIST.find(
                          (element) => element.value === item.type
                        )?.name || ""
                      ) : (
                        <Select
                          optionList={FB_TYPE_LIST}
                          value={item.type}
                          onChange={(event) => {
                            const tmpArr = JSON.parse(
                              JSON.stringify(logConfig.regexKeyList)
                            );
                            // set format to empty when change type
                            tmpArr[index].format = "";
                            tmpArr[index].type = event.target.value;
                            changeRegExpList?.(tmpArr);
                          }}
                          placeholder="type"
                        />
                      )}
                    </div>
                  </div>
                  <div className="tag-value flex-1">
                    <div>
                      <div className="min-height">{item.value}</div>
                      {item.type === "date" && isCustomType() && (
                        <div className="m-w-75p">
                          <FormItem
                            key={identity(index)}
                            optionTitle={`${t(
                              "resource:config.parsing.timeFormat"
                            )}`}
                            optionDesc={""}
                            infoType={InfoBarTypes.CONFIG_TIME_FORMAT}
                            successText={
                              item.showSuccess
                                ? t("resource:config.parsing.formatSuccess")
                                : ""
                            }
                            errorText={
                              item.showError
                                ? t("resource:config.parsing.formatError")
                                : logConfig.regexKeyList?.[index]?.error
                            }
                          >
                            <div className="flex">
                              <div className="flex-1">
                                <TextInput
                                  value={item.format}
                                  placeholder="%Y-%m-%d %H:%M:%S"
                                  onChange={(event) => {
                                    const tmpArr = JSON.parse(
                                      JSON.stringify(logConfig.regexKeyList)
                                    );
                                    tmpArr[index].showSuccess = false;
                                    tmpArr[index].showError = false;
                                    tmpArr[index].format =
                                      event.target.value || undefined;
                                    changeRegExpList?.(tmpArr);
                                  }}
                                />
                              </div>
                              <div className="pl-10">
                                {
                                  <Button
                                    loadingColor="#666"
                                    loading={item.loadingCheck}
                                    onClick={() => {
                                      validateTimeFormat(
                                        index,
                                        item.value,
                                        item.format
                                      );
                                    }}
                                  >
                                    {t("button.validate")}
                                  </Button>
                                }
                              </div>
                            </div>
                          </FormItem>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </FormItem>

      {/* JSON Schema Render */}
      {logConfig.jsonSchema && logConfig.logType === LogType.JSON && (
        <JSONInputRenderer
          schema={logConfig.jsonSchema}
          data={logConfig.userSampleLog}
          changeSchema={(schema) => {
            changeJSONSchema?.(schema);
          }}
        />
      )}

      {logConfig.regexKeyList &&
        logConfig.regexKeyList.length > 0 &&
        isCustomType() && (
          <div>
            <FormItem
              optionTitle={t("resource:config.parsing.timeKey")}
              optionDesc={t("resource:config.parsing.timeKeyDesc")}
              successText={
                timeKeyFormatValid
                  ? t("resource:config.parsing.formatSuccess")
                  : ""
              }
              errorText={
                timeKeyFormatInvalid
                  ? t("resource:config.parsing.formatError")
                  : ""
              }
            >
              <div className="flex m-w-75p">
                <div className="flex-1" style={{ maxWidth: 330 }}>
                  <Select
                    allowEmpty
                    placeholder={t("resource:config.parsing.selectTimeKey")}
                    optionList={logConfig.selectKeyList || []}
                    value={logConfig.timeKey || ""}
                    onChange={(event) => {
                      setTimeKeyFormatInvalid(false);
                      setTimeKeyFormatValid(false);
                      const tmpArr = JSON.parse(
                        JSON.stringify(logConfig.regexKeyList)
                      );
                      tmpArr.forEach((element: any) => {
                        element.format =
                          element.type !== "date" ? undefined : element.format;
                      });
                      changeRegExpList?.(tmpArr);
                      changeTimeKey?.(event.target.value);
                    }}
                  />
                </div>
                {logConfig?.regexKeyList?.find(
                  (element) => element.key === logConfig.timeKey
                )?.type !== "date" &&
                  logConfig.timeKey && (
                    <>
                      <div className="flex-1 pl-10">
                        <TextInput
                          placeholder="%Y-%m-%d %H:%M:%S"
                          value={
                            logConfig.regexKeyList.find(
                              (element) => element.key === logConfig.timeKey
                            )?.format || ""
                          }
                          onChange={(event) => {
                            if (logConfig.regexKeyList) {
                              const tmpArr = JSON.parse(
                                JSON.stringify(logConfig.regexKeyList)
                              );
                              const index = logConfig.regexKeyList.findIndex(
                                (element) => element.key === logConfig.timeKey
                              );
                              tmpArr[index].format =
                                event.target.value || undefined;
                              setTimeKeyFormatInvalid(false);
                              setTimeKeyFormatValid(false);
                              changeRegExpList?.(tmpArr);
                            }
                          }}
                        />
                      </div>
                      <div className="pl-10">
                        <Button
                          disabled={
                            !logConfig.timeKey ||
                            !logConfig.regexKeyList.find(
                              (element) => element.key === logConfig.timeKey
                            )?.format
                          }
                          loadingColor="#666"
                          loading={loadingCheckTimeKeyFormat}
                          onClick={() => {
                            validTimeKeyFormat();
                          }}
                        >
                          {t("button.validate")}
                        </Button>
                      </div>
                    </>
                  )}
              </div>
            </FormItem>
            <div className="mt-20">
              <Alert content={t("resource:config.parsing.timeKeyTips")} />
            </div>
          </div>
        )}

      {(isCustomType() ||
        logConfig.multilineLogParser ===
          MultiLineLogParser.JAVA_SPRING_BOOT) && (
        <FormItem
          optionTitle={t("resource:config.parsing.timezone")}
          optionDesc={t("resource:config.parsing.timezoneDesc")}
        >
          <Select
            className="m-w-35p"
            placeholder={t("resource:config.parsing.selectTimezone")}
            optionList={generateTimeZoneList()}
            value={logConfig.timeOffset || ""}
            onChange={(event) => {
              changeTimeOffset?.(event.target.value);
            }}
          ></Select>
        </FormItem>
      )}
    </div>
  );
}

export default forwardRef(SampleLogParsing);
