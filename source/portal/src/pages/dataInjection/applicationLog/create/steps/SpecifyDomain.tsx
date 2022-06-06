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
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import ExtLink from "components/ExtLink";
import { appSyncRequestQuery } from "assets/js/request";
import { getDomainDetails, listImportedDomains } from "graphql/queries";
import { SelectItem } from "components/Select/select";
import { DomainDetails, ImportedDomain } from "API";
import Select from "components/Select";
import { ApplicationLogType } from "../CreatePipeline";

import {
  ENABLE_CLODSTATE,
  ENABLE_ULTRAWARM,
  PIPELINE_TASK_ES_USER_DEFAULT,
  REPLICA_COUNT_LIST,
} from "assets/js/const";
import { InfoBarTypes } from "reducer/appReducer";
import { useTranslation } from "react-i18next";

interface SpecifyOpenSearchClusterProps {
  applicationLog: ApplicationLogType;
  changeOpenSearchCluster: (domain: DomainDetails | undefined) => void;
  changeWarnLogTransition: (value: string) => void;
  changeColdLogTransition: (value: string) => void;
  changeLogRetention: (value: string) => void;
  changeLoadingDomain: (loading: boolean) => void;
  changeShards: (shards: string) => void;
  changeReplicas: (replica: string) => void;
  esDomainEmptyError: boolean;
  warmLogInvalidError?: boolean;
  coldLogInvalidError?: boolean;
  logRetentionInvalidError?: boolean;
  shardsInvalidError?: boolean;
}

