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
import { useTranslation } from "react-i18next";
import Alert from "components/Alert";
import FormItem from "components/FormItem";
import {
  AmplifyConfigType,
  CloudFrontFieldType,
  CLOUDFRONT_FIELDS_TYPE,
  CLOUDFRONT_LOG_STANDARD,
  CLOUDFRONT_LOG_TYPE,
} from "types";
import Select from "components/Select";
import { CloudFrontTaskProps } from "../CreateCloudFront";
import Button from "components/Button/button";
import TextInput from "components/TextInput";
import MultiSelect from "components/MultiSelect";
import { CloudFrontFieldTypeList, CreateLogMethod } from "assets/js/const";
import { appSyncRequestQuery } from "assets/js/request";
import { getResourceLogConfigs } from "graphql/queries";
import { DestinationType, ResourceLogConf, ResourceType } from "API";
import LoadingText from "components/LoadingText";
import KDSSettings from "../../common/KDSSettings";
import { SelectItem } from "components/Select/select";
import { splitStringToBucketAndPrefix } from "assets/js/utils";
import { S3SourceType } from "../../cloudtrail/steps/comp/SourceType";
import { useSelector } from "react-redux";
import { AlertType } from "components/Alert/alert";
import { RootState } from "reducer/reducers";

interface LogTypeProps {
  cloudFrontTask: CloudFrontTaskProps;
  region: string;
  changeLogType: (type: string) => void;
  setIsLoading: (loading: boolean) => void;
  changeS3Bucket?: (bucket: string) => void;
  changeLogPath?: (path: string) => void;
  changeFieldType?: (type: string) => void;
  setNextStepDisableStatus?: (disable: boolean) => void;
  changeSamplingRate?: (rate: string) => void;
  changeCustomFields?: (fields: string[]) => void;
  changeMinCapacity?: (num: string) => void;
  changeEnableAS?: (enable: string) => void;
  changeMaxCapacity?: (num: string) => void;
  changeUserConfirm?: (confirm: boolean) => void;
  changeTmpFlowList: (list: SelectItem[]) => void;
  changeS3SourceType: (type: string) => void;
  changeSuccessTextType: (type: string) => void;
  showConfirmError?: boolean;
  logTypeEmptyError?: boolean;
  samplingRateError?: boolean;
  shardNumError?: boolean;
  maxShardNumError?: boolean;
  standardOnly?: boolean;
}

