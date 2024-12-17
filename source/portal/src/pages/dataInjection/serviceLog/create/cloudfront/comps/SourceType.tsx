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
import React from "react";
import { useTranslation } from "react-i18next";
import Alert from "components/Alert";
import FormItem from "components/FormItem";
import {
  AmplifyConfigType,
  CloudFrontFieldType,
  CLOUDFRONT_FIELDS_TYPE,
} from "types";
import { CloudFrontTaskProps } from "../CreateCloudFront";
import Button from "components/Button/button";
import TextInput from "components/TextInput";
import MultiSelect from "components/MultiSelect";
import { CloudFrontFieldTypeList, CreateLogMethod } from "assets/js/const";
import { DestinationType } from "API";
import LoadingText from "components/LoadingText";
import KDSSettings from "../../common/KDSSettings";
import { S3SourceType } from "../../cloudtrail/steps/comp/SourceType";
import { useSelector } from "react-redux";
import { AlertType } from "components/Alert/alert";
import { RootState } from "reducer/reducers";

interface LogTypeProps {
  cloudFrontTask: CloudFrontTaskProps;
  changeFieldType?: (type: string) => void;
  changeSamplingRate?: (rate: string) => void;
  changeCustomFields?: (fields: string[]) => void;
  changeMinCapacity?: (num: string) => void;
  changeEnableAS?: (enable: string) => void;
  changeMaxCapacity?: (num: string) => void;
  changeUserConfirm?: (confirm: boolean) => void;
  showConfirmError?: boolean;
  samplingRateError?: boolean;
  shardNumError?: boolean;
  maxShardNumError?: boolean;
  loadingBucket: boolean;
}

const SourceType: React.FC<LogTypeProps> = (props: LogTypeProps) => {
  const {
    cloudFrontTask,
    changeFieldType,
    changeSamplingRate,
    changeCustomFields,
    changeUserConfirm,
    showConfirmError,
    samplingRateError,
    shardNumError,
    maxShardNumError,
    changeMinCapacity,
    changeEnableAS,
    changeMaxCapacity,
    loadingBucket,
  } = props;
  const { t } = useTranslation();

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  return (
    <>
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
                    {cloudFrontTask.params.cloudFrontObj &&
                      !cloudFrontTask.params.userIsConfirmed &&
                      cloudFrontTask.params.tmpFlowList.length > 0 &&
                      cloudFrontTask.destinationType === DestinationType.KDS &&
                      !loadingBucket && (
                        <Alert
                          type={AlertType.Warning}
                          actions={
                            <Button
                              onClick={() => {
                                changeUserConfirm && changeUserConfirm(true);
                              }}
                            >
                              {t("button.confirm")}
                            </Button>
                          }
                          title={t("servicelog:cloudfront.existTips")}
                          content={t("servicelog:cloudfront.existTipsDesc")}
                        />
                      )}
                    {cloudFrontTask.params.cloudFrontObj &&
                      !cloudFrontTask.params.userIsConfirmed &&
                      cloudFrontTask.params.tmpFlowList.length <= 0 &&
                      cloudFrontTask.destinationType === DestinationType.KDS &&
                      !loadingBucket && (
                        <Alert
                          type={AlertType.Warning}
                          actions={
                            <Button
                              onClick={() => {
                                changeUserConfirm && changeUserConfirm(true);
                              }}
                            >
                              {t("button.confirm")}
                            </Button>
                          }
                          title={t("servicelog:cloudfront.noOutput")}
                          content={t("servicelog:cloudfront.noOutputDesc")}
                        />
                      )}
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
                        type="number"
                        placeholder={t("servicelog:cloudfront.enterSR")}
                        className="m-w-45p"
                        value={cloudFrontTask.params.samplingRate}
                        onChange={(event) => {
                          const newValue = event.target.value;
                          if (/^\d*$/.test(newValue)) {
                            const number = parseInt(newValue, 10);
                            if (
                              (number >= 1 && number <= 100) ||
                              newValue === ""
                            ) {
                              changeSamplingRate?.(event.target.value);
                            }
                          }
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
                              changeCustomFields && changeCustomFields(fields);
                            }
                          }}
                          placeholder={t("servicelog:cloudfront.chooseFields")}
                        />
                      </div>
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
