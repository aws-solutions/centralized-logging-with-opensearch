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
import Alert from "components/Alert";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import Tiles from "components/Tiles";
import { AmplifyConfigType, CreationMethod, YesNo } from "types";
import { useTranslation } from "react-i18next";
import TextInput from "components/TextInput";
import { useSelector } from "react-redux";
import { AppStateProps, InfoBarTypes } from "reducer/appReducer";
import Select from "components/Select";
import {
  ENABLE_CLODSTATE,
  ENABLE_ULTRAWARM,
  REPLICA_COUNT_LIST,
} from "assets/js/const";
import ExtLink from "components/ExtLink";
import AutoComplete from "components/AutoComplete";
import { OptionType } from "components/AutoComplete/autoComplete";
import ValueWithLabel from "components/ValueWithLabel";
import { EksIngestionPropsType } from "../EksLogIngest";
import { appSyncRequestQuery } from "assets/js/request";
import { listAppPipelines } from "graphql/queries";
import { AppPipeline } from "API";
import { buildESLink, buildKDSLink, formatLocalTime } from "assets/js/utils";
import LoadingText from "components/LoadingText";

const YESNO_LIST = [
  {
    name: "yes",
    value: YesNo.Yes,
  },
  {
    name: "no",
    value: YesNo.No,
  },
];

interface SpecifySettingProps {
  eksIngestionInfo: EksIngestionPropsType;
  changeCreationMethod: (method: string) => void;
  changeIndexPrefix: (prefix: string) => void;
  changeStartShardNum: (num: string) => void;
  changeEnableAS: (enable: boolean) => void;
  changeMaxShardNum: (num: string) => void;
  changeWarmTransition: (warmTrans: string) => void;
  changeColdTransition: (coldTrans: string) => void;
  changeLogRetention: (retention: string) => void;
  changeExistsPipeline: (pipeline: OptionType) => void;
  changeShards: (shards: string) => void;
  changeReplicas: (replica: string) => void;
}

