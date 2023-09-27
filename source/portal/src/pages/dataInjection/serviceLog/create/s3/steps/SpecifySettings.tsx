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
import Alert from "components/Alert";
import { CreateLogMethod, S3_ACCESS_LOG_LINK } from "assets/js/const";
import FormItem from "components/FormItem";
import ExtLink from "components/ExtLink";
import { SelectItem } from "components/Select/select";
import { appSyncRequestQuery } from "assets/js/request";
import { LoggingBucket, Resource, ResourceType } from "API";
import { getResourceLoggingBucket, listResources } from "graphql/queries";
import AutoComplete from "components/AutoComplete";
import { S3TaskProps } from "../CreateS3";
import { OptionType } from "components/AutoComplete/autoComplete";
import TextInput from "components/TextInput";
import { InfoBarTypes } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import AutoEnableLogging from "../../common/AutoEnableLogging";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";

interface SpecifySettingsProps {
  s3Task: S3TaskProps;
  changeTaskType: (type: string) => void;
  changeS3Bucket: (bucket: string) => void;
  changeLogBucketObj: (s3: OptionType | null) => void;
  changeLogPath: (logPath: string) => void;
  manualChangeBucket: (bucket: string) => void;
  autoS3EmptyError: boolean;
  manualS3EmptyError: boolean;
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
    s3Task,
    changeLogBucketObj,
    manualChangeBucket,
    changeS3Bucket,
    changeTaskType,
    changeLogPath,
    autoS3EmptyError,
    manualS3EmptyError,
    manualS3PathInvalid,
    setNextStepDisableStatus,
    setISChanging,
    changeNeedEnableLogging,
    changeCrossAccount,
  } = props;
  const { t } = useTranslation();
  const [loadingS3List, setLoadingS3List] = useState(false);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [disableBucket, setDisableBucket] = useState(false);
  const [s3BucketOptionList, setS3BucketOptionList] = useState<SelectItem[]>(
    []
  );
  const [showInfoText, setShowInfoText] = useState(false);
  const [showSuccessText, setShowSuccessText] = useState(false);
  const [previewS3Path, setPreviewS3Path] = useState("");

  const getS3List = async (accountId: string) => {
    try {
      setS3BucketOptionList([]);
      setLoadingS3List(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.S3Bucket,
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
      setS3BucketOptionList(tmpOptionList);
      setLoadingS3List(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getBucketPrefix = async (bucket: string) => {
    setLoadingBucket(true);
    setISChanging(true);
    const resData: any = await appSyncRequestQuery(getResourceLoggingBucket, {
      accountId: s3Task.logSourceAccountId,
      type: ResourceType.S3Bucket,
      resourceName: bucket,
    });
    console.info("getBucketPrefix:", resData.data);
    const logginBucket: LoggingBucket = resData?.data?.getResourceLoggingBucket;
    setLoadingBucket(false);
    setISChanging(false);
    setPreviewS3Path(` s3://${logginBucket.bucket}/${logginBucket.prefix}`);
    if (logginBucket.enabled) {
      changeS3Bucket(logginBucket.bucket || "");
      changeLogPath(logginBucket.prefix || "");
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
    if (s3Task.params.logBucketObj && s3Task.params.logBucketObj.value) {
      getBucketPrefix(s3Task.params.logBucketObj.value);
    }
  }, [s3Task.params.logBucketObj]);

  useEffect(() => {
    if (s3Task.params.taskType === CreateLogMethod.Automatic) {
      getS3List(s3Task.logSourceAccountId);
    }
  }, [s3Task.logSourceAccountId]);

  useEffect(() => {
    changeNeedEnableLogging(showInfoText);
  }, [showInfoText]);

  return (
    <div>
      <PagePanel title={t("servicelog:create.step.specifySetting")}>
        <div>
          <HeaderPanel title={t("servicelog:s3.s3logEnable")}>
            <div>
              <FormItem
                optionTitle={t("servicelog:s3.creationMethod")}
                optionDesc=""
                infoType={InfoBarTypes.INGESTION_CREATION_METHOD}
              >
                <Tiles
                  value={s3Task.params.taskType}
                  onChange={(event) => {
                    changeTaskType(event.target.value);
                    changeLogBucketObj(null);
                    if (event.target.value === CreateLogMethod.Automatic) {
                      changeLogPath("");
                      getS3List(s3Task.logSourceAccountId);
                    }
                  }}
                  items={[
                    {
                      label: t("servicelog:s3.auto"),
                      description: t("servicelog:s3.autoDesc"),
                      value: CreateLogMethod.Automatic,
                    },
                    {
                      label: t("servicelog:s3.manual"),
                      description: t("servicelog:s3.manualDesc"),
                      value: CreateLogMethod.Manual,
                    },
                  ]}
                />
              </FormItem>
            </div>
          </HeaderPanel>

          <HeaderPanel title={t("servicelog:s3.title")}>
            <div>
              <Alert content={t("servicelog:s3.alert")} />
              <CrossAccountSelect
                disabled={loadingS3List}
                accountId={s3Task.logSourceAccountId}
                changeAccount={(id) => {
                  changeCrossAccount(id);
                  changeLogBucketObj(null);
                }}
                loadingAccount={(loading) => {
                  setDisableBucket(loading);
                }}
              />
              {s3Task.params.taskType === CreateLogMethod.Automatic && (
                <div className="pb-50">
                  <FormItem
                    optionTitle={t("servicelog:s3.bucket")}
                    optionDesc={
                      <div>
                        {t("servicelog:s3.bucketDesc")}
                        <ExtLink to={S3_ACCESS_LOG_LINK}>
                          {t("servicelog:s3.serverAccessLog")}
                        </ExtLink>
                      </div>
                    }
                    errorText={
                      autoS3EmptyError
                        ? t("servicelog:s3.bucketEmptyError")
                        : ""
                    }
                    successText={
                      showSuccessText && previewS3Path
                        ? t("servicelog:s3.savedTips") + previewS3Path
                        : ""
                    }
                  >
                    <AutoComplete
                      outerLoading
                      disabled={loadingS3List || loadingBucket || disableBucket}
                      className="m-w-75p"
                      placeholder={t("servicelog:s3.selectBucket")}
                      loading={loadingS3List || loadingBucket}
                      optionList={s3BucketOptionList}
                      value={s3Task.params.logBucketObj}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>,
                        data
                      ) => {
                        changeLogBucketObj(data);
                      }}
                    />
                  </FormItem>
                  {showInfoText && (
                    <AutoEnableLogging
                      title={t("servicelog:s3.noLogOutput")}
                      desc={
                        t("servicelog:s3.noLogOutputDesc") +
                        previewS3Path +
                        " ?"
                      }
                      accountId={s3Task.logSourceAccountId}
                      resourceType={ResourceType.S3Bucket}
                      resourceName={s3Task.source}
                      changeEnableStatus={(status) => {
                        setISChanging(status);
                      }}
                      changeLogBucketAndPrefix={(bucket, prefix, enabled) => {
                        changeS3Bucket(bucket || "");
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
              {s3Task.params.taskType === CreateLogMethod.Manual && (
                <div className="pb-50">
                  <FormItem
                    optionTitle={t("servicelog:s3.bucketName")}
                    optionDesc={t("servicelog:s3.bucketNameDesc")}
                  >
                    <TextInput
                      className="m-w-75p"
                      placeholder={t("servicelog:s3.inputBucket")}
                      value={s3Task.params.manualBucketName}
                      onChange={(event) => {
                        manualChangeBucket(event.target.value);
                      }}
                    />
                  </FormItem>
                  <FormItem
                    optionTitle={t("servicelog:s3.s3LogLocation")}
                    optionDesc={t("servicelog:s3.s3LogLocationDesc")}
                    errorText={
                      (manualS3EmptyError
                        ? t("servicelog:s3.s3LogLocationError")
                        : "") ||
                      (manualS3PathInvalid
                        ? t("servicelog:s3InvalidError")
                        : "")
                    }
                  >
                    <TextInput
                      className="m-w-75p"
                      value={s3Task.params.manualBucketS3Path}
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
