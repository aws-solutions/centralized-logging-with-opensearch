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
import React, { useState, useEffect } from "react";

import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import Tiles from "components/Tiles";
import { CreateLogMethod } from "assets/js/const";
import FormItem from "components/FormItem";
import { SelectItem } from "components/Select/select";
import { appSyncRequestQuery } from "assets/js/request";
import { Resource, ResourceType, DestinationType } from "API";
import { getResourceLogConfigs, listResources } from "graphql/queries";
import AutoComplete from "components/AutoComplete";
import { WAFTaskProps } from "../CreateWAF";
import { OptionType } from "components/AutoComplete/autoComplete";
import TextInput from "components/TextInput";
import { InfoBarTypes } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import AutoEnableLogging from "../../common/AutoEnableLogging";
import { buildWAFLink, splitStringToBucketAndPrefix } from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import IngestOptionSelect, { IngestOption } from "./IngestOptionSelect";
import SampleSchedule from "./SampleSchedule";
import { AnalyticEngineTypes } from "../../common/SpecifyAnalyticsEngine";
import { RootState } from "reducer/reducers";

export enum WAF_TYPE {
  CLOUDFRONT = "CLOUDFRONT",
  REGIONAL = "REGIONAL",
}

interface SpecifySettingsProps {
  wafTask: WAFTaskProps;
  changeTaskType: (type: string) => void;
  changeWAFBucket: (bucket: string) => void;
  changeWAFObj: (waf: OptionType | null) => void;
  changeLogPath: (logPath: string) => void;
  manualChangeACL: (acl: string) => void;
  autoWAFEmptyError: boolean;
  manualAclEmptyError: boolean;
  manualWAFEmptyError: boolean;
  manualS3PathInvalid: boolean;
  intervalValueError: boolean;
  setNextStepDisableStatus: (status: boolean) => void;
  setISChanging: (changing: boolean) => void;
  changeNeedEnableLogging: (need: boolean) => void;
  changeCrossAccount: (id: string) => void;
  changeIngestionOption: (option: string) => void;
  changeScheduleInterval: (interval: string) => void;
  changeLogSource: (source: string) => void;
  engineType: AnalyticEngineTypes;
}

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const {
    wafTask,
    changeWAFObj,
    manualChangeACL,
    changeWAFBucket,
    changeTaskType,
    changeLogPath,
    autoWAFEmptyError,
    manualAclEmptyError,
    manualWAFEmptyError,
    manualS3PathInvalid,
    intervalValueError,
    setNextStepDisableStatus,
    changeNeedEnableLogging,
    setISChanging,
    changeCrossAccount,
    changeIngestionOption,
    changeScheduleInterval,
    changeLogSource,
    engineType,
  } = props;
  const { t } = useTranslation();

  const [loadingWAFList, setLoadingWAFList] = useState(false);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [wafOptionList, setWAFOptionList] = useState<SelectItem[]>([]);

  const [showInfoText, setShowInfoText] = useState(false);
  const [showSuccessText, setShowSuccessText] = useState(false);
  const [previewS3Path, setPreviewS3Path] = useState("");
  const [logRegion, setLogRegion] = useState("");
  const [disableWAF, setDisableWAF] = useState(false);

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const getWAFList = async (accountId: string) => {
    try {
      setWAFOptionList([]);
      setLoadingWAFList(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.WAF,
        accountId: accountId,
      });
      console.info("domainNames:", resData.data);
      const dataList: Resource[] = resData.data.listResources;
      const tmpOptionList: SelectItem[] = [];
      dataList.forEach((element) => {
        tmpOptionList.push({
          name: `${element.name}`,
          value: element.id,
          description: element.description || "",
        });
      });
      setWAFOptionList(tmpOptionList);
      setLoadingWAFList(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getBucketPrefix = async (aclArn: string) => {
    setLoadingBucket(true);
    setISChanging(true);
    const resData: any = await appSyncRequestQuery(getResourceLogConfigs, {
      type: ResourceType.WAF,
      resourceName: aclArn,
      accountId: wafTask.logSourceAccountId,
    });
    const confs = resData?.data.getResourceLogConfigs;
    setLoadingBucket(false);
    setISChanging(false);
    if (confs.length > 0) {
      const { bucket, prefix } = splitStringToBucketAndPrefix(
        confs[0].destinationName
      );
      setPreviewS3Path(` s3://${bucket}/${prefix}`);
      changeWAFBucket(bucket || "");
      changeLogPath(prefix || "");
      setShowSuccessText(true);
      setLogRegion(confs[0].region);
      if (confs[0].region !== amplifyConfig.aws_project_region) {
        changeLogSource("S3_DIFF");
      } else {
        changeLogSource(confs[0].name || "");
      }
    } else {
      setShowInfoText(true);
      setShowSuccessText(false);
    }
  };

  useEffect(() => {
    setShowSuccessText(false);
    setShowInfoText(false);
    setNextStepDisableStatus(false);
    if (
      wafTask.params.wafObj &&
      wafTask.params.wafObj.value &&
      wafTask.params.ingestOption === IngestOption.FullRequest
    ) {
      getBucketPrefix(wafTask.params.wafObj.value);
    }
  }, [wafTask.params.wafObj, wafTask.params.ingestOption]);

  useEffect(() => {
    if (wafTask.params.taskType === CreateLogMethod.Automatic) {
      getWAFList(wafTask.logSourceAccountId);
    }
  }, [wafTask.logSourceAccountId, wafTask.params.taskType]);

  useEffect(() => {
    changeNeedEnableLogging(showInfoText);
  }, [showInfoText]);

  return (
    <div>
      <PagePanel title={t("servicelog:create.step.specifySetting")}>
        <div>
          <HeaderPanel title={t("servicelog:waf.logCreation")}>
            <div>
              <FormItem
                optionTitle={t("servicelog:waf.creationMethod")}
                optionDesc=""
                infoType={InfoBarTypes.INGESTION_CREATION_METHOD}
              >
                <Tiles
                  value={wafTask.params.taskType}
                  onChange={(event) => {
                    changeTaskType(event.target.value);
                    changeWAFObj(null);
                    if (event.target.value === CreateLogMethod.Automatic) {
                      changeLogPath("");
                    }
                  }}
                  items={[
                    {
                      label: t("servicelog:waf.auto"),
                      description: t("servicelog:waf.autoDesc"),
                      value: CreateLogMethod.Automatic,
                    },
                    {
                      label: t("servicelog:waf.manual"),
                      description: t("servicelog:waf.manualDesc"),
                      value: CreateLogMethod.Manual,
                    },
                  ]}
                />
              </FormItem>
            </div>
          </HeaderPanel>

          <HeaderPanel title={t("servicelog:waf.title")}>
            <div>
              <CrossAccountSelect
                disabled={loadingWAFList}
                accountId={wafTask.logSourceAccountId}
                changeAccount={(id) => {
                  changeCrossAccount(id);
                  changeWAFObj(null);
                }}
                loadingAccount={(loading) => {
                  setDisableWAF(loading);
                }}
              />
              {wafTask.params.taskType === CreateLogMethod.Automatic && (
                <div className="pb-50">
                  <FormItem
                    optionTitle={t("servicelog:waf.acl")}
                    optionDesc={<div>{t("servicelog:waf.aclDesc")}</div>}
                    errorText={
                      autoWAFEmptyError ? t("servicelog:waf.aclEmptyError") : ""
                    }
                  >
                    <AutoComplete
                      outerLoading
                      disabled={loadingBucket || disableWAF}
                      className="m-w-75p"
                      placeholder={t("servicelog:waf.selectWAF")}
                      loading={loadingWAFList || loadingBucket}
                      optionList={wafOptionList}
                      value={wafTask.params.wafObj}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>,
                        data
                      ) => {
                        changeWAFObj(data);
                      }}
                    />
                  </FormItem>
                  <IngestOptionSelect
                    ingestOption={wafTask.params.ingestOption}
                    onlyFullRequest={
                      engineType === AnalyticEngineTypes.LIGHT_ENGINE
                    }
                    changeIngestOption={(option) => {
                      changeIngestionOption(option);
                    }}
                    warningText={
                      showSuccessText && wafTask.params.logSource === "S3" ? (
                        <div>{t("servicelog:waf.sourceWAFTip")}</div>
                      ) : (
                        ""
                      )
                    }
                    successText={
                      showSuccessText &&
                      previewS3Path &&
                      wafTask.params.logSource === "KDF-to-S3"
                        ? t("servicelog:waf.savedTips") + previewS3Path
                        : ""
                    }
                    errorText={
                      showSuccessText &&
                      previewS3Path &&
                      wafTask.params.logSource === "S3_DIFF"
                        ? t("servicelog:waf.diffRegion", {
                            bucket: previewS3Path,
                            logRegion: logRegion,
                            homeRegion: amplifyConfig.aws_project_region,
                          })
                        : ""
                    }
                  />
                  {showInfoText && (
                    <AutoEnableLogging
                      title={t("servicelog:waf.noLogOutput")}
                      desc={t("servicelog:waf.noLogOutputDesc") + " ?"}
                      accountId={wafTask.logSourceAccountId}
                      destName=""
                      destType={DestinationType.S3}
                      resourceType={ResourceType.WAF}
                      resourceName={wafTask.arnId}
                      link={buildWAFLink(amplifyConfig.aws_project_region)}
                      changeEnableStatus={(status) => {
                        setISChanging(status);
                      }}
                      changeLogSource={(source) => {
                        changeLogSource(source);
                      }}
                      changeLogBucketAndPrefix={(bucket, prefix, enabled) => {
                        changeWAFBucket(bucket || "");
                        changeLogPath(prefix || "");
                        if (enabled) {
                          setPreviewS3Path(` s3://${bucket}/${prefix}`);
                          setShowSuccessText(true);
                          setShowInfoText(false);
                        } else {
                          setShowInfoText(true);
                          setShowSuccessText(false);
                        }
                      }}
                    />
                  )}
                  {wafTask.params.ingestOption ===
                    IngestOption.SampledRequest && (
                    <SampleSchedule
                      interval={wafTask.params.interval}
                      changeScheduleInterval={(interval) => {
                        changeScheduleInterval(interval);
                      }}
                      errorText={
                        intervalValueError
                          ? t("servicelog:waf.sampleScheduleError")
                          : ""
                      }
                    />
                  )}
                </div>
              )}
              {wafTask.params.taskType === CreateLogMethod.Manual && (
                <div className="pb-50">
                  <FormItem
                    optionTitle={t("servicelog:waf.aclName")}
                    optionDesc={t("servicelog:waf.aclNameDesc")}
                    errorText={
                      manualAclEmptyError
                        ? t("servicelog:waf.manualAclEmptyError")
                        : ""
                    }
                  >
                    <TextInput
                      className="m-w-75p"
                      placeholder={t("servicelog:waf.inputWAF")}
                      value={wafTask.params.webACLNames}
                      onChange={(event) => {
                        manualChangeACL(event.target.value);
                      }}
                    />
                  </FormItem>
                  <IngestOptionSelect
                    onlyFullRequest={
                      engineType === AnalyticEngineTypes.LIGHT_ENGINE
                    }
                    ingestOption={wafTask.params.ingestOption}
                    changeIngestOption={(option) => {
                      changeIngestionOption(option);
                    }}
                  />
                  {wafTask.params.ingestOption === IngestOption.FullRequest && (
                    <FormItem
                      optionTitle={t("servicelog:waf.logLocation")}
                      optionDesc={t("servicelog:waf.logLocationDesc")}
                      errorText={
                        (manualWAFEmptyError
                          ? t("servicelog:waf.logLocationError")
                          : "") ||
                        (manualS3PathInvalid
                          ? t("servicelog:s3InvalidError")
                          : "")
                      }
                    >
                      <TextInput
                        className="m-w-75p"
                        value={wafTask.params.manualBucketWAFPath}
                        placeholder="s3://bucket/prefix"
                        onChange={(event) => {
                          changeLogPath(event.target.value);
                        }}
                      />
                    </FormItem>
                  )}

                  {wafTask.params.ingestOption ===
                    IngestOption.SampledRequest && (
                    <SampleSchedule
                      interval={wafTask.params.interval}
                      changeScheduleInterval={(interval) => {
                        changeScheduleInterval(interval);
                      }}
                      errorText={
                        intervalValueError
                          ? t("servicelog:waf.sampleScheduleError")
                          : ""
                      }
                    />
                  )}
                </div>
              )}
            </div>
          </HeaderPanel>
        </div>
      </PagePanel>
    </div>
  );
};

export default SpecifySettings;
