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
import React, { useState, useEffect } from "react";
import AutoComplete from "components/AutoComplete";
import FormItem from "components/FormItem";
import { SelectItem } from "components/Select/select";
import { listResources } from "graphql/queries";
import { appSyncRequestQuery } from "assets/js/request";
import { Resource, ResourceType } from "API";
import { OptionType } from "components/AutoComplete/autoComplete";
import { InstanceGroupType } from "../instanceGroup/create/CreateInstanceGroup";
import { useTranslation } from "react-i18next";

interface ASGSelectProps {
  accountId: string;
  instanceGroupInfo: InstanceGroupType | undefined;
  changeASG: (asg: OptionType | null) => void;
}

const ASGSelect: React.FC<ASGSelectProps> = (props: ASGSelectProps) => {
  const { instanceGroupInfo, accountId, changeASG } = props;
  const { t } = useTranslation();
  const [loadingASGList, setLoadingASGList] = useState(false);
  const [asgOptionList, setASGOptionList] = useState<SelectItem[]>([]);
  const getASGList = async () => {
    try {
      setLoadingASGList(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        // type: ResourceType.S3Bucket,
        type: ResourceType.ASG,
        accountId: accountId,
      });
      console.info("asgData:", resData.data);
      const dataList: Resource[] = resData.data.listResources;
      const tmpOptionList: SelectItem[] = [];
      dataList.forEach((element) => {
        tmpOptionList.push({
          name: `${element.name}`,
          value: element.name || "",
        });
      });
      setASGOptionList(tmpOptionList);
      setLoadingASGList(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    changeASG(null);
    getASGList();
  }, [accountId]);

  return (
    <div className="pd-20">
      <FormItem
        optionTitle={t("resource:group.create.asg.name")}
        optionDesc={t("resource:group.create.asg.desc")}
      >
        <AutoComplete
          outerLoading
          disabled={loadingASGList}
          className="m-w-75p"
          placeholder={t("resource:group.create.asg.selectASG")}
          loading={loadingASGList}
          optionList={asgOptionList}
          value={instanceGroupInfo?.asgObj || null}
          onChange={(event: React.ChangeEvent<HTMLInputElement>, data) => {
            changeASG(data);
          }}
        />
      </FormItem>
    </div>
  );
};

export default ASGSelect;
