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
import Button from "components/Button";
import FormItem from "components/FormItem";
import Select from "components/Select";
import TextInput from "components/TextInput";
import React from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import { AppDispatch } from "reducer/store";
import { identity } from "lodash";
import {
  IIS_W3C_FIELDS_MAP,
  isCustomType,
  isSpringBootType,
  isWindowsIISLog,
  isWindowsIISLogWithW3C,
  regexKeyListChanged,
} from "reducer/createLogConfig";
import cloneDeep from "lodash.clonedeep";
import { RegexListType } from "./LogConfigComp";
import { FB_TYPE_LIST } from "assets/js/const";
import { InfoBarTypes } from "reducer/appReducer";
import { appSyncRequestQuery } from "assets/js/request";
import { checkTimeFormat } from "graphql/queries";
import { defaultStr, displayI18NMessage } from "assets/js/utils";
import { RegularSpec } from "API";

const RegexKeyItemList = () => {
  const { t } = useTranslation();
  const logConfig = useSelector((state: RootState) => state.logConfig);
  const dispatch = useDispatch<AppDispatch>();

  const validateTimeFormat = async (
    index: number,
    timeStr: string,
    formatStr: string
  ) => {
    if (logConfig.regexKeyList) {
      const tmpDataLoading: RegexListType[] = cloneDeep(
        logConfig.regexKeyList ?? []
      );
      tmpDataLoading[index].loadingCheck = true;
      dispatch(regexKeyListChanged(tmpDataLoading));
      const resData: any = await appSyncRequestQuery(checkTimeFormat, {
        timeStr: timeStr,
        formatStr: formatStr,
      });
      const tmpDataRes: RegexListType[] = cloneDeep(
        logConfig.regexKeyList ?? []
      );
      tmpDataRes[index].loadingCheck = false;
      tmpDataRes[index].showSuccess =
        resData?.data?.checkTimeFormat?.isMatch || false;
      tmpDataRes[index].showError = !resData?.data?.checkTimeFormat?.isMatch;
      dispatch(regexKeyListChanged(tmpDataRes));
    }
  };

  const disabledEdit = (regexItem: RegularSpec) => {
    return (
      (isWindowsIISLog(logConfig.data.logType) &&
        Object.values(IIS_W3C_FIELDS_MAP).includes(regexItem.key)) ||
      (isWindowsIISLog(logConfig.data.logType) &&
        !isWindowsIISLogWithW3C(
          logConfig.data.logType,
          logConfig.data.iisLogParser
        ))
    );
  };

  return (
    <div>
      {logConfig?.regexKeyList?.map((item: any, index: number) => {
        if (
          item.key === "log_timestamp" &&
          isWindowsIISLog(logConfig.data.logType)
        ) {
          return "";
        }
        return (
          <div
            key={identity(index)}
            className="flex show-tag-list flex-start no-stripe has-border-bottom"
          >
            <div className="tag-key log">
              <div className="pr-20">
                {disabledEdit(item) ? (
                  item.key
                ) : (
                  <TextInput
                    disabled={
                      isSpringBootType(logConfig) && item.key === "time"
                    }
                    value={item.key}
                    onChange={(event) => {
                      const tmpArr: RegexListType[] = cloneDeep(
                        logConfig.regexKeyList ?? []
                      );
                      tmpArr[index].key = event.target.value;
                      dispatch(regexKeyListChanged(tmpArr));
                    }}
                  />
                )}
              </div>
            </div>
            <div className="tag-key log">
              <div className="pr-20">
                {isSpringBootType(logConfig) ? (
                  defaultStr(
                    FB_TYPE_LIST.find((element) => element.value === item.type)
                      ?.name
                  )
                ) : (
                  <Select
                    disabled={disabledEdit(item)}
                    optionList={FB_TYPE_LIST}
                    value={item.type}
                    onChange={(event) => {
                      const tmpArr: RegexListType[] = cloneDeep(
                        logConfig.regexKeyList ?? []
                      );
                      // set format to empty when change type
                      tmpArr[index].format = "";
                      tmpArr[index].type = event.target.value;
                      dispatch(regexKeyListChanged(tmpArr));
                    }}
                    placeholder="type"
                  />
                )}
              </div>
            </div>
            <div className="tag-value flex-1">
              <div>
                <div className="min-height">{item.value}</div>
                {item.type === "date" && isCustomType(logConfig) && (
                  <div className="m-w-75p">
                    <FormItem
                      key={identity(index)}
                      optionTitle={`${t("resource:config.parsing.timeFormat")}`}
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
                          : displayI18NMessage(item.error)
                      }
                    >
                      <div className="flex">
                        <div className="flex-1">
                          <TextInput
                            value={item.format}
                            placeholder="%Y-%m-%d %H:%M:%S"
                            onChange={(event) => {
                              const tmpArr: RegexListType[] = cloneDeep(
                                logConfig.regexKeyList ?? []
                              );
                              tmpArr[index].showSuccess = false;
                              tmpArr[index].showError = false;
                              tmpArr[index].error = "";
                              tmpArr[index].format =
                                event.target.value || undefined;
                              dispatch(regexKeyListChanged(tmpArr));
                            }}
                          />
                        </div>
                        <div className="pl-10">
                          {
                            <Button
                              disabled={!item.format}
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
  );
};

export default RegexKeyItemList;
