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
import Tiles from "components/Tiles";
import Alert from "components/Alert";
import {
  CreateLogMethod,
  ENABLE_RDS_LOGS_LINK,
  RDSTypes,
  RDS_LOG_GROUP_SUFFIX_AUDIT,
  RDS_LOG_GROUP_SUFFIX_ERROR,
  RDS_LOG_GROUP_SUFFIX_GENERAL,
  RDS_LOG_GROUP_SUFFIX_SLOWQUERY,
  RDS_TASK_GROUP_PREFIX,
  RDS_TYPE_LIST,
} from "assets/js/const";
import FormItem from "components/FormItem";
import { SelectItem } from "components/Select/select";
import { appSyncRequestQuery } from "assets/js/request";
import { LoggingBucket, Resource, ResourceType } from "API";
import { getResourceLoggingBucket, listResources } from "graphql/queries";
import AutoComplete from "components/AutoComplete";
import { RDSTaskProps } from "../CreateRDS";
import { OptionType } from "components/AutoComplete/autoComplete";
import TextInput from "components/TextInput";
import Select from "components/Select";
import { AlertType } from "components/Alert/alert";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { InfoBarTypes } from "reducer/appReducer";
import { buildRDSLink } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import { RootState } from "reducer/reducers";

interface SpecifySettingsProps {
  rdsTask: RDSTaskProps;
  changeTaskType: (type: string) => void;
  changeS3Bucket: (bucket: string) => void;
  changeRDSObj: (rds: OptionType | null) => void;
  errorLogEnabled: (enable: boolean) => void;
  queryLogEnabled: (enable: boolean) => void;
  generalLogEnabled: (enable: boolean) => void;
  auditLogEnabled: (enable: boolean) => void;

