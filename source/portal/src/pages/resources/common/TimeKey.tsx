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
import { appSyncRequestQuery } from "assets/js/request";
import { defaultStr, displayI18NMessage } from "assets/js/utils";
import Alert from "components/Alert";
import Button from "components/Button";
import FormItem from "components/FormItem";
import Select from "components/Select";
import TextInput from "components/TextInput";
import { checkTimeFormat } from "graphql/queries";
import cloneDeep from "lodash.clonedeep";
import React from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import {
  TIME_KEY_TYPES,
  findTimeKeyObject,
  regexKeyListChanged,
  timeKeyChanged,
  timeKeyFormatChanged,
  validatingTimeKeyFormat,
} from "reducer/createLogConfig";
import { RootState } from "reducer/reducers";
import { AppDispatch } from "reducer/store";
import { RegexListType } from "./LogConfigComp";

const TimeKey = () => {
  const { t } = useTranslation();
  const logConfig = useSelector((state: RootState) => state.logConfig);
  const dispatch = useDispatch<AppDispatch>();

  const validateTimeFormat = async () => {
    if (!findTimeKeyObject(logConfig)?.format) {
      return;
    }
    dispatch(
      validatingTimeKeyFormat({
        loading: true,
        valid: 0,
      })
    );
    const resData: any = await appSyncRequestQuery(checkTimeFormat, {
      timeStr: findTimeKeyObject(logConfig)?.value,
      formatStr: findTimeKeyObject(logConfig)?.format,
    });
    const tmpDataRes: RegexListType[] = cloneDeep(logConfig.regexKeyList ?? []);
    const valid = resData?.data?.checkTimeFormat?.isMatch ? 1 : -1;
    dispatch(
      validatingTimeKeyFormat({
        loading: false,
        valid,
      })
    );
    dispatch(regexKeyListChanged(tmpDataRes));
  };

  return (
    <div>
      <FormItem
        optionTitle={t("resource:config.parsing.timeKey")}
        optionDesc={t("resource:config.parsing.timeKeyDesc")}
        errorText={displayI18NMessage(logConfig.timeKeyFormatError)}
        successText={displayI18NMessage(logConfig.timeKeyFormatSuccess)}
      >
        <div className="flex m-w-75p">
          <div className="flex-1" style={{ maxWidth: 330 }}>
            <Select
              allowEmpty
              placeholder={t("resource:config.parsing.selectTimeKey")}
              optionList={logConfig.selectTimeKeyList || []}
              value={defaultStr(logConfig.data.timeKey)}
              onChange={(event) => {
                dispatch(timeKeyChanged(event.target.value));
              }}
            />
          </div>
          {!TIME_KEY_TYPES.includes(
            logConfig.regexKeyList?.find(
              (element) => element.key === logConfig.data.timeKey
            )?.type ?? ""
          ) &&
            logConfig.data.timeKey && (
              <>
                <div className="flex-1 pl-10">
                  <TextInput
                    placeholder="%Y-%m-%d %H:%M:%S"
                    value={defaultStr(findTimeKeyObject(logConfig)?.format)}
                    onChange={(event) => {
                      if (logConfig.regexKeyList) {
                        const tmpArr = cloneDeep(logConfig.regexKeyList);
                        const index = logConfig.regexKeyList.findIndex(
                          (element) => element.key === logConfig.data.timeKey
                        );
                        tmpArr[index].format = event.target.value || undefined;
                        dispatch(regexKeyListChanged(tmpArr));
                        dispatch(timeKeyFormatChanged());
                      }
                    }}
                  />
                </div>
                <div className="pl-10">
                  <Button
                    disabled={
                      !logConfig.data.timeKey ||
                      !findTimeKeyObject(logConfig)?.format
                    }
                    loadingColor="#666"
                    loading={logConfig.timeKeyFormatLoading}
                    onClick={() => {
                      validateTimeFormat();
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
  );
};

export default TimeKey;