const SpecifyOpenSearchCluster: React.FC<SpecifyOpenSearchClusterProps> = (
  props: SpecifyOpenSearchClusterProps
) => {
  const {
    applicationLog,
    changeOpenSearchCluster,
    changeWarnLogTransition,
    changeColdLogTransition,
    changeLogRetention,
    changeLoadingDomain,
    changeShards,
    changeReplicas,
    esDomainEmptyError,
    warmLogInvalidError,
    coldLogInvalidError,
    logRetentionInvalidError,
    shardsInvalidError,
  } = props;
  const { t } = useTranslation();
  const [loadingDomain, setLoadingDomain] = useState(false);
  const [openSearchCluster, setOpenSearchCuster] = useState(
    applicationLog.openSearchId
  );
  const [domainOptionList, setDomainOptionList] = useState<SelectItem[]>([]);
  const [showAdvanceSetting, setShowAdvanceSetting] = useState(false);

  const getImportedESDomainList = async () => {
    try {
      setLoadingDomain(true);
      changeLoadingDomain(true);
      // setDomainList([]);
      const resData: any = await appSyncRequestQuery(listImportedDomains);
      const dataDomains: ImportedDomain[] = resData.data.listImportedDomains;
      const tmpDomainList: SelectItem[] = [];
      // const tmpDomainMap: any = {};
      const userDefaultES: string =
        localStorage.getItem(PIPELINE_TASK_ES_USER_DEFAULT) || "";
      const tmpESIdList: string[] = [];
      dataDomains.forEach((element) => {
        tmpESIdList.push(element.id);
        tmpDomainList.push({
          name: element.domainName,
          value: element.id,
        });
        // tmpDomainMap[element.domainName] = element;
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

  const esSelectChanged = async (cluster: string) => {
    const resData: any = await appSyncRequestQuery(getDomainDetails, {
      id: cluster,
    });
    console.info("resData:", resData);
    const dataDomain: DomainDetails = resData.data.getDomainDetails;
    changeOpenSearchCluster(dataDomain);
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
      <PagePanel title={t("applog:create.step.specifyOS")}>
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
            <div>
              <div
                className="addtional-settings"
                onClick={() => {
                  setShowAdvanceSetting(!showAdvanceSetting);
                }}
              >
                <i className="icon">
                  {showAdvanceSetting && <ArrowDropDownIcon fontSize="large" />}
                  {!showAdvanceSetting && (
                    <ArrowDropDownIcon
                      className="reverse-90"
                      fontSize="large"
                    />
                  )}
                </i>
                {t("servicelog:cluster.additionalSetting")}
              </div>

              <div className={showAdvanceSetting ? "" : "hide"}>
                <>
                  <FormItem
                    optionTitle={t("servicelog:cluster.shardNum")}
                    optionDesc={t("servicelog:cluster.shardNumDesc")}
                    errorText={
                      shardsInvalidError
                        ? t("servicelog:cluster.shardNumError")
                        : ""
                    }
                  >
                    <div className="m-w-75p">
                      <TextInput
                        type="number"
                        value={applicationLog.aosParas.shardNumbers}
                        placeholder={t("servicelog:cluster.inputShardNum")}
                        onChange={(event) => {
                          changeShards(event.target.value);
                        }}
                      />
                    </div>
                  </FormItem>

                  <FormItem
                    optionTitle={t("servicelog:cluster.replicaNum")}
                    optionDesc={t("servicelog:cluster.replicaNumDesc")}
                  >
                    <div className="m-w-75p">
                      <Select
                        optionList={REPLICA_COUNT_LIST}
                        value={applicationLog.aosParas.replicaNumbers}
                        onChange={(event) => {
                          changeReplicas(event.target.value);
                        }}
                        placeholder={t("servicelog:cluster.inputReplica")}
                      />
                    </div>
                  </FormItem>
                </>
              </div>
            </div>
          </HeaderPanel>

          <HeaderPanel
            title={t("applog:create.specifyOS.logLifecycle")}
            infoType={InfoBarTypes.LOG_LIFECYCLE}
          >
            <div>
              <FormItem
                optionTitle={t("applog:create.specifyOS.warmLog")}
                optionDesc={
                  <div>
                    {t("applog:create.specifyOS.warmLogDesc1")}
                    <ExtLink to={ENABLE_ULTRAWARM}>
                      {t("applog:create.specifyOS.warmLogDesc2")}
                    </ExtLink>
                    {t("applog:create.specifyOS.warmLogDesc3")}
                  </div>
                }
                errorText={
                  warmLogInvalidError
                    ? t("applog:create.specifyOS.warmLogInvalid")
                    : ""
                }
              >
                <TextInput
                  readonly={!applicationLog.warmEnable}
                  className="m-w-75p"
                  type="number"
                  value={applicationLog.aosParas.warmLogTransition}
                  onChange={(event) => {
                    console.info(event.target.value);
                    changeWarnLogTransition(event.target.value);
                  }}
                />
              </FormItem>
              <FormItem
                optionTitle={t("applog:create.specifyOS.coldLog")}
                optionDesc={
                  <div>
                    {t("applog:create.specifyOS.coldLogDesc1")}
                    <ExtLink to={ENABLE_CLODSTATE}>
                      {t("applog:create.specifyOS.coldLogDesc2")}
                    </ExtLink>
                    {t("applog:create.specifyOS.coldLogDesc3")}
                  </div>
                }
                errorText={
                  coldLogInvalidError
                    ? t("applog:create.specifyOS.coldLogInvalid")
                    : ""
                }
              >
                <TextInput
                  readonly={!applicationLog.coldEnable}
                  className="m-w-75p"
                  type="number"
                  value={applicationLog.aosParas.coldLogTransition}
                  onChange={(event) => {
                    console.info(event.target.value);
                    changeColdLogTransition(event.target.value);
                  }}
                />
              </FormItem>
              <FormItem
                optionTitle={t("applog:create.specifyOS.logRetention")}
                optionDesc={t("applog:create.specifyOS.logRetentionDesc")}
                errorText={
                  logRetentionInvalidError
                    ? t("applog:create.specifyOS.logRetentionError")
                    : ""
                }
              >
                <TextInput
                  className="m-w-75p"
                  type="number"
                  value={applicationLog.aosParas.logRetention}
                  placeholder="180"
                  onChange={(event) => {
                    console.info(event.target.value);
                    changeLogRetention(event.target.value);
                  }}
                />
              </FormItem>
            </div>
          </HeaderPanel>
        </div>
      </PagePanel>
    </div>
  );
};

export default SpecifyOpenSearchCluster;
