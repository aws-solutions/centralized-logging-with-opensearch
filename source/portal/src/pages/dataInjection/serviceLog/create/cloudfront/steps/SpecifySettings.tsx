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
import Alert from "components/Alert";
import { CreateLogMethod } from "assets/js/const";
// import S3Select from "components/S3Select";
import FormItem from "components/FormItem";
import ExtLink from "components/ExtLink";
import { SelectItem } from "components/Select/select";
import { appSyncRequestQuery } from "assets/js/request";
import { LoggingBucket, Resource, ResourceType } from "API";
import { getResourceLoggingBucket, listResources } from "graphql/queries";
import AutoComplete from "components/AutoComplete";
import { CloudFrontTaskProps } from "../CreateCloudFront";
import { OptionType } from "components/AutoComplete/autoComplete";
import TextInput from "components/TextInput";
import { buildCloudFrontLink } from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { AppStateProps, InfoBarTypes } from "reducer/appReducer";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
// import Select from "components/Select";

interface SpecifySettingsProps {
  cloudFrontTask: CloudFrontTaskProps;
  changeTaskType: (type: string) => void;
  changeS3Bucket: (bucket: string) => void;
  changeCloudFrontObj: (s3: OptionType | null) => void;
  changeLogPath: (logPath: string) => void;
  manualChangeBucket: (bucket: string) => void;
  autoS3EmptyError: boolean;
  manualS3EmptyError: boolean;
  setNextStepDisableStatus: (status: boolean) => void;
  setISChanging: (changing: boolean) => void;
  changeCrossAccount: (id: string) => void;
}

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const {
    cloudFrontTask,
    changeCloudFrontObj,
    manualChangeBucket,
    changeS3Bucket,
    changeTaskType,
    changeLogPath,
    autoS3EmptyError,
    manualS3EmptyError,
    setNextStepDisableStatus,
    setISChanging,
    changeCrossAccount,
  } = props;

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const { t } = useTranslation();

  // const [cloudFront, setCloudFront] = useState(
  //   cloudFrontTask.params.cloudFrontObj
  // );

  const [loadingCloudFrontList, setLoadingCloudFrontList] = useState(false);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [cloudFrontOptionList, setCloudFrontOptionList] = useState<
    SelectItem[]
  >([]);

  // const [infoText, setInfoText] = useState("");
  const [showInfoText, setShowInfoText] = useState(false);
  // const [successText, setSuccessText] = useState("");
  const [showSuccessText, setShowSuccessText] = useState(false);
  const [previewS3Path, setPreviewS3Path] = useState("");
  const [disabeCloudFront, setDisableCloudFront] = useState(false);

  const getCloudFrontList = async (accountId: string) => {
    try {
      setLoadingCloudFrontList(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.Distribution,
        accountId: accountId,
      });
      console.info("getCloudFrontList:", resData.data);
      const dataList: Resource[] = resData.data.listResources;
      const tmpOptionList: SelectItem[] = [];
      dataList.forEach((element) => {
        tmpOptionList.push({
          name: `${element.id}${
            element.description ? ` (${element.description})` : ""
          }`,
          value: element.id,
        });
      });
      setCloudFrontOptionList(tmpOptionList);
      setLoadingCloudFrontList(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getBucketPrefix = async (cloudFront: string) => {
    setLoadingBucket(true);
    setISChanging(true);
    const resData: any = await appSyncRequestQuery(getResourceLoggingBucket, {
      type: ResourceType.Distribution,
      resourceName: cloudFront,
      accountId: cloudFrontTask.logSourceAccountId,
    });
    console.info("getBucketPrefix:", resData.data);
    const logginBucket: LoggingBucket = resData?.data?.getResourceLoggingBucket;
    setLoadingBucket(false);
    setISChanging(false);
    changeS3Bucket(logginBucket?.bucket || "");
    changeLogPath(logginBucket?.prefix || "");
    setPreviewS3Path(`s3://${logginBucket.bucket}/${logginBucket.prefix}`);
    if (logginBucket.enabled) {
      setShowSuccessText(true);
    } else {
      setShowInfoText(true);
      setNextStepDisableStatus(true);
      setShowSuccessText(false);
    }
  };

  useEffect(() => {
    setShowSuccessText(false);
    setShowInfoText(false);
    setNextStepDisableStatus(false);
    if (
      cloudFrontTask.params.cloudFrontObj &&
      cloudFrontTask.params.cloudFrontObj.value
    ) {
      getBucketPrefix(cloudFrontTask.params.cloudFrontObj.value);
    }
  }, [cloudFrontTask.params.cloudFrontObj]);

  useEffect(() => {
    if (cloudFrontTask.params.taskType === CreateLogMethod.Automatic) {
      getCloudFrontList(cloudFrontTask.logSourceAccountId);
    }
  }, [cloudFrontTask.logSourceAccountId]);

  return (
    <div>
      <PagePanel title={t("servicelog:create.step.specifySetting")}>
        <div>
          <HeaderPanel title={t("servicelog:cloudfront.enabled")}>
            <div>
              <FormItem
                optionTitle={t("servicelog:cloudfront.method")}
                optionDesc=""
                infoType={InfoBarTypes.INGESTION_CREATION_METHOD}
              >
                <Tiles
                  value={cloudFrontTask.params.taskType}
                  onChange={(event) => {
                    changeTaskType(event.target.value);
                    changeCloudFrontObj(null);
                    // setCreationMethod(event.target.value);
                    if (event.target.value === CreateLogMethod.Automatic) {
                      changeLogPath("");
                      // getCloudFrontList();
                    }
                  }}
                  items={[
                    {
                      label: t("servicelog:cloudfront.auto"),
                      description: t("servicelog:cloudfront.autoDesc"),
                      value: CreateLogMethod.Automatic,
                    },
                    {
                      label: t("servicelog:cloudfront.manual"),
                      description: t("servicelog:cloudfront.manualDesc"),
                      value: CreateLogMethod.Manual,
                    },
                  ]}
                />
              </FormItem>
            </div>
          </HeaderPanel>

          <HeaderPanel title={t("servicelog:create.service.cloudfront")}>
            <div>
              <Alert content={t("servicelog:cloudfront.alert")} />
              <CrossAccountSelect
                accountId={cloudFrontTask.logSourceAccountId}
                changeAccount={(id) => {
                  changeCrossAccount(id);
                  changeCloudFrontObj(null);
                }}
                loadingAccount={(loading) => {
                  setDisableCloudFront(loading);
                }}
              />
              {cloudFrontTask.params.taskType === CreateLogMethod.Automatic && (
                <div className="pb-50">
                  <FormItem
                    optionTitle={t("servicelog:cloudfront.distribution")}
                    optionDesc={
                      <div>
                        {t("servicelog:cloudfront.distributionDesc")}
                        <ExtLink
                          to={buildCloudFrontLink(
                            amplifyConfig.aws_project_region,
                            ""
                          )}
                        >
                          {t("servicelog:cloudfront.curAccount")}
                        </ExtLink>
                        .
                      </div>
                    }
                    errorText={
                      autoS3EmptyError
                        ? t("servicelog:cloudfront.cloudfrontError")
                        : ""
                    }
                    warningText={
                      showInfoText
                        ? t("servicelog:cloudfront.cloudfrontWarning")
                        : ""
                    }
                    successText={
                      showSuccessText && previewS3Path
                        ? t("servicelog:cloudfront.savedTips") + previewS3Path
                        : ""
                    }
                  >
                    <AutoComplete
                      outerLoading
                      disabled={
                        loadingCloudFrontList ||
                        loadingBucket ||
                        disabeCloudFront
                      }
                      className="m-w-75p"
                      placeholder={t(
                        "servicelog:cloudfront.selectDistribution"
                      )}
                      loading={loadingCloudFrontList || loadingBucket}
                      optionList={cloudFrontOptionList}
                      value={cloudFrontTask.params.cloudFrontObj}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>,
                        data
                      ) => {
                        changeCloudFrontObj(data);
                      }}
                    />
                  </FormItem>
                </div>
              )}
              {cloudFrontTask.params.taskType === CreateLogMethod.Manual && (
                <div className="pb-50">
                  <FormItem
                    optionTitle={t("servicelog:cloudfront.distributionId")}
                    optionDesc={t("servicelog:cloudfront.distributionIdDesc")}
                  >
                    <TextInput
                      className="m-w-75p"
                      placeholder={t(
                        "servicelog:cloudfront.distributionIdPlace"
                      )}
                      value={cloudFrontTask.params.manualBucketName}
                      onChange={(event) => {
                        manualChangeBucket(event.target.value);
                      }}
                    />
                  </FormItem>
                  <FormItem
                    optionTitle={t("servicelog:cloudfront.logLocation")}
                    optionDesc={t("servicelog:cloudfront.logLocationDesc")}
                    errorText={
                      manualS3EmptyError
                        ? t("servicelog:cloudfront.logLocationError")
                        : ""
                    }
                  >
                    <TextInput
                      className="m-w-75p"
                      value={cloudFrontTask.params.manualBucketS3Path}
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
