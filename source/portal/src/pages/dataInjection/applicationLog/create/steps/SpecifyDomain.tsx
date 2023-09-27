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
import React, { useState } from "react";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import ExtLink from "components/ExtLink";
import { DomainDetails, DomainStatusCheckResponse } from "API";
import Select from "components/Select";

import {
  ENABLE_CLODSTATE,
  ENABLE_ULTRAWARM,
  REPLICA_COUNT_LIST,
} from "assets/js/const";
import { InfoBarTypes } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import Switch from "components/Switch";
import {
  ClusterCompressionTypeList,
  AppLogClusterIndexSuffixFormatList,
  WarmLogSettingsList,
  WarmTransitionType,
  ApplicationLogType,
} from "types";
import IndexName from "../../common/IndexName";
import { identity } from "lodash";
import SelectOpenSearchDomain from "pages/dataInjection/common/SelectOpenSearchDomain";
import ExpandableSection from "components/ExpandableSection";

interface SpecifyOpenSearchClusterProps {
  applicationLog: ApplicationLogType;
  changeOpenSearchCluster: (domain: DomainDetails | undefined) => void;
  changeWarnLogTransition: (value: string) => void;
  changeColdLogTransition: (value: string) => void;
  changeLogRetention: (value: string) => void;
  changeLoadingDomain: (loading: boolean) => void;
  changeShards: (shards: string) => void;
  changeReplicas: (replica: string) => void;
  changeIndexSuffix: (suffix: string) => void;
  changeEnableRollover: (enable: boolean) => void;
  changeRolloverSize: (size: string) => void;
  changeCompressionType: (codec: string) => void;
  changeWarmSettings: (type: string) => void;
  onIndexNameChanged?: (name: string) => void;
  esDomainEmptyError: boolean;
  warmLogInvalidError?: boolean;
  coldLogInvalidError?: boolean;
  logRetentionInvalidError?: boolean;
  coldMustLargeThanWarm?: boolean;
  logRetentionMustThanColdAndWarm?: boolean;
  shardsInvalidError?: boolean;
  rolloverSizeError?: boolean;
  indexNameError?: string;
  domainCheckedStatus?: DomainStatusCheckResponse;
  changeOSDomainCheckStatus: (status: DomainStatusCheckResponse) => void;
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
    changeIndexSuffix,
    changeEnableRollover,
    changeRolloverSize,
    changeCompressionType,
    changeWarmSettings,
    esDomainEmptyError,
    warmLogInvalidError,
    coldLogInvalidError,
    logRetentionInvalidError,
    coldMustLargeThanWarm,
    logRetentionMustThanColdAndWarm,
    shardsInvalidError,
    rolloverSizeError,
    changeOSDomainCheckStatus,
    domainCheckedStatus,
  } = props;
  const { t } = useTranslation();
  const [loadingDomain, setLoadingDomain] = useState(false);

  return (
    <div>
      <PagePanel title={t("applog:create.step.specifyOS")}>
        <div>
          {props.onIndexNameChanged && (
            <HeaderPanel title={t("applog:create.ingestSetting.indexName")}>
              <IndexName
                value={applicationLog.aosParams.indexPrefix}
                setValue={(value) => {
                  props.onIndexNameChanged?.(value as string);
                }}
                error={props.indexNameError ?? ""}
              />
            </HeaderPanel>
          )}
          <HeaderPanel title={t("applog:create.specifyOS.aosDomain")}>
            <SelectOpenSearchDomain
              changeLoadingDomain={(loading) => {
                changeLoadingDomain(loading);
                setLoadingDomain(loading);
              }}
              changeOpenSearchDomain={changeOpenSearchCluster}
              openSearchCluster={applicationLog.openSearchId}
              esDomainEmptyError={esDomainEmptyError}
              changeOSDomainCheckStatus={(status) => {
                changeOSDomainCheckStatus && changeOSDomainCheckStatus(status);
              }}
            />
            <div>
              <ExpandableSection
                defaultExpanded={false}
                headerText={t("servicelog:cluster.additionalSetting")}
              >
                <>
                  <FormItem
                    optionTitle={t("applog:create.specifyOS.indexSuffix")}
                    optionDesc={t("applog:create.specifyOS.indexSuffixDesc")}
                  >
                    <div className="flex align-center m-w-75p">
                      <div style={{ flex: 1 }}>
                        <TextInput
                          disabled
                          className=""
                          value={applicationLog.aosParams.indexPrefix}
                          onChange={(event) => {
                            console.info(event);
                          }}
                        />
                      </div>
                      <div> - </div>
                      <div style={{ width: 170 }}>
                        <Select
                          optionList={AppLogClusterIndexSuffixFormatList}
                          value={applicationLog.aosParams.indexSuffix}
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
                      shardsInvalidError
                        ? t("servicelog:cluster.shardNumError")
                        : ""
                    }
                  >
                    <div className="m-w-75p">
                      <TextInput
                        type="number"
                        value={applicationLog.aosParams.shardNumbers}
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
                        value={applicationLog.aosParams.replicaNumbers}
                        onChange={(event) => {
                          changeReplicas(event.target.value);
                        }}
                        placeholder={t("servicelog:cluster.inputReplica")}
                      />
                    </div>
                  </FormItem>

                  {!loadingDomain && !applicationLog.rolloverSizeNotSupport && (
                    <FormItem
                      optionTitle=""
                      optionDesc=""
                      errorText={
                        rolloverSizeError
                          ? t("servicelog:cluster.rolloverError")
                          : ""
                      }
                    >
                      <>
                        <Switch
                          reverse
                          isOn={applicationLog.enableRolloverByCapacity}
                          handleToggle={() => {
                            changeEnableRollover(
                              !applicationLog.enableRolloverByCapacity
                            );
                          }}
                          label={t("servicelog:cluster.enableRolloverByCap")}
                          desc={t("servicelog:cluster.enableRolloverByCapDesc")}
                        />
                        <div className="flex align-center">
                          <TextInput
                            type="number"
                            readonly={!applicationLog.enableRolloverByCapacity}
                            value={applicationLog.aosParams.rolloverSize}
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
                      value={applicationLog.aosParams.codec}
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
            title={t("applog:create.specifyOS.logLifecycle")}
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
                  warmLogInvalidError
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
                            disabled={!applicationLog.warmEnable}
                            onClick={() => {
                              changeWarmSettings(element.value);
                            }}
                            onChange={(event) => {
                              console.info(event);
                            }}
                            checked={
                              element.value ===
                                applicationLog.warmTransitionType &&
                              applicationLog.warmEnable
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
                      !applicationLog.warmEnable ||
                      applicationLog.warmTransitionType ===
                        WarmTransitionType.IMMEDIATELY
                    }
                    className="m-w-75p"
                    type="number"
                    value={applicationLog.aosParams.warmLogTransition}
                    onChange={(event) => {
                      console.info(event.target.value);
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
                  (coldLogInvalidError
                    ? t("applog:create.specifyOS.coldLogInvalid")
                    : "") ||
                  (coldMustLargeThanWarm
                    ? t("applog:create.specifyOS.coldLogMustThanWarm")
                    : "")
                }
              >
                <TextInput
                  readonly={!applicationLog.coldEnable}
                  className="m-w-75p"
                  type="number"
                  value={applicationLog.aosParams.coldLogTransition}
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
                  (logRetentionInvalidError
                    ? t("applog:create.specifyOS.logRetentionError")
                    : "") ||
                  (logRetentionMustThanColdAndWarm
                    ? t(
                        "applog:create.specifyOS.logRetentionMustLargeThanCodeAndWarm"
                      )
                    : "")
                }
              >
                <TextInput
                  className="m-w-75p"
                  type="number"
                  value={applicationLog.aosParams.logRetention}
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
