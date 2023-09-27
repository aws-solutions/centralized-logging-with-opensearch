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
import FormItem from "components/FormItem";
import Select from "components/Select";
import { useTranslation } from "react-i18next";
import { AmplifyConfigType, CWL_SOURCE_LIST } from "types";
import { VpcLogTaskProps } from "../../CreateVPC";
import { appSyncRequestQuery } from "assets/js/request";
import { getResourceLogConfigs } from "graphql/queries";
import { DestinationType, ResourceLogConf, ResourceType } from "API";
import { CLOUDWATCH_PRICING_LINK, CreateLogMethod } from "assets/js/const";
import LoadingText from "components/LoadingText";
import TextInput from "components/TextInput";
import AutoEnableLogging from "../../../common/AutoEnableLogging";
import { SelectItem } from "components/Select/select";
import { splitStringToBucketAndPrefix } from "assets/js/utils";
import { useSelector } from "react-redux";
import { AlertType } from "components/Alert/alert";
import KDSSettings from "../../../common/KDSSettings";
import { RootState } from "reducer/reducers";

interface SourceTypeProps {
  vpcLogTask: VpcLogTaskProps;
  changeSourceType: (type: string) => void;
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
    changeSourceType,
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
    sourceTypeEmptyError,
    manualS3EmptyError,
    manualS3PathInvalid,
    vpcFlowLogEmptyError,
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

  const getVpcLoggingConfig = async (vpcId: string) => {
    setLoadingBucket(true);
    setISChanging(true);
    const resData: any = await appSyncRequestQuery(getResourceLogConfigs, {
      type: ResourceType.VPC,
      resourceName: vpcId,
      accountId: vpcLogTask.logSourceAccountId,
    });

    const tmpS3SourceList: SelectItem[] = [];
    const tmpCWLSourceList: SelectItem[] = [];
    const resSourceList = resData?.data?.getResourceLogConfigs;
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

    changeS3FlowList(tmpS3SourceList);
    changeCWLFlowList(tmpCWLSourceList);

    setLoadingBucket(false);
    setISChanging(false);
  };

  useEffect(() => {
    if (vpcLogTask.params.vpcLogObj && vpcLogTask.params.vpcLogObj.value) {
      getVpcLoggingConfig(vpcLogTask.params.vpcLogObj.value);
    }
  }, [vpcLogTask.params.vpcLogObj]);

  const changeSourceTypeWhenDestS3 = () => {
    if (vpcLogTask.params.s3FLowList.length > 0) {
      // check the only one s3 source
      if (vpcLogTask.params.s3FLowList.length === 1) {
        if (
          vpcLogTask.params.s3FLowList[0].optTitle ===
          amplifyConfig.aws_project_region
        ) {
          // means the only exists one is valid
          changeVpcLogSourceType(VPCLogSourceType.ONE_S3_SAME_REGION);
          const { bucket, prefix } = splitStringToBucketAndPrefix(
            vpcLogTask.params.s3FLowList[0].value
          );
          changeBucket(bucket);
          changeLogPath(prefix);
        } else {
          changeVpcLogSourceType(VPCLogSourceType.ONE_S3_DIFF_REGION);
        }
      } else {
        changeVpcLogSourceType(VPCLogSourceType.MULTI_S3_NOT_SELECT);
      }
    } else {
      changeVpcLogSourceType(VPCLogSourceType.NONE);
    }
  };

  // Monitor source type / destination change
  useEffect(() => {
    if (vpcLogTask.destinationType === DestinationType.S3) {
      changeTmpFlowList(vpcLogTask.params.s3FLowList);
      changeSourceTypeWhenDestS3();
    }

    if (vpcLogTask.destinationType === DestinationType.CloudWatch) {
      changeTmpFlowList(vpcLogTask.params.cwlFlowList);
      if (vpcLogTask.params.cwlFlowList.length > 0) {
        // check the only one cwl source
        if (vpcLogTask.params.cwlFlowList.length === 1) {
          changeVpcLogSourceType(VPCLogSourceType.ONE_CWL);
          changeVPCFLowLog(vpcLogTask.params.cwlFlowList[0]?.value);
          changeLogFormat(vpcLogTask.params.cwlFlowList[0]?.description || "");
        } else {
          changeVpcLogSourceType(VPCLogSourceType.MULTI_CWL);
        }
      } else {
        changeVpcLogSourceType(VPCLogSourceType.NONE);
      }
    }
  }, [vpcLogTask.destinationType]);

