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
import ExtLink from "components/ExtLink";
import FormItem from "components/FormItem";
import Select from "components/Select";
import { useTranslation } from "react-i18next";
import { appSyncRequestQuery } from "assets/js/request";
import { listSubAccountLinks } from "graphql/queries";
import { SubAccountLink } from "API";
import { OptionType } from "components/AutoComplete/autoComplete";

interface CrossAccountSelectProps {
  accountId: string;
  changeAccount: (id: string, accountInfo: SubAccountLink | null) => void;
  loadingAccount?: (loading: boolean) => void;
  className?: string;
  disabled?: boolean;
}

const PAGE_SIZE = 999;

const CrossAccountSelect: React.FC<CrossAccountSelectProps> = (
  props: CrossAccountSelectProps
) => {
  const { accountId, className, changeAccount, loadingAccount, disabled } =
    props;
  const [subAccountList, setSubAccountList] = useState<SubAccountLink[]>([]);
  const { t } = useTranslation();
  const [loadingData, setLoadingData] = useState(false);
  const [accountOptionList, setAccountOptionList] = useState<OptionType[]>([]);

  // Get Member Account List
  const getCrossAccountList = async () => {
    try {
      setLoadingData(true);
      loadingAccount && loadingAccount(true);
      const resData: any = await appSyncRequestQuery(listSubAccountLinks, {
        page: 1,
        count: PAGE_SIZE,
      });
      console.info("resData:", resData);
      const dataLogAccountList: SubAccountLink[] =
        resData.data.listSubAccountLinks?.subAccountLinks || [];
      setSubAccountList(dataLogAccountList);
      const tmpList: OptionType[] = [
        {
          name: t("resource:crossAccount.currentAccount"),
          value: "",
        },
      ];
      dataLogAccountList.forEach((element) => {
        if (element.subAccountId) {
          tmpList.push({
            description: element.id || "",
            value: element.subAccountId || "",
            name: `${element.subAccountName}(${element.subAccountId})`,
          });
        }
      });
      setAccountOptionList(tmpList);
      setLoadingData(false);
      loadingAccount && loadingAccount(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getCrossAccountList();
  }, []);

  return (
    <>
      <FormItem
        optionTitle={t("resource:crossAccount.account")}
        optionDesc={
          <div>
            {t("resource:crossAccount.selectDesc1")}
            <ExtLink to="/resources/cross-account">
              {t("resource:crossAccount.linkAccount")}
            </ExtLink>
          </div>
        }
      >
        <Select
          allowEmpty
          disabled={disabled}
          className={className ? className : "m-w-75p"}
          loading={loadingData}
          optionList={accountOptionList}
          value={accountId}
          onChange={(event) => {
            console.info("event:", event);
            changeAccount(
              event.target.value,
              subAccountList.find(
                (element) => element.subAccountId === event.target.value
              ) || null
            );
          }}
          placeholder=""
          hasRefresh
          clickRefresh={() => {
            getCrossAccountList();
          }}
        />
      </FormItem>
    </>
  );
};

export default CrossAccountSelect;
