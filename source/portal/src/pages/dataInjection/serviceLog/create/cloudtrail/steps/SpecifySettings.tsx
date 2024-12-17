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
import AutoComplete from "components/AutoComplete";
import FormItem from "components/FormItem";
import { appSyncRequestQuery } from "assets/js/request";
import { DestinationType, Resource, ResourceLogConf, ResourceType } from "API";
import { SelectItem } from "components/Select/select";
import { getResourceLogConfigs, listResources } from "graphql/queries";
import { OptionType } from "components/AutoComplete/autoComplete";
import { CloudTrailTaskProps } from "../CreateCloudTrail";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import SourceType, { S3SourceType, SuccessTextType } from "./comp/SourceType";
import { RootState } from "reducer/reducers";
import { CreateLogMethod } from "assets/js/const";
import TextInput from "components/TextInput";
import LogSourceEnable from "../../common/LogSourceEnable";
import { defaultStr, splitStringToBucketAndPrefix } from "assets/js/utils";

interface SpecifySettingsProps {
  cloudTrailTask: CloudTrailTaskProps;
  changeCloudTrailObj: (trail: OptionType | null) => void;
  changeBucket: (bucket: string) => void;
  changeLogPath: (logPath: string) => void;
  changeManualS3: (name: string) => void;
  trailEmptyError: boolean;
  setTrailEmptyError: React.Dispatch<React.SetStateAction<boolean>>;
  manualS3EmptyError: boolean;
  manualCwlArnEmptyError: boolean;
  setISChanging: (changing: boolean) => void;
  changeCrossAccount: (id: string) => void;
  changeTmpFlowList: (list: SelectItem[]) => void;
  changeS3SourceType: (type: string) => void;
  changeSuccessTextType: (type: string) => void;
  changeLogSource: (source: string) => void;
  shardNumError: boolean;
  maxShardNumError: boolean;
  changeMinCapacity: (num: string) => void;
  changeEnableAS: (enable: string) => void;
  changeMaxCapacity: (num: string) => void;
  manualChangeCloudTrail: (trail: string) => void;
  changeTaskType: (type: string) => void;
}

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const {
    cloudTrailTask,
    changeCloudTrailObj,
    changeBucket,
    changeLogPath,
    changeManualS3,
    manualS3EmptyError,
    manualCwlArnEmptyError,
    trailEmptyError,
    setTrailEmptyError,
    setISChanging,
    changeCrossAccount,
    changeTmpFlowList,
    changeS3SourceType,
    changeSuccessTextType,
    changeLogSource,
    shardNumError,
    maxShardNumError,
    changeMinCapacity,
    changeEnableAS,
    changeMaxCapacity,
    manualChangeCloudTrail,
    changeTaskType,
  } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const [cloudTrailOptionList, setCloudTrailOptionList] = useState<
    SelectItem[]
  >([]);
  const [loadingCloudTrail, setLoadingCloudTrail] = useState(false);
  const [disableTrail, setDisableTrail] = useState(false);

  const [s3FLowList, setS3FLowList] = useState<SelectItem[]>([]);
  const [cwlFlowList, setCwlFlowList] = useState<SelectItem[]>([]);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const buildSourceOptionList = (resSourceList: any) => {
    const tmpS3SourceList: SelectItem[] = [];
    const tmpCWLSourceList: SelectItem[] = [];
    if (resSourceList && resSourceList.length > 0) {
      resSourceList.forEach((element: ResourceLogConf) => {
        if (element.destinationType === DestinationType.S3) {
          tmpS3SourceList.push({
            name: defaultStr(element.name),
            value: defaultStr(element.destinationName),
            description: defaultStr(element.logFormat),
            optTitle: defaultStr(element.region),
          });
        }
        if (element.destinationType === DestinationType.CloudWatch) {
          tmpCWLSourceList.push({
            name: defaultStr(element.name),
            value: defaultStr(element.destinationName),
            description: defaultStr(element.logFormat),
            optTitle: defaultStr(element.region),
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

  const handleS3SourceChange = () => {
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
  };

  // Monitor source type / destination change
  useEffect(() => {
    if (cloudTrailTask.params.curTrailObj) {
      if (cloudTrailTask.destinationType === DestinationType.S3) {
        handleS3SourceChange();
      }
      if (cloudTrailTask.destinationType === DestinationType.CloudWatch) {
        changeTmpFlowList(cwlFlowList);
        if (cwlFlowList.length > 0) {
          changeSuccessTextType(SuccessTextType.CWL_ENABLED);
          changeLogSource(cwlFlowList[0]?.value);
        }
      }
    }
  }, [s3FLowList, cwlFlowList]);

  const getCloudTrailList = async (accountId: string) => {
    try {
      setCloudTrailOptionList([]);
      setLoadingCloudTrail(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.Trail,
        accountId: accountId,
      });
      console.info("domainNames:", resData.data);
      const dataList: Resource[] = resData.data.listResources;
      const tmpOptionList: SelectItem[] = [];
      dataList.forEach((element) => {
        tmpOptionList.push({
          name: `${element.name}`,
          value: element.id,
        });
      });
      setCloudTrailOptionList(tmpOptionList);
      setLoadingCloudTrail(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (cloudTrailTask.params.curTrailObj) {
      getCloudTrailLoggingConfig(cloudTrailTask.params.curTrailObj.value);
    }
  }, [cloudTrailTask.params.curTrailObj]);

  useEffect(() => {
    getCloudTrailList(cloudTrailTask.logSourceAccountId);
  }, [cloudTrailTask.logSourceAccountId]);

  return (
    <div>
      <PagePanel title={t("step.logSource")}>
        <div>
          <LogSourceEnable
            value={cloudTrailTask.params.taskType}
            onChange={(value) => {
              changeCloudTrailObj(null);
              changeTaskType(value);
            }}
          />
          <HeaderPanel
            title={t("servicelog:create.awsServiceLogSettings")}
            desc={t("servicelog:create.awsServiceLogSettingsDesc")}
          >
            <div>
              <div className="pb-50">
                <CrossAccountSelect
                  disabled={loadingCloudTrail}
                  accountId={cloudTrailTask.logSourceAccountId}
                  changeAccount={(id) => {
                    changeCrossAccount(id);
                    changeCloudTrailObj(null);
                  }}
                  loadingAccount={(loading) => {
                    setDisableTrail(loading);
                  }}
                />
                {cloudTrailTask.params.taskType ===
                  CreateLogMethod.Automatic && (
                  <FormItem
                    optionTitle={t("servicelog:trail.trail")}
                    optionDesc={t("servicelog:trail.select")}
                    errorText={
                      trailEmptyError ? t("servicelog:trail.trailError") : ""
                    }
                    successText={
                      (cloudTrailTask.params.successTextType ===
                        SuccessTextType.S3_ENABLED &&
                      cloudTrailTask.params?.tmpFlowList[0]
                        ? t("servicelog:create.savedTips") +
                          cloudTrailTask.params?.tmpFlowList[0]?.value
                        : "") ||
                      (cloudTrailTask.params.successTextType ===
                        SuccessTextType.CWL_ENABLED &&
                      cloudTrailTask.params?.tmpFlowList[0]
                        ? t("servicelog:trail.logSourceCWLDest") +
                          cloudTrailTask.params?.tmpFlowList[0]?.value
                        : "")
                    }
                  >
                    <AutoComplete
                      outerLoading
                      disabled={disableTrail}
                      className="m-w-75p"
                      placeholder={t("servicelog:trail.selectTrail")}
                      loading={loadingCloudTrail}
                      optionList={cloudTrailOptionList}
                      value={cloudTrailTask.params.curTrailObj}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>,
                        data
                      ) => {
                        changeCloudTrailObj(data);
                      }}
                    />
                  </FormItem>
                )}
                {cloudTrailTask.params.taskType === CreateLogMethod.Manual && (
                  <FormItem
                    optionTitle={t("servicelog:trail.trail")}
                    optionDesc={t("servicelog:trail.manual")}
                    errorText={
                      trailEmptyError
                        ? t("servicelog:trail.trailManualError")
                        : ""
                    }
                  >
                    <TextInput
                      className="m-w-75p"
                      placeholder={"example-cloudtrail-name"}
                      value={cloudTrailTask.source}
                      onChange={(event) => {
                        setTrailEmptyError(false);
                        const trail = event.target.value;
                        manualChangeCloudTrail(trail);
                      }}
                    />
                  </FormItem>
                )}
                <SourceType
                  loadingBucket={loadingBucket}
                  cloudTrailTask={cloudTrailTask}
                  shardNumError={shardNumError}
                  maxShardNumError={maxShardNumError}
                  manualS3EmptyError={manualS3EmptyError}
                  manualCwlArnEmptyError={manualCwlArnEmptyError}
                  changeManualS3={(s3) => {
                    changeManualS3(s3);
                  }}
                  changeBucket={(bucket) => {
                    changeBucket(bucket);
                  }}
                  changeLogPath={(path) => {
                    changeLogPath(path);
                  }}
                  setISChanging={(changing) => {
                    setISChanging(changing);
                    setDisableTrail(changing);
                  }}
                  changeTmpFlowList={(list) => {
                    changeTmpFlowList(list);
                  }}
                  changeSuccessTextType={(type) => {
                    changeSuccessTextType(type);
                  }}
                  changeLogSource={(source) => {
                    changeLogSource(source);
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
