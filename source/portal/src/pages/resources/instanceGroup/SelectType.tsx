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
import { EC2GroupType } from "API";
import { defaultStr } from "assets/js/utils";
import Tiles from "components/Tiles";
import React from "react";
import { useTranslation } from "react-i18next";

interface SelectTypeProps {
  groupType: string | undefined;
  changeGroupType: (type: string) => void;
}

const SelectType: React.FC<SelectTypeProps> = (props: SelectTypeProps) => {
  const { groupType, changeGroupType } = props;
  const { t } = useTranslation();
  return (
    <div className="instance-group-select">
      <Tiles
        value={defaultStr(groupType)}
        onChange={(event) => {
          changeGroupType(event.target.value);
        }}
        items={[
          {
            label: t("resource:group.manual"),
            description: t("resource:group.manualsDesc"),
            value: EC2GroupType.EC2,
          },
          {
            label: t("resource:group.asg"),
            description: t("resource:group.asgDesc"),
            value: EC2GroupType.ASG,
          },
        ]}
      />
    </div>
  );
};

export default SelectType;
