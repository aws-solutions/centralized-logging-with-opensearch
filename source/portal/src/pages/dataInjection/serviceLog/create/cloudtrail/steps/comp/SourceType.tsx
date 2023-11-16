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
import { DestinationType, ResourceLogConf, ResourceType } from "API";
import { CLOUDWATCH_PRICING_LINK, CreateLogMethod } from "assets/js/const";
import { appSyncRequestQuery } from "assets/js/request";
import { splitStringToBucketAndPrefix } from "assets/js/utils";
import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";
import FormItem from "components/FormItem";
import LoadingText from "components/LoadingText";
import Select from "components/Select";
import { SelectItem } from "components/Select/select";
import { getResourceLogConfigs } from "graphql/queries";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { AmplifyConfigType, CWL_SOURCE_LIST } from "types";
import AutoEnableLogging from "../../../common/AutoEnableLogging";
import KDSSettings from "../../../common/KDSSettings";
import { CloudTrailTaskProps } from "../../CreateCloudTrail";
import { RootState } from "reducer/reducers";
import TextInput from "components/TextInput";

interface SourceTypeProps {
  cloudTrailTask: CloudTrailTaskProps;
  changeSourceType: (type: string) => void;
  changeBucket: (bucket: string) => void;
  changeManualS3: (s3: string) => void;
  changeLogPath: (logPath: string) => void;
  setISChanging: (change: boolean) => void;
  changeTmpFlowList: (list: SelectItem[]) => void;
  changeS3SourceType: (type: string) => void;
  changeSuccessTextType: (type: string) => void;
  changeLogSource: (source: string) => void;
  manualS3EmptyError: boolean;
  manualCwlArnEmptyError: boolean;
  sourceTypeEmptyError?: boolean;
  shardNumError?: boolean;
  maxShardNumError?: boolean;
  changeMinCapacity?: (num: string) => void;
  changeEnableAS?: (enable: string) => void;
  changeMaxCapacity?: (num: string) => void;
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
    changeSourceType,
    changeBucket,
    changeManualS3,
    changeLogPath,
    setISChanging,
    changeTmpFlowList,
    changeS3SourceType,
    changeSuccessTextType,
    changeLogSource,
    sourceTypeEmptyError,
    manualS3EmptyError,
    manualCwlArnEmptyError,
    shardNumError,
    maxShardNumError,
    changeMinCapacity,
    changeEnableAS,
    changeMaxCapacity,
  } = props;
  const { t } = useTranslation();

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const [loadingBucket, setLoadingBucket] = useState(false);

  const [s3FLowList, setS3FLowList] = useState<SelectItem[]>([]);
  const [cwlFlowList, setCwlFlowList] = useState<SelectItem[]>([]);

  const buildSourceOptionList = (resSourceList: any) => {
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
        if (element.destinationType === DestinationType.CloudWatch) {
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

  const getCloudTrailLoggingConfig = async (trailId: string) => {
    setLoadingBucket(true);
    setISChanging(true);
    const resData: any = await appSyncRequestQuery(getResourceLogConfigs, {
      type: ResourceType.Trail,
      resourceName: trailId,
      accountId: cloudTrailTask.logSourceAccountId,
    });
    const resSourceList = resData?.data?.getResourceLogConfigs;
    const { tmpS3SourceList, tmpCWLSourceList } =
      buildSourceOptionList(resSourceList);
    setS3FLowList(tmpS3SourceList);
    setCwlFlowList(tmpCWLSourceList);

    if (cloudTrailTask.destinationType === DestinationType.S3) {
      changeTmpFlowList(tmpS3SourceList);
    }

    if (cloudTrailTask.destinationType === DestinationType.CloudWatch) {
      changeTmpFlowList(tmpCWLSourceList);
    }
    setLoadingBucket(false);
    setISChanging(false);
  };

  useEffect(() => {
    if (
      cloudTrailTask.params.curTrailObj &&
      cloudTrailTask.params.curTrailObj.value
    ) {
      getCloudTrailLoggingConfig(cloudTrailTask.params.curTrailObj.value);
    }
  }, [cloudTrailTask.params.curTrailObj]);

  // Monitor source type / destination change
  useEffect(() => {
    if (cloudTrailTask.destinationType === DestinationType.S3) {
      changeTmpFlowList(s3FLowList);
      // change bucket and prefix when s3 log config only one
      if (s3FLowList.length > 0) {
        if (s3FLowList[0].optTitle === amplifyConfig.aws_project_region) {
          changeS3SourceType(S3SourceType.SAMEREGION);
          const { bucket, prefix } = splitStringToBucketAndPrefix(
            s3FLowList[0].value
          );
          changeBucket(bucket);
          changeLogPath(prefix);
          changeSuccessTextType(SuccessTextType.S3_ENABLED);
        } else {
          changeSuccessTextType("");
          changeS3SourceType(S3SourceType.DIFFREGION);
        }
      } else {
        changeS3SourceType(S3SourceType.NONE);
      }
    }
    if (cloudTrailTask.destinationType === DestinationType.CloudWatch) {
      changeTmpFlowList(cwlFlowList);
      if (cwlFlowList.length > 0) {
        changeSuccessTextType(SuccessTextType.CWL_ENABLED);
        changeLogSource(cwlFlowList[0]?.value);
      }
    }
  }, [cloudTrailTask.destinationType]);

  return (
    <>
      <FormItem
        optionTitle={t("servicelog:trail.logSource")}
        optionDesc={t("servicelog:trail.logSourceDesc")}
        successText={
          (cloudTrailTask.params.successTextType ===
            SuccessTextType.S3_ENABLED && cloudTrailTask.params?.tmpFlowList[0]
            ? t("servicelog:trail.savedTips") +
              cloudTrailTask.params?.tmpFlowList[0]?.value
            : "") ||
          (cloudTrailTask.params.successTextType ===
            SuccessTextType.CWL_ENABLED && cloudTrailTask.params?.tmpFlowList[0]
            ? t("servicelog:trail.logSourceCWLDest") +
              cloudTrailTask.params?.tmpFlowList[0]?.value
            : "")
        }
        errorText={
          sourceTypeEmptyError ? t("servicelog:trail.logSourceEmptyError") : ""
        }
      >
        <Select
          disabled={cloudTrailTask.params.taskType === CreateLogMethod.Automatic && (loadingBucket || cloudTrailTask.params.curTrailObj === null)}
          placeholder={t("servicelog:trail.chooseLogSource")}
          className="m-w-45p"
          optionList={CWL_SOURCE_LIST}
          value={cloudTrailTask.destinationType}
          onChange={(event) => {
            changeSourceType(event.target.value);
          }}
        />
      </FormItem>
      {loadingBucket ? (
        <LoadingText />
      ) : (
        <>
          {cloudTrailTask.destinationType === DestinationType.CloudWatch &&
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
          {cloudTrailTask.destinationType === DestinationType.S3 &&
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
                <FormItem
                  optionTitle={t("servicelog:trail.cloudtrailLogLocation")}
                  optionDesc={t("servicelog:trail.cloudtrailLogLocationDesc")}
                  errorText={manualS3EmptyError ? t("servicelog:trail.error.s3Empty") : ""}
                >
                  <TextInput
                    className="m-w-75p"
                    value={cloudTrailTask.params.manualBucketS3Path}
                    placeholder="s3://bucket/prefix"
                    onChange={(event) => {
                      const { bucket, prefix } = splitStringToBucketAndPrefix(
                        event.target.value
                      );
                      changeLogPath(prefix);
                      changeBucket(bucket);
                      changeManualS3(event.target.value);
                    }}
                  />
                </FormItem>
              )}

              {cloudTrailTask.destinationType === DestinationType.CloudWatch && (
                <FormItem
                  optionTitle={t("servicelog:trail.cloudtrailLogLocation")}
                  optionDesc={t("servicelog:trail.cloudtrailCWLLocationDesc")}
                  errorText={manualCwlArnEmptyError ? t("servicelog:trail.error.cwlEmpty") : ""}
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

          {cloudTrailTask.destinationType === DestinationType.CloudWatch && (
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
