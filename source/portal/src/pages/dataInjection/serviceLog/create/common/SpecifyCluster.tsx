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
import { S3TaskProps } from "../s3/CreateS3";
import { CloudFrontTaskProps } from "../cloudfront/CreateCloudFront";
import { CloudTrailTaskProps } from "../cloudtrail/CreateCloudTrail";
import { LambdaTaskProps } from "../lambda/CreateLambda";
import { RDSTaskProps } from "../rds/CreateRDS";
import { ELBTaskProps } from "../elb/CreateELB";
import { WAFTaskProps } from "../waf/CreateWAF";

import { YesNo } from "types";
import {
  ENABLE_CLODSTATE,
  ENABLE_ULTRAWARM,
  PIPELINE_TASK_ES_USER_DEFAULT,
  REPLICA_COUNT_LIST,
  ServiceLogType,
  ServiceTypeDescMap,
} from "assets/js/const";
import { InfoBarTypes } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import { VpcLogTaskProps } from "../vpc/CreateVPC";
import { ConfigTaskProps } from "../config/CreateConfig";
interface SpecifyOpenSearchClusterProps {
  taskType: ServiceLogType;
  pipelineTask:
    | S3TaskProps
    | CloudFrontTaskProps
    | CloudTrailTaskProps
    | LambdaTaskProps
    | RDSTaskProps
    | ELBTaskProps
    | WAFTaskProps
    | VpcLogTaskProps
    | ConfigTaskProps;
  changeBucketIndex: (prefix: string) => void;
  changeOpenSearchCluster: (domain: DomainDetails | undefined) => void;
  changeSampleDashboard: (yesNo: string) => void;
  changeWarnLogTransition: (value: string) => void;
  changeColdLogTransition: (value: string) => void;
  changeLogRetention: (value: string) => void;
  changeLoadingDomain: (loading: boolean) => void;
  changeShards: (shards: string) => void;
  changeReplicas: (replicas: string) => void;
  esDomainEmptyError: boolean;
  aosInputValidRes: AOSInputValidRes;
}

export interface AOSInputValidRes {
  shardsInvalidError: boolean;
  warmLogInvalidError: boolean;
  coldLogInvalidError: boolean;
  logRetentionInvalidError: boolean;
}

export const checkOpenSearchInput = (
  pipelineTask:
    | S3TaskProps
    | CloudFrontTaskProps
    | CloudTrailTaskProps
    | LambdaTaskProps
    | RDSTaskProps
    | ELBTaskProps
    | WAFTaskProps
    | VpcLogTaskProps
    | ConfigTaskProps
) => {
  const validRes: AOSInputValidRes = {
    shardsInvalidError: false,
    warmLogInvalidError: false,
    coldLogInvalidError: false,
    logRetentionInvalidError: false,
  };
  // check number of shards
  if (parseInt(pipelineTask.params.shardNumbers) <= 0) {
    validRes.shardsInvalidError = true;
  } else {
    validRes.shardsInvalidError = false;
  }

  if (parseInt(pipelineTask.params.daysToWarm) < 0) {
    validRes.warmLogInvalidError = true;
  } else {
    validRes.warmLogInvalidError = false;
  }

  if (parseInt(pipelineTask.params.daysToCold) < 0) {
    validRes.coldLogInvalidError = true;
  } else {
    validRes.coldLogInvalidError = false;
  }

  if (parseInt(pipelineTask.params.daysToRetain) < 0) {
    validRes.logRetentionInvalidError = true;
  } else {
    validRes.logRetentionInvalidError = false;
  }

  return validRes;
};

