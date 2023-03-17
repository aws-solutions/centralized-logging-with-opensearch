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
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import { IngestionPropsType } from "../CreateIngestion";
import Tiles from "components/Tiles";
import InstanceGroupComp, {
  InstanceWithStatus,
} from "pages/resources/common/InstanceGroupComp";
import { CreationMethod } from "types";
import { InstanceGroupType } from "pages/resources/instanceGroup/create/CreateInstanceGroup";
import { InfoBarTypes } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import LoadingText from "components/LoadingText";
import { AppPipeline } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { getAppPipeline } from "graphql/queries";
import { OptionType } from "components/AutoComplete/autoComplete";

interface IngestSettingProps {
  pipelineId: string;
  ingestionInfo: IngestionPropsType;
  changeCreationMethod: (method: string) => void;
  disableSelect?: boolean;
  emptyError: boolean;
  clearEmptyError: () => void;
  changeInstanceGroup: (instanceGroup: InstanceGroupType) => void;
  changeSelectInstanceSet: (sets: InstanceWithStatus[]) => void;
  changeLoadingRefresh: (refresh: boolean) => void;
  changeCurAccountId: (id: string) => void;
  changeASG: (asg: OptionType | null) => void;
  changeGroupType: (type: string) => void;
}

const StepCreateInstanceGroup: React.FC<IngestSettingProps> = (
  props: IngestSettingProps
) => {
  const {
    pipelineId,
    ingestionInfo,
    emptyError,
    clearEmptyError,
    changeCreationMethod,
    changeInstanceGroup,
    changeSelectInstanceSet,
    changeLoadingRefresh,
    changeCurAccountId,
    changeASG,
    changeGroupType,
  } = props;
  const { t } = useTranslation();
  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [hideAccountSetting, setHideAccountSetting] = useState(false);

  const getPipelineById = async () => {
    try {
      setLoadingPipeline(true);
      const resData: any = await appSyncRequestQuery(getAppPipeline, {
        id: pipelineId,
      });
      console.info("resData:", resData);
      const dataPipelne: AppPipeline = resData.data.getAppPipeline;
      setHideAccountSetting(dataPipelne.bufferAccessRoleArn ? false : true);
      setLoadingPipeline(false);
    } catch (error) {
      setLoadingPipeline(false);
      console.error(error);
    }
  };

  useEffect(() => {
    if (
      pipelineId &&
      ingestionInfo.instanceGroupMethod === CreationMethod.New
    ) {
      getPipelineById();
    }
  }, [pipelineId]);

  return (
    <div>
      <HeaderPanel title={t("applog:ingestion.createInstanceGroup.method")}>
        <div>
          <FormItem
            infoType={InfoBarTypes.INSTANCE_GROUP_CREATION_METHOD}
            optionTitle={t("applog:ingestion.createInstanceGroup.method")}
            optionDesc=""
          >
            <Tiles
              value={ingestionInfo.instanceGroupMethod}
              onChange={(event) => {
                changeCreationMethod(event.target.value);
              }}
              items={[
                {
                  label: t("applog:ingestion.createInstanceGroup.new"),
                  description: t(
                    "applog:ingestion.createInstanceGroup.newDesc"
                  ),
                  value: CreationMethod.New,
                },
                {
                  label: t("applog:ingestion.createInstanceGroup.exists"),
                  description: t(
                    "applog:ingestion.createInstanceGroup.existsDesc"
                  ),
                  value: CreationMethod.Exists,
                },
              ]}
            />
          </FormItem>
        </div>
      </HeaderPanel>

      {ingestionInfo.instanceGroupMethod === CreationMethod.New &&
        (loadingPipeline ? (
          <LoadingText />
        ) : (
          <div className="mb-20">
            <InstanceGroupComp
              hideAccountSetting={hideAccountSetting}
              showNameEmptyError={emptyError}
              instanceGroup={ingestionInfo.curInstanceGroup}
              setCreateDisabled={(disable) => {
                changeLoadingRefresh(disable);
              }}
              accountId={ingestionInfo.accountId}
              changeCurAccount={(id) => {
                changeCurAccountId(id);
              }}
              changeGroupName={(name) => {
                console.info("name:", name);
                clearEmptyError();
                const tmpConfig: any = {
                  ...ingestionInfo.curInstanceGroup,
                  groupName: name,
                };
                changeInstanceGroup(tmpConfig);
              }}
              changeInstanceSet={(sets) => {
                console.info("sets:", sets);
                changeSelectInstanceSet(sets);
              }}
              changeASG={(asg) => {
                changeASG(asg);
              }}
              changeGroupType={(type) => {
                changeGroupType(type);
              }}
            />
          </div>
        ))}
    </div>
  );
};

export default StepCreateInstanceGroup;
