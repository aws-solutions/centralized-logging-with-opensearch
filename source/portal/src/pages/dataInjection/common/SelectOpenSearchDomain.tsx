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

import {
  DomainDetails,
  DomainStatusCheckResponse,
  DomainStatusCheckType,
  ImportedDomain,
} from "API";
import { PIPELINE_TASK_ES_USER_DEFAULT } from "assets/js/const";
import { appSyncRequestQuery } from "assets/js/request";
import ExtLink from "components/ExtLink";
import FormItem from "components/FormItem";
import Select, { SelectItem } from "components/Select/select";
import {
  domainStatusCheck,
  getDomainDetails,
  listImportedDomains,
} from "graphql/queries";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface SelectOpenSearchDomainProps {
  changeLoadingDomain: (loading: boolean) => void;
  changeOpenSearchDomain: (domain: DomainDetails) => void;
  openSearchCluster: string;
  esDomainEmptyError: boolean;
  changeOSDomainCheckStatus: (status: DomainStatusCheckResponse) => void;
}

const SelectOpenSearchDomain: React.FC<SelectOpenSearchDomainProps> = (
  props: SelectOpenSearchDomainProps
) => {
  const { t } = useTranslation();
  const {
    openSearchCluster,
    esDomainEmptyError,
    changeOpenSearchDomain,
    changeLoadingDomain,
    changeOSDomainCheckStatus,
  } = props;
  const [loadingDomain, setLoadingDomain] = useState(false);
  const [currentDomain, setCurrentDomain] = useState(openSearchCluster);
  const [domainOptionList, setDomainOptionList] = useState<SelectItem[]>([]);
  const [domainCheckRes, setDomainCheckRes] =
    useState<DomainStatusCheckResponse>();

  const getImportedESDomainList = async () => {
    try {
      setLoadingDomain(true);
      changeLoadingDomain(true);
      const resData: any = await appSyncRequestQuery(listImportedDomains);
      const dataDomains: ImportedDomain[] = resData.data.listImportedDomains;
      const tmpDomainList: SelectItem[] = [];
      const userDefaultES: string =
        localStorage.getItem(PIPELINE_TASK_ES_USER_DEFAULT) || "";
      const tmpESIdList: string[] = [];
      dataDomains.forEach((element) => {
        tmpESIdList.push(element.id);
        tmpDomainList.push({
          name: element.domainName,
          value: element.id,
        });
      });
      setDomainOptionList(tmpDomainList);
      // select user default cluster when multiple es
      if (tmpESIdList.includes(userDefaultES)) {
        setCurrentDomain(userDefaultES);
      } else {
        // select the only one es item
        if (tmpDomainList.length === 1) {
          setCurrentDomain(tmpDomainList[0].value);
        }
      }
      setLoadingDomain(false);
      changeLoadingDomain(false);
    } catch (error) {
      console.error(error);
      changeLoadingDomain(false);
    }
  };

  const esSelectChanged = async (cluster: string) => {
    console.info("cluster:", cluster);
    setDomainCheckRes(undefined);
    setLoadingDomain(true);
    changeLoadingDomain(true);
    const resData: any = await appSyncRequestQuery(getDomainDetails, {
      id: cluster,
    });
    const dataDomain: DomainDetails = resData.data.getDomainDetails;
    changeOpenSearchDomain(dataDomain);
    // Check the AOS domain status during the pipeline task creation
    // Currently front-end only use the response.status
    try {
      const domainCheckResData: any = await appSyncRequestQuery(
        domainStatusCheck,
        {
          domainName: dataDomain.domainName,
        }
      );
      const domainCheckRes: DomainStatusCheckResponse =
        domainCheckResData.data.domainStatusCheck;
      changeOSDomainCheckStatus(domainCheckRes);
      setDomainCheckRes(domainCheckRes);
      setLoadingDomain(false);
      changeLoadingDomain(false);
    } catch (error) {
      setLoadingDomain(false);
      changeLoadingDomain(false);
      console.error(error);
    }
  };

  useEffect(() => {
    if (currentDomain) {
      esSelectChanged(currentDomain);
      localStorage.setItem(PIPELINE_TASK_ES_USER_DEFAULT, currentDomain);
    }
  }, [currentDomain]);

  useEffect(() => {
    getImportedESDomainList();
  }, []);

  return (
    <FormItem
      optionTitle={t("applog:create.specifyOS.aosDomain")}
      optionDesc={
        <div>
          {t("applog:create.specifyOS.aosDomainDesc1")}
          <ExtLink to="/clusters/import-opensearch-cluster">
            {t("applog:create.specifyOS.aosDomainDesc2")}
          </ExtLink>
          {t("applog:create.specifyOS.aosDomainDesc3")}
        </div>
      }
      errorText={
        (esDomainEmptyError
          ? t("applog:create.specifyOS.aosDomainError")
          : "") ||
        (domainCheckRes?.status === DomainStatusCheckType.FAILED
          ? `${t("cluster:check.dueTo")} ${domainCheckRes?.details
              ?.filter((item) => item?.status === "FAILED")
              .map((item) => t(`cluster:check.failed.${item?.errorCode}`))} ${t(
              "cluster:check.chooseAnother"
            )}`
          : "")
      }
    >
      <Select
        placeholder={t("applog:create.specifyOS.selectDomain")}
        className="m-w-75p"
        loading={loadingDomain}
        optionList={domainOptionList}
        value={currentDomain}
        onChange={(event) => {
          setCurrentDomain(event.target.value);
        }}
        hasRefresh
        clickRefresh={() => {
          getImportedESDomainList();
        }}
      />
    </FormItem>
  );
};

export default SelectOpenSearchDomain;
