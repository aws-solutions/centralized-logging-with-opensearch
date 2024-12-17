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
import Alert from "components/Alert";
import {
  CreateLogMethod,
  ENABLE_RDS_LOGS_LINK,
  RDS_TYPE_LIST,
} from "assets/js/const";
import FormItem from "components/FormItem";
import { SelectItem } from "components/Select/select";
import { appSyncRequestQuery } from "assets/js/request";
import { LoggingBucket, Resource, ResourceType, SubAccountLink } from "API";
import { getResourceLoggingBucket, listResources } from "graphql/queries";
import AutoComplete from "components/AutoComplete";
import { RDSTaskProps } from "../CreateRDS";
import { OptionType } from "components/AutoComplete/autoComplete";
import TextInput from "components/TextInput";
import Select from "components/Select";
import { AlertType } from "components/Alert/alert";
import { AnalyticEngineTypes, RDSIngestOption } from "types";
import { defaultStr } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import LogSourceEnable from "../../common/LogSourceEnable";

interface SpecifySettingsProps {
  engineType: AnalyticEngineTypes;
  ingestLogType: string;
  rdsTask: RDSTaskProps;
  changeTaskType: (type: string) => void;
  changeRDSObj: (rds: OptionType | null) => void;
  errorLogEnabled: (enable: boolean) => void;
  queryLogEnabled: (enable: boolean) => void;
  generalLogEnabled: (enable: boolean) => void;
  auditLogEnabled: (enable: boolean) => void;

  manualChangeDBIdentifier: (bucket: string) => void;
  manualChangeDBType: (type: string) => void;
  autoRDSEmptyError: boolean;
  manualRDSEmptyError: boolean;
  setISChanging: (changing: boolean) => void;
  changeRDSBucket: (bucket: string, prefix: string) => void;
  changeCrossAccount: (id: string, accountInfo: SubAccountLink | null) => void;
}

