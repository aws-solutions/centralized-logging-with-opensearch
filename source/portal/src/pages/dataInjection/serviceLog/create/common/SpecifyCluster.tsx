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
import React from "react";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import ExtLink from "components/ExtLink";
import { DomainDetails, DomainStatusCheckResponse } from "API";
import Select from "components/Select";

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
  REPLICA_COUNT_LIST,
  ServiceLogType,
  ServiceTypeDescMap,
} from "assets/js/const";
import { InfoBarTypes } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import Switch from "components/Switch";
import { checkIndexNameValidate, ternary } from "assets/js/utils";
import { ParticalServiceType } from "pages/pipelineAlarm/AlarmAndTags";
import { identity, defaultTo } from "lodash";
import SelectOpenSearchDomain from "pages/dataInjection/common/SelectOpenSearchDomain";
import ExpandableSection from "components/ExpandableSection";

interface SpecifyOpenSearchClusterProps {
  taskType: ServiceLogType;
  pipelineTask: ParticalServiceType;
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
  domainCheckedStatus?: DomainStatusCheckResponse;
  changeOSDomainCheckStatus: (status: DomainStatusCheckResponse) => void;
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

export const checkOpenSearchInput = (pipelineTask: ParticalServiceType) => {
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
  pipelineTask: ParticalServiceType,
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
          } else if (userInputWarmAge !== "0") {
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
    changeOSDomainCheckStatus,
    domainCheckedStatus,
  } = props;
  const { t } = useTranslation();

  return (
    <div>
      <PagePanel title={t("servicelog:cluster.specifyDomain")}>
        <div>
          <HeaderPanel title={t("servicelog:cluster.aosDomain")}>
            <SelectOpenSearchDomain
              changeLoadingDomain={changeLoadingDomain}
              changeOpenSearchDomain={changeOpenSearchCluster}
              openSearchCluster={pipelineTask.params.esDomainId}
              esDomainEmptyError={esDomainEmptyError}
              changeOSDomainCheckStatus={(status) => {
                changeOSDomainCheckStatus(status);
              }}
            />

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
              <ExpandableSection
                defaultExpanded={false}
                headerText={t("servicelog:cluster.additionalSetting")}
              >
                <>
                  <FormItem
                    optionTitle={t("servicelog:cluster.indexPrefix")}
                    optionDesc={`${t("servicelog:cluster.indexPrefixDesc1")} ${
                      ServiceTypeDescMap[taskType].desc
                    }${t("servicelog:cluster.indexPrefixDesc2")}`}
                    errorText={defaultTo(
                      ternary(
                        aosInputValidRes.indexEmptyError,
                        t("applog:create.ingestSetting.indexNameError"),
                        ""
                      ),
                      ternary(
                        aosInputValidRes.indexNameFormatError,
                        t("applog:create.ingestSetting.indexNameFormatError"),
                        ""
                      )
                    )}
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
                    infoText={
                      domainCheckedStatus?.multiAZWithStandbyEnabled
                        ? t("cluster:domain.standByTips")
                        : ""
                    }
                  >
                    <div className="m-w-75p">
                      <Select
                        disabled={
                          domainCheckedStatus?.multiAZWithStandbyEnabled ??
                          false
                        }
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
              </ExpandableSection>
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
                  {WarmLogSettingsList.map((element, index) => {
                    return (
                      <div key={identity(index)}>
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
                  (aosInputValidRes?.coldLogInvalidError
                    ? t("applog:create.specifyOS.coldLogInvalid")
                    : "") ||
                  (aosInputValidRes.coldMustLargeThanWarm
                    ? t("applog:create.specifyOS.coldLogMustThanWarm")
                    : "")
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
                  (aosInputValidRes?.logRetentionInvalidError
                    ? t("applog:create.specifyOS.logRetentionError")
                    : "") ||
                  (aosInputValidRes.logRetentionMustThanColdAndWarm
                    ? t(
                        "applog:create.specifyOS.logRetentionMustLargeThanCodeAndWarm"
                      )
                    : "")
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
