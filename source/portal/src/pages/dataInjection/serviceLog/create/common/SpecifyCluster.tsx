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

import {
  YesNo,
  ClusterCompressionTypeList,
  ServiceLogClusterIndexSuffixFormatList,
  WarmLogSettingsList,
  WarmTransitionType,
} from "types";
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
import Switch from "components/Switch";
import { checkIndexNameValidate } from "assets/js/utils";
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
  changeIndexSuffix: (suffix: string) => void;
  changeEnableRollover: (enable: boolean) => void;
  changeRolloverSize: (size: string) => void;
  changeCompressionType: (codec: string) => void;
  changeWarmSettings: (type: string) => void;
}

export interface AOSInputValidRes {
  shardsInvalidError: boolean;
  warmLogInvalidError: boolean;
  coldLogInvalidError: boolean;
  logRetentionInvalidError: boolean;
  coldMustLargeThanWarm: boolean;
  logRetentionMustThanColdAndWarm: boolean;
  capacityInvalidError: boolean;
  indexEmptyError: boolean;
  indexNameFormatError: boolean;
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
    coldMustLargeThanWarm: false,
    logRetentionMustThanColdAndWarm: false,
    capacityInvalidError: false,
    indexEmptyError: false,
    indexNameFormatError: false,
  };

  // check index name empty
  if (pipelineTask.params.indexPrefix.trim() === "") {
    validRes.indexEmptyError = true;
  } else {
    validRes.indexEmptyError = false;
  }

  // check index name format
  if (!checkIndexNameValidate(pipelineTask.params.indexPrefix)) {
    validRes.indexNameFormatError = true;
  } else {
    validRes.indexNameFormatError = false;
  }

  // check number of shards
  if (parseInt(pipelineTask.params.shardNumbers) <= 0) {
    validRes.shardsInvalidError = true;
  } else {
    validRes.shardsInvalidError = false;
  }

  if (parseInt(pipelineTask.params.warmAge) < 0) {
    validRes.warmLogInvalidError = true;
  } else {
    validRes.warmLogInvalidError = false;
  }

  if (parseInt(pipelineTask.params.coldAge) < 0) {
    validRes.coldLogInvalidError = true;
  } else {
    validRes.coldLogInvalidError = false;
  }

  if (pipelineTask.params.warmTransitionType === WarmTransitionType.BY_DAYS) {
    if (
      parseInt(pipelineTask.params.coldAge) <
      parseInt(pipelineTask.params.warmAge)
    ) {
      validRes.coldMustLargeThanWarm = true;
    } else {
      validRes.coldMustLargeThanWarm = false;
    }
  }

  if (pipelineTask.params.warmTransitionType === WarmTransitionType.BY_DAYS) {
    if (
      (pipelineTask.params.warmEnable &&
        parseInt(pipelineTask.params.retainAge) <
          parseInt(pipelineTask.params.warmAge)) ||
      (pipelineTask.params.coldEnable &&
        parseInt(pipelineTask.params.retainAge) <
          parseInt(pipelineTask.params.coldAge))
    ) {
      validRes.logRetentionMustThanColdAndWarm = true;
    } else {
      validRes.logRetentionMustThanColdAndWarm = false;
    }
  } else {
    if (
      pipelineTask.params.coldEnable &&
      parseInt(pipelineTask.params.retainAge) <
        parseInt(pipelineTask.params.coldAge)
    ) {
      validRes.logRetentionMustThanColdAndWarm = true;
    } else {
      validRes.logRetentionMustThanColdAndWarm = false;
    }
  }

  if (parseInt(pipelineTask.params.retainAge) < 0) {
    validRes.logRetentionInvalidError = true;
  } else {
    validRes.logRetentionInvalidError = false;
  }

  if (
    pipelineTask.params.enableRolloverByCapacity &&
    parseFloat(pipelineTask.params.rolloverSize) <= 0
  ) {
    validRes.capacityInvalidError = true;
  } else {
    validRes.capacityInvalidError = false;
  }

  return validRes;
};