const NORMAL_LOGGING_TYPE = ["[MySQL]", "[Aurora MySQL]"];
const LIGHT_ENGINE_LOGGING_TYPE = [
  ...NORMAL_LOGGING_TYPE,
  "[Aurora PostgreSQL]",
  "[PostgreSQL]",
];

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const {
    engineType,
    ingestLogType,
    rdsTask,
    changeRDSObj,
    manualChangeDBIdentifier,
    manualChangeDBType,
    // changeS3Bucket,
    changeTaskType,
    autoRDSEmptyError,
    manualRDSEmptyError,
    // setNextStepDisableStatus,
    setISChanging,
    changeRDSBucket,
    changeCrossAccount,
  } = props;

  const { t } = useTranslation();

  const [loadingRDSList, setLoadingRDSList] = useState(false);
  const [rdsOptionList, setRDSOptionList] = useState<SelectItem[]>([]);
  const [showLogTypes, setShowLogTypes] = useState(false);
  const [disableRDS, setDisableRDS] = useState(false);

  const removeCharacters = (str: string, charactersToRemove: string[]) => {
    let result = str;
    charactersToRemove.forEach((char) => {
      result = result.split(char).join("");
    });
    return result;
  };

  const isRDSTypeInSupportArray = (str: string) => {
    const postgreTypes = ["[PostgreSQL]", "[Aurora PostgreSQL]"];
    const mySQLTypes = ["[MySQL]", "[Aurora MySQL]"];

    const typesToCheck =
      ingestLogType === RDSIngestOption.PostgreSQL ? postgreTypes : mySQLTypes;

    return typesToCheck.some((type) => str.includes(type));
  };

  const getRDSList = async (accountId: string) => {
    try {
      setRDSOptionList([]);
      setLoadingRDSList(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.RDS,
        accountId: accountId,
      });
      console.info("getRDSList:", resData.data);
      const dataList: Resource[] = resData.data.listResources;
      const tmpOptionList: SelectItem[] = [];

      dataList.forEach((element) => {
        if (element.name && isRDSTypeInSupportArray(element.name)) {
          tmpOptionList.push({
            name: `${removeCharacters(
              element.name,
              LIGHT_ENGINE_LOGGING_TYPE
            )}`,
            value: element.id,
            description: defaultStr(element.description),
          });
        }
      });
      setRDSOptionList(tmpOptionList);
      setLoadingRDSList(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getRDSBucketPrefix = async (rdsId: string) => {
    setISChanging(true);
    const resData: any = await appSyncRequestQuery(getResourceLoggingBucket, {
      type: ResourceType.RDS,
      resourceName: rdsId,
      accountId: rdsTask.logSourceAccountId,
    });
    const loggingBucket: LoggingBucket =
      resData?.data?.getResourceLoggingBucket;
    changeRDSBucket(
      defaultStr(loggingBucket?.bucket),
      defaultStr(loggingBucket.prefix)
    );
    setISChanging(false);
  };

  useEffect(() => {
    if (rdsTask.params.taskType === CreateLogMethod.Automatic) {
      getRDSList(rdsTask.logSourceAccountId);
    }
  }, [rdsTask.logSourceAccountId]);

  useEffect(() => {
    if (rdsTask.params.rdsObj?.value) {
      if (ingestLogType === RDSIngestOption.MySQL) {
        setShowLogTypes(true);
      }
      // get rds bucket info
      getRDSBucketPrefix(rdsTask.params.rdsObj.value);
    } else {
      setShowLogTypes(false);
    }
  }, [rdsTask.params.rdsObj]);

  return (
    <div>
      <PagePanel title={t("step.logSource")}>
        <div>
          <LogSourceEnable
            value={rdsTask.params.taskType}
            onChange={(value) => {
              changeTaskType(value);
              changeRDSObj(null);
            }}
          />
          <HeaderPanel
            title={t("servicelog:create.awsServiceLogSettings")}
            desc={t("servicelog:create.awsServiceLogSettingsDesc")}
          >
            <div>
              <Alert content={t("servicelog:rds.alert")} />
              {showLogTypes && (
                <Alert
                  type={AlertType.Warning}
                  content={
                    <div>
                      {t("servicelog:rds.enableAlert1")}
                      <a
                        href={ENABLE_RDS_LOGS_LINK}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("servicelog:rds.enableAlert2")}
                      </a>
                    </div>
                  }
                />
              )}
              <CrossAccountSelect
                disabled={loadingRDSList}
                accountId={rdsTask.logSourceAccountId}
                changeAccount={(id, accountInfo) => {
                  changeCrossAccount(id, accountInfo);
                  changeRDSObj(null);
                }}
                loadingAccount={(loading) => {
                  setDisableRDS(loading);
                }}
              />
              {rdsTask.params.taskType === CreateLogMethod.Automatic && (
                <div>
                  <FormItem
                    optionTitle={t("servicelog:rds.dbID")}
                    optionDesc={t("servicelog:rds.selectDB")}
                    errorText={
                      autoRDSEmptyError ? t("servicelog:rds.dbError") : ""
                    }
                  >
                    <AutoComplete
                      disabled={disableRDS || loadingRDSList}
                      outerLoading
                      className="m-w-75p"
                      placeholder={t("servicelog:rds.select")}
                      loading={loadingRDSList}
                      optionList={rdsOptionList}
                      value={rdsTask.params.rdsObj}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>,
                        data
                      ) => {
                        changeRDSObj(data);
                      }}
                    />
                  </FormItem>
                </div>
              )}
              {rdsTask.params.taskType === CreateLogMethod.Manual && (
                <div>
                  {engineType !== AnalyticEngineTypes.LIGHT_ENGINE &&
                    ingestLogType === RDSIngestOption.MySQL && (
                      <FormItem
                        optionTitle={t("servicelog:rds.dbType")}
                        optionDesc={t("servicelog:rds.selectTheDBType")}
                      >
                        <Select
                          placeholder={t("servicelog:rds.selectDBType")}
                          className="m-w-75p"
                          // loading={loadingDomain}
                          optionList={RDS_TYPE_LIST}
                          value={rdsTask.params.manualDBType}
                          onChange={(event) => {
                            console.info("manualDBType:event:", event);
                            manualChangeDBType(event.target.value);
                          }}
                        />
                      </FormItem>
                    )}

                  <FormItem
                    optionTitle={t("servicelog:rds.inputDBID")}
                    optionDesc={t("servicelog:rds.inputDBIDDesc")}
                    errorText={
                      manualRDSEmptyError
                        ? t("servicelog:rds.inputDBIDError")
                        : ""
                    }
                  >
                    <TextInput
                      className="m-w-75p"
                      placeholder={t("servicelog:rds.inputDBID")}
                      value={rdsTask.params.manualDBIdentifier}
                      onChange={(event) => {
                        manualChangeDBIdentifier(event.target.value);
                      }}
                      onBlur={(event) => {
                        getRDSBucketPrefix(event.target.value);
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
