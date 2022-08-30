/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { LoggingBucket, Resource, ResourceType } from "API";
import { CreateLogMethod, VPC_FLOW_LOG_LINK } from "assets/js/const";
import { appSyncRequestQuery } from "assets/js/request";
import { splitStringToBucketAndPrefix } from "assets/js/utils";
import Alert from "components/Alert";
import AutoComplete from "components/AutoComplete";
import { OptionType } from "components/AutoComplete/autoComplete";
import ExtLink from "components/ExtLink";
import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import { SelectItem } from "components/Select/select";
import TextInput from "components/TextInput";
import Tiles from "components/Tiles";
import { getResourceLoggingBucket, listResources } from "graphql/queries";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { InfoBarTypes } from "reducer/appReducer";
import AutoEnableLogging from "../../common/AutoEnableLogging";
import { VpcLogTaskProps } from "../CreateVPC";

interface SpecifySettingsProps {
  vpcLogTask: VpcLogTaskProps;
  autoVpcEmptyError: boolean;
  manualVpcEmptyError: boolean;
  setISChanging: (changing: boolean) => void;
  changeTaskType: (type: string) => void;
  changeVpcLogObj: (vpc: OptionType | null) => void;
  changeLogBucket: (bucket: string) => void;
  changeLogPrefix: (path: string) => void;
  changeManualBucketName: (name: string) => void;
  changeManualBucketS3Path: (name: string) => void;
  setNextStepDisableStatus: (status: boolean) => void;
  changeCrossAccount: (id: string) => void;
}

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const {
    vpcLogTask,
    autoVpcEmptyError,
    manualVpcEmptyError,
    setISChanging,
    changeTaskType,
    changeVpcLogObj,
    changeLogBucket,
    changeLogPrefix,
    changeManualBucketName,
    changeManualBucketS3Path,
    setNextStepDisableStatus,
    changeCrossAccount,
  } = props;

  const { t } = useTranslation();

  const [loadingVpcList, setLoadingVpcList] = useState(false);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [showSuccessText, setShowSuccessText] = useState(false);
  const [showInfoText, setShowInfoText] = useState(false);

  const [previewVpcLogPath, setPreviewVpcLogPath] = useState("");

  const [vpcOptionList, setVpcOptionList] = useState<SelectItem[]>([]);
  const [disableVPC, setDisableVPC] = useState(false);

  const getVpcList = async (accountId: string) => {
    try {
      setLoadingVpcList(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.VPC,
        accountId: accountId,
      });
      console.info("domainNames:", resData.data);
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

  const getVpcLoggingBucket = async (bucket: string) => {
    setLoadingBucket(true);
    setISChanging(true);
    const resData: any = await appSyncRequestQuery(getResourceLoggingBucket, {
      type: ResourceType.VPC,
      resourceName: bucket,
      accountId: vpcLogTask.logSourceAccountId,
    });
    console.info("getBucketPrefix:", resData.data);
    const logginBucket: LoggingBucket = resData?.data?.getResourceLoggingBucket;
    setLoadingBucket(false);
    setISChanging(false);
    setPreviewVpcLogPath(` s3://${logginBucket.bucket}/${logginBucket.prefix}`);
    if (logginBucket.enabled) {
      changeLogBucket(logginBucket.bucket || "");
      changeLogPrefix(logginBucket.prefix || "");
      setNextStepDisableStatus(false);
      setShowSuccessText(true);
    } else {
      setNextStepDisableStatus(true);
      setShowInfoText(true);
      setShowSuccessText(false);
    }
  };

  useEffect(() => {
    setShowSuccessText(false);
    setNextStepDisableStatus(false);
    setShowInfoText(false);
    if (vpcLogTask.params.vpcLogObj && vpcLogTask.params.vpcLogObj.value) {
      getVpcLoggingBucket(vpcLogTask.params.vpcLogObj.value);
    }
  }, [vpcLogTask.params.vpcLogObj]);

  useEffect(() => {
    if (vpcLogTask.params.taskType === CreateLogMethod.Automatic) {
      getVpcList(vpcLogTask.logSourceAccountId);
    }
  }, [vpcLogTask.logSourceAccountId]);

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
              <Alert content={t("servicelog:vpc.alert")} />
              <CrossAccountSelect
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
                    successText={
                      showSuccessText && previewVpcLogPath
                        ? t("servicelog:vpc.savedTips") + previewVpcLogPath
                        : ""
                    }
                  >
                    <AutoComplete
                      outerLoading
                      disabled={loadingVpcList || loadingBucket || disableVPC}
                      className="m-w-75p"
                      placeholder={t("servicelog:vpc.selectVpc")}
                      loading={loadingVpcList || loadingBucket}
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
                  {showInfoText && (
                    <AutoEnableLogging
                      title={t("servicelog:vpc.noLogOutput")}
                      desc={
                        t("servicelog:vpc.noLogOutputDesc") +
                        previewVpcLogPath +
                        " ?"
                      }
                      accountId={vpcLogTask.logSourceAccountId}
                      resourceType={ResourceType.VPC}
                      resourceName={vpcLogTask.source}
                      changeEnableStatus={(status) => {
                        setISChanging(status);
                      }}
                      changeLogBucketAndPrefix={(bucket, prefix, enabled) => {
                        changeLogBucket(bucket || "");
                        changeLogPrefix(prefix || "");
                        if (enabled) {
                          setPreviewVpcLogPath(` s3://${bucket}/${prefix}`);
                          setShowSuccessText(true);
                          setShowInfoText(false);
                          setNextStepDisableStatus(false);
                        } else {
                          setShowInfoText(true);
                          setShowSuccessText(false);
                        }
                      }}
                    />
                  )}
                </div>
              )}
              {vpcLogTask.params.taskType === CreateLogMethod.Manual && (
                <div className="pb-50">
                  <FormItem
                    optionTitle={t("servicelog:vpc.vpcName")}
                    optionDesc={t("servicelog:vpc.vpcNameDesc")}
                  >
                    <TextInput
                      className="m-w-75p"
                      placeholder={t("servicelog:vpc.inputVpc")}
                      value={vpcLogTask.params.manualBucketName}
                      onChange={(event) => {
                        changeManualBucketName(event.target.value);
                      }}
                    />
                  </FormItem>
                  <FormItem
                    optionTitle={t("servicelog:vpc.vpcLogLocation")}
                    optionDesc={t("servicelog:vpc.vpcLogLocationDesc")}
                    errorText={
                      manualVpcEmptyError
                        ? t("servicelog:vpc.vpcLogLocationError")
                        : ""
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
                        changeLogPrefix(prefix);
                        changeLogBucket(bucket);
                        changeManualBucketS3Path(event.target.value);
                      }}
                    />
                  </FormItem>
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