const SpecifyOpenSearchCluster: React.FC<SpecifyOpenSearchClusterProps> = (
  props: SpecifyOpenSearchClusterProps
) => {
  const {
    taskType,
    pipelineTask,
    changeOpenSearchCluster,
    changeBucketIndex,
    changeSampleDashboard,
    changeWarnLogTransition,
    changeColdLogTransition,
    changeLogRetention,
    changeLoadingDomain,
    changeShards,
    changeReplicas,
    esDomainEmptyError,
    aosInputValidRes,
  } = props;
  const { t } = useTranslation();
  const [loadingDomain, setLoadingDomain] = useState(false);
  const [openSearchCluster, setOpenSearchCuster] = useState(
    pipelineTask.params.esDomainId
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
    console.info("cluster:", cluster);
    const resData: any = await appSyncRequestQuery(getDomainDetails, {
      id: cluster,
    });
    console.info("resData:", resData);
    const dataDomain: DomainDetails = resData.data.getDomainDetails;
    console.info("dataDomain:", dataDomain);
    changeOpenSearchCluster(dataDomain);
  };

  useEffect(() => {
    if (openSearchCluster) {
      esSelectChanged(openSearchCluster);
      localStorage.setItem(PIPELINE_TASK_ES_USER_DEFAULT, openSearchCluster);
    }
  }, [openSearchCluster]);

  return (
    <div>
      <PagePanel title={t("servicelog:cluster.specifyDomain")}>
        <div>
          <HeaderPanel title={t("servicelog:cluster.aosDomain")}>
            <FormItem
              optionTitle={t("servicelog:cluster.aosDomain")}
              optionDesc={
                <div>
                  {t("servicelog:cluster.aosDomainDesc1")}
                  <ExtLink to="/clusters/import-opensearch-cluster">
                    {t("servicelog:cluster.aosDomainDesc2")}
                  </ExtLink>
                  {t("servicelog:cluster.aosDomainDesc3")}
                </div>
              }
              errorText={
                esDomainEmptyError ? t("servicelog:cluster.aosDomainError") : ""
              }
            >
              <Select
                placeholder={t("servicelog:cluster.selectOS")}
                className="m-w-75p"
                loading={loadingDomain}
                optionList={domainOptionList}
                value={openSearchCluster}
                onChange={(event) => {
                  setOpenSearchCuster(event.target.value);
                  console.info("event.target.value:", event.target.value);
                }}
                hasRefresh
                clickRefresh={() => {
                  getImportedESDomainList();
                }}
              />
            </FormItem>
            <FormItem
              infoType={InfoBarTypes.SAMPLE_DASHBAORD}
              optionTitle={t("servicelog:cluster.sampleDashboard")}
              optionDesc={t("servicelog:cluster.sampleDashboardDesc")}
            >
              {Object.values(YesNo).map((key) => {
                return (
                  <div key={key}>
                    <label>
                      <input
                        value={pipelineTask.params.createDashboard}
                        onChange={(event) => {
                          console.info(event);
                        }}
                        onClick={() => {
                          console.info(key);
                          changeSampleDashboard(key);
                        }}
                        checked={pipelineTask.params.createDashboard === key}
                        name="sampleDashboard"
                        type="radio"
                      />{" "}
                      {t(key.toLocaleLowerCase())}
                    </label>
                  </div>
                );
              })}
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
                    optionTitle={t("servicelog:cluster.indexPrefix")}
                    optionDesc={`${t("servicelog:cluster.indexPrefixDesc1")} ${
                      ServiceTypeDescMap[taskType].desc
                    }${t("servicelog:cluster.indexPrefixDesc2")}`}
                  >
                    <div className="flex align-center m-w-75p">
                      <div style={{ flex: 1 }}>
                        <TextInput
                          className=""
                          value={pipelineTask.params.indexPrefix}
                          placeholder={t("servicelog:cluster.inputIndex")}
                          onChange={(event) => {
                            changeBucketIndex(event.target.value);
                          }}
                        />
                      </div>
                      {/* <div style={{ width: 70 }}>s3access-</div> */}
                      <div style={{ width: 180 }}>
                        {ServiceTypeDescMap[taskType].suffix}
                      </div>
                    </div>
                  </FormItem>

                  <FormItem
                    optionTitle={t("servicelog:cluster.shardNum")}
                    optionDesc={t("servicelog:cluster.shardNumDesc")}
                    errorText={
                      aosInputValidRes?.shardsInvalidError
                        ? t("servicelog:cluster.shardNumError")
                        : ""
                    }
                  >
                    <div className="m-w-75p">
                      <TextInput
                        type="number"
                        value={pipelineTask.params.shardNumbers}
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
                        value={pipelineTask.params.replicaNumbers}
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
            title={t("servicelog:cluster.logLifecycle")}
            infoType={InfoBarTypes.LOG_LIFECYCLE}
          >
            <div>
              <FormItem
                optionTitle={t("servicelog:cluster.warmLog")}
                optionDesc={
                  <div>
                    {t("servicelog:cluster.warmLogDesc1")}
                    <ExtLink to={ENABLE_ULTRAWARM}>
                      {t("servicelog:cluster.warmLogDesc2")}
                    </ExtLink>
                    {t("servicelog:cluster.warmLogDesc3")}
                  </div>
                }
                errorText={
                  aosInputValidRes?.warmLogInvalidError
                    ? t("applog:create.specifyOS.warmLogInvalid")
                    : ""
                }
              >
                <TextInput
                  readonly={!pipelineTask.params.warmEnable}
                  className="m-w-75p"
                  type="number"
                  value={
                    pipelineTask.params.daysToWarm === "0"
                      ? ""
                      : pipelineTask.params.daysToWarm
                  }
                  onChange={(event) => {
                    console.info(event.target.value);
                    changeWarnLogTransition(event.target.value);
                  }}
                />
              </FormItem>
              <FormItem
                optionTitle={t("servicelog:cluster.coldLog")}
                optionDesc={
                  <div>
                    {t("servicelog:cluster.coldLogDesc1")}
                    <ExtLink to={ENABLE_CLODSTATE}>
                      {t("servicelog:cluster.coldLogDesc2")}
                    </ExtLink>
                    {t("servicelog:cluster.coldLogDesc3")}
                  </div>
                }
                errorText={
                  aosInputValidRes?.coldLogInvalidError
                    ? t("applog:create.specifyOS.coldLogInvalid")
                    : ""
                }
              >
                <TextInput
                  readonly={!pipelineTask.params.coldEnable}
                  className="m-w-75p"
                  type="number"
                  value={
                    pipelineTask.params.daysToCold === "0"
                      ? ""
                      : pipelineTask.params.daysToCold
                  }
                  onChange={(event) => {
                    console.info(event.target.value);
                    changeColdLogTransition(event.target.value);
                  }}
                />
              </FormItem>
              <FormItem
                optionTitle={t("servicelog:cluster.logRetention")}
                optionDesc={t("servicelog:cluster.logRetentionDesc")}
                errorText={
                  aosInputValidRes?.logRetentionInvalidError
                    ? t("applog:create.specifyOS.logRetentionError")
                    : ""
                }
              >
                <TextInput
                  className="m-w-75p"
                  type="number"
                  value={
                    pipelineTask.params.daysToRetain === "0"
                      ? ""
                      : pipelineTask.params.daysToRetain
                  }
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
