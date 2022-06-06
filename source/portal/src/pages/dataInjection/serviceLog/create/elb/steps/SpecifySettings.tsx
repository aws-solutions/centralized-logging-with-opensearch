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
// import ELBSelect from "components/ELBSelect";
import FormItem from "components/FormItem";
import { SelectItem } from "components/Select/select";
import { appSyncRequestQuery } from "assets/js/request";
import { LoggingBucket, Resource, ResourceType } from "API";
import { getResourceLoggingBucket, listResources } from "graphql/queries";
import AutoComplete from "components/AutoComplete";
import { ELBTaskProps } from "../CreateELB";
import { OptionType } from "components/AutoComplete/autoComplete";
import TextInput from "components/TextInput";
import { InfoBarTypes } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import AutoEnableLogging from "../../common/AutoEnableLogging";
// import Select from "components/Select";

interface SpecifySettingsProps {
  elbTask: ELBTaskProps;
  changeTaskType: (type: string) => void;
  changeELBBucket: (bucket: string) => void;
  changeELBObj: (elb: OptionType) => void;
  changeLogPath: (logPath: string) => void;
  manualChangeBucket: (bucket: string) => void;
  autoELBEmptyError: boolean;
  manualELBEmptyError: boolean;
  setNextStepDisableStatus: (status: boolean) => void;
  setISChanging: (changing: boolean) => void;
  changeNeedEnableLogging: (need: boolean) => void;
}

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const {
    elbTask,
    changeELBObj,
    manualChangeBucket,
    changeELBBucket,
    changeTaskType,
    changeLogPath,
    autoELBEmptyError,
    manualELBEmptyError,
    setNextStepDisableStatus,
    changeNeedEnableLogging,
    setISChanging,
  } = props;
  const { t } = useTranslation();
  const [elb, setELB] = useState(elbTask.params.elbObj);
  // const [elbManualBucketName, setELBManualBucketName] = useState("");

  const [loadingELBList, setLoadingELBList] = useState(false);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [elbOptionList, setELBOptionList] = useState<SelectItem[]>([]);

  // const [infoText, setInfoText] = useState("");
  const [showInfoText, setShowInfoText] = useState(false);
  const [showSuccessText, setShowSuccessText] = useState(false);
  const [previewS3Path, setPreviewS3Path] = useState("");

  const getELBList = async () => {
    try {
      setLoadingELBList(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.ELB,
      });
      console.info("domainNames:", resData.data);
      const dataList: Resource[] = resData.data.listResources;
      const tmpOptionList: SelectItem[] = [];
      dataList.forEach((element) => {
        tmpOptionList.push({
          name: `${element.name}`,
          value: element.id,
        });
      });
      setELBOptionList(tmpOptionList);
      setLoadingELBList(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getBucketPrefix = async (bucket: string) => {
    setLoadingBucket(true);
    setISChanging(true);
    const resData: any = await appSyncRequestQuery(getResourceLoggingBucket, {
      type: ResourceType.ELB,
      resourceName: bucket,
    });
    console.info("getBucketPrefix:", resData.data);
    const logginBucket: LoggingBucket = resData?.data?.getResourceLoggingBucket;
    setLoadingBucket(false);
    setISChanging(false);
    setPreviewS3Path(` s3://${logginBucket.bucket}/${logginBucket.prefix}`);
    if (logginBucket.enabled) {
      changeELBBucket(logginBucket.bucket || "");
      changeLogPath(logginBucket.prefix || "");
      // changeNeedAutoCreateLogging(false);
      setShowSuccessText(true);
    } else {
      setShowInfoText(true);
      setShowSuccessText(false);
      // changeNeedAutoCreateLogging(true);
    }
  };

  useEffect(() => {
    console.info("elb:", elb);
    setShowSuccessText(false);
    setShowInfoText(false);
    setNextStepDisableStatus(false);
    if (elb && elb.value) {
      getBucketPrefix(elb.value);
    }
  }, [elb]);

  useEffect(() => {
    if (elbTask.params.taskType === CreateLogMethod.Automatic) {
      getELBList();
    }
  }, []);

  useEffect(() => {
    changeNeedEnableLogging(showInfoText);
  }, [showInfoText]);

  return (
    <div>
      <PagePanel title={t("servicelog:create.step.specifySetting")}>
        <div>
          <HeaderPanel title={t("servicelog:elb.logCreation")}>
            <div>
              <FormItem
                optionTitle={t("servicelog:elb.creationMethod")}
                optionDesc=""
                infoType={InfoBarTypes.INGESTION_CREATION_METHOD}
              >
                <Tiles
                  value={elbTask.params.taskType}
                  onChange={(event) => {
                    changeTaskType(event.target.value);
                    setELB(null);
                    // setCreationMethod(event.target.value);
                    if (event.target.value === CreateLogMethod.Automatic) {
                      changeLogPath("");
                      getELBList();
                    }
                  }}
                  items={[
                    {
                      label: t("servicelog:elb.auto"),
                      description: t("servicelog:elb.autoDesc"),
                      value: CreateLogMethod.Automatic,
                    },
                    {
                      label: t("servicelog:elb.manual"),
                      description: t("servicelog:elb.manualDesc"),
                      value: CreateLogMethod.Manual,
                    },
                  ]}
                />
              </FormItem>
            </div>
          </HeaderPanel>

          <HeaderPanel title={t("servicelog:elb.title")}>
            <div>
              {elbTask.params.taskType === CreateLogMethod.Automatic && (
                <div className="pb-50">
                  <FormItem
                    optionTitle={t("servicelog:elb.alb")}
                    optionDesc={<div>{t("servicelog:elb.albDesc")}</div>}
                    errorText={
                      autoELBEmptyError ? t("servicelog:elb.elbEmptyError") : ""
                    }
                    successText={
                      showSuccessText && previewS3Path
                        ? t("servicelog:elb.savedTips") + previewS3Path
                        : ""
                    }
                  >
                    <AutoComplete
                      disabled={loadingBucket}
                      className="m-w-75p"
                      placeholder={t("servicelog:elb.selectALB")}
                      loading={loadingELBList}
                      optionList={elbOptionList}
                      value={elb}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>,
                        data
                      ) => {
                        setELB(data);
                        changeELBObj(data);
                      }}
                    />
                  </FormItem>
                  {showInfoText && (
                    <AutoEnableLogging
                      title={t("servicelog:elb.noLogOutput")}
                      desc={
                        t("servicelog:elb.noLogOutputDesc") +
                        previewS3Path +
                        " ?"
                      }
                      resourceType={ResourceType.ELB}
                      resourceName={elbTask.arnId}
                      changeEnableStatus={(status) => {
                        setISChanging(status);
                      }}
                      changeLogBucketAndPrefix={(bucket, prefix, enabled) => {
                        changeELBBucket(bucket || "");
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
                </div>
              )}
              {elbTask.params.taskType === CreateLogMethod.Manual && (
                <div className="pb-50">
                  <FormItem
                    optionTitle={t("servicelog:elb.albName")}
                    optionDesc={t("servicelog:elb.albNameDesc")}
                  >
                    <TextInput
                      className="m-w-75p"
                      placeholder={t("servicelog:elb.inputALB")}
                      value={elbTask.params.manualBucketName}
                      onChange={(event) => {
                        manualChangeBucket(event.target.value);
                      }}
                    />
                  </FormItem>
                  <FormItem
                    optionTitle={t("servicelog:elb.logLocation")}
                    optionDesc={t("servicelog:elb.logLocationDesc")}
                    errorText={
                      manualELBEmptyError
                        ? t("servicelog:elb.logLocationError")
                        : ""
                    }
                  >
                    <TextInput
                      className="m-w-75p"
                      value={elbTask.params.manualBucketELBPath}
                      placeholder="s3://bucket/prefix"
                      onChange={(event) => {
                        changeLogPath(event.target.value);
                      }}
                    />
                  </FormItem>
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