  manualChangeDBIdentifier: (bucket: string) => void;
  manualChangeDBType: (type: string) => void;
  changeErrorARN: (arn: string) => void;
  changeQeuryARN: (arn: string) => void;
  changeGeneralARN: (arn: string) => void;
  changeAuditARN: (arn: string) => void;
  autoRDSEmptyError: boolean;
  manualRDSEmptyError: boolean;
  setNextStepDisableStatus: (status: boolean) => void;
  setISChanging: (changing: boolean) => void;
  changeRDSBucket: (bucket: string, prefix: string) => void;
  changeCrossAccount: (id: string) => void;
}

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const {
    rdsTask,
    changeRDSObj,
    errorLogEnabled,
    queryLogEnabled,
    generalLogEnabled,
    auditLogEnabled,
    manualChangeDBIdentifier,
    manualChangeDBType,
    changeErrorARN,
    changeQeuryARN,
    changeGeneralARN,
    changeAuditARN,
    // changeS3Bucket,
    changeTaskType,
    autoRDSEmptyError,
    manualRDSEmptyError,
    // setNextStepDisableStatus,
    setISChanging,
    changeRDSBucket,
    changeCrossAccount,
  } = props;

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const { t } = useTranslation();

  const [loadingRDSList, setLoadingRDSList] = useState(false);
  const [rdsOptionList, setRDSOptionList] = useState<SelectItem[]>([]);
  const [showLogTypes, setShowLogTypes] = useState(false);
  const [disabeRDS, setDisableRDS] = useState(false);

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
        tmpOptionList.push({
          name: `${element.name}`,
          value: element.id,
          description: element.description || "",
        });
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
    console.info("getBucketPrefix:", resData.data);
    const logginBucket: LoggingBucket = resData?.data?.getResourceLoggingBucket;
    changeRDSBucket(logginBucket?.bucket || "", logginBucket.prefix || "");
    setISChanging(false);
  };

  useEffect(() => {
    if (rdsTask.params.taskType === CreateLogMethod.Automatic) {
      getRDSList(rdsTask.logSourceAccountId);
    }
  }, [rdsTask.logSourceAccountId]);

  useEffect(() => {
    if (rdsTask.params.rdsObj?.value) {
      setShowLogTypes(true);
      // get rds bucket info
      getRDSBucketPrefix(rdsTask.params.rdsObj.value);
    } else {
      setShowLogTypes(false);
    }
  }, [rdsTask.params.rdsObj]);

  return (
    <div>
      <PagePanel title={t("servicelog:create.step.specifySetting")}>
        <div>
          <HeaderPanel title={t("servicelog:rds.creation")}>
            <div>
              <FormItem
                optionTitle={t("servicelog:rds.method")}
                optionDesc=""
                infoType={InfoBarTypes.INGESTION_CREATION_METHOD}
              >
                <Tiles
                  value={rdsTask.params.taskType}
                  onChange={(event) => {
                    changeTaskType(event.target.value);
                    changeRDSObj(null);
                  }}
                  items={[
                    {
                      label: t("servicelog:rds.auto"),
                      description: t("servicelog:rds.autoDesc"),
                      value: CreateLogMethod.Automatic,
                    },
                    {
                      label: t("servicelog:rds.manual"),
                      description: t("servicelog:rds.manualDesc"),
                      value: CreateLogMethod.Manual,
                    },
                  ]}
                />
              </FormItem>
            </div>
          </HeaderPanel>

          <HeaderPanel title={t("servicelog:create.service.rds")}>
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
                      .
                    </div>
                  }
                />
              )}
              <CrossAccountSelect
                disabled={loadingRDSList}
                accountId={rdsTask.logSourceAccountId}
                changeAccount={(id) => {
                  changeCrossAccount(id);
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
                    optionDesc={
                      <div>
                        {t("servicelog:rds.selectDB")}
                        <ExtLink
                          to={buildRDSLink(amplifyConfig.aws_project_region)}
                        >
                          {t("servicelog:rds.curAccount")}
                        </ExtLink>
                        .
                      </div>
                    }
                    errorText={
                      autoRDSEmptyError ? t("servicelog:rds.dbError") : ""
                    }
                  >
                    <AutoComplete
                      disabled={disabeRDS || loadingRDSList}
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

                  {showLogTypes && (
                    <FormItem
                      optionTitle={t("servicelog:rds.logType")}
                      optionDesc={t("servicelog:rds.logTypeDesc")}
                    >
                      <div className="flex">
                        <div className="flex-1">
                          <label>
                            <input
                              checked={rdsTask.params.errorLogEnable}
                              type="checkbox"
                              onChange={(event) => {
                                errorLogEnabled(event.target.checked);
                              }}
                            />
                            {t("servicelog:rds.errorLog")}
                          </label>
                        </div>
                        <div className="flex-1">
                          <label>
                            <input
                              checked={rdsTask.params.queryLogEnable}
                              type="checkbox"
                              onChange={(event) => {
                                queryLogEnabled(event.target.checked);
                              }}
                            />
                            {t("servicelog:rds.slowLog")}
                          </label>
                        </div>
                        <div className="flex-1">
                          <label>
                            <input
                              checked={rdsTask.params.generalLogEnable}
                              type="checkbox"
                              onChange={(event) => {
                                generalLogEnabled(event.target.checked);
                              }}
                            />
                            {t("servicelog:rds.generalLog")}
                          </label>
                        </div>
                        <div className="flex-1">
                          <label>
                            <input
                              checked={rdsTask.params.auditLogEnable}
                              type="checkbox"
                              onChange={(event) => {
                                auditLogEnabled(event.target.checked);
                              }}
                            />
                            {t("servicelog:rds.auditLog")}
                          </label>
                        </div>
                      </div>
                    </FormItem>
                  )}
                </div>
              )}
              {rdsTask.params.taskType === CreateLogMethod.Manual && (
                <div>
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
                        let conjection = "";
                        if (event.target.value === RDSTypes.Aurora) {
                          conjection = "cluster";
                        }
                        if (event.target.value === RDSTypes.MySQL) {
                          conjection = "instance";
                        }
                        changeErrorARN(
                          `${RDS_TASK_GROUP_PREFIX}/${conjection}/${rdsTask.params.manualDBIdentifier}${RDS_LOG_GROUP_SUFFIX_ERROR}`
                        );
                        changeQeuryARN(
                          `${RDS_TASK_GROUP_PREFIX}/${conjection}/${rdsTask.params.manualDBIdentifier}${RDS_LOG_GROUP_SUFFIX_SLOWQUERY}`
                        );
                        changeGeneralARN(
                          `${RDS_TASK_GROUP_PREFIX}/${conjection}/${rdsTask.params.manualDBIdentifier}${RDS_LOG_GROUP_SUFFIX_GENERAL}`
                        );
                        changeAuditARN(
                          `${RDS_TASK_GROUP_PREFIX}/${conjection}/${rdsTask.params.manualDBIdentifier}${RDS_LOG_GROUP_SUFFIX_AUDIT}`
                        );
                      }}
                    />
                  </FormItem>

                  <FormItem
                    optionTitle={t("servicelog:rds.logLocation")}
                    optionDesc={t("servicelog:rds.logLocationDesc")}
                  >
                    <div>
                      <div className="mb-15">
                        <div>
                          <label>
                            <input
                              checked={rdsTask.params.errorLogEnable}
                              type="checkbox"
                              onChange={(event) => {
                                errorLogEnabled(event.target.checked);
                              }}
                            />
                            {t("servicelog:rds.errorLog")}
                          </label>
                        </div>
                        <div>
                          <TextInput
                            className="m-w-75p"
                            placeholder="/aws/rds/xxxxxx/error"
                            value={rdsTask.params.errorLogARN}
                            onChange={(event) => {
                              console.info("event:", event);
                              changeErrorARN(event.target.value);
                            }}
                          />
                        </div>
                      </div>
                      <div className="mb-15">
                        <div>
                          <label>
                            <input
                              checked={rdsTask.params.queryLogEnable}
                              type="checkbox"
                              onChange={(event) => {
                                queryLogEnabled(event.target.checked);
                              }}
                            />{" "}
                            {t("servicelog:rds.slowLog")}
                          </label>
                        </div>
                        <div>
                          <TextInput
                            className="m-w-75p"
                            placeholder="/aws/rds/xxxxxx/slowquery"
                            value={rdsTask.params.queryLogARN}
                            onChange={(event) => {
                              console.info("event:", event);
                              changeQeuryARN(event.target.value);
                            }}
                          />
                        </div>
                      </div>
                      <div className="mb-15">
                        <div>
                          <label>
                            <input
                              checked={rdsTask.params.generalLogEnable}
                              type="checkbox"
                              onChange={(event) => {
                                generalLogEnabled(event.target.checked);
                              }}
                            />{" "}
                            {t("servicelog:rds.generalLog")}
                          </label>
                        </div>
                        <div>
                          <TextInput
                            className="m-w-75p"
                            placeholder="/aws/rds/xxxxxx/general"
                            value={rdsTask.params.generalLogARN}
                            onChange={(event) => {
                              console.info("event:", event);
                              changeGeneralARN(event.target.value);
                            }}
                          />
                        </div>
                      </div>
                      <div className="mb-15">
                        <div>
                          <label>
                            <input
                              checked={rdsTask.params.auditLogEnable}
                              type="checkbox"
                              onChange={(event) => {
                                auditLogEnabled(event.target.checked);
                              }}
                            />{" "}
                            {t("servicelog:rds.auditLog")}
                          </label>
                        </div>
                        <div>
                          <TextInput
                            className="m-w-75p"
                            placeholder="/aws/rds/xxxxxx/audit"
                            value={rdsTask.params.auditLogARN}
                            onChange={(event) => {
                              console.info("event:", event);
                              changeAuditARN(event.target.value);
                            }}
                          />
                        </div>
                      </div>
                    </div>
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
