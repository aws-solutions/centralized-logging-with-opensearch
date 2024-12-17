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
import { DestinationType, ResourceType } from "API";
import { CLOUDWATCH_PRICING_LINK, CreateLogMethod } from "assets/js/const";
import { splitStringToBucketAndPrefix } from "assets/js/utils";
import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";
import FormItem from "components/FormItem";
import LoadingText from "components/LoadingText";
import { SelectItem } from "components/Select/select";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { AmplifyConfigType } from "types";
import AutoEnableLogging from "../../../common/AutoEnableLogging";
import KDSSettings from "../../../common/KDSSettings";
import { CloudTrailTaskProps } from "../../CreateCloudTrail";
import { RootState } from "reducer/reducers";
import TextInput from "components/TextInput";
import LogLocation from "../../../common/LogLocation";

interface SourceTypeProps {
  cloudTrailTask: CloudTrailTaskProps;
  changeBucket: (bucket: string) => void;
  changeManualS3: (s3: string) => void;
  changeLogPath: (logPath: string) => void;
  setISChanging: (change: boolean) => void;
  changeTmpFlowList: (list: SelectItem[]) => void;
  changeSuccessTextType: (type: string) => void;
  changeLogSource: (source: string) => void;
  manualS3EmptyError: boolean;
  manualCwlArnEmptyError: boolean;
  shardNumError?: boolean;
  maxShardNumError?: boolean;
  changeMinCapacity?: (num: string) => void;
  changeEnableAS?: (enable: string) => void;
  changeMaxCapacity?: (num: string) => void;
  loadingBucket: boolean;
}

export enum S3SourceType {
  NONE = "NONE",
  SAMEREGION = "SAMEREGION",
  DIFFREGION = "DIFFREGION",
}

export enum SuccessTextType {
  S3_ENABLED = "S3_ENABLED",
  CWL_ENABLED = "CWL_ENABLED",
}

const SourceType: React.FC<SourceTypeProps> = (props: SourceTypeProps) => {
  const {
    cloudTrailTask,
    changeBucket,
    changeManualS3,
    changeLogPath,
    setISChanging,
    changeTmpFlowList,
    changeSuccessTextType,
    changeLogSource,
    manualS3EmptyError,
    manualCwlArnEmptyError,
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
      {loadingBucket ? (
        <LoadingText />
      ) : (
        <>
          {cloudTrailTask.params.curTrailObj &&
            cloudTrailTask.destinationType === DestinationType.CloudWatch &&
            cloudTrailTask.params.taskType === CreateLogMethod.Automatic &&
            cloudTrailTask.params.tmpFlowList.length <= 0 && (
              <AutoEnableLogging
                alertType={AlertType.Warning}
                title={t("servicelog:trail.noOutput")}
                desc={`
                ${t("servicelog:trail.noOutputDesc1")}${
                  amplifyConfig.solution_name
                }/${cloudTrailTask.type}/${
                  cloudTrailTask.params.curTrailObj?.name
                }${t("servicelog:trail.noOutputDesc2")}
                `}
                learnMoreLink={CLOUDWATCH_PRICING_LINK}
                destName={`${amplifyConfig.solution_name}/${cloudTrailTask.type}/${cloudTrailTask.params.curTrailObj?.name}`}
                destType={cloudTrailTask.destinationType}
                accountId={cloudTrailTask.logSourceAccountId}
                resourceType={ResourceType.Trail}
                resourceName={cloudTrailTask.source}
                changeEnableStatus={(status) => {
                  setISChanging(status);
                }}
                changeLogBucketAndPrefix={(bucket, prefix, enabled) => {
                  console.info(bucket, prefix, enabled);
                }}
                changeEnableTmpFlowList={(list) => {
                  if (list && list.length > 0) {
                    changeSuccessTextType(SuccessTextType.CWL_ENABLED);
                    changeTmpFlowList(list);
                    changeLogSource(list?.[0]?.value);
                  }
                }}
              />
            )}
          {cloudTrailTask.params.curTrailObj &&
            cloudTrailTask.destinationType === DestinationType.S3 &&
            cloudTrailTask.params.taskType === CreateLogMethod.Automatic &&
            cloudTrailTask.params.s3SourceType === S3SourceType.DIFFREGION && (
              <Alert
                type={AlertType.Error}
                content={t("servicelog:trail.diffRegion", {
                  bucket: cloudTrailTask.params.tmpFlowList[0]?.value,
                  logRegion: cloudTrailTask.params.tmpFlowList[0]?.optTitle,
                  homeRegion: amplifyConfig.aws_project_region,
                })}
              />
            )}

          {cloudTrailTask.params.taskType === CreateLogMethod.Manual && (
            <>
              {cloudTrailTask.destinationType === DestinationType.S3 && (
                <LogLocation
                  manualS3EmptyError={manualS3EmptyError}
                  logLocation={cloudTrailTask.params.manualBucketS3Path}
                  changeLogPath={(value) => {
                    const { bucket, prefix } =
                      splitStringToBucketAndPrefix(value);
                    changeLogPath(prefix);
                    changeBucket(bucket);
                    changeManualS3(value);
                  }}
                />
              )}

              {cloudTrailTask.destinationType ===
                DestinationType.CloudWatch && (
                <FormItem
                  optionTitle={t("servicelog:trail.cloudtrailLogLocation")}
                  optionDesc={t("servicelog:trail.cloudtrailCWLLocationDesc")}
                  errorText={
                    manualCwlArnEmptyError
                      ? t("servicelog:trail.error.cwlEmpty")
                      : ""
                  }
                >
                  <TextInput
                    placeholder={`log-group-name`}
                    value={cloudTrailTask.params.logSource}
                    onChange={(event) => {
                      changeLogSource(event.target.value);
                    }}
                  />
                </FormItem>
              )}
            </>
          )}

          {(cloudTrailTask.params.curTrailObj ||
            cloudTrailTask.params.logSource) &&
            cloudTrailTask.destinationType === DestinationType.CloudWatch && (
              <KDSSettings
                pipelineTask={cloudTrailTask}
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
            )}
        </>
      )}
    </>
  );
};

export default SourceType;
