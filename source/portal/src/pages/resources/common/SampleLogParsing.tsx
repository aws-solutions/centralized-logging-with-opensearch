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
import { LogType, MultiLineLogParser } from "API";
import Button from "components/Button";
import FormItem from "components/FormItem";
import TextArea from "components/TextArea";
import TextInput from "components/TextInput";
import { InfoBarTypes } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import Select from "components/Select";
import { FB_TYPE_LIST } from "assets/js/const";
import Alert from "components/Alert";
import { Alert as AlertInfo } from "assets/js/alert";
import { ExLogConf } from "./LogConfigComp";
import {
  getLogFormatByUserLogConfig,
  IsJsonString,
  JsonToDotNotate,
  replaceSpringbootTimeFormat,
} from "assets/js/utils";

interface SampleLogParsingProps {
  changeSpecs: (specs: any) => void;
  changeSampleLog: (log: string) => void;
  logConfig: ExLogConf;
  logType: LogType;
  showSampleLogRequiredError?: boolean;
  sampleLogInvalid: boolean;
  changeSampleLogInvalid: (valid: boolean) => void;
}

const SampleLogParsing: React.FC<SampleLogParsingProps> = (
  props: SampleLogParsingProps
) => {
  const {
    logType,
    logConfig,
    showSampleLogRequiredError,
    changeSpecs,
    changeSampleLog,
    sampleLogInvalid,
    changeSampleLogInvalid,
  } = props;
  const { t } = useTranslation();
  const [logResMap, setLogResMap] = useState<any>({});
  const [regexKeyList, setRegexKeyList] = useState<any[]>([]);
  const [showValidInfo, setShowValidInfo] = useState(false);
  const [timeFormat, setTimeFormat] = useState("");

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
      AlertInfo("Input the json");
    }
    if (!IsJsonString(logConfig?.userSampleLog || "")) {
      AlertInfo("Sample Log is not a JSON format");
    }
    const tmpJsonObj = JsonToDotNotate(
      JSON.parse(logConfig.userSampleLog || "")
    );
    console.info("tmpJsonFormat:", tmpJsonObj);
    const initArr: any = [];
    Object.keys(tmpJsonObj).map((key) => {
      initArr.push({
        key: key,
        type: getDefaultType(key, tmpJsonObj[key]),
        format: "",
        value: tmpJsonObj[key],
      });
    });
    setRegexKeyList(initArr);
  };

  const parseLog = () => {
    const regex = logConfig.regularExpression || "";
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
      Alert(t("resource:config.parsing.alert"));
      return;
    }
    const found: any = logConfig?.userSampleLog?.match(regex);
    const foundLength = found?.length;
    const groupLength = found?.groups && Object.keys(found?.groups)?.length;
    console.info("foundLength-groupLength", foundLength, groupLength);

    if (logType === LogType.Nginx || logType === LogType.Apache) {
      if (found && found.groups) {
        setShowValidInfo(true);
        changeSampleLogInvalid(false);
      } else {
        setShowValidInfo(false);
        changeSampleLogInvalid(true);
      }
      setLogResMap(found?.groups || {});
    }
    if (
      logType === LogType.SingleLineText ||
      logType === LogType.MultiLineText
    ) {
      const initArr = [];
      if (found && found.length > 0) {
        setShowValidInfo(true);
        changeSampleLogInvalid(false);
        for (let i = 0; i < found?.length; i++) {
          let tmpKeyName = "";
          const keys = Object.keys(found?.groups);
          if (i > 0) {
            if (foundLength - 1 === groupLength) {
              tmpKeyName = keys[i - 1];
            }
            initArr.push({
              key: tmpKeyName,
              type: getDefaultType(tmpKeyName, found[i]),
              format: "",
              value:
                found[i]?.length > 450
                  ? found[i].substr(0, 448) + "..."
                  : found[i],
            });
          }
        }
      } else {
        setShowValidInfo(false);
        changeSampleLogInvalid(true);
      }
      setRegexKeyList(initArr);
    }
  };

  useEffect(() => {
    setShowValidInfo(false);
    setRegexKeyList([]);
    setLogResMap({});
    setTimeFormat("");
  }, [logConfig.logType, logConfig.multilineLogParser]);

  useEffect(() => {
    if (logConfig.userLogFormat) {
      console.info("userLogFormatChanged:", logConfig.userLogFormat);
      if (
        logConfig.logType === LogType.MultiLineText &&
        logConfig.multilineLogParser === MultiLineLogParser.JAVA_SPRING_BOOT
      ) {
        let tmpTimeFormat = getLogFormatByUserLogConfig(
          logConfig.userLogFormat
        );
        // console.info("tmpTimeFormat:tmpTimeFormat", tmpTimeFormat);
        tmpTimeFormat = replaceSpringbootTimeFormat(tmpTimeFormat);
        setTimeFormat(tmpTimeFormat);
      }
    }
  }, [logConfig.userLogFormat]);

  useEffect(() => {
    if (regexKeyList && regexKeyList.length > 0) {
      const tmpSpecList = [];
      for (let i = 0; i < regexKeyList.length; i++) {
        tmpSpecList.push({
          key: regexKeyList[i].key,
          type: regexKeyList[i].type,
          format: regexKeyList[i].key === "time" ? timeFormat : undefined,
        });
      }
      changeSpecs(tmpSpecList);
    }
  }, [regexKeyList, timeFormat]);

  useEffect(() => {
    if (logConfig.logType !== LogType.JSON) {
      parseLog();
    }
  }, [logConfig?.userSampleLog]);

  return (
    <div>
      <FormItem
        infoType={
          logConfig.logType === LogType.Nginx
            ? InfoBarTypes.NGINX_SAMPLE_LOG_PARSING
            : logConfig.logType === LogType.Apache
            ? InfoBarTypes.APACHE_SAMPLE_LOG_PARSING
            : undefined
        }
        optionTitle={`${t("resource:config.parsing.sampleLog")}${
          logConfig.logType === LogType.Nginx ||
          logConfig.logType === LogType.Apache
            ? " - " + t("optional")
            : ""
        }`}
        optionDesc={
          logConfig.logType === LogType.JSON
            ? t("resource:config.parsing.sampleLogJSONDesc")
            : t("resource:config.parsing.sampleLogDesc")
        }
        successText={
          showValidInfo && !sampleLogInvalid
            ? t("resource:config.parsing.valid")
            : ""
        }
        errorText={
          showSampleLogRequiredError
            ? t("resource:config.parsing.sampleRequired")
            : sampleLogInvalid
            ? t("resource:config.parsing.invalid")
            : ""
        }
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
                setRegexKeyList([]);
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
          <div className="flex show-tag-list">
            <div className="tag-key log">
              <b>{t("resource:config.parsing.key")}</b>
            </div>
            {(logType === LogType.JSON ||
              logType === LogType.SingleLineText ||
              logType === LogType.MultiLineText) && (
              <div className="tag-key log">
                <b>{t("resource:config.parsing.type")}</b>
              </div>
            )}
            <div className="tag-value flex-1">
              <b>{t("resource:config.parsing.value")}</b>
            </div>
          </div>
          {(logType === LogType.Nginx || logType === LogType.Apache) &&
            Object.keys(logResMap).map((item: any, index: number) => {
              return (
                <div key={index} className="flex show-tag-list no-stripe">
                  <div className="tag-key log">
                    <div>{item}</div>
                  </div>
                  <div className="tag-value flex-1">{logResMap[item]}</div>
                </div>
              );
            })}

          {(logType === LogType.JSON ||
            logType === LogType.SingleLineText ||
            logType === LogType.MultiLineText) &&
            regexKeyList.map((item: any, index: number) => {
              return (
                <div key={index} className="flex show-tag-list no-stripe">
                  <div className="tag-key log">
                    <div className="pr-20">
                      <TextInput
                        disabled={
                          logConfig.logType === LogType.MultiLineText &&
                          logConfig.multilineLogParser ===
                            MultiLineLogParser.JAVA_SPRING_BOOT &&
                          item.key === "time"
                        }
                        value={item.key}
                        onChange={(event) => {
                          const tmpArr = JSON.parse(
                            JSON.stringify(regexKeyList)
                          );
                          tmpArr[index].key = event.target.value;
                          setRegexKeyList(tmpArr);
                        }}
                      />
                    </div>
                  </div>
                  <div className="tag-key log">
                    <div className="pr-20">
                      {logConfig.logType === LogType.MultiLineText &&
                      logConfig.multilineLogParser ===
                        MultiLineLogParser.JAVA_SPRING_BOOT ? (
                        FB_TYPE_LIST.find(
                          (element) => element.value === item.type
                        )?.name || ""
                      ) : (
                        <Select
                          optionList={FB_TYPE_LIST}
                          value={item.type}
                          onChange={(event) => {
                            const tmpArr = JSON.parse(
                              JSON.stringify(regexKeyList)
                            );
                            tmpArr[index].type = event.target.value;
                            setRegexKeyList(tmpArr);
                          }}
                          placeholder={"type"}
                        />
                      )}
                    </div>
                  </div>
                  <div className="tag-value flex-1">{item.value}</div>
                </div>
              );
            })}
          {regexKeyList.length > 0 &&
            (logType === LogType.JSON ||
              logType === LogType.SingleLineText ||
              logType === LogType.MultiLineText) && (
              <div className="mt-20">
                <Alert content={t("resource:config.parsing.dateTips")} />
              </div>
            )}
          {regexKeyList.length > 0 &&
            (logType === LogType.JSON ||
              logType === LogType.SingleLineText ||
              (logConfig.logType === LogType.MultiLineText &&
                logConfig.multilineLogParser ===
                  MultiLineLogParser.CUSTOM)) && (
              <div className="mt-20">
                <FormItem
                  optionTitle={t("resource:config.parsing.timeFormat")}
                  optionDesc={t("resource:config.parsing.timeFormatDesc")}
                  infoType={InfoBarTypes.CONFIG_TIME_FORMAT}
                >
                  <TextInput
                    value={timeFormat}
                    placeholder="%Y-%m-%d %H:%M:%S.%L"
                    onChange={(event) => {
                      setTimeFormat(event.target.value);
                    }}
                  />
                </FormItem>
              </div>
            )}
        </div>
      </FormItem>
    </div>
  );
};

export default SampleLogParsing;
