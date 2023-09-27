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
import React, { useState } from "react";
import FormItem from "components/FormItem";
import Select from "components/Select";
import TextInput from "components/TextInput";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import {
  AmplifyConfigType,
  YesNo,
  YESNO_LIST,
  ApplicationLogType,
} from "types";
import { NOT_SUPPORT_KDS_AUTO_SCALING_REGION } from "assets/js/const";
import { RootState } from "reducer/reducers";

interface BufferKDSProps {
  shardNumInvalidError: boolean | undefined;
  maxShardNumInvalidError: boolean | undefined;
  applicationLog: ApplicationLogType;
  changeShardNumber: (number: string) => void;
  changeEnableAS: (enable: string) => void;
  changeMaxShardNum: (number: string) => void;
}

const BufferKDS: React.FC<BufferKDSProps> = (props: BufferKDSProps) => {
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const {
    shardNumInvalidError,
    maxShardNumInvalidError,
    applicationLog,
    changeShardNumber,
    changeEnableAS,
    changeMaxShardNum,
  } = props;
  const [enableAS, setEnableAS] = useState(
    applicationLog.kdsBufferParams.enableAutoScaling === "true"
      ? YesNo.Yes
      : YesNo.No
  );
  return (
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
          value={applicationLog.kdsBufferParams.minCapacity}
          type="number"
          onChange={(event) => {
            changeShardNumber(event.target.value);
          }}
          placeholder={t("applog:create.ingestSetting.shardNum")}
        />
      </FormItem>

      <FormItem
        optionTitle={t("applog:create.ingestSetting.enableAutoS")}
        optionDesc={t("applog:create.ingestSetting.enableAutoSDesc")}
      >
        <Select
          disabled={NOT_SUPPORT_KDS_AUTO_SCALING_REGION.includes(
            amplifyConfig.aws_project_region
          )}
          isI18N
          className="m-w-45p"
          optionList={YESNO_LIST}
          value={enableAS}
          onChange={(event) => {
            setEnableAS(event.target.value);
            changeEnableAS(event.target.value === YesNo.Yes ? "true" : "false");
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
          disabled={
            applicationLog.kdsBufferParams.enableAutoScaling === "false"
          }
          className="m-w-45p"
          type="number"
          value={applicationLog.kdsBufferParams.maxCapacity}
          onChange={(event) => {
            changeMaxShardNum(event.target.value);
          }}
          placeholder={t("applog:create.ingestSetting.maxShardNum")}
        />
      </FormItem>
    </div>
  );
};

export default BufferKDS;
