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

import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import AutoComplete from "components/AutoComplete";
import FormItem from "components/FormItem";
import { appSyncRequestQuery } from "assets/js/request";
import { Resource, ResourceType } from "API";
import { SelectItem } from "components/Select/select";
import { listResources } from "graphql/queries";
import { OptionType } from "components/AutoComplete/autoComplete";
import { CloudTrailTaskProps } from "../CreateCloudTrail";
import ExtLink from "components/ExtLink";
import { buildTrailLink } from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import SourceType from "./comp/SourceType";
import { RootState } from "reducer/reducers";

interface SpecifySettingsProps {
  cloudTrailTask: CloudTrailTaskProps;
  changeCloudTrailObj: (trail: OptionType | null) => void;
  changeBucket: (bucket: string) => void;
  changeLogPath: (logPath: string) => void;
  trailEmptyError: boolean;
  setISChanging: (changing: boolean) => void;
  changeCrossAccount: (id: string) => void;
  changeSourceType: (type: string) => void;
  changeTmpFlowList: (list: SelectItem[]) => void;
  changeS3SourceType: (type: string) => void;
  changeSuccessTextType: (type: string) => void;
  changeLogSource: (source: string) => void;
  sourceTypeEmptyError?: boolean;
  shardNumError: boolean;
  maxShardNumError: boolean;
  changeMinCapacity: (num: string) => void;
  changeEnableAS: (enable: string) => void;
  changeMaxCapacity: (num: string) => void;
}

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const {
    cloudTrailTask,
    changeCloudTrailObj,
    changeBucket,
    changeLogPath,
    trailEmptyError,
    setISChanging,
    changeCrossAccount,
    changeSourceType,
    changeTmpFlowList,
    changeS3SourceType,
    changeSuccessTextType,
    changeLogSource,
    sourceTypeEmptyError,
    shardNumError,
    maxShardNumError,
    changeMinCapacity,
    changeEnableAS,
    changeMaxCapacity,
  } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const [cloudTrailOptionList, setCloudTrailOptionList] = useState<
    SelectItem[]
  >([]);
  const [loadingCloudTrail, setLoadingCloudTrail] = useState(false);
  const [disableTrail, setDisableTrail] = useState(false);

  const getCloudTrailList = async (accountId: string) => {
    try {
      setCloudTrailOptionList([]);
      setLoadingCloudTrail(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.Trail,
        accountId: accountId,
      });
      console.info("domainNames:", resData.data);
      const dataList: Resource[] = resData.data.listResources;
      const tmpOptionList: SelectItem[] = [];
      dataList.forEach((element) => {
        tmpOptionList.push({
          name: `${element.name}`,
          value: element.id,
        });
      });
      setCloudTrailOptionList(tmpOptionList);
      setLoadingCloudTrail(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getCloudTrailList(cloudTrailTask.logSourceAccountId);
  }, [cloudTrailTask.logSourceAccountId]);

  return (
    <div>
      <PagePanel title={t("servicelog:create.step.specifySetting")}>
        <div>
          <HeaderPanel title={t("servicelog:create.service.trail")}>
            <div>
              <div className="pb-50">
                <CrossAccountSelect
                  disabled={loadingCloudTrail}
                  accountId={cloudTrailTask.logSourceAccountId}
                  changeAccount={(id) => {
                    changeCrossAccount(id);
                    changeCloudTrailObj(null);
                  }}
                  loadingAccount={(loading) => {
                    setDisableTrail(loading);
                  }}
                />
                <FormItem
                  optionTitle={t("servicelog:trail.trail")}
                  optionDesc={
                    <div>
                      {t("servicelog:trail.select")}
                      <ExtLink
                        to={buildTrailLink(amplifyConfig.aws_project_region)}
                      >
                        {t("servicelog:trail.curAccount")}
                      </ExtLink>
                      .
                    </div>
                  }
                  errorText={
                    trailEmptyError ? t("servicelog:trail.trailError") : ""
                  }
                >
                  <AutoComplete
                    outerLoading
                    disabled={disableTrail}
                    className="m-w-75p"
                    placeholder={t("servicelog:trail.selectTrail")}
                    loading={loadingCloudTrail}
                    optionList={cloudTrailOptionList}
                    value={cloudTrailTask.params.curTrailObj}
                    onChange={(
                      event: React.ChangeEvent<HTMLInputElement>,
                      data
                    ) => {
                      changeCloudTrailObj(data);
                    }}
                  />
                </FormItem>

                <SourceType
                  cloudTrailTask={cloudTrailTask}
                  sourceTypeEmptyError={sourceTypeEmptyError}
                  shardNumError={shardNumError}
                  maxShardNumError={maxShardNumError}
                  changeSourceType={(type) => {
                    changeSourceType(type);
                  }}
                  changeBucket={(bucket) => {
                    changeBucket(bucket);
                  }}
                  changeLogPath={(path) => {
                    changeLogPath(path);
                  }}
                  setISChanging={(changing) => {
                    setISChanging(changing);
                    setDisableTrail(changing);
                  }}
                  changeTmpFlowList={(list) => {
                    changeTmpFlowList(list);
                  }}
                  changeS3SourceType={(type) => {
                    changeS3SourceType(type);
                  }}
                  changeSuccessTextType={(type) => {
                    changeSuccessTextType(type);
                  }}
                  changeLogSource={(source) => {
                    changeLogSource(source);
                  }}
                  changeMinCapacity={(num) => {
                    changeMinCapacity(num);
                  }}
                  changeEnableAS={(enable) => {
                    changeEnableAS(enable);
                  }}
                  changeMaxCapacity={(num) => {
                    changeMaxCapacity(num);
                  }}
                />
              </div>
            </div>
          </HeaderPanel>
        </div>
      </PagePanel>
    </div>
  );
};

export default SpecifySettings;
