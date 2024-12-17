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
import { CreateLogMethod } from "assets/js/const";
import FormItem from "components/FormItem";
import { SelectItem } from "components/Select/select";
import { appSyncRequestQuery } from "assets/js/request";
import { LoggingBucket, Resource, ResourceType } from "API";
import { getResourceLoggingBucket, listResources } from "graphql/queries";
import AutoComplete from "components/AutoComplete";
import { ELBTaskProps } from "../CreateELB";
import { OptionType } from "components/AutoComplete/autoComplete";
import TextInput from "components/TextInput";
import { useTranslation } from "react-i18next";
import AutoEnableLogging from "../../common/AutoEnableLogging";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import LogSourceEnable from "../../common/LogSourceEnable";
import { defaultStr } from "assets/js/utils";
import LogLocation from "../../common/LogLocation";

interface SpecifySettingsProps {
  elbTask: ELBTaskProps;
  changeTaskType: (type: string) => void;
  changeELBBucket: (bucket: string) => void;
  changeELBObj: (elb: OptionType | null) => void;
  changeLogPath: (logPath: string) => void;
  manualChangeBucket: (bucket: string) => void;
  autoELBEmptyError: boolean;
  manualELBEmptyError: boolean;
  manualS3PathInvalid: boolean;
  setNextStepDisableStatus: (status: boolean) => void;
  setISChanging: (changing: boolean) => void;
  changeNeedEnableLogging: (need: boolean) => void;
  changeCrossAccount: (id: string) => void;
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
    manualS3PathInvalid,
    setNextStepDisableStatus,
    changeNeedEnableLogging,
    setISChanging,
    changeCrossAccount,
  } = props;
  const { t } = useTranslation();

  const [loadingELBList, setLoadingELBList] = useState(false);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [elbOptionList, setELBOptionList] = useState<SelectItem[]>([]);

  const [showInfoText, setShowInfoText] = useState(false);
  const [showSuccessText, setShowSuccessText] = useState(false);
  const [previewS3Path, setPreviewS3Path] = useState("");
  const [disableELB, setDisableELB] = useState(false);

  const getELBList = async (accountId: string) => {
    try {
      setELBOptionList([]);
      setLoadingELBList(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.ELB,
        accountId: accountId,
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
      accountId: elbTask.logSourceAccountId,
    });
    console.info("getBucketPrefix:", resData.data);
    const logginBucket: LoggingBucket = resData?.data?.getResourceLoggingBucket;
    setLoadingBucket(false);
    setISChanging(false);
    setPreviewS3Path(` s3://${logginBucket.bucket}/${logginBucket.prefix}`);
    if (logginBucket.enabled) {
      changeELBBucket(defaultStr(logginBucket.bucket));
      changeLogPath(defaultStr(logginBucket.prefix));
      setShowSuccessText(true);
    } else {
      setShowInfoText(true);
      setShowSuccessText(false);
    }
  };

  useEffect(() => {
    setShowSuccessText(false);
    setShowInfoText(false);
    setNextStepDisableStatus(false);
    if (elbTask.params.elbObj?.value) {
      getBucketPrefix(elbTask.params.elbObj.value);
    }
  }, [elbTask.params.elbObj]);

  useEffect(() => {
    if (elbTask.params.taskType === CreateLogMethod.Automatic) {
      getELBList(elbTask.logSourceAccountId);
    }
  }, [elbTask.logSourceAccountId]);

  useEffect(() => {
    changeNeedEnableLogging(showInfoText);
  }, [showInfoText]);

  return (
    <div>
      <PagePanel title={t("step.logSource")}>
        <div>
          <LogSourceEnable
            value={elbTask.params.taskType}
            onChange={(value) => {
              changeTaskType(value);
              changeELBObj(null);
              if (value === CreateLogMethod.Automatic) {
                changeLogPath("");
              }
            }}
          />
          <HeaderPanel
            title={t("servicelog:create.awsServiceLogSettings")}
            desc={t("servicelog:create.awsServiceLogSettingsDesc")}
          >
            <div>
              <CrossAccountSelect
                disabled={loadingELBList}
                accountId={elbTask.logSourceAccountId}
                changeAccount={(id) => {
                  changeCrossAccount(id);
                  changeELBObj(null);
                }}
                loadingAccount={(loading) => {
                  setDisableELB(loading);
                }}
              />
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
                        ? t("servicelog:create.savedTips") + previewS3Path
                        : ""
                    }
                  >
                    <AutoComplete
                      outerLoading
                      disabled={loadingBucket || disableELB || loadingELBList}
                      className="m-w-75p"
                      placeholder={t("servicelog:elb.selectALB")}
                      loading={loadingELBList || loadingBucket}
                      optionList={elbOptionList}
                      value={elbTask.params.elbObj}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>,
                        data
                      ) => {
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
                      accountId={elbTask.logSourceAccountId}
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
                  <LogLocation
                    manualS3EmptyError={manualELBEmptyError}
                    manualS3PathInvalid={manualS3PathInvalid}
                    logLocation={elbTask.params.manualBucketELBPath}
                    changeLogPath={(value) => {
                      changeLogPath(value);
                    }}
                  />
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
