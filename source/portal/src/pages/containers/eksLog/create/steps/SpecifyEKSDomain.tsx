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
import { ImportedDomain } from "API";
import {
  DOC_VPC_ACCEPT_LINK,
  DOC_VPC_ROUTE_TABLE_LINK,
  DOC_VPC_SECURITY_GROUP_LINK,
  PIPELINE_TASK_ES_USER_DEFAULT,
} from "assets/js/const";
import { appSyncRequestQuery } from "assets/js/request";
import Alert from "components/Alert";
import ExtLink from "components/ExtLink";
import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import Select, { SelectItem } from "components/Select/select";
import { listImportedDomains } from "graphql/queries";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { EKSClusterLogSourceType } from "../ImportEksCluster";

interface SpecifyDomainProps {
  eksClusterLogSource: EKSClusterLogSourceType;
  changeOpenSearchCluster: (clusterId: string | undefined) => void;
  changeLoadingDomain: (loading: boolean) => void;
  esDomainEmptyError: boolean;
  changeConfirmNetwork: (comfirm: boolean) => void;
  confirmNetworkError: boolean;
  userIsConfirm: boolean;
}

const SpecifyEKSDomain: React.FC<SpecifyDomainProps> = (
  props: SpecifyDomainProps
) => {
  const {
    eksClusterLogSource,
    changeOpenSearchCluster,
    changeLoadingDomain,
    esDomainEmptyError,
    changeConfirmNetwork,
    confirmNetworkError,
    userIsConfirm,
  } = props;

  const { t } = useTranslation();
  const [loadingDomain, setLoadingDomain] = useState(false);
  const [openSearchCluster, setOpenSearchCuster] = useState(
    eksClusterLogSource.aosDomainId
  );
  const [domainOptionList, setDomainOptionList] = useState<SelectItem[]>([]);

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
        setOpenSearchCuster(userDefaultES);
      } else {
        // select the only one es item
        if (tmpDomainList.length === 1) {
          setOpenSearchCuster(tmpDomainList[0].value);
        }
      }
      setLoadingDomain(false);
      changeLoadingDomain(false);
    } catch (error) {
      console.error(error);
      changeLoadingDomain(false);
    }
  };

  useEffect(() => {
    getImportedESDomainList();
  }, []);

  const esSelectChanged = (clusterId: string) => {
    changeOpenSearchCluster(clusterId);
  };

  useEffect(() => {
    console.info("openSearchCluster:", openSearchCluster);
    if (openSearchCluster) {
      esSelectChanged(openSearchCluster);
      localStorage.setItem(PIPELINE_TASK_ES_USER_DEFAULT, openSearchCluster);
    }
  }, [openSearchCluster]);

  return (
    <div>
      <HeaderPanel title={t("applog:create.specifyOS.aosDomain")}>
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
            esDomainEmptyError
              ? t("applog:create.specifyOS.aosDomainError")
              : ""
          }
        >
          <Select
            placeholder={t("applog:create.specifyOS.selectDomain")}
            className="m-w-75p"
            loading={loadingDomain}
            optionList={domainOptionList}
            value={openSearchCluster}
            onChange={(event) => {
              setOpenSearchCuster(event.target.value);
            }}
            hasRefresh
            clickRefresh={() => {
              getImportedESDomainList();
            }}
          />
        </FormItem>
      </HeaderPanel>
      <HeaderPanel title={t("ekslog:create.eksSource.networkConfig")}>
        <Alert content={t("ekslog:create.eksSource.networkConfigDesc")} />
        <div className="config-list">
          <div className="list-item">
            {t("ekslog:create.eksSource.vpc1")}
            <ExtLink to={DOC_VPC_ACCEPT_LINK}>
              {t("ekslog:create.eksSource.guide")}
            </ExtLink>
          </div>
          <div className="list-item">
            {t("ekslog:create.eksSource.vpc2")}
            <ExtLink to={DOC_VPC_ROUTE_TABLE_LINK}>
              {t("ekslog:create.eksSource.guide")}
            </ExtLink>
          </div>
          <div className="list-item">
            {t("ekslog:create.eksSource.vpc3")}
            <ExtLink to={DOC_VPC_SECURITY_GROUP_LINK}>
              {t("ekslog:create.eksSource.guide")}
            </ExtLink>
          </div>
          <FormItem
            optionTitle=""
            optionDesc=""
            errorText={
              confirmNetworkError
                ? t("ekslog:create.eksSource.acknowledge")
                : ""
            }
          >
            <div className="list-item">
              <label className="label">
                <input
                  checked={userIsConfirm}
                  type="checkbox"
                  onChange={(e) => {
                    changeConfirmNetwork(e.target.checked);
                  }}
                />
                <b>{t("ekslog:create.eksSource.confirmed")}</b>
              </label>
            </div>
          </FormItem>
        </div>
      </HeaderPanel>
    </div>
  );
};

export default SpecifyEKSDomain;
