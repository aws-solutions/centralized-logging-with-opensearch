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
import { DestinationType, Resource, ResourceLogConf, ResourceType } from "API";
import {
  CreateLogMethod,
  VPC_FLOW_LOG_SELECT_ALL_FIELDS,
} from "assets/js/const";
import { appSyncRequestQuery } from "assets/js/request";
import AutoComplete from "components/AutoComplete";
import { OptionType } from "components/AutoComplete/autoComplete";
import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import { SelectItem } from "components/Select/select";
import TextInput from "components/TextInput";
import { getResourceLogConfigs, listResources } from "graphql/queries";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { VpcLogTaskProps } from "../CreateVPC";
import SourceType, { VPCLogSourceType } from "./comp/SourceType";
import { AnalyticEngineTypes } from "types";
import LogSourceEnable from "../../common/LogSourceEnable";
import { defaultStr, splitStringToBucketAndPrefix } from "assets/js/utils";

interface SpecifySettingsProps {
  engineType: AnalyticEngineTypes;
  vpcLogTask: VpcLogTaskProps;
  autoVpcEmptyError: boolean;
  manualVpcEmptyError: boolean;
  manualS3EmptyError: boolean;
  manualS3PathInvalid: boolean;
  setISChanging: (changing: boolean) => void;
  changeTaskType: (type: string) => void;
  changeVpcLogObj: (vpc: OptionType | null) => void;
  changeLogBucket: (bucket: string) => void;
  changeLogPrefix: (path: string) => void;
  changeManualS3: (name: string) => void;
  setNextStepDisableStatus: (status: boolean) => void;
  changeCrossAccount: (id: string) => void;
  changeVPCFLowLog: (flow: string) => void;
  changeS3FlowList: (list: SelectItem[]) => void;
  changeCWLFlowList: (list: SelectItem[]) => void;
  changeTmpFlowList: (flowList: SelectItem[]) => void;
  changeVPCId: (vpc: string) => void;
  changeLogFormat: (format: string) => void;
  changeVpcLogSourceType: (type: string) => void;
  sourceTypeEmptyError?: boolean;
  vpcFlowLogEmptyError?: boolean;
  shardNumError: boolean;
  maxShardNumError: boolean;
  changeMinCapacity: (num: string) => void;
  changeEnableAS: (enable: string) => void;
  changeMaxCapacity: (num: string) => void;
  region: string;
}

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const {
    engineType,
    vpcLogTask,
    autoVpcEmptyError,
    manualVpcEmptyError,
    manualS3EmptyError,
    manualS3PathInvalid,
    setISChanging,
    changeTaskType,
    changeVpcLogObj,
    changeLogBucket,
    changeLogPrefix,
    changeManualS3,
    setNextStepDisableStatus,
    changeCrossAccount,
    changeS3FlowList,
    changeCWLFlowList,
    changeVPCFLowLog,
    changeTmpFlowList,
    changeVPCId,
    changeLogFormat,
    changeVpcLogSourceType,
    sourceTypeEmptyError,
    vpcFlowLogEmptyError,
    shardNumError,
    maxShardNumError,
    changeMinCapacity,
    changeEnableAS,
    changeMaxCapacity,
    region,
  } = props;

  const { t } = useTranslation();

  const [loadingVpcList, setLoadingVpcList] = useState(false);

  const [vpcOptionList, setVpcOptionList] = useState<SelectItem[]>([]);
  const [disableVPC, setDisableVPC] = useState(false);

  const getVpcList = async (accountId: string) => {
    try {
      setVpcOptionList([]);
      setLoadingVpcList(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.VPC,
        accountId: accountId,
      });
      const dataList: Resource[] = resData.data.listResources;
      const tmpOptionList: SelectItem[] = [];
      dataList.forEach((element) => {
        tmpOptionList.push({
          name: `${element.id} (${element.name})`,
          value: element.id,
        });
      });
      setVpcOptionList(tmpOptionList);
      setLoadingVpcList(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (vpcLogTask.params.taskType === CreateLogMethod.Automatic) {
      getVpcList(vpcLogTask.logSourceAccountId);
    }
  }, [vpcLogTask.logSourceAccountId, vpcLogTask.params.taskType]);

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
    if (resSourceList?.length > 0) {
      resSourceList.forEach((element: ResourceLogConf) => {
        const sourceObj = {
          name: defaultStr(element.name),
          value: defaultStr(element.destinationName),
          description: defaultStr(element.logFormat),
          optTitle: defaultStr(element.region),
        };
        if (element.destinationType === DestinationType.S3) {
          if (engineType === AnalyticEngineTypes.LIGHT_ENGINE) {
            if (element.logFormat === VPC_FLOW_LOG_SELECT_ALL_FIELDS) {
              tmpS3SourceList.push(sourceObj);
            }
          } else {
            tmpS3SourceList.push(sourceObj);
          }
        } else {
          tmpCWLSourceList.push(sourceObj);
        }
      });
    }

    changeS3FlowList(tmpS3SourceList);
    changeCWLFlowList(tmpCWLSourceList);

    setLoadingBucket(false);
    setISChanging(false);
  };

  const changeSourceTypeWhenDestS3 = () => {
    if (vpcLogTask.params.s3FLowList.length > 0) {
      // check the only one s3 source
      if (vpcLogTask.params.s3FLowList.length === 1) {
        if (vpcLogTask.params.s3FLowList[0].optTitle === region) {
          // means the only exists one is valid
          changeVpcLogSourceType(VPCLogSourceType.ONE_S3_SAME_REGION);
          const { bucket, prefix } = splitStringToBucketAndPrefix(
            vpcLogTask.params.s3FLowList[0].value
          );
          changeLogBucket(bucket);
          changeLogPrefix(prefix);
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
    if (vpcLogTask.params.vpcLogObj) {
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
            changeLogFormat(
              defaultStr(vpcLogTask.params.cwlFlowList[0]?.description)
            );
          } else {
            changeVpcLogSourceType(VPCLogSourceType.MULTI_CWL);
          }
        } else {
          changeVpcLogSourceType(VPCLogSourceType.NONE);
        }
      }
    }
  }, [vpcLogTask.params.s3FLowList, vpcLogTask.params.cwlFlowList]);

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
        if (curSelectItem?.optTitle === region) {
          // user selected log source is same region
          changeVpcLogSourceType(VPCLogSourceType.MULTI_S3_SAME_REGION);
          const { bucket, prefix } = splitStringToBucketAndPrefix(
            curSelectItem.value
          );
          changeLogBucket(bucket);
          changeLogPrefix(prefix);
        } else {
          // user selected log source is not same region
          changeVpcLogSourceType(VPCLogSourceType.MULTI_S3_DIFF_REGION);
        }
      }
    }
  }, [vpcLogTask.params.logSource]);

  useEffect(() => {
    if (vpcLogTask.params.vpcLogObj) {
      getVpcLoggingConfig(vpcLogTask.params.vpcLogObj.value);
    }
  }, [vpcLogTask.params.vpcLogObj]);

  return (
    <div>
      <PagePanel title={t("step.logSource")}>
        <div>
          <LogSourceEnable
            value={vpcLogTask.params.taskType}
            onChange={(value) => {
              changeVpcLogObj(null);
              changeTaskType(value);
            }}
          />
          <HeaderPanel
            title={t("servicelog:create.awsServiceLogSettings")}
            desc={t("servicelog:create.awsServiceLogSettingsDesc")}
          >
            <div>
              <CrossAccountSelect
                disabled={loadingVpcList}
                accountId={vpcLogTask.logSourceAccountId}
                changeAccount={(id) => {
                  changeCrossAccount(id);
                  changeVpcLogObj(null);
                }}
                loadingAccount={(loading) => {
                  setDisableVPC(loading);
                }}
              />
              <div className="pb-50">
                {vpcLogTask.params.taskType === CreateLogMethod.Automatic && (
                  <FormItem
                    optionTitle={t("servicelog:vpc.vpc")}
                    optionDesc={t("servicelog:vpc.vpcDesc")}
                    errorText={
                      autoVpcEmptyError ? t("servicelog:vpc.vpcEmptyError") : ""
                    }
                    successText={
                      (vpcLogTask.params.vpcLogSourceType ===
                      VPCLogSourceType.ONE_S3_SAME_REGION
                        ? `${t("servicelog:create.savedTips")} ${
                            vpcLogTask.params.tmpFlowList[0]?.value
                          }`
                        : "") ||
                      (vpcLogTask.params.vpcLogSourceType ===
                      VPCLogSourceType.ONE_CWL
                        ? `${t("servicelog:vpc.logCWLEnabled1")} ${
                            vpcLogTask.params.tmpFlowList[0]?.value
                          } ${t("servicelog:vpc.logCWLEnabled2")}`
                        : "")
                    }
                  >
                    <AutoComplete
                      outerLoading
                      disabled={loadingVpcList || disableVPC}
                      className="m-w-75p"
                      placeholder={t("servicelog:vpc.selectVpc")}
                      loading={loadingVpcList}
                      optionList={vpcOptionList}
                      value={vpcLogTask.params.vpcLogObj}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>,
                        data
                      ) => {
                        changeVpcLogObj(data);
                      }}
                    />
                  </FormItem>
                )}
                {vpcLogTask.params.taskType === CreateLogMethod.Manual && (
                  <FormItem
                    optionTitle={t("servicelog:vpc.vpcName")}
                    optionDesc={t("servicelog:vpc.vpcNameDesc")}
                    errorText={
                      manualVpcEmptyError ? t("servicelog:vpc.inputVpc") : ""
                    }
                  >
                    <TextInput
                      className="m-w-75p"
                      placeholder={t("servicelog:vpc.inputVpc")}
                      value={vpcLogTask.source}
                      onChange={(event) => {
                        changeVPCId(event.target.value);
                      }}
                    />
                  </FormItem>
                )}
                <SourceType
                  loadingBucket={loadingBucket}
                  engineType={engineType}
                  vpcLogTask={vpcLogTask}
                  sourceTypeEmptyError={sourceTypeEmptyError}
                  manualS3EmptyError={manualS3EmptyError}
                  manualS3PathInvalid={manualS3PathInvalid}
                  vpcFlowLogEmptyError={vpcFlowLogEmptyError}
                  shardNumError={shardNumError}
                  maxShardNumError={maxShardNumError}
                  changeVPCFLowLog={(flow) => {
                    changeVPCFLowLog(flow);
                  }}
                  changeBucket={(bucket) => {
                    changeLogBucket(bucket);
                  }}
                  changeLogPath={(prefix) => {
                    changeLogPrefix(prefix);
                  }}
                  setISChanging={(changing) => {
                    setISChanging(changing);
                  }}
                  setNextStepDisableStatus={(disable) => {
                    setNextStepDisableStatus(disable);
                  }}
                  changeS3FlowList={(list) => {
                    changeS3FlowList(list);
                  }}
                  changeCWLFlowList={(list) => {
                    changeCWLFlowList(list);
                  }}
                  changeTmpFlowList={(list) => {
                    changeTmpFlowList(list);
                  }}
                  changeManualS3={(s3) => {
                    changeManualS3(s3);
                  }}
                  changeLogFormat={(format) => {
                    changeLogFormat(format);
                  }}
                  changeVpcLogSourceType={(type) => {
                    changeVpcLogSourceType(type);
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
                />
              </div>
            </div>
          </HeaderPanel>
        </div>
      </PagePanel>
    </div>
  );
};
export default SpecifySettings;
