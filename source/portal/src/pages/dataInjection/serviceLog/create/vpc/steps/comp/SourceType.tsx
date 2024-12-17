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
import FormItem from "components/FormItem";
import Select from "components/Select";
import { useTranslation } from "react-i18next";
import { AmplifyConfigType, AnalyticEngineTypes } from "types";
import { VpcLogTaskProps } from "../../CreateVPC";
import { DestinationType, ResourceType } from "API";
import { CLOUDWATCH_PRICING_LINK, CreateLogMethod } from "assets/js/const";
import LoadingText from "components/LoadingText";
import TextInput from "components/TextInput";
import AutoEnableLogging from "../../../common/AutoEnableLogging";
import { SelectItem } from "components/Select/select";
import {
  defaultStr,
  splitStringToBucketAndPrefix,
  ternary,
} from "assets/js/utils";
import { useSelector } from "react-redux";
import { AlertType } from "components/Alert/alert";
import KDSSettings from "../../../common/KDSSettings";
import { RootState } from "reducer/reducers";
import LogLocation from "../../../common/LogLocation";

interface SourceTypeProps {
  engineType: AnalyticEngineTypes;
  vpcLogTask: VpcLogTaskProps;
  changeManualS3: (s3: string) => void;
  changeBucket: (bucket: string) => void;
  changeLogPath: (logPath: string) => void;
  changeVPCFLowLog: (flow: string) => void;
  setISChanging: (changing: boolean) => void;
  setNextStepDisableStatus: (disabled: boolean) => void;
  changeS3FlowList: (list: SelectItem[]) => void;
  changeCWLFlowList: (list: SelectItem[]) => void;
  changeTmpFlowList: (flowList: SelectItem[]) => void;
  changeLogFormat: (format: string) => void;
  changeVpcLogSourceType: (type: string) => void;
  sourceTypeEmptyError?: boolean;
  manualS3EmptyError?: boolean;
  manualS3PathInvalid?: boolean;
  vpcFlowLogEmptyError?: boolean;
  shardNumError?: boolean;
  maxShardNumError?: boolean;
  changeMinCapacity?: (num: string) => void;
  changeEnableAS?: (enable: string) => void;
  changeMaxCapacity?: (num: string) => void;
  loadingBucket: boolean;
}

export enum VPCLogSourceType {
  NONE = "NONE",
  ONE_CWL = "ONE_CWL",
  MULTI_CWL = "MULTI_CWL",
  ONE_S3_SAME_REGION = "ONE_S3_SAME_REGION",
  ONE_S3_DIFF_REGION = "ONE_S3_DIFF_REGION",
  MULTI_S3_NOT_SELECT = "MULTI_S3_NOT_SELECT",
  MULTI_S3_SAME_REGION = "MULTI_S3_SAME_REGION",
  MULTI_S3_DIFF_REGION = "MULTI_S3_DIFF_REGION",
}

