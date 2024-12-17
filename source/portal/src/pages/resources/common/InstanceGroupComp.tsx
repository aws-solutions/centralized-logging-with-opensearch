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
/* eslint-disable react/display-name */
import React, { useState } from "react";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import {
  EC2GroupPlatform,
  EC2GroupType,
  LogSourceType,
  SubAccountLink,
} from "API";
import { InstanceGroupType } from "../instanceGroup/create/CreateInstanceGroup";
import { useTranslation } from "react-i18next";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import InstanceTable, { InstanceWithStatusType } from "./InstanceTable";
import SelectType from "../instanceGroup/SelectType";
import ASGSelect from "./ASGSelect";
import { OptionType } from "components/AutoComplete/autoComplete";
import { defaultStr } from "assets/js/utils";

interface InstanceGroupCompProps {
  accountId: string;
  instanceGroup?: InstanceGroupType;
  changeGroupName: (name: string) => void;
  changeGroupType: (type: string) => void;
  changeInstanceSet: (sets: InstanceWithStatusType[]) => void;
  showNameEmptyError: boolean;
  setCreateDisabled: (disable: boolean) => void;
  changeCurAccount: (
    accountId: string,
    accountInfo: SubAccountLink | null
  ) => void;
  changeASG: (asg: OptionType | null) => void;
  hideAccountSetting?: boolean;
  platform: EC2GroupPlatform;
  changePlatform?: (platform: EC2GroupPlatform) => void;
}

const InstanceGroupComp: React.FC<InstanceGroupCompProps> = (
  props: InstanceGroupCompProps
) => {
  const {
    accountId,
    instanceGroup,
    changeGroupName,
    changeGroupType,
    showNameEmptyError,
    changeInstanceSet,
    setCreateDisabled,
    changeCurAccount,
    changeASG,
    hideAccountSetting,
    platform,
    changePlatform,
  } = props;

  const { t } = useTranslation();
  const [instanceIsLoading, setInstanceIsLoading] = useState(true);

  return (
    <div>
      <PagePanel
        title={t("resource:group.comp.createInstanceGroup")}
        desc={t("resource:group.comp.instanceGroupDesc")}
      >
        <div>
          <HeaderPanel
            title={t("resource:group.comp.settings")}
            marginBottom={0}
          >
            <>
              <FormItem
                optionTitle={t("resource:group.comp.prerequisites")}
                optionDesc={t("resource:group.comp.prerequisitesDesc")}
              >
                <ul>
                  {[1, 2, 3, 4, 5].map((item) => {
                    return (
                      <li key={item}>{t(`resource:group.comp.tips${item}`)}</li>
                    );
                  })}
                </ul>
              </FormItem>
              {!hideAccountSetting && (
                <CrossAccountSelect
                  disabled={instanceIsLoading}
                  accountId={accountId || ""}
                  changeAccount={(id, account) => {
                    changeCurAccount(id, account);
                  }}
                />
              )}
              <FormItem
                optionTitle={t("resource:group.comp.groupName")}
                optionDesc={t("resource:group.comp.groupNameDesc")}
                errorText={
                  showNameEmptyError
                    ? t("resource:group.comp.groupNameError")
                    : ""
                }
              >
                <TextInput
                  className="m-w-75p"
                  value={defaultStr(instanceGroup?.groupName)}
                  onChange={(event) => {
                    changeGroupName(event.target.value);
                  }}
                  placeholder="log-example-group"
                />
              </FormItem>
              <FormItem
                optionTitle={t("resource:group.comp.instanceGroupType")}
                optionDesc={t("resource:group.comp.instanceGroupTypeDesc")}
              >
                <SelectType
                  groupType={instanceGroup?.groupType}
                  changeGroupType={(type) => {
                    changeGroupType(type);
                  }}
                />
              </FormItem>
            </>
          </HeaderPanel>
          <div style={{ height: 1, borderBottom: "1px solid #ccc" }}></div>

          <div className="mt-20">
            <>
              {instanceGroup?.groupType === LogSourceType.EC2 && (
                <InstanceTable
                  description={t("resource:group.comp.instances.titleDesc")}
                  platform={platform}
                  accountId={accountId}
                  changeInstanceSet={(sets) => {
                    changeInstanceSet(sets);
                  }}
                  setCreateDisabled={(disable) => {
                    setInstanceIsLoading(disable);
                    setCreateDisabled(disable);
                  }}
                  changePlatform={(pf) => {
                    changePlatform?.(pf);
                  }}
                />
              )}
              {instanceGroup?.groupType === EC2GroupType.ASG && (
                <HeaderPanel
                  title={t("resource:group.comp.instances.title")}
                  contentNoPadding
                >
                  <ASGSelect
                    accountId={accountId}
                    instanceGroupInfo={instanceGroup}
                    changeASG={(asg) => {
                      changeASG(asg);
                    }}
                    platform={platform}
                    changePlatform={(pf) => {
                      changePlatform?.(pf);
                    }}
                  />
                </HeaderPanel>
              )}
            </>
          </div>
        </div>
      </PagePanel>
    </div>
  );
};

export default InstanceGroupComp;
