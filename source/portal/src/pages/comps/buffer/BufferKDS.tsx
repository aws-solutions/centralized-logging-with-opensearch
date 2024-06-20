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
import { useDispatch, useSelector } from "react-redux";
import { AmplifyConfigType, YesNo, YESNO_LIST } from "types";
import { NOT_SUPPORT_KDS_AUTO_SCALING_REGION } from "assets/js/const";
import { RootState } from "reducer/reducers";
import { AppDispatch } from "reducer/store";
import {
  enableAutoScalingChanged,
  maxCapacityChanged,
  minCapacityChanged,
} from "reducer/configBufferKDS";
import { displayI18NMessage } from "assets/js/utils";

const BufferKDS: React.FC = () => {
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const kdsBuffer = useSelector((state: RootState) => state.kdsBuffer);
  const dispatch = useDispatch<AppDispatch>();
  const [enableAS, setEnableAS] = useState(
    kdsBuffer.data.enableAutoScaling === "true" ? YesNo.Yes : YesNo.No
  );
  return (
    <div>
      <FormItem
        optionTitle={t("applog:create.ingestSetting.shardNum")}
        optionDesc={t("applog:create.ingestSetting.shardNumDesc")}
        errorText={displayI18NMessage(kdsBuffer.minCapacityError)}
      >
        <TextInput
          className="m-w-45p"
          value={kdsBuffer.data.minCapacity}
          type="number"
          onChange={(event) => {
            dispatch(minCapacityChanged(event.target.value));
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
            dispatch(
              enableAutoScalingChanged(
                event.target.value === YesNo.Yes ? "true" : "false"
              )
            );
          }}
          placeholder=""
        />
      </FormItem>

      {kdsBuffer.data.enableAutoScaling === "true" && (
        <FormItem
          optionTitle={t("applog:create.ingestSetting.maxShardNum")}
          optionDesc={t("applog:create.ingestSetting.maxShardNumDesc")}
          errorText={displayI18NMessage(kdsBuffer.maxCapacityError)}
        >
          <TextInput
            className="m-w-45p"
            type="number"
            value={kdsBuffer.data.maxCapacity}
            onChange={(event) => {
              dispatch(maxCapacityChanged(event.target.value));
            }}
            placeholder={t("applog:create.ingestSetting.maxShardNum")}
          />
        </FormItem>
      )}
    </div>
  );
};

export default BufferKDS;
