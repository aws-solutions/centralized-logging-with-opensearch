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
import ExtLink from "components/ExtLink";
import { appSyncRequestQuery } from "assets/js/request";
import { listDomainNames } from "graphql/queries";
import Select from "components/Select";
import { SelectItem } from "components/Select/select";
import { ImportedDomainType } from "../ImportCluster";
import { DOCS_LINK_CREATE_ES } from "assets/js/const";
import { useTranslation } from "react-i18next";

interface SelectDomainProps {
  importedCluster: ImportedDomainType;
  changeDomain: (domain: string) => void;
  disableSelect?: boolean;
  emptyError?: boolean;
  clearEmptyError?: () => void;
}

const SelectDomain: React.FC<SelectDomainProps> = (
  props: SelectDomainProps
) => {
  const {
    importedCluster,
    changeDomain,
    emptyError,
    clearEmptyError,
    disableSelect,
  } = props;
  const { t } = useTranslation();
  const [domain, setDomain] = useState(importedCluster.domainName);
  const [loadingDomain, setLoadingDomain] = useState(false);
  const [domainOptionList, setDomainOptionList] = useState<SelectItem[]>([]);

  const getESDomainList = async () => {
    try {
      setLoadingDomain(true);
      const resData: any = await appSyncRequestQuery(listDomainNames);
      console.info("domainNames:", resData.data?.listDomainNames?.domainNames);
      const dataDomainList: string[] =
        resData.data?.listDomainNames?.domainNames;
      setLoadingDomain(false);
      const tmpDomainOptionList: SelectItem[] = [];
      dataDomainList.forEach((element) => {
        tmpDomainOptionList.push({
          name: element,
          value: element,
        });
      });
      setDomainOptionList(tmpDomainOptionList);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getESDomainList();
  }, []);

  return (
    <div>
      <HeaderPanel title={t("cluster:import.selectDomain.osDomain")}>
        <div>
          <FormItem
            optionTitle={t("cluster:import.selectDomain.domain")}
            optionDesc={
              <div>
                {t("cluster:import.selectDomain.domainDesc1")}
                <ExtLink to={DOCS_LINK_CREATE_ES}>
                  {t("cluster:import.selectDomain.domainDesc2")}
                </ExtLink>
                {t("cluster:import.selectDomain.domainDesc3")}
              </div>
            }
            errorText={
              emptyError ? t("cluster:import.selectDomain.domainError") : ""
            }
          >
            <Select
              disabled={disableSelect}
              className="m-w-75p"
              placeholder={t("cluster:import.selectDomain.selectDomain")}
              loading={loadingDomain}
              optionList={domainOptionList}
              value={domain}
              onChange={(event) => {
                console.info(event);
                clearEmptyError && clearEmptyError();
                setDomain(event.target.value);
                changeDomain(event.target.value);
              }}
              hasRefresh
              clickRefresh={() => {
                getESDomainList();
              }}
            />
          </FormItem>
        </div>
      </HeaderPanel>
    </div>
  );
};

export default SelectDomain;
