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
import { Resource, ResourceType } from "API";
import { CreateLogMethod, VPC_FLOW_LOG_LINK } from "assets/js/const";
import { appSyncRequestQuery } from "assets/js/request";
import AutoComplete from "components/AutoComplete";
import { OptionType } from "components/AutoComplete/autoComplete";
import ExtLink from "components/ExtLink";
import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import { SelectItem } from "components/Select/select";
import TextInput from "components/TextInput";
import Tiles from "components/Tiles";
import { listResources } from "graphql/queries";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { InfoBarTypes } from "reducer/appReducer";
import { VpcLogTaskProps } from "../CreateVPC";
import SourceType from "./comp/SourceType";

interface SpecifySettingsProps {
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
  changeSourceType: (type: string) => void;
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
}

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const {
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
    changeSourceType,
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

  return (
    <div>
      <PagePanel title={t("servicelog:create.step.specifySetting")}>
        <div>
          <HeaderPanel title={t("servicelog:vpc.vpclogEnable")}>
            <div>
              <FormItem
                optionTitle={t("servicelog:vpc.creationMethod")}
                optionDesc=""
                infoType={InfoBarTypes.INGESTION_CREATION_METHOD}
              >
                <Tiles
                  value={vpcLogTask.params.taskType}
                  onChange={(event) => {
                    changeVpcLogObj(null);
                    changeTaskType(event.target.value);
                  }}
                  items={[
                    {
                      label: t("servicelog:vpc.auto"),
                      description: t("servicelog:vpc.autoDesc"),
                      value: CreateLogMethod.Automatic,
                    },
                    {
                      label: t("servicelog:vpc.manual"),
                      description: t("servicelog:vpc.manualDesc"),
                      value: CreateLogMethod.Manual,
                    },
                  ]}
                />
              </FormItem>
            </div>
          </HeaderPanel>

          <HeaderPanel title={t("servicelog:vpc.title")}>
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
              {vpcLogTask.params.taskType === CreateLogMethod.Automatic && (
                <div className="pb-50">
                  <FormItem
                    optionTitle={t("servicelog:vpc.vpc")}
                    optionDesc={
                      <div>
                        {t("servicelog:vpc.vpcDesc")}
                        <ExtLink to={VPC_FLOW_LOG_LINK}>
                          {t("servicelog:vpc.vpcLog")}
                        </ExtLink>
                      </div>
                    }
                    errorText={
                      autoVpcEmptyError ? t("servicelog:vpc.vpcEmptyError") : ""
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
                  <SourceType
                    vpcLogTask={vpcLogTask}
                    sourceTypeEmptyError={sourceTypeEmptyError}
                    manualS3EmptyError={manualS3EmptyError}
                    manualS3PathInvalid={manualS3PathInvalid}
                    vpcFlowLogEmptyError={vpcFlowLogEmptyError}
                    shardNumError={shardNumError}
                    maxShardNumError={maxShardNumError}
                    changeSourceType={(type) => {
                      changeSourceType(type);
                    }}
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
              )}
              {vpcLogTask.params.taskType === CreateLogMethod.Manual && (
                <div className="pb-50">
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

                  <SourceType
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
                    changeSourceType={(type) => {
                      changeSourceType(type);
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
              )}
            </div>
          </HeaderPanel>
        </div>
      </PagePanel>
    </div>
  );
};
export default SpecifySettings;