const AOS_EXCLUDE_PARAMS = ["enableRolloverByCapacity", "warmTransitionType"];
export const covertParametersByKeyAndConditions = (
  pipelineTask:
    | S3TaskProps
    | CloudFrontTaskProps
    | CloudTrailTaskProps
    | LambdaTaskProps
    | RDSTaskProps
    | ELBTaskProps
    | WAFTaskProps
    | VpcLogTaskProps
    | ConfigTaskProps,
  taskExcludeParams: string[]
) => {
  const resParamList: any[] = [];
  const EXCLUDE_PARAMS = [...taskExcludeParams, ...AOS_EXCLUDE_PARAMS];
  Object.keys(pipelineTask.params).forEach((key) => {
    if (EXCLUDE_PARAMS.indexOf(key) < 0) {
      if (key === "rolloverSize") {
        // handle enable rollover by size
        resParamList.push({
          parameterKey: "rolloverSize",
          parameterValue: pipelineTask.params.enableRolloverByCapacity
            ? pipelineTask.params.rolloverSize + "gb"
            : "",
        });
      } else if (key === "warmAge") {
        // handle wram log transition
        const userInputWarmAge = pipelineTask.params.warmAge;
        let tmpWarmAge = "";
        if (pipelineTask.params.warmEnable && userInputWarmAge) {
          if (
            pipelineTask.params.warmTransitionType ===
            WarmTransitionType.IMMEDIATELY
          ) {
            tmpWarmAge = "1s";
          } else if (userInputWarmAge && userInputWarmAge !== "0") {
            tmpWarmAge = userInputWarmAge + "d";
          }
        }
        resParamList.push({
          parameterKey: "warmAge",
          parameterValue: tmpWarmAge,
        });
      } else if (key === "coldAge") {
        // handle cold log transition
        const userInputCodeAge = pipelineTask.params.coldAge;
        let tmpCodeAge = "";
        if (
          pipelineTask.params.coldEnable &&
          userInputCodeAge &&
          userInputCodeAge !== "0"
        ) {
          tmpCodeAge = userInputCodeAge + "d";
        }
        resParamList.push({
          parameterKey: "coldAge",
          parameterValue: tmpCodeAge,
        });
      } else if (key === "retainAge") {
        // handle log rentaintion
        const userInputRetainAge = pipelineTask.params.retainAge;
        let tmpRetainAge = "";
        if (userInputRetainAge && userInputRetainAge !== "0") {
          tmpRetainAge = userInputRetainAge + "d";
        }
        resParamList.push({
          parameterKey: "retainAge",
          parameterValue: tmpRetainAge,
        });
      } else {
        resParamList.push({
          parameterKey: key,
          parameterValue: (pipelineTask.params as any)?.[key] || "",
        });
      }
    }
  });
  return resParamList;
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
    changeIndexSuffix,
    changeEnableRollover,
    changeRolloverSize,
    changeCompressionType,
    changeWarmSettings,
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

  const esSelectChanged = async (cluster: string) => {
    console.info("cluster:", cluster);
    const resData: any = await appSyncRequestQuery(getDomainDetails, {
      id: cluster,
    });
    const dataDomain: DomainDetails = resData.data.getDomainDetails;
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
                    errorText={
                      aosInputValidRes.indexEmptyError
                        ? t("applog:create.ingestSetting.indexNameError")
                        : aosInputValidRes.indexNameFormatError
                        ? t("applog:create.ingestSetting.indexNameFormatError")
                        : ""
                    }
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
                      <div>{ServiceTypeDescMap[taskType].pureSuffix}-</div>
                      <div style={{ width: 170 }}>
                        <Select
                          optionList={ServiceLogClusterIndexSuffixFormatList}
                          value={pipelineTask.params.indexSuffix}
                          onChange={(event) => {
                            changeIndexSuffix(event.target.value);
                          }}
                        />
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

                  {!pipelineTask.params.rolloverSizeNotSupport && (
                    <FormItem
                      optionTitle=""
                      optionDesc=""
                      errorText={
                        aosInputValidRes.capacityInvalidError
                          ? t("servicelog:cluster.rolloverError")
                          : ""
                      }
                    >
                      <>
                        <Switch
                          disabled={pipelineTask.params.rolloverSizeNotSupport}
                          reverse
                          isOn={pipelineTask.params.enableRolloverByCapacity}
                          handleToggle={() => {
                            changeEnableRollover(
                              !pipelineTask.params.enableRolloverByCapacity
                            );
                          }}
                          label={t("servicelog:cluster.enableRolloverByCap")}
                          desc={t("servicelog:cluster.enableRolloverByCapDesc")}
                        />
                        <div className="flex align-center">
                          <TextInput
                            type="number"
                            readonly={
                              !pipelineTask.params.enableRolloverByCapacity
                            }
                            value={pipelineTask.params.rolloverSize}
                            onChange={(event) => {
                              changeRolloverSize(event.target.value);
                            }}
                          />
                          <div className="ml-10">GB</div>
                        </div>
                      </>
                    </FormItem>
                  )}

                  <FormItem
                    optionTitle={t("servicelog:cluster.compressType")}
                    optionDesc={t("servicelog:cluster.compressTypeDesc")}
                  >
                    <Select
                      className="m-w-75p"
                      optionList={ClusterCompressionTypeList}
                      value={pipelineTask.params.codec}
                      onChange={(event) => {
                        changeCompressionType(event.target.value);
                      }}
                    />
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
                <>
                  {WarmLogSettingsList.map((element, key) => {
                    return (
                      <div key={key}>
                        <label>
                          <input
                            disabled={!pipelineTask.params.warmEnable}
                            onClick={() => {
                              changeWarmSettings(element.value);
                            }}
                            onChange={(event) => {
                              console.info(event);
                            }}
                            checked={
                              element.value ===
                                pipelineTask.params.warmTransitionType &&
                              pipelineTask.params.warmEnable
                            }
                            name="fieldType"
                            type="radio"
                          />{" "}
                          {t(element.name)}
                        </label>
                      </div>
                    );
                  })}
                  <TextInput
                    readonly={
                      !pipelineTask.params.warmEnable ||
                      pipelineTask.params.warmTransitionType ===
                        WarmTransitionType.IMMEDIATELY
                    }
                    className="m-w-75p"
                    type="number"
                    value={
                      pipelineTask.params.warmAge === "0"
                        ? ""
                        : pipelineTask.params.warmAge
                    }
                    onChange={(event) => {
                      changeWarnLogTransition(event.target.value);
                    }}
                  />
                </>
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
                    : aosInputValidRes.coldMustLargeThanWarm
                    ? t("applog:create.specifyOS.coldLogMustThanWarm")
                    : ""
                }
              >
                <TextInput
                  readonly={!pipelineTask.params.coldEnable}
                  className="m-w-75p"
                  type="number"
                  value={
                    pipelineTask.params.coldAge === "0"
                      ? ""
                      : pipelineTask.params.coldAge
                  }
                  onChange={(event) => {
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
                    : aosInputValidRes.logRetentionMustThanColdAndWarm
                    ? t(
                        "applog:create.specifyOS.logRetentionMustLargeThanCodeAndWarm"
                      )
                    : ""
                }
              >
                <TextInput
                  className="m-w-75p"
                  type="number"
                  value={
                    pipelineTask.params.retainAge === "0"
                      ? ""
                      : pipelineTask.params.retainAge
                  }
                  placeholder="180"
                  onChange={(event) => {
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