const SourceType: React.FC<SourceTypeProps> = (props: SourceTypeProps) => {
  const {
    vpcLogTask,
    changeManualS3,
    changeBucket,
    changeLogPath,
    changeVPCFLowLog,
    setISChanging,
    setNextStepDisableStatus,
    changeS3FlowList,
    changeCWLFlowList,
    changeTmpFlowList,
    changeVpcLogSourceType,
    changeLogFormat,
    manualS3EmptyError,
    manualS3PathInvalid,
    vpcFlowLogEmptyError,
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

  const buildLogSourceSuccessText = () => {
    return (
      (vpcLogTask.destinationType === DestinationType.S3 &&
      vpcLogTask.params.vpcLogSourceType ===
        VPCLogSourceType.MULTI_S3_SAME_REGION
        ? t("servicelog:create.savedTips") + vpcLogTask.params.logSource
        : "") ||
      (vpcLogTask.destinationType === DestinationType.CloudWatch &&
      vpcLogTask.params.vpcLogSourceType === VPCLogSourceType.MULTI_CWL &&
      vpcLogTask.params.logSource
        ? `${t("servicelog:vpc.logCWLEnabled1")} ${
            vpcLogTask.params.logSource
          } ${t("servicelog:vpc.logCWLEnabled2")}`
        : "")
    );
  };

  return (
    <>
      {loadingBucket ? (
        <LoadingText />
      ) : (
        <>
          {vpcLogTask.destinationType === DestinationType.S3 &&
            vpcLogTask.params.taskType === CreateLogMethod.Automatic &&
            vpcLogTask.params.vpcLogSourceType === VPCLogSourceType.NONE && (
              <AutoEnableLogging
                title={t("servicelog:vpc.noLogOutput")}
                desc={t("servicelog:vpc.noLogOutputDesc") + " ?"}
                accountId={vpcLogTask.logSourceAccountId}
                resourceType={ResourceType.VPC}
                resourceName={vpcLogTask.source}
                destName=""
                destType={vpcLogTask.destinationType}
                changeEnableStatus={(status) => {
                  setISChanging(status);
                }}
                changeEnableTmpFlowList={(list) => {
                  changeTmpFlowList(list);
                  changeS3FlowList(list);
                }}
                changeLogBucketAndPrefix={(bucket, prefix, enabled) => {
                  console.info("enabled:", enabled);
                  changeBucket(bucket || "");
                  changeLogPath(prefix || "");
                  changeVpcLogSourceType(VPCLogSourceType.ONE_S3_SAME_REGION);
                }}
              />
            )}
          {vpcLogTask.destinationType === DestinationType.CloudWatch &&
            vpcLogTask.params.taskType === CreateLogMethod.Automatic &&
            vpcLogTask.params.vpcLogSourceType === VPCLogSourceType.NONE && (
              <AutoEnableLogging
                title={t("servicelog:vpc.vpcNoOutput")}
                desc={t("servicelog:vpc.vpcNoLogOutputDesc")}
                learnMoreLink={CLOUDWATCH_PRICING_LINK}
                destName={`${amplifyConfig.solution_name}/${vpcLogTask.type}/${vpcLogTask.params.vpcLogObj?.value}`}
                destType={vpcLogTask.destinationType}
                accountId={vpcLogTask.logSourceAccountId}
                resourceType={ResourceType.VPC}
                resourceName={vpcLogTask.source}
                changeEnableStatus={(status) => {
                  setNextStepDisableStatus(status);
                }}
                changeLogBucketAndPrefix={(bucket, prefix, enabled) => {
                  console.info(bucket, prefix, enabled);
                }}
                changeEnableTmpFlowList={(list, format) => {
                  changeCWLFlowList(list);
                  changeTmpFlowList(list);
                  changeVpcLogSourceType(VPCLogSourceType.ONE_CWL);
                  changeLogFormat(format);
                  changeVPCFLowLog(list?.[0]?.value);
                }}
              />
            )}
          {vpcLogTask.destinationType &&
            vpcLogTask.params.tmpFlowList.length > 1 &&
            vpcLogTask.params.taskType === CreateLogMethod.Automatic && (
              <FormItem
                optionTitle={t("servicelog:vpc.selectFlowLog")}
                optionDesc={t("servicelog:vpc.selectFlowLogDesc")}
                successText={buildLogSourceSuccessText()}
                errorText={ternary(
                  vpcFlowLogEmptyError,
                  t("servicelog:vpc.selectVPCFlowLog"),
                  undefined
                )}
              >
                <Select
                  placeholder={t("servicelog:vpc.selectFlowLog")}
                  className="m-w-75p"
                  optionList={vpcLogTask.params.tmpFlowList}
                  value={vpcLogTask.params.logSource}
                  onChange={(event) => {
                    changeVPCFLowLog(event.target.value);
                    changeLogFormat(
                      defaultStr(
                        vpcLogTask?.params?.tmpFlowList?.find(
                          (element) => element.value === event.target.value
                        )?.description
                      )
                    );
                  }}
                />
              </FormItem>
            )}
          {(vpcLogTask.params.vpcLogSourceType ===
            VPCLogSourceType.ONE_S3_DIFF_REGION ||
            vpcLogTask.params.vpcLogSourceType ===
              VPCLogSourceType.MULTI_S3_DIFF_REGION) && (
            <AutoEnableLogging
              alertType={AlertType.Warning}
              resourceType={ResourceType.VPC}
              resourceName={defaultStr(vpcLogTask.params.vpcLogObj?.value)}
              destName=""
              destType={DestinationType.S3}
              changeEnableTmpFlowList={(list) => {
                changeTmpFlowList(list);
                changeS3FlowList(list);
              }}
              changeLogBucketAndPrefix={(bucket, prefix, enabled) => {
                console.info("enabled:", enabled);
                changeBucket(bucket);
                changeLogPath(prefix);
                changeVpcLogSourceType(VPCLogSourceType.ONE_S3_SAME_REGION);
              }}
              changeEnableStatus={(enable) => {
                setISChanging(enable);
              }}
              title={t("servicelog:vpc.diffRegionTip")}
              desc={t("servicelog:vpc.diffRegion", {
                bucket: vpcLogTask.params.tmpFlowList[0]?.value,
                logRegion: vpcLogTask.params.tmpFlowList[0]?.optTitle,
                homeRegion: amplifyConfig.aws_project_region,
              })}
            />
          )}
          {vpcLogTask.params.taskType === CreateLogMethod.Manual && (
            <>
              {vpcLogTask.destinationType === DestinationType.S3 && (
                <LogLocation
                  manualS3EmptyError={manualS3EmptyError}
                  manualS3PathInvalid={manualS3PathInvalid}
                  logLocation={vpcLogTask.params.manualBucketS3Path}
                  changeLogPath={(value) => {
                    const { bucket, prefix } =
                      splitStringToBucketAndPrefix(value);
                    changeLogPath(prefix);
                    changeBucket(bucket);
                    changeManualS3(value);
                  }}
                />
              )}

              {vpcLogTask.destinationType === DestinationType.CloudWatch && (
                <FormItem
                  optionTitle={t("servicelog:create.flowLogLocation")}
                  optionDesc={t("servicelog:create.flowLogLocationDesc")}
                  errorText={ternary(
                    vpcFlowLogEmptyError,
                    t("servicelog:create.logLocationError"),
                    undefined
                  )}
                >
                  <TextInput
                    placeholder={`arn:aws:logs:${amplifyConfig.aws_project_region}:123456789012:log-group`}
                    value={vpcLogTask.params.logSource}
                    onChange={(event) => {
                      changeVPCFLowLog(event.target.value);
                    }}
                  />
                </FormItem>
              )}
            </>
          )}

          {vpcLogTask.destinationType === DestinationType.CloudWatch && (
            <KDSSettings
              pipelineTask={vpcLogTask}
              shardNumError={shardNumError}
              maxShardNumError={maxShardNumError}
              changeMinCapacity={(num) => {
                changeMinCapacity?.(num);
              }}
              changeEnableAS={(enable) => {
                changeEnableAS?.(enable);
              }}
              changeMaxCapacity={(num) => {
                changeMaxCapacity?.(num);
              }}
            />
          )}
        </>
      )}
    </>
  );
};

export default SourceType;
