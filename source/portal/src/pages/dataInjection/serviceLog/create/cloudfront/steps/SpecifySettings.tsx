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
import { DestinationType, Resource, ResourceLogConf, ResourceType } from "API";
import { getResourceLogConfigs, listResources } from "graphql/queries";
import AutoComplete from "components/AutoComplete";
import { CloudFrontTaskProps } from "../CreateCloudFront";
import { OptionType } from "components/AutoComplete/autoComplete";
import TextInput from "components/TextInput";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import SourceType from "../comps/SourceType";
import { RootState } from "reducer/reducers";
import LogSourceEnable from "../../common/LogSourceEnable";
import { S3SourceType } from "../../cloudtrail/steps/comp/SourceType";
import { defaultStr, splitStringToBucketAndPrefix } from "assets/js/utils";
import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";
import LogLocation from "../../common/LogLocation";

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
  samplingRateError: boolean;
  shardNumError: boolean;
  maxShardNumError: boolean;
  setNextStepDisableStatus: (status: boolean) => void;
  changeCrossAccount: (id: string) => void;
  changeFieldType: (type: string) => void;
  changeSamplingRate: (rate: string) => void;
  changeCustomFields: (fields: string[]) => void;
  changeMinCapacity: (num: string) => void;
  changeEnableAS: (enable: string) => void;
  changeMaxCapacity: (num: string) => void;
  changeUserConfirm: (confirm: boolean) => void;
  changeTmpFlowList: (list: SelectItem[]) => void;
  changeS3SourceType: (type: string) => void;
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
    changeCrossAccount,
    changeFieldType,
    changeSamplingRate,
    changeCustomFields,
    changeMinCapacity,
    changeEnableAS,
    changeMaxCapacity,
    changeUserConfirm,
    changeTmpFlowList,
    changeS3SourceType,
    showConfirmError,
    samplingRateError,
    shardNumError,
    maxShardNumError,
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

  const [disableCloudFront, setDisableCloudFront] = useState(false);
  const [s3FLowList, setS3FLowList] = useState<SelectItem[]>([]);
  const [kdsFlowList, setKdsFlowList] = useState<SelectItem[]>([]);
  const [crossAccountDisableKDS, setCrossAccountDisableKDS] = useState(false);

  const getCloudFrontLogConfig = async (cloudFrontId: string) => {
    setLoadingBucket(true);
    try {
      const resData: any = await appSyncRequestQuery(getResourceLogConfigs, {
        type: ResourceType.Distribution,
        resourceName: cloudFrontId,
        accountId: cloudFrontTask.logSourceAccountId,
        region: cloudFrontTask.logSourceRegion,
      });
      const resSourceList = resData?.data?.getResourceLogConfigs;
      const { tmpS3SourceList, tmpCWLSourceList } =
        buildSourceOptions(resSourceList);

      setS3FLowList(tmpS3SourceList);
      setKdsFlowList(tmpCWLSourceList);

      if (cloudFrontTask.destinationType === DestinationType.S3) {
        changeTmpFlowList(tmpS3SourceList);
      }

      if (cloudFrontTask.destinationType === DestinationType.CloudWatch) {
        changeTmpFlowList(tmpCWLSourceList);
      }

      setLoadingBucket(false);
    } catch (error) {
      setLoadingBucket(false);
    }
  };

  const fetchAllData = async (
    fetchData: any,
    accountId = "",
    initialToken = ""
  ) => {
    const nextToken = initialToken;
    const allData: SelectItem[] = [];

    async function fetchPage(token: string) {
      const response = await fetchData(accountId, token);
      const dataList: Resource[] = response.data ?? [];
      dataList.forEach((element) => {
        allData.push({
          name: `${element.id}${
            element.description ? ` (${element.description})` : ""
          }`,
          value: element.id,
        });
      });
      if (response.nextToken) {
        await fetchPage(response.nextToken);
      }
    }
    await fetchPage(nextToken);
    return allData;
  };

  const fetchData = async (accountId: string, nextToken: string) => {
    const resData: any = await appSyncRequestQuery(listResources, {
      type: ResourceType.Distribution,
      accountId: accountId,
      parentId: nextToken,
    });
    return {
      data: resData.data.listResources,
      nextToken: resData.data?.listResources?.[0]?.parentId ?? "",
    };
  };

  const buildSourceOptions = (resSourceList: any) => {
    const tmpS3SourceList: SelectItem[] = [];
    const tmpCWLSourceList: SelectItem[] = [];
    if (resSourceList && resSourceList.length > 0) {
      resSourceList.forEach((element: ResourceLogConf) => {
        if (element.destinationType === DestinationType.S3) {
          tmpS3SourceList.push({
            name: defaultStr(element.name),
            value: element.destinationName,
            description: defaultStr(element.logFormat),
            optTitle: defaultStr(element.region),
          });
        }
        if (element.destinationType === DestinationType.KDS) {
          tmpCWLSourceList.push({
            name: defaultStr(element.name),
            value: element.destinationName,
            description: defaultStr(element.logFormat),
            optTitle: defaultStr(element.region),
          });
        }
      });
    }
    return { tmpS3SourceList, tmpCWLSourceList };
  };

  const buildWaringText = () => {
    if (
      !loadingBucket &&
      cloudFrontTask.params.cloudFrontObj &&
      cloudFrontTask?.params?.taskType === CreateLogMethod.Automatic &&
      cloudFrontTask?.destinationType === DestinationType.S3 &&
      cloudFrontTask?.params?.tmpFlowList?.length <= 0
    ) {
      return t("servicelog:cloudfront.cloudfrontWarning");
    }
    return "";
  };

  const buildSuccessText = () => {
    if (
      !loadingBucket &&
      cloudFrontTask.params.cloudFrontObj &&
      cloudFrontTask.destinationType === DestinationType.S3 &&
      cloudFrontTask.params.s3SourceType === S3SourceType.SAMEREGION &&
      cloudFrontTask.params.tmpFlowList.length > 0
    ) {
      return (
        t("servicelog:create.savedTips") +
        cloudFrontTask?.params?.tmpFlowList[0]?.value
      );
    }
    return "";
  };

  useEffect(() => {
    if (cloudFrontTask.params.cloudFrontObj?.value) {
      getCloudFrontLogConfig(cloudFrontTask.params.cloudFrontObj.value);
    }
  }, [cloudFrontTask.params.cloudFrontObj]);

  useEffect(() => {
    if (cloudFrontTask.params.taskType === CreateLogMethod.Automatic) {
      setLoadingCloudFrontList(true);
      fetchAllData(fetchData, cloudFrontTask.logSourceAccountId).then(
        (allData) => {
          setCloudFrontOptionList(allData);
          setLoadingCloudFrontList(false);
        }
      );
    }
  }, [cloudFrontTask.logSourceAccountId]);

  const handleS3FlowList = () => {
    if (s3FLowList[0].optTitle === amplifyConfig.aws_project_region) {
      changeS3SourceType(S3SourceType.SAMEREGION);
      const { bucket, prefix } = splitStringToBucketAndPrefix(
        s3FLowList[0].value
      );
      changeS3Bucket && changeS3Bucket(bucket);
      changeLogPath && changeLogPath(prefix);
      setNextStepDisableStatus && setNextStepDisableStatus(false);
    } else {
      changeS3SourceType(S3SourceType.DIFFREGION);
      setNextStepDisableStatus && setNextStepDisableStatus(true);
    }
  };

  useEffect(() => {
    if (cloudFrontTask.params.taskType === CreateLogMethod.Automatic) {
      if (cloudFrontTask.destinationType === DestinationType.S3) {
        changeTmpFlowList(s3FLowList);
        // change bucket and prefix when s3 log config only one
        if (s3FLowList.length > 0) {
          handleS3FlowList();
        } else {
          changeS3SourceType(S3SourceType.NONE);
          setNextStepDisableStatus && setNextStepDisableStatus(true);
        }
      } else {
        changeTmpFlowList(kdsFlowList);
      }
    } else {
      setNextStepDisableStatus(false);
    }
  }, [cloudFrontTask.params.taskType, s3FLowList, kdsFlowList]);

  return (
    <div>
      <PagePanel title={t("step.logSource")}>
        <div>
          <LogSourceEnable
            value={cloudFrontTask.params.taskType}
            onChange={(value) => {
              changeTaskType(value);
              changeCloudFrontObj(null);
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
                disabled={loadingCloudFrontList}
                accountId={cloudFrontTask.logSourceAccountId}
                changeAccount={(id) => {
                  changeCrossAccount(id);
                  changeCloudFrontObj(null);
                  if (
                    id &&
                    cloudFrontTask.destinationType === DestinationType.KDS
                  ) {
                    setCrossAccountDisableKDS(true);
                    setNextStepDisableStatus(true);
                  } else {
                    setCrossAccountDisableKDS(false);
                    setNextStepDisableStatus(false);
                  }
                }}
                loadingAccount={(loading) => {
                  setDisableCloudFront(loading);
                }}
              />
              {crossAccountDisableKDS && (
                <Alert
                  content={t("error.crossAccountDisableKDS")}
                  type={AlertType.Warning}
                />
              )}
              {!crossAccountDisableKDS &&
                cloudFrontTask.params.taskType ===
                  CreateLogMethod.Automatic && (
                  <div className="pb-50">
                    <FormItem
                      optionTitle={t("servicelog:cloudfront.distribution")}
                      optionDesc={t("servicelog:cloudfront.distributionDesc")}
                      warningText={buildWaringText()}
                      successText={buildSuccessText()}
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
                          disableCloudFront
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
                      loadingBucket={loadingBucket}
                      cloudFrontTask={cloudFrontTask}
                      showConfirmError={showConfirmError}
                      samplingRateError={samplingRateError}
                      shardNumError={shardNumError}
                      maxShardNumError={maxShardNumError}
                      changeFieldType={(type) => {
                        changeFieldType(type);
                      }}
                      changeSamplingRate={(rate) => {
                        changeSamplingRate(rate);
                      }}
                      changeCustomFields={(fields) => {
                        changeCustomFields(fields);
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
                    />
                  </div>
                )}
              {!crossAccountDisableKDS &&
                cloudFrontTask.params.taskType === CreateLogMethod.Manual && (
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
                    <LogLocation
                      manualS3EmptyError={manualS3EmptyError}
                      manualS3PathInvalid={manualS3PathInvalid}
                      logLocation={cloudFrontTask.params.manualBucketS3Path}
                      changeLogPath={(value) => {
                        changeLogPath(value);
                      }}
                    />
                    <SourceType
                      loadingBucket={loadingBucket}
                      cloudFrontTask={cloudFrontTask}
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
