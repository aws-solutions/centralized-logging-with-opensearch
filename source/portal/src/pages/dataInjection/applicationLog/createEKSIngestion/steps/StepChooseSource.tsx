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
import { IngestionFromEKSPropsType } from "../CreateEKSIngestion";
import { useTranslation } from "react-i18next";
import AutoComplete from "components/AutoComplete";
import { SelectItem } from "components/Select/select";
import { appSyncRequestQuery } from "assets/js/request";
import { EKSClusterLogSource, SubAccountLink } from "API";
import { listImportedEKSClusters, listSubAccountLinks } from "graphql/queries";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import { Link } from "react-router-dom";
import { OptionType } from "components/AutoComplete/autoComplete";

interface IngestSettingProps {
  ingestionInfo: IngestionFromEKSPropsType;
  eksRequireError: boolean;
  changeEKSObject: (eks: SelectItem | null) => void;
  changeCurAccount: (id: string, accountInfo: SubAccountLink | null) => void;
}

const PAGE_SIZE = 999;

const StepChooseSource: React.FC<IngestSettingProps> = (
  props: IngestSettingProps
) => {
  const { ingestionInfo, eksRequireError, changeEKSObject, changeCurAccount } =
    props;

  const { t } = useTranslation();
  const [loadingEKSList, setLoadingEKSList] = useState(false);
  const [eksOptionList, setEKSOptionList] = useState<SelectItem[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(true);

  const getAccountAndEKSList = async (accountId: string) => {
    try {
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
      console.info("resAccountData:", resAccountData);
      const dataLogAccountList: SubAccountLink[] =
        resAccountData.data.listSubAccountLinks?.subAccountLinks || [];

      dataLogAccountList.forEach((element) => {
        if (element.subAccountId) {
          tmpAccountList.push({
            description: element.id,
            value: element.subAccountId || "",
            name: `${element.subAccountName}(${element.subAccountId})`,
          });
        }
      });

      const resData: any = await appSyncRequestQuery(listImportedEKSClusters, {
        page: 1,
        count: PAGE_SIZE,
      });
      console.info("domainNames:", resData.data);
      const dataList: EKSClusterLogSource[] =
        resData.data.listImportedEKSClusters.eksClusterLogSourceList;
      const tmpOptionList: SelectItem[] = [];

      if (accountId && tmpAccountList.length > 0) {
        // if account has value and account list is not empty, need to filter the eks list
        dataList.forEach((element) => {
          if (accountId === element.accountId) {
            tmpOptionList.push({
              name: `${element.eksClusterName}`,
              value: element.id || "",
            });
          }
        });
      } else {
        // Account Id is empty means the user select the current account
        const accountIdList = tmpAccountList.map((element) => element.value);
        if (accountIdList.length > 0) {
          dataList.forEach((element) => {
            if (!accountIdList.includes(element?.accountId || "")) {
              tmpOptionList.push({
                name: `${element.eksClusterName}`,
                value: element.id || "",
              });
            }
          });
        } else {
          // Account Id is empty and sub account list is empty, set all account to current account
          dataList.forEach((element) => {
            tmpOptionList.push({
              name: `${element.eksClusterName}`,
              value: element.id || "",
            });
          });
        }
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
      <HeaderPanel title={t("resource:crossAccount.accountSettings")}>
        <CrossAccountSelect
          className="m-w-75p"
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
      <HeaderPanel title={t("applog:ingestion.eks.ingestFromEKS")}>
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
          <AutoComplete
            outerLoading
            disabled={loadingEKSList || loadingAccount}
            className="m-w-75p"
            placeholder={t("applog:ingestion.eks.specifySource.chooseEKS")}
            loading={loadingEKSList || loadingAccount}
            optionList={eksOptionList}
            value={ingestionInfo.eksObject}
            onChange={(event: React.ChangeEvent<HTMLInputElement>, data) => {
              changeEKSObject(data);
            }}
          />
        </FormItem>
      </HeaderPanel>
    </div>
  );
};

export default StepChooseSource;
