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
import React, { useEffect, useState } from "react";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import { useTranslation } from "react-i18next";
import { SelectItem } from "components/Select/select";

import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import AutoComplete from "components/AutoComplete";
import { OptionType } from "components/AutoComplete/autoComplete";
import { IngestionFromEKSPropsType } from "../CreateEKS";
import { Link } from "react-router-dom";
import {
  LogSource,
  LogSourceType,
  Resource,
  ResourceType,
  SubAccountLink,
} from "API";
import { appSyncRequestQuery } from "assets/js/request";
import {
  listLogSources,
  listResources,
  listSubAccountLinks,
} from "graphql/queries";
import { StatusType } from "components/Status/Status";

interface IngestSettingProps {
  ingestionInfo: IngestionFromEKSPropsType;
  eksRequireError: boolean;
  changeEKSObject: (eks: SelectItem | null) => void;
  changeCurAccount: (id: string, accountInfo: SubAccountLink | null) => void;
}

const PAGE_SIZE = 999;

const buildStatus = (existsEKSList: string[], curEKSName?: string | null) => {
  return existsEKSList.includes(curEKSName ?? "") ? "" : StatusType.Deleted;
};

const StepChooseEKSSource: React.FC<IngestSettingProps> = (
  props: IngestSettingProps
) => {
  const { ingestionInfo, eksRequireError, changeEKSObject, changeCurAccount } =
    props;

  const { t } = useTranslation();

  const [loadingEKSList, setLoadingEKSList] = useState(false);
  const [eksOptionList, setEKSOptionList] = useState<SelectItem[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(true);

  const buildSubAccountOptionList = (
    accountId: string,
    dataList: LogSource[],
    existEKSList: string[]
  ) => {
    const tmpOptionList: SelectItem[] = [];
    dataList.forEach((element) => {
      if (accountId === element.accountId) {
        tmpOptionList.push({
          description: element.eks?.deploymentKind ?? "",
          name: `${element.eks?.eksClusterName}`,
          id: element.sourceId,
          value: element.accountId || "",
          status: buildStatus(existEKSList, element.eks?.eksClusterName),
        });
      }
    });
    return tmpOptionList;
  };

  const buildCurrentAccountOptionList = (
    tmpAccountList: OptionType[],
    dataList: LogSource[],
    existEKSList: string[]
  ) => {
    const tmpOptionList: SelectItem[] = [];
    const accountIdList = tmpAccountList.map((element) => element.value);
    if (accountIdList.length > 0) {
      dataList.forEach((element) => {
        if (!accountIdList.includes(element?.accountId || "")) {
          tmpOptionList.push({
            description: element.eks?.deploymentKind ?? "",
            name: `${element.eks?.eksClusterName}`,
            id: element.sourceId,
            value: element.accountId || "",
            status: buildStatus(existEKSList, element.eks?.eksClusterName),
          });
        }
      });
    } else {
      // Account Id is empty and sub account list is empty, set all account to current account
      dataList.forEach((element) => {
        tmpOptionList.push({
          description: element.eks?.deploymentKind ?? "",
          name: `${element.eks?.eksClusterName}`,
          id: element.sourceId,
          value: element.accountId || "",
          status: buildStatus(existEKSList, element.eks?.eksClusterName),
        });
      });
    }
    return tmpOptionList;
  };

  const getAccountAndEKSList = async (accountId: string) => {
    try {
      setEKSOptionList([]);
      setLoadingEKSList(true);
      // Get Account Lit
      const tmpAccountList: OptionType[] = [];
      const resAccountData: any = await appSyncRequestQuery(
        listSubAccountLinks,
        {
          page: 1,
          count: PAGE_SIZE,
        }
      );
      const dataLogAccountList: SubAccountLink[] =
        resAccountData.data.listSubAccountLinks?.subAccountLinks || [];

      dataLogAccountList.forEach((element) => {
        if (element.subAccountId) {
          tmpAccountList.push({
            description: element.id || "",
            value: element.subAccountId || "",
            name: `${element.subAccountName}(${element.subAccountId})`,
          });
        }
      });
      // List Log Sources
      const resData: any = await appSyncRequestQuery(listLogSources, {
        type: LogSourceType.EKSCluster,
        page: 1,
        count: PAGE_SIZE,
      });
      const dataList: LogSource[] = resData.data.listLogSources.logSources;
      let tmpOptionList: SelectItem[] = [];

      // List Account EKS
      const resEKSResource: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.EKSCluster,
        accountId: accountId,
      });
      const eskResourceList: Resource[] = resEKSResource.data.listResources;
      const existEKSResourceList = eskResourceList.map((element) => element.id);

      if (accountId && tmpAccountList.length > 0) {
        // if account has value and account list is not empty, need to filter the eks list
        tmpOptionList = buildSubAccountOptionList(
          accountId,
          dataList,
          existEKSResourceList
        );
      } else {
        // Account Id is empty means the user select the current account
        tmpOptionList = buildCurrentAccountOptionList(
          tmpAccountList,
          dataList,
          existEKSResourceList
        );
      }
      setEKSOptionList(tmpOptionList);
      setLoadingEKSList(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getAccountAndEKSList(ingestionInfo.accountId);
  }, [ingestionInfo.accountId]);

  return (
    <div>
      <HeaderPanel title={t("applog:logSourceDesc.eks.step1.settings")}>
        <CrossAccountSelect
          className="m-w-75p"
          disabled={loadingEKSList}
          accountId={ingestionInfo.accountId}
          changeAccount={(id, accountInfo) => {
            changeEKSObject(null);
            changeCurAccount(id, accountInfo);
          }}
          loadingAccount={(loading) => {
            setLoadingAccount(loading);
          }}
        />
      </HeaderPanel>

      <HeaderPanel title={t("applog:logSourceDesc.eks.step1.cluster")}>
        <FormItem
          optionTitle={t("applog:ingestion.eks.specifySource.eksTitle")}
          optionDesc={
            <div>
              {t("applog:ingestion.eks.specifySource.eksDesc1")}
              <Link to="/containers/eks-log/create">
                {t("applog:ingestion.eks.specifySource.eksDesc2")}
              </Link>{" "}
              {t("applog:ingestion.eks.specifySource.eksDesc3")}
            </div>
          }
          errorText={
            eksRequireError
              ? t("applog:ingestion.eks.specifySource.selectEKS")
              : ""
          }
        >
          <div>
            <div className="pb-50">
              <AutoComplete
                hasStatus
                outerLoading
                disabled={loadingEKSList || loadingAccount}
                className="m-w-75p"
                placeholder={t("applog:ingestion.eks.specifySource.chooseEKS")}
                loading={loadingEKSList || loadingAccount}
                optionList={eksOptionList}
                value={ingestionInfo.eksObject}
                onChange={(
                  event: React.ChangeEvent<HTMLInputElement>,
                  data
                ) => {
                  changeEKSObject(data);
                }}
              />
            </div>
          </div>
        </FormItem>
      </HeaderPanel>
    </div>
  );
};

export default StepChooseEKSSource;
