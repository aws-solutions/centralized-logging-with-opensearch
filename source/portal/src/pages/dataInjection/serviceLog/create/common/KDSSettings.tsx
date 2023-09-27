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
import { NOT_SUPPORT_KDS_AUTO_SCALING_REGION } from "assets/js/const";
import FormItem from "components/FormItem";
import Select from "components/Select";
import TextInput from "components/TextInput";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { AmplifyConfigType, YesNo, YESNO_LIST } from "types";
import { CloudFrontTaskProps } from "../cloudfront/CreateCloudFront";
import { CloudTrailTaskProps } from "../cloudtrail/CreateCloudTrail";
import { VpcLogTaskProps } from "../vpc/CreateVPC";
import { RootState } from "reducer/reducers";

interface KDSSettingsProps {
  pipelineTask: CloudFrontTaskProps | CloudTrailTaskProps | VpcLogTaskProps;
  shardNumError?: boolean;
  maxShardNumError?: boolean;
  changeMinCapacity?: (num: string) => void;
  changeEnableAS?: (enable: string) => void;
  changeMaxCapacity?: (num: string) => void;
}

const KDSSettings: React.FC<KDSSettingsProps> = (props: KDSSettingsProps) => {
  const { t } = useTranslation();
  const {
    pipelineTask,
    shardNumError,
    maxShardNumError,
    changeMinCapacity,
    changeEnableAS,
    changeMaxCapacity,
  } = props;
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  return (
    <>
      <FormItem
        optionTitle={t("servicelog:cloudfront.kdsShardNum")}
        optionDesc={t("servicelog:cloudfront.kdsShardNumDesc")}
        errorText={
          shardNumError ? t("servicelog:cloudfront.shardNumError") : ""
        }
      >
        <TextInput
          className="m-w-45p"
          type="number"
          value={pipelineTask.params.minCapacity}
          onChange={(event) => {
            changeMinCapacity && changeMinCapacity(event.target.value);
          }}
        />
      </FormItem>

      <FormItem
        optionTitle={t("servicelog:cloudfront.enableAS")}
        optionDesc={t("servicelog:cloudfront.enableASDesc")}
      >
        <Select
          isI18N
          disabled={NOT_SUPPORT_KDS_AUTO_SCALING_REGION.includes(
            amplifyConfig.aws_project_region
          )}
          placeholder=""
          className="m-w-45p"
          optionList={YESNO_LIST}
          value={pipelineTask.params.enableAutoScaling}
          onChange={(event) => {
            changeEnableAS && changeEnableAS(event.target.value);
          }}
        />
      </FormItem>

      <FormItem
        optionTitle={t("servicelog:cloudfront.kdsMaxShard")}
        optionDesc={t("servicelog:cloudfront.kdsMaxShardDesc")}
        errorText={
          maxShardNumError ? t("servicelog:cloudfront.maxShardNumError") : ""
        }
      >
        <TextInput
          disabled={pipelineTask.params.enableAutoScaling === YesNo.No}
          className="m-w-45p"
          type="number"
          value={pipelineTask.params.maxCapacity}
          onChange={(event) => {
            changeMaxCapacity && changeMaxCapacity(event.target.value);
          }}
        />
      </FormItem>
    </>
  );
};

export default KDSSettings;