  // Monitor vpc flow change
  useEffect(() => {
    if (
      vpcLogTask.params.logSource &&
      vpcLogTask.params.tmpFlowList.length > 0
    ) {
      if (vpcLogTask.destinationType === DestinationType.S3) {
        const curSelectItem = vpcLogTask.params.tmpFlowList.find(
          (element) => element.value === vpcLogTask.params.logSource
        );
        if (curSelectItem?.optTitle === amplifyConfig.aws_project_region) {
          // user selected log source is same region
          changeVpcLogSourceType(VPCLogSourceType.MULTI_S3_SAME_REGION);
          const { bucket, prefix } = splitStringToBucketAndPrefix(
            curSelectItem.value
          );
          changeBucket(bucket);
          changeLogPath(prefix);
        } else {
          // user selected log source is not same region
          changeVpcLogSourceType(VPCLogSourceType.MULTI_S3_DIFF_REGION);
        }
      }
    }
  }, [vpcLogTask.params.logSource]);

  useEffect(() => {
    console.info("vpcLogTaskvpcLogTaskvpcLogTask:", vpcLogTask);
  }, [vpcLogTask]);

  return (
    <>
      <FormItem
        optionTitle={t("servicelog:vpc.logSource")}
        optionDesc={t("servicelog:vpc.logSourceDesc")}
        errorText={
          sourceTypeEmptyError ? t("servicelog:vpc.logSourceEmptyError") : ""
        }
        successText={
          (vpcLogTask.params.vpcLogSourceType ===
          VPCLogSourceType.ONE_S3_SAME_REGION
            ? `${t("servicelog:vpc.savedTips")} ${
                vpcLogTask.params.tmpFlowList[0]?.value
              }`
            : "") ||
          (vpcLogTask.params.vpcLogSourceType === VPCLogSourceType.ONE_CWL
            ? `${t("servicelog:vpc.logCWLEnabled1")} ${
                vpcLogTask.params.tmpFlowList[0]?.value
              } ${t("servicelog:vpc.logCWLEnabled2")}`
            : "")
        }
      >
        <Select
          disabled={
            vpcLogTask.params.taskType === CreateLogMethod.Automatic &&
            (loadingBucket || vpcLogTask.params.vpcLogObj === null)
          }
          placeholder={t("servicelog:vpc.chooseLogSource")}
          className="m-w-45p"
          optionList={CWL_SOURCE_LIST}
          value={vpcLogTask.destinationType}
          onChange={(event) => {
            changeSourceType(event.target.value);
          }}
        />
      </FormItem>
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
                successText={
                  (vpcLogTask.destinationType === DestinationType.S3 &&
                  vpcLogTask.params.vpcLogSourceType ===
                    VPCLogSourceType.MULTI_S3_SAME_REGION
                    ? t("servicelog:vpc.savedTips") +
                      vpcLogTask.params.logSource
                    : "") ||
                  (vpcLogTask.destinationType === DestinationType.CloudWatch &&
                  vpcLogTask.params.vpcLogSourceType ===
                    VPCLogSourceType.MULTI_CWL &&
                  vpcLogTask.params.logSource
                    ? `${t("servicelog:vpc.logCWLEnabled1")} ${
                        vpcLogTask.params.logSource
                      } ${t("servicelog:vpc.logCWLEnabled2")}`
                    : "")
                }
                errorText={
                  vpcFlowLogEmptyError
                    ? t("servicelog:vpc.selectVPCFlowLog")
                    : ""
                }
              >
                <Select
                  placeholder={t("servicelog:vpc.selectFlowLog")}
                  className="m-w-75p"
                  optionList={vpcLogTask.params.tmpFlowList}
                  value={vpcLogTask.params.logSource}
                  onChange={(event) => {
                    changeVPCFLowLog(event.target.value);
                    changeLogFormat(
                      vpcLogTask?.params?.tmpFlowList?.find(
                        (element) => element.value === event.target.value
                      )?.description || ""
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
              resourceName={vpcLogTask.params.vpcLogObj?.value || ""}
              destName=""
              destType={DestinationType.S3}
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
                <FormItem
                  optionTitle={t("servicelog:vpc.vpcLogLocation")}
                  optionDesc={t("servicelog:vpc.vpcLogLocationDesc")}
                  errorText={
                    (manualS3EmptyError
                      ? t("servicelog:vpc.vpcLogLocationError")
                      : "") ||
                    (manualS3PathInvalid ? t("servicelog:s3InvalidError") : "")
                  }
                >
                  <TextInput
                    className="m-w-75p"
                    value={vpcLogTask.params.manualBucketS3Path}
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

              {vpcLogTask.destinationType === DestinationType.CloudWatch && (
                <FormItem
                  optionTitle={t("servicelog:vpc.flowLogLocation")}
                  optionDesc={t("servicelog:vpc.flowLogLocationDesc")}
                  errorText={
                    vpcFlowLogEmptyError
                      ? t("servicelog:vpc.vpcLogLocationError")
                      : ""
                  }
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
