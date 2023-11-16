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
import ExtLink from "components/ExtLink";
import { SelectItem } from "components/Select/select";
import { appSyncRequestQuery } from "assets/js/request";
import { Resource, ResourceType } from "API";
import { listResources } from "graphql/queries";
import AutoComplete from "components/AutoComplete";
import { CloudFrontTaskProps } from "../CreateCloudFront";
import { OptionType } from "components/AutoComplete/autoComplete";
import TextInput from "components/TextInput";
import { buildCloudFrontLink } from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { InfoBarTypes } from "reducer/appReducer";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import SourceType from "../comps/SourceType";
import { RootState } from "reducer/reducers";

interface SpecifySettingsProps {
  cloudFrontTask: CloudFrontTaskProps;
  changeTaskType: (type: string) => void;
  changeS3Bucket: (bucket: string) => void;
  changeCloudFrontObj: (s3: OptionType | null) => void;
  changeLogPath: (logPath: string) => void;
  manualChangeBucket: (bucket: string) => void;
  autoS3EmptyError: boolean;
  manualS3EmptyError: boolean;
  manualS3PathInvalid: boolean;
  showConfirmError: boolean;
  logTypeEmptyError: boolean;
  samplingRateError: boolean;
  shardNumError: boolean;
  maxShardNumError: boolean;
  standardOnly?: boolean;
  setNextStepDisableStatus: (status: boolean) => void;
  setISChanging: (changing: boolean) => void;
  changeCrossAccount: (id: string) => void;
  changeLogType: (type: string) => void;
  changeFieldType: (type: string) => void;
  changeSamplingRate: (rate: string) => void;
  changeCustomFields: (fields: string[]) => void;
  changeMinCapacity: (num: string) => void;
  changeEnableAS: (enable: string) => void;
  changeMaxCapacity: (num: string) => void;
  changeUserConfirm: (confirm: boolean) => void;
  changeTmpFlowList: (list: SelectItem[]) => void;
  changeS3SourceType: (type: string) => void;
  changeSuccessTextType: (type: string) => void;
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
    manualS3PathInvalid,
    setNextStepDisableStatus,
    setISChanging,
    changeCrossAccount,
    changeLogType,
    changeFieldType,
    changeSamplingRate,
    changeCustomFields,
    changeMinCapacity,
    changeEnableAS,
    changeMaxCapacity,
    changeUserConfirm,
    changeTmpFlowList,
    changeS3SourceType,
    changeSuccessTextType,
    showConfirmError,
    logTypeEmptyError,
    samplingRateError,
    shardNumError,
    maxShardNumError,
    standardOnly,
  } = props;

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const { t } = useTranslation();

  const [loadingCloudFrontList, setLoadingCloudFrontList] = useState(false);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [cloudFrontOptionList, setCloudFrontOptionList] = useState<
    SelectItem[]
  >([]);

  const [disabeCloudFront, setDisableCloudFront] = useState(false);

  const getCloudFrontList = async (accountId: string) => {
    try {
      setCloudFrontOptionList([]);
      setLoadingCloudFrontList(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.Distribution,
        accountId: accountId,
      });
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

  useEffect(() => {
    console.info(
      "cloudFrontTask.params.cloudFrontObj",
      cloudFrontTask.params.cloudFrontObj
    );
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
                    if (event.target.value === CreateLogMethod.Automatic) {
                      changeLogPath("");
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
              <CrossAccountSelect
                disabled={loadingCloudFrontList}
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
                      loading={loadingCloudFrontList}
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
                  <SourceType
                    standardOnly={standardOnly}
                    cloudFrontTask={cloudFrontTask}
                    showConfirmError={showConfirmError}
                    logTypeEmptyError={logTypeEmptyError}
                    samplingRateError={samplingRateError}
                    shardNumError={shardNumError}
                    maxShardNumError={maxShardNumError}
                    region={amplifyConfig.aws_project_region}
                    changeLogType={(type) => {
                      changeLogType(type);
                    }}
                    setIsLoading={(loading) => {
                      setLoadingBucket(loading);
                    }}
                    changeFieldType={(type) => {
                      changeFieldType(type);
                    }}
                    changeS3Bucket={(bucket) => {
                      changeS3Bucket(bucket);
                    }}
                    changeLogPath={(prefix) => {
                      changeLogPath(prefix);
                    }}
                    setNextStepDisableStatus={(disable) => {
                      setNextStepDisableStatus(disable);
                    }}
                    changeSamplingRate={(rate) => {
                      changeSamplingRate(rate);
                    }}
                    changeCustomFields={(fileds) => {
                      changeCustomFields(fileds);
                    }}
                    changeMinCapacity={(num) => {
                      changeMinCapacity(num);
                    }}
                    changeEnableAS={(enable) => {
                      changeEnableAS(enable);
                    }}
                    changeMaxCapacity={(num) => {
                      changeMaxCapacity(num);
                    }}
                    changeUserConfirm={(confirm) => {
                      changeUserConfirm(confirm);
                    }}
                    changeTmpFlowList={(list) => {
                      changeTmpFlowList(list);
                    }}
                    changeS3SourceType={(type) => {
                      changeS3SourceType(type);
                    }}
                    changeSuccessTextType={(type) => {
                      changeSuccessTextType(type);
                    }}
                  />
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
                      (manualS3EmptyError
                        ? t("servicelog:cloudfront.logLocationError")
                        : "") ||
                      (manualS3PathInvalid
                        ? t("servicelog:s3InvalidError")
                        : "")
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
                  <SourceType
                    cloudFrontTask={cloudFrontTask}
                    region={amplifyConfig.aws_project_region}
                    changeS3Bucket={(bucket) => {
                      changeS3Bucket(bucket);
                    }}
                    changeLogPath={(prefix) => {
                      changeLogPath(prefix);
                    }}
                    changeLogType={(type) => {
                      changeLogType(type);
                    }}
                    setIsLoading={(loading) => {
                      setISChanging(loading);
                    }}
                    changeTmpFlowList={(list) => {
                      changeTmpFlowList(list);
                    }}
                    changeS3SourceType={(type) => {
                      changeS3SourceType(type);
                    }}
                    changeSuccessTextType={(type) => {
                      changeSuccessTextType(type);
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