const SpecifySettings: React.FC<SpecifySettingProps> = (
  props: SpecifySettingProps
) => {
  const { t } = useTranslation();
  const {
    eksIngestionInfo,
    changeCreationMethod,
    changeIndexPrefix,
    changeStartShardNum,
    changeEnableAS,
    changeMaxShardNum,
    changeWarmTransition,
    changeColdTransition,
    changeLogRetention,
    changeExistsPipeline,
    changeShards,
    changeReplicas,
  } = props;
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const [enableAS, setEnableAS] = useState(
    eksIngestionInfo.kdsParas.enableAutoScaling ? YesNo.Yes : YesNo.No
  );
  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [pipelineOptionList, setPipelineOptionList] = useState<OptionType[]>(
    []
  );
  const [pipelineIdMap, setPipelineIdMap] = useState<any>();
  const [showAdvanceSetting, setShowAdvanceSetting] = useState(false);

  // Get Application Log List
  const getApplicationLogList = async () => {
    // setSelectedApplicationLog([]);
    try {
      setLoadingPipeline(true);
      // setApplicationLogs([]);
      const resData: any = await appSyncRequestQuery(listAppPipelines, {
        page: 1,
        count: 999,
      });
      console.info("resData:", resData);
      // const dataAppLogs: AppPipeline[] =
      const tmpOptionList: OptionType[] = [];
      const appPipelineArr: AppPipeline[] =
        resData.data.listAppPipelines.appPipelines;
      const tmpPipelineIdMap: any = {};
      appPipelineArr.forEach((element) => {
        if (
          element.aosParas?.domainName === eksIngestionInfo.aosParas.domainName
        ) {
          tmpOptionList.push({
            name: `${element.id}(${element.aosParas.indexPrefix})`,
            value: element.id,
          });
          tmpPipelineIdMap[element.id] = element;
        }
      });
      setPipelineOptionList(tmpOptionList);
      setPipelineIdMap(tmpPipelineIdMap);
      setLoadingPipeline(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (eksIngestionInfo.createMethod === CreationMethod.Exists) {
      getApplicationLogList();
    }
  }, [eksIngestionInfo.createMethod]);

  return (
    <div>
      <PagePanel title={t("ekslog:ingest.step.specifyPipeline")}>
        <Alert
          content={
            <div>
              {t("ekslog:ingest.specifyPipeline.alert")}{" "}
              <b>{eksIngestionInfo.aosParas.domainName}</b>
            </div>
          }
        />
      </PagePanel>
      <HeaderPanel title={t("ekslog:ingest.specifyPipeline.creationMethod")}>
        <FormItem
          optionTitle={t("ekslog:ingest.specifyPipeline.creationMethod")}
          optionDesc=""
        >
          <Tiles
            value={eksIngestionInfo.createMethod}
            onChange={(event) => {
              changeCreationMethod(event.target.value);
            }}
            items={[
              {
                label: t("ekslog:ingest.specifyPipeline.createNew"),
                description: t("ekslog:ingest.specifyPipeline.createNewDesc"),
                value: CreationMethod.New,
              },
              {
                label: t("ekslog:ingest.specifyPipeline.chooseExists"),
                description: t(
                  "ekslog:ingest.specifyPipeline.chooseExistsDesc"
                ),
                value: CreationMethod.Exists,
              },
            ]}
          />
        </FormItem>
      </HeaderPanel>

      {eksIngestionInfo.createMethod === CreationMethod.New && (
        <>
          <HeaderPanel title={t("ekslog:ingest.specifyPipeline.index")}>
            <FormItem
              optionTitle={t("ekslog:ingest.specifyPipeline.indexPrefix")}
              optionDesc={t("ekslog:ingest.specifyPipeline.indexPrefixDesc")}
              errorText={
                eksIngestionInfo.indexPrefixRequiredError
                  ? t("applog:create.ingestSetting.indexNameError")
                  : eksIngestionInfo.indexPrefixFormatError
                  ? t("applog:create.ingestSetting.indexNameFormatError")
                  : ""
              }
            >
              <TextInput
                className="m-w-75p"
                value={eksIngestionInfo.aosParas.indexPrefix}
                placeholder="log-example"
                onChange={(event) => {
                  changeIndexPrefix(event.target.value);
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
                      eksIngestionInfo.shardsError
                        ? t("servicelog:cluster.shardNumError")
                        : ""
                    }
                  >
                    <div className="m-w-75p">
                      <TextInput
                        type="number"
                        value={eksIngestionInfo.aosParas.shardNumbers}
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
                        value={eksIngestionInfo.aosParas.replicaNumbers}
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

          <HeaderPanel title={t("applog:create.ingestSetting.buffer")}>
            <div>
              <FormItem
                optionTitle={t("applog:create.ingestSetting.shardNum")}
                optionDesc={t("applog:create.ingestSetting.shardNumDesc")}
                errorText={
                  eksIngestionInfo.shardNumFormatError
                    ? t("applog:create.ingestSetting.shardNumError")
                    : ""
                }
              >
                <TextInput
                  className="m-w-45p"
                  value={eksIngestionInfo.kdsParas.startShardNumber}
                  type="number"
                  onChange={(event) => {
                    changeStartShardNum(event.target.value);
                  }}
                  placeholder={t("applog:create.ingestSetting.shardNum")}
                />
              </FormItem>

              {!amplifyConfig.aws_project_region.startsWith("cn") ? (
                <>
                  <FormItem
                    optionTitle={t("applog:create.ingestSetting.enableAutoS")}
                    optionDesc={t(
                      "applog:create.ingestSetting.enableAutoSDesc"
                    )}
                  >
                    <Select
                      isI18N
                      className="m-w-45p"
                      optionList={YESNO_LIST}
                      value={enableAS}
                      onChange={(event) => {
                        setEnableAS(event.target.value);
                        changeEnableAS(
                          event.target.value === YesNo.Yes ? true : false
                        );
                      }}
                      placeholder=""
                    />
                  </FormItem>

                  <FormItem
                    optionTitle={t("applog:create.ingestSetting.maxShardNum")}
                    optionDesc={t(
                      "applog:create.ingestSetting.maxShardNumDesc"
                    )}
                    errorText={
                      eksIngestionInfo.maxShardNumFormatError
                        ? t("applog:create.ingestSetting.maxShardNumError")
                        : ""
                    }
                  >
                    <TextInput
                      disabled={!eksIngestionInfo.kdsParas.enableAutoScaling}
                      className="m-w-45p"
                      type="number"
                      value={eksIngestionInfo.kdsParas.maxShardNumber}
                      onChange={(event) => {
                        changeMaxShardNum(event.target.value);
                      }}
                      placeholder={t("applog:create.ingestSetting.maxShardNum")}
                    />
                  </FormItem>
                </>
              ) : (
                ""
              )}
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
                  eksIngestionInfo.warmTransError
                    ? t("applog:create.specifyOS.warmLogInvalid")
                    : ""
                }
              >
                <TextInput
                  readonly={!eksIngestionInfo.warmEnable}
                  className="m-w-45p"
                  type="number"
                  value={eksIngestionInfo.aosParas.warmLogTransition}
                  onChange={(event) => {
                    console.info(event.target.value);
                    changeWarmTransition(event.target.value);
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
                  eksIngestionInfo.coldTransError
                    ? t("applog:create.specifyOS.coldLogInvalid")
                    : ""
                }
              >
                <TextInput
                  readonly={!eksIngestionInfo.coldEnable}
                  className="m-w-45p"
                  type="number"
                  value={eksIngestionInfo.aosParas.coldLogTransition}
                  onChange={(event) => {
                    console.info(event.target.value);
                    changeColdTransition(event.target.value);
                  }}
                />
              </FormItem>
              <FormItem
                optionTitle={t("applog:create.specifyOS.logRetention")}
                optionDesc={t("applog:create.specifyOS.logRetentionDesc")}
                errorText={
                  eksIngestionInfo.retentionError
                    ? t("applog:create.specifyOS.logRetentionError")
                    : ""
                }
              >
                <TextInput
                  className="m-w-45p"
                  type="number"
                  value={eksIngestionInfo.aosParas.logRetention}
                  placeholder="180"
                  onChange={(event) => {
                    console.info(event.target.value);
                    changeLogRetention(event.target.value);
                  }}
                />
              </FormItem>
            </div>
          </HeaderPanel>
        </>
      )}

      {eksIngestionInfo.createMethod === CreationMethod.Exists && (
        <>
          <HeaderPanel
            title={t("ekslog:ingest.specifyPipeline.choosePipeline")}
          >
            <FormItem
              optionTitle={t("ekslog:ingest.specifyPipeline.pipeline")}
              optionDesc={t("ekslog:ingest.specifyPipeline.filterPipeline")}
              errorText={
                eksIngestionInfo.pipelineRequiredError
                  ? t("ekslog:ingest.specifyPipeline.pipelineRequiredError")
                  : ""
              }
            >
              <AutoComplete
                // disabled={loadingPipeline}
                className="m-w-75p"
                placeholder={t("ekslog:ingest.specifyPipeline.selectPipeline")}
                loading={loadingPipeline}
                optionList={pipelineOptionList}
                value={eksIngestionInfo.existsPipeline}
                onChange={(
                  event: React.ChangeEvent<HTMLInputElement>,
                  data
                ) => {
                  console.info(event, data);
                  changeExistsPipeline(data);
                }}
              />
            </FormItem>
          </HeaderPanel>
          {eksIngestionInfo.existsPipeline?.value && (
            <HeaderPanel
              title={t("ekslog:ingest.specifyPipeline.pipelineConfig")}
            >
              <>
                {loadingPipeline ? (
                  <LoadingText />
                ) : (
                  <div className="flex value-label-span">
                    <div className="flex-1">
                      <ValueWithLabel
                        label={t("ekslog:ingest.specifyPipeline.osIndexPrefix")}
                      >
                        {
                          pipelineIdMap?.[eksIngestionInfo.existsPipeline.value]
                            ?.aosParas.domainName
                        }
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel
                        label={t("ekslog:ingest.specifyPipeline.aos")}
                      >
                        <ExtLink
                          to={buildESLink(
                            amplifyConfig.aws_project_region,
                            pipelineIdMap?.[
                              eksIngestionInfo.existsPipeline.value
                            ]?.aosParas?.domainName || ""
                          )}
                        >
                          {
                            pipelineIdMap?.[
                              eksIngestionInfo.existsPipeline.value
                            ]?.aosParas?.domainName
                          }
                        </ExtLink>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel
                        label={t("ekslog:ingest.specifyPipeline.kds")}
                      >
                        <div>
                          <ExtLink
                            to={buildKDSLink(
                              amplifyConfig.aws_project_region,
                              pipelineIdMap?.[
                                eksIngestionInfo.existsPipeline.value
                              ]?.kdsParas?.streamName || ""
                            )}
                          >
                            {pipelineIdMap?.[
                              eksIngestionInfo.existsPipeline.value
                            ]?.kdsParas?.streamName || "-"}
                          </ExtLink>
                          {pipelineIdMap?.[
                            eksIngestionInfo.existsPipeline.value
                          ]?.kdsParas?.enableAutoScaling
                            ? t("applog:detail.autoScaling")
                            : ""}
                        </div>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel
                        label={t("ekslog:ingest.specifyPipeline.created")}
                      >
                        <div>
                          {formatLocalTime(
                            pipelineIdMap?.[
                              eksIngestionInfo.existsPipeline.value
                            ]?.createdDt || ""
                          )}
                        </div>
                      </ValueWithLabel>
                    </div>
                  </div>
                )}
              </>
            </HeaderPanel>
          )}
        </>
      )}
    </div>
  );
};

export default SpecifySettings;
