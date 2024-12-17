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
import React, { useEffect } from "react";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import ExtLink from "components/ExtLink";
import Select from "components/Select";

import {
  YesNo,
  ClusterCompressionTypeList,
  ServiceLogClusterIndexSuffixFormatList,
  WarmLogSettingsList,
  WarmTransitionType,
  AppLogClusterIndexSuffixFormatList,
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
import { identity } from "lodash";
import SelectOpenSearchDomain from "pages/dataInjection/common/SelectOpenSearchDomain";
import ExpandableSection from "components/ExpandableSection";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import { AppDispatch } from "reducer/store";
import {
  indexPrefixChanged,
  createDashboardChanged,
  indexSuffixChanged,
  shardNumbersChanged,
  replicaNumbersChanged,
  rolloverSizeChanged,
  compressionTypeChanged,
  warmTransitionTypeChanged,
  warmAgeChanged,
  coldAgeChanged,
  retainAgeChanged,
  domainLoadingChanged,
  openSearchClusterChanged,
  domainCheckStatusChanged,
  appIndexSuffixChanged,
  indexTaskTypeSuffixChanged,
} from "reducer/createOpenSearch";
import { displayI18NMessage } from "assets/js/utils";
import { LogSourceType } from "API";
import { logBucketPrefixChanged } from "reducer/configBufferS3";

interface ConfigOpenSearchProps {
  taskType: ServiceLogType | LogSourceType;
  hidePageTitle?: boolean;
  onChangeIndexPrefix?: (indexPrefix: string) => void;
  isWAFSampled?: boolean;
}

const isServiceLogType = (type: string): type is ServiceLogType => {
  return Object.values(ServiceLogType).includes(type as ServiceLogType);
};

const ConfigOpenSearch: React.FC<ConfigOpenSearchProps> = (
  props: ConfigOpenSearchProps
) => {
  const { t } = useTranslation();
  const { taskType, hidePageTitle, onChangeIndexPrefix, isWAFSampled } = props;
  const openSearch = useSelector((state: RootState) => state.openSearch);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (
      isServiceLogType(taskType) &&
      ServiceTypeDescMap[taskType]?.pureSuffix
    ) {
      if (isWAFSampled) {
        dispatch(indexTaskTypeSuffixChanged("-wafsampled"));
      } else {
        dispatch(
          indexTaskTypeSuffixChanged(ServiceTypeDescMap[taskType].pureSuffix)
        );
      }
    }
  }, [taskType, ServiceTypeDescMap[taskType]?.pureSuffix]);

  return (
    <div>
      <PagePanel title={hidePageTitle ? null : t("step.analyticsEngine")}>
        <div>
          <HeaderPanel title={t("servicelog:cluster.aosDomain")}>
            <SelectOpenSearchDomain
              changeLoadingDomain={(loading) => {
                dispatch(domainLoadingChanged(loading));
              }}
              changeOpenSearchDomain={(domain) => {
                dispatch(openSearchClusterChanged(domain));
              }}
              openSearchCluster={openSearch.esDomainId}
              esDomainEmptyError={openSearch.domainNameError}
              changeOSDomainCheckStatus={(status) => {
                dispatch(domainCheckStatusChanged(status));
              }}
            />

            <FormItem
              optionTitle={t("servicelog:cluster.indexPrefix")}
              optionDesc={t("servicelog:cluster.indexPrefixDesc")}
              errorText={displayI18NMessage(openSearch.indexPrefixError)}
            >
              {isServiceLogType(taskType) ? (
                <div className="flex align-center m-w-75p">
                  <div style={{ flex: 1 }}>
                    <TextInput
                      className=""
                      value={openSearch.indexPrefix}
                      placeholder="log-example"
                      onChange={(event) => {
                        dispatch(indexPrefixChanged(event.target.value));
                      }}
                    />
                  </div>
                  <div>{openSearch.indexTaskTypeSuffix}-</div>
                  <div style={{ width: 170 }}>
                    <Select
                      optionList={ServiceLogClusterIndexSuffixFormatList}
                      value={openSearch.indexSuffix}
                      onChange={(event) => {
                        dispatch(indexSuffixChanged(event.target.value));
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex align-center m-w-75p">
                  <div style={{ flex: 1 }}>
                    <TextInput
                      className=""
                      value={openSearch.indexPrefix}
                      placeholder="log-example"
                      onChange={(event) => {
                        dispatch(indexPrefixChanged(event.target.value));
                        onChangeIndexPrefix?.(event.target.value);
                        if (taskType !== LogSourceType.S3) {
                          dispatch(
                            logBucketPrefixChanged(
                              `AppLogs/${event.target.value}/year=%Y/month=%m/day=%d/`
                            )
                          );
                        }
                      }}
                    />
                  </div>
                  <div> - </div>
                  <div style={{ width: 170 }}>
                    <Select
                      optionList={AppLogClusterIndexSuffixFormatList}
                      value={openSearch.appIndexSuffix}
                      onChange={(event) => {
                        dispatch(appIndexSuffixChanged(event.target.value));
                      }}
                    />
                  </div>
                </div>
              )}
            </FormItem>

            <FormItem
              infoType={InfoBarTypes.NUMBER_OF_SHARDS}
              optionTitle={t("servicelog:cluster.shardNum")}
              optionDesc={t("servicelog:cluster.shardNumDesc")}
              errorText={displayI18NMessage(openSearch.shardsError)}
            >
              <div className="m-w-75p">
                <TextInput
                  type="number"
                  value={openSearch.shardNumbers}
                  placeholder={t("servicelog:cluster.inputShardNum")}
                  onChange={(event) => {
                    dispatch(shardNumbersChanged(event.target.value));
                  }}
                />
              </div>
            </FormItem>

            <>
              {isServiceLogType(taskType) && (
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
                            value={openSearch.createDashboard}
                            onChange={(event) => {
                              console.info(event);
                            }}
                            onClick={() => {
                              dispatch(createDashboardChanged(key));
                            }}
                            checked={openSearch.createDashboard === key}
                            name="sampleDashboard"
                            type="radio"
                          />{" "}
                          {t(key.toLocaleLowerCase())}
                        </label>
                      </div>
                    );
                  })}
                </FormItem>
              )}
            </>

            <div>
              <ExpandableSection
                isOpenSearch={true}
                defaultExpanded={openSearch.showAdvancedSetting}
                headerText={t("servicelog:cluster.additionalSetting")}
              >
                <>
                  <FormItem
                    optionTitle={t("servicelog:cluster.replicaNum")}
                    optionDesc={t("servicelog:cluster.replicaNumDesc")}
                    infoText={
                      openSearch.domainCheckedStatus?.multiAZWithStandbyEnabled
                        ? t("cluster:domain.standByTips")
                        : ""
                    }
                  >
                    <div className="m-w-75p">
                      <Select
                        disabled={
                          openSearch.domainCheckedStatus
                            ?.multiAZWithStandbyEnabled ?? false
                        }
                        optionList={REPLICA_COUNT_LIST}
                        value={openSearch.replicaNumbers}
                        onChange={(event) => {
                          dispatch(replicaNumbersChanged(event.target.value));
                        }}
                        placeholder={t("servicelog:cluster.inputReplica")}
                      />
                    </div>
                  </FormItem>

                  {!openSearch.rolloverSizeNotSupport && (
                    <FormItem
                      optionTitle={t("servicelog:cluster.rolloverTitle")}
                      optionDesc={t("servicelog:cluster.rolloverDesc")}
                      errorText={displayI18NMessage(openSearch.capacityError)}
                    >
                      <Select
                        disabled={openSearch.rolloverSizeNotSupport}
                        className="m-w-75p"
                        allowEmpty
                        value={openSearch.rolloverSize}
                        optionList={[
                          { name: "None", value: "" },
                          { name: "10 GB", value: "10gb" },
                          { name: "30 GB", value: "30gb" },
                          { name: "50 GB", value: "50gb" },
                        ]}
                        onChange={(event) => {
                          dispatch(rolloverSizeChanged(event.target.value));
                        }}
                      />
                    </FormItem>
                  )}

                  <FormItem
                    optionTitle={t("servicelog:cluster.compressType")}
                    optionDesc={t("servicelog:cluster.compressTypeDesc")}
                  >
                    <Select
                      className="m-w-75p"
                      optionList={ClusterCompressionTypeList}
                      value={openSearch.codec}
                      onChange={(event) => {
                        dispatch(compressionTypeChanged(event.target.value));
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
                errorText={displayI18NMessage(openSearch.warmLogError)}
              >
                <>
                  {WarmLogSettingsList.map((element, index) => {
                    return (
                      <div key={identity(index)}>
                        <label>
                          <input
                            disabled={!openSearch.warmEnable}
                            onClick={() => {
                              dispatch(
                                warmTransitionTypeChanged(element.value)
                              );
                            }}
                            onChange={(event) => {
                              console.info(event);
                            }}
                            checked={
                              element.value === openSearch.warmTransitionType &&
                              openSearch.warmEnable
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
                      !openSearch.warmEnable ||
                      openSearch.warmTransitionType ===
                        WarmTransitionType.IMMEDIATELY
                    }
                    className="m-w-75p"
                    type="number"
                    value={openSearch.warmAge === "0" ? "" : openSearch.warmAge}
                    onChange={(event) => {
                      dispatch(warmAgeChanged(event.target.value));
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
                errorText={displayI18NMessage(openSearch.coldLogError)}
              >
                <TextInput
                  readonly={!openSearch.coldEnable}
                  className="m-w-75p"
                  type="number"
                  value={openSearch.coldAge === "0" ? "" : openSearch.coldAge}
                  onChange={(event) => {
                    dispatch(coldAgeChanged(event.target.value));
                  }}
                />
              </FormItem>
              <FormItem
                optionTitle={t("servicelog:cluster.logRetention")}
                optionDesc={t("servicelog:cluster.logRetentionDesc")}
                errorText={displayI18NMessage(openSearch.retentionLogError)}
              >
                <TextInput
                  className="m-w-75p"
                  type="number"
                  value={
                    openSearch.retainAge === "0" ? "" : openSearch.retainAge
                  }
                  placeholder="180"
                  onChange={(event) => {
                    dispatch(retainAgeChanged(event.target.value));
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

export default ConfigOpenSearch;
