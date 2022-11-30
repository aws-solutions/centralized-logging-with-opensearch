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

import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import Tiles from "components/Tiles";
import { CreateLogMethod } from "assets/js/const";
// import WAFSelect from "components/WAFSelect";
import FormItem from "components/FormItem";
import { SelectItem } from "components/Select/select";
import { appSyncRequestQuery } from "assets/js/request";
import {
  LoggingBucket,
  LoggingBucketSource,
  Resource,
  ResourceType,
} from "API";
import { getResourceLoggingBucket, listResources } from "graphql/queries";
import AutoComplete from "components/AutoComplete";
import { WAFTaskProps } from "../CreateWAF";
import { OptionType } from "components/AutoComplete/autoComplete";
import TextInput from "components/TextInput";
import { AppStateProps, InfoBarTypes } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import AutoEnableLogging from "../../common/AutoEnableLogging";
import { buildWAFLink } from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import IngestOptionSelect, { IngestOption } from "./IngestOptionSelect";
import SampleSchedule from "./SampleSchedule";
// import Select from "components/Select";

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
  intervalValueError: boolean;
  setNextStepDisableStatus: (status: boolean) => void;
  setISChanging: (changing: boolean) => void;
  changeNeedEnableLogging: (need: boolean) => void;
  changeCrossAccount: (id: string) => void;
  changeIngestionOption: (option: string) => void;
  changeScheduleInterval: (interval: string) => void;
  changeLogSource: (source: string) => void;
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
    intervalValueError,
    setNextStepDisableStatus,
    changeNeedEnableLogging,
    setISChanging,
    changeCrossAccount,
    changeIngestionOption,
    changeScheduleInterval,
    changeLogSource,
  } = props;
  const { t } = useTranslation();
  // const [waf, setWAF] = useState(wafTask.params.wafObj);
  // const [wafManualBucketName, setWAFManualBucketName] = useState("");

  const [loadingWAFList, setLoadingWAFList] = useState(false);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [wafOptionList, setWAFOptionList] = useState<SelectItem[]>([]);

  // const [infoText, setInfoText] = useState("");
  const [showInfoText, setShowInfoText] = useState(false);
  // const [successText, setSuccessText] = useState("");
  const [showSuccessText, setShowSuccessText] = useState(false);
  const [previewS3Path, setPreviewS3Path] = useState("");
  const [disableWAF, setDisableWAF] = useState(false);

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  const getWAFList = async (accountId: string) => {
    try {
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

  const getBucketPrefix = async (bucket: string) => {
    setLoadingBucket(true);
    setISChanging(true);
    const resData: any = await appSyncRequestQuery(getResourceLoggingBucket, {
      type: ResourceType.WAF,
      resourceName: bucket,
      accountId: wafTask.logSourceAccountId,
    });
    console.info("getBucketPrefix:", resData.data);
    const logginBucket: LoggingBucket = resData?.data?.getResourceLoggingBucket;
    setLoadingBucket(false);
    setISChanging(false);
    setPreviewS3Path(` s3://${logginBucket.bucket}/${logginBucket.prefix}`);
    if (logginBucket.enabled) {
      changeWAFBucket(logginBucket.bucket || "");
      changeLogPath(logginBucket.prefix || "");
      changeLogSource(logginBucket.source || "");
      // changeNeedAutoCreateLogging(false);
      setShowSuccessText(true);
    } else {
      setShowInfoText(true);
      setShowSuccessText(false);
      // changeNeedAutoCreateLogging(true);
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
                    changeIngestOption={(option) => {
                      changeIngestionOption(option);
                    }}
                    warningText={
                      showSuccessText &&
                      wafTask.params.logSource === LoggingBucketSource.WAF ? (
                        <div>{t("servicelog:waf.sourceWAFTip")}</div>
                      ) : (
                        ""
                      )
                    }
                    successText={
                      showSuccessText &&
                      previewS3Path &&
                      wafTask.params.logSource ===
                        LoggingBucketSource.KinesisDataFirehoseForWAF
                        ? t("servicelog:waf.savedTips") + previewS3Path
                        : ""
                    }
                  />
                  {showInfoText && (
                    <AutoEnableLogging
                      title={t("servicelog:waf.noLogOutput")}
                      desc={
                        t("servicelog:waf.noLogOutputDesc") +
                        previewS3Path +
                        " ?"
                      }
                      accountId={wafTask.logSourceAccountId}
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
                        manualWAFEmptyError
                          ? t("servicelog:waf.logLocationError")
                          : ""
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
