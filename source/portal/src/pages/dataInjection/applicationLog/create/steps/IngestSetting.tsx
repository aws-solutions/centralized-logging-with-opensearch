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
import React, { useState } from "react";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import Select from "components/Select";
import { ApplicationLogType } from "../CreatePipeline";
import TextInput from "components/TextInput";
import { AmplifyConfigType, YesNo } from "types";
import { useTranslation } from "react-i18next";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";

interface IngestSettingProps {
  applicationLog: ApplicationLogType;
  changeIndexPrefix: (index: string) => void;
  changeShardNumber: (shardNum: string) => void;
  changeMaxShardNum: (shardNum: string) => void;
  changeEnableAS: (enable: boolean) => void;
  disableSelect?: boolean;
  indexEmptyError: boolean;
  indexFormatError: boolean;
  shardNumInvalidError?: boolean;
  maxShardNumInvalidError?: boolean;
}

const YESNO_LIST = [
  {
    name: "yes",
    value: YesNo.Yes,
  },
  {
    name: "no",
    value: YesNo.No,
  },
];

const IngestSetting: React.FC<IngestSettingProps> = (
  props: IngestSettingProps
) => {
  console.info(props);
  const {
    applicationLog,
    changeIndexPrefix,
    changeShardNumber,
    changeEnableAS,
    changeMaxShardNum,
    indexEmptyError,
    indexFormatError,
    shardNumInvalidError,
    maxShardNumInvalidError,
  } = props;
  const { t } = useTranslation();
  const [enableAS, setEnableAS] = useState(
    applicationLog.kdsParas.enableAutoScaling ? YesNo.Yes : YesNo.No
  );
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  return (
    <div>
      <HeaderPanel title={t("applog:create.ingestSetting.index")}>
        <div>
          <FormItem
            optionTitle={t("applog:create.ingestSetting.indexName")}
            optionDesc={t("applog:create.ingestSetting.indexNameDesc")}
            errorText={
              indexEmptyError
                ? t("applog:create.ingestSetting.indexNameError")
                : indexFormatError
                ? t("applog:create.ingestSetting.indexNameFormatError")
                : ""
            }
          >
            <TextInput
              className="m-w-75p"
              value={applicationLog.aosParas.indexPrefix}
              onChange={(event) => {
                changeIndexPrefix(event.target.value);
              }}
              placeholder="log-example"
            />
          </FormItem>
        </div>
      </HeaderPanel>

      <HeaderPanel title={t("applog:create.ingestSetting.buffer")}>
        <div>
          <FormItem
            optionTitle={t("applog:create.ingestSetting.shardNum")}
            optionDesc={t("applog:create.ingestSetting.shardNumDesc")}
            errorText={
              shardNumInvalidError
                ? t("applog:create.ingestSetting.shardNumError")
                : ""
            }
          >
            <TextInput
              className="m-w-45p"
              value={applicationLog.kdsParas.startShardNumber}
              type="number"
              onChange={(event) => {
                changeShardNumber(event.target.value);
              }}
              placeholder={t("applog:create.ingestSetting.shardNum")}
            />
          </FormItem>

          {!amplifyConfig.aws_project_region.startsWith("cn") ? (
            <>
              <FormItem
                optionTitle={t("applog:create.ingestSetting.enableAutoS")}
                optionDesc={t("applog:create.ingestSetting.enableAutoSDesc")}
              >
                <Select
                  isI18N
                  className="m-w-45p"
                  optionList={YESNO_LIST}
                  value={enableAS}
                  onChange={(event) => {
                    setEnableAS(event.target.value);
                    changeEnableAS(
                      event.target.value === YesNo.Yes ? true : false
                    );
                  }}
                  placeholder=""
                />
              </FormItem>

              <FormItem
                optionTitle={t("applog:create.ingestSetting.maxShardNum")}
                optionDesc={t("applog:create.ingestSetting.maxShardNumDesc")}
                errorText={
                  maxShardNumInvalidError
                    ? t("applog:create.ingestSetting.maxShardNumError")
                    : ""
                }
              >
                <TextInput
                  disabled={!applicationLog.kdsParas.enableAutoScaling}
                  className="m-w-45p"
                  type="number"
                  value={applicationLog.kdsParas.maxShardNumber}
                  onChange={(event) => {
                    changeMaxShardNum(event.target.value);
                  }}
                  placeholder={t("applog:create.ingestSetting.maxShardNum")}
                />
              </FormItem>
            </>
          ) : (
            ""
          )}
        </div>
      </HeaderPanel>
    </div>
  );
};

export default IngestSetting;