const SourceType: React.FC<LogTypeProps> = (props: LogTypeProps) => {
  const {
    cloudFrontTask,
    region,
    setIsLoading,
    changeLogType,
    changeS3Bucket,
    changeLogPath,
    changeFieldType,
    changeSamplingRate,
    changeCustomFields,
    changeUserConfirm,
    changeTmpFlowList,
    changeS3SourceType,
    setNextStepDisableStatus,
    showConfirmError,
    logTypeEmptyError,
    samplingRateError,
    shardNumError,
    maxShardNumError,
    changeMinCapacity,
    changeEnableAS,
    changeMaxCapacity,
    standardOnly,
  } = props;
  const { t } = useTranslation();

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const [loadingBucket, setLoadingBucket] = useState(false);

  const [s3FLowList, setS3FLowList] = useState<SelectItem[]>([]);
  const [kdsFlowList, setKdsFlowList] = useState<SelectItem[]>([]);

  const buildSourceOptions = (resSourceList: any) => {
    const tmpS3SourceList: SelectItem[] = [];
    const tmpCWLSourceList: SelectItem[] = [];
    if (resSourceList && resSourceList.length > 0) {
      resSourceList.forEach((element: ResourceLogConf) => {
        if (element.destinationType === DestinationType.S3) {
          tmpS3SourceList.push({
            name: element.name || "",
            value: element.destinationName,
            description: element.logFormat || "",
            optTitle: element.region || "",
          });
        }
        if (element.destinationType === DestinationType.KDS) {
          tmpCWLSourceList.push({
            name: element.name || "",
            value: element.destinationName,
            description: element.logFormat || "",
            optTitle: element.region || "",
          });
        }
      });
    }
    return { tmpS3SourceList, tmpCWLSourceList };
  };

  const getCloudFrontLogConfig = async (cloudFrontId: string) => {
    setLoadingBucket(true);
    setIsLoading(true);
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
      setIsLoading(false);
    } catch (error) {
      setLoadingBucket(false);
    }
  };

  // get cloudfront logging config when type or distribution changed
  useEffect(() => {
    if (
      cloudFrontTask.params.cloudFrontObj &&
      cloudFrontTask.params.cloudFrontObj.value
    ) {
      getCloudFrontLogConfig(cloudFrontTask.params.cloudFrontObj.value);
    }
  }, [cloudFrontTask.params.cloudFrontObj]);

  // Monitor source type / destination change
  useEffect(() => {
    console.info("s3FLowList:", s3FLowList);
    if (cloudFrontTask.destinationType === DestinationType.S3) {
      changeTmpFlowList(s3FLowList);
      // change bucket and prefix when s3 log config only one
      if (s3FLowList.length > 0) {
        if (s3FLowList[0].optTitle === amplifyConfig.aws_project_region) {
          changeS3SourceType(S3SourceType.SAMEREGION);
          const { bucket, prefix } = splitStringToBucketAndPrefix(
            s3FLowList[0].value
          );
          console.info("change bucket prefix:", bucket, prefix);
          changeS3Bucket && changeS3Bucket(bucket);
          changeLogPath && changeLogPath(prefix);
        } else {
          changeS3SourceType(S3SourceType.DIFFREGION);
          setNextStepDisableStatus && setNextStepDisableStatus(true);
        }
      } else {
        changeS3SourceType(S3SourceType.NONE);
        setNextStepDisableStatus && setNextStepDisableStatus(true);
      }
    }
    if (cloudFrontTask.destinationType === DestinationType.KDS) {
      changeTmpFlowList(kdsFlowList);
    }
  }, [cloudFrontTask.destinationType]);

  const buildWaringText = () => {
    if (
      !loadingBucket &&
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
      cloudFrontTask.destinationType === DestinationType.S3 &&
      cloudFrontTask.params.s3SourceType === S3SourceType.SAMEREGION &&
      cloudFrontTask.params.tmpFlowList.length > 0
    ) {
      return (
        t("servicelog:cloudfront.savedTips") +
        cloudFrontTask?.params?.tmpFlowList[0]?.value
      );
    }
    return "";
  };

  return (
    <>
      <FormItem
        optionTitle={t("servicelog:cloudfront.logType")}
        optionDesc={t("servicelog:cloudfront.logTypeDesc")}
        warningText={buildWaringText()}
        successText={buildSuccessText()}
        errorText={
          logTypeEmptyError ? t("servicelog:cloudfront.selectLogType") : ""
        }
      >
        <Select
          isI18N
          disabled={
            cloudFrontTask.params.taskType === CreateLogMethod.Automatic &&
            (loadingBucket || cloudFrontTask.params.cloudFrontObj === null)
          }
          placeholder={t("servicelog:cloudfront.selectLogType")}
          className="m-w-45p"
          optionList={
            cloudFrontTask.logSourceAccountId || region.startsWith("cn") || standardOnly
              ? CLOUDFRONT_LOG_STANDARD
              : CLOUDFRONT_LOG_TYPE
          }
          value={cloudFrontTask.destinationType}
          onChange={(event) => {
            changeLogType(event.target.value);
          }}
        />
      </FormItem>
      {cloudFrontTask.params.taskType === CreateLogMethod.Automatic &&
        (loadingBucket ? (
          <LoadingText />
        ) : (
          <>
            {cloudFrontTask.destinationType === DestinationType.S3 &&
              cloudFrontTask.params.s3SourceType === S3SourceType.DIFFREGION &&
              cloudFrontTask.params.tmpFlowList[0] && (
                <Alert
                  type={AlertType.Error}
                  content={t("servicelog:cloudfront.diffRegion", {
                    bucket: cloudFrontTask.params.tmpFlowList[0]?.value,
                    logRegion: cloudFrontTask.params.tmpFlowList[0]?.optTitle,
                    homeRegion: amplifyConfig.aws_project_region,
                  })}
                />
              )}

            {cloudFrontTask.destinationType === DestinationType.KDS && (
              <>
                <FormItem
                  optionTitle=""
                  optionDesc=""
                  errorText={
                    showConfirmError
                      ? t("servicelog:cloudfront.pleaseConfirm")
                      : ""
                  }
                >
                  <>
                    <>
                      {!cloudFrontTask.params.userIsConfirmed &&
                        cloudFrontTask.params.tmpFlowList.length > 0 &&
                        cloudFrontTask.destinationType ===
                          DestinationType.KDS &&
                        !loadingBucket && (
                          <Alert
                            type={AlertType.Warning}
                            actions={
                              <>
                                <Button
                                  onClick={() => {
                                    changeUserConfirm &&
                                      changeUserConfirm(true);
                                  }}
                                >
                                  {t("button.confirm")}
                                </Button>
                              </>
                            }
                            title={t("servicelog:cloudfront.existTips")}
                            content={t("servicelog:cloudfront.existTipsDesc")}
                          />
                        )}
                      {!cloudFrontTask.params.userIsConfirmed &&
                        cloudFrontTask.params.tmpFlowList.length <= 0 &&
                        cloudFrontTask.destinationType ===
                          DestinationType.KDS &&
                        !loadingBucket && (
                          <Alert
                            type={AlertType.Warning}
                            actions={
                              <>
                                <Button
                                  onClick={() => {
                                    changeUserConfirm &&
                                      changeUserConfirm(true);
                                  }}
                                >
                                  {t("button.confirm")}
                                </Button>
                              </>
                            }
                            title={t("servicelog:cloudfront.noOutput")}
                            content={t("servicelog:cloudfront.noOutputDesc")}
                          />
                        )}
                    </>
                  </>
                </FormItem>

                {cloudFrontTask.params.userIsConfirmed && (
                  <>
                    <FormItem
                      optionTitle={t("servicelog:cloudfront.sampleRate")}
                      optionDesc={t("servicelog:cloudfront.sampleRateDesc")}
                      errorText={
                        samplingRateError
                          ? t("servicelog:cloudfront.sampleRateError")
                          : ""
                      }
                    >
                      <TextInput
                        type="numnber"
                        placeholder={t("servicelog:cloudfront.enterSR")}
                        className="m-w-45p"
                        value={cloudFrontTask.params.samplingRate}
                        onChange={(event) => {
                          changeSamplingRate &&
                            changeSamplingRate(event.target.value);
                        }}
                      />
                    </FormItem>

                    <FormItem
                      optionTitle={t("servicelog:cloudfront.fields")}
                      optionDesc={t("servicelog:cloudfront.fieldsDesc")}
                      infoText={
                        cloudFrontTask.params.fieldType ===
                        CloudFrontFieldType.CUSTOM
                          ? t("servicelog:cloudfront.fieldsTips")
                          : ""
                      }
                    >
                      {CLOUDFRONT_FIELDS_TYPE.map((element) => {
                        return (
                          <div key={element.value}>
                            <label>
                              <input
                                value={cloudFrontTask.params.fieldType}
                                onClick={() => {
                                  changeFieldType &&
                                    changeFieldType(element.value);
                                }}
                                onChange={(e) => {
                                  console.info(e);
                                }}
                                checked={
                                  cloudFrontTask.params.fieldType ===
                                  element.value
                                }
                                name="fieldType"
                                type="radio"
                              />{" "}
                              {t(element.name)}
                            </label>
                          </div>
                        );
                      })}
                    </FormItem>

                    {cloudFrontTask.params.fieldType ===
                      CloudFrontFieldType.CUSTOM && (
                      <>
                        <div className="mb-20">
                          <MultiSelect
                            className="m-w-75p"
                            optionList={CloudFrontFieldTypeList}
                            value={cloudFrontTask.params.customFields}
                            defaultSelectItems={[
                              "timestamp",
                              "time-to-first-byte",
                              "origin-fbl",
                            ]}
                            onChange={(fields) => {
                              if (fields) {
                                console.info("fields:", fields);
                                changeCustomFields &&
                                  changeCustomFields(fields);
                              }
                            }}
                            placeholder={t(
                              "servicelog:cloudfront.chooseFields"
                            )}
                          />
                        </div>
                      </>
                    )}
                    <KDSSettings
                      pipelineTask={cloudFrontTask}
                      shardNumError={shardNumError}
                      maxShardNumError={maxShardNumError}
                      changeMinCapacity={(num) => {
                        changeMinCapacity && changeMinCapacity(num);
                      }}
                      changeEnableAS={(enable) => {
                        changeEnableAS && changeEnableAS(enable);
                      }}
                      changeMaxCapacity={(num) => {
                        changeMaxCapacity && changeMaxCapacity(num);
                      }}
                    />
                  </>
                )}
              </>
            )}
          </>
        ))}
      {cloudFrontTask.params.taskType === CreateLogMethod.Manual &&
        cloudFrontTask.destinationType === DestinationType.KDS && (
          <Alert content={t("servicelog:cloudfront.manualNotSupportRTL")} />
        )}
    </>
  );
};

export default SourceType;
