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
import Alert from "components/Alert";
import FormItem from "components/FormItem";
import { appSyncRequestQuery } from "assets/js/request";
import { LoggingBucket, ResourceType } from "API";
import { getResourceLoggingBucket } from "graphql/queries";
import { InfoBarTypes } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import { ConfigTaskProps } from "../CreateConfig";
import Tiles from "components/Tiles";
import { CreateLogMethod } from "assets/js/const";
import TextInput from "components/TextInput";
import { splitStringToBucketAndPrefix } from "assets/js/utils";
import { AlertType } from "components/Alert/alert";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import LoadingText from "components/LoadingText";

interface SpecifySettingsProps {
  configTask: ConfigTaskProps;
  configEmptyError: boolean;
  manualConfigEmptyError: boolean;
  manualS3PathInvalid: boolean;
  changeTaskType: (type: string) => void;
  changeConfigName: (name: string) => void;
  changeManualBucketS3Path: (path: string) => void;
  changeLogBucket: (bucket: string) => void;
  changeLogPrefix: (path: string) => void;
  setNextStepDisableStatus: (status: boolean) => void;
  changeCrossAccount: (id: string) => void;
}

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const {
    configTask,
    configEmptyError,
    manualConfigEmptyError,
    manualS3PathInvalid,
    changeTaskType,
    changeConfigName,
    changeManualBucketS3Path,
    changeLogBucket,
    changeLogPrefix,
    setNextStepDisableStatus,
    changeCrossAccount,
  } = props;
  const { t } = useTranslation();

  const [showSuccessText, setShowSuccessText] = useState(false);
  const [showInfoText, setShowInfoText] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createMethod, setCreateMethod] = useState(configTask.params.taskType);
  const [previewConfigPath, setPreviewConfigPath] = useState("");
  const [disableConfig, setDisableConfig] = useState(false);

  const getConfigBucketAndPrefix = async (accountId: string) => {
    setIsLoading(true);
    setNextStepDisableStatus(true);

    const resData: any = await appSyncRequestQuery(getResourceLoggingBucket, {
      type: ResourceType.Config,
      resourceName: "",
      accountId: accountId,
    });
    const logginBucket: LoggingBucket = resData?.data?.getResourceLoggingBucket;
    if (logginBucket.enabled) {
      setShowSuccessText(true);
      setShowInfoText(false);
      setPreviewConfigPath(
        `s3://${logginBucket.bucket}/${logginBucket.prefix}`
      );
      changeLogBucket(logginBucket.bucket || "");
      changeLogPrefix(logginBucket.prefix || "");
      setNextStepDisableStatus(false);
    } else {
      setNextStepDisableStatus(true);
      setShowInfoText(true);
      setShowSuccessText(false);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    setNextStepDisableStatus(false);
    setShowInfoText(false);
    setShowSuccessText(false);
    if (createMethod === CreateLogMethod.Automatic) {
      getConfigBucketAndPrefix(configTask.logSourceAccountId);
    }
  }, [createMethod]);

  useEffect(() => {
    getConfigBucketAndPrefix(configTask.logSourceAccountId);
  }, [configTask.logSourceAccountId]);

  return (
    <div>
      <PagePanel title={t("servicelog:create.step.specifySetting")}>
        <div>
          <HeaderPanel title={t("servicelog:config.logCreation")}>
            <div>
              <FormItem
                optionTitle={t("servicelog:config.creationMethod")}
                optionDesc=""
                infoType={InfoBarTypes.INGESTION_CREATION_METHOD}
              >
                <Tiles
                  value={configTask.params.taskType}
                  onChange={(event) => {
                    if (!isLoading) {
                      changeTaskType(event.target.value);
                      setCreateMethod(event.target.value);
                    }
                  }}
                  items={[
                    {
                      label: t("servicelog:config.auto"),
                      description: t("servicelog:config.autoDesc"),
                      value: CreateLogMethod.Automatic,
                    },
                    {
                      label: t("servicelog:config.manual"),
                      description: t("servicelog:config.manualDesc"),
                      value: CreateLogMethod.Manual,
                    },
                  ]}
                />
              </FormItem>
            </div>
          </HeaderPanel>
          <HeaderPanel title={t("servicelog:create.service.config")}>
            <div>
              <CrossAccountSelect
                disabled={isLoading}
                accountId={configTask.logSourceAccountId}
                changeAccount={(id) => {
                  changeCrossAccount(id);
                }}
                loadingAccount={(loading) => {
                  setDisableConfig(loading);
                }}
              />

              {isLoading ? (
                <LoadingText />
              ) : (
                <div>
                  {showInfoText && (
                    <Alert
                      content={t("servicelog:config.needEnableLogging")}
                      type={AlertType.Error}
                    />
                  )}
                  {configTask.params.taskType === CreateLogMethod.Automatic && (
                    <div className="pb-50">
                      <FormItem
                        optionTitle={t("servicelog:config.configName")}
                        optionDesc={t("servicelog:config.configNameDesc")}
                        errorText={
                          configEmptyError
                            ? t("servicelog:config.configNameEmptyError")
                            : ""
                        }
                        successText={
                          showSuccessText && previewConfigPath
                            ? t("servicelog:config.savedTips") +
                              previewConfigPath
                            : ""
                        }
                      >
                        <TextInput
                          disabled={disableConfig}
                          className="m-w-75p"
                          placeholder={t("servicelog:config.configName")}
                          value={configTask.source}
                          onChange={(event) => {
                            changeConfigName(event.target.value);
                          }}
                        />
                      </FormItem>
                    </div>
                  )}
                  {configTask.params.taskType === CreateLogMethod.Manual && (
                    <div className="pb-50">
                      <FormItem
                        optionTitle={t("servicelog:config.configName")}
                        optionDesc={t("servicelog:config.configNameDesc")}
                        errorText={
                          configEmptyError
                            ? t("servicelog:config.configNameEmptyError")
                            : ""
                        }
                      >
                        <TextInput
                          className="m-w-75p"
                          placeholder={t("servicelog:config.configName")}
                          value={configTask.source}
                          onChange={(event) => {
                            changeConfigName(event.target.value);
                          }}
                        />
                      </FormItem>
                      <FormItem
                        optionTitle={t("servicelog:config.logLocation")}
                        optionDesc={t("servicelog:config.logLocationDesc")}
                        errorText={
                          (manualConfigEmptyError
                            ? t("servicelog:config.logLocationError")
                            : "") ||
                          (manualS3PathInvalid
                            ? t("servicelog:s3InvalidError")
                            : "")
                        }
                      >
                        <TextInput
                          className="m-w-75p"
                          value={configTask.params.manualBucketS3Path}
                          placeholder="s3://bucket/prefix"
                          onChange={(event) => {
                            const { bucket, prefix } =
                              splitStringToBucketAndPrefix(event.target.value);
                            changeLogPrefix(prefix);
                            changeLogBucket(bucket);
                            changeManualBucketS3Path(event.target.value);
                          }}
                        />
                      </FormItem>
                    </div>
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
