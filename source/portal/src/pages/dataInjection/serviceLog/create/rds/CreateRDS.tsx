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
import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import CreateStep from "components/CreateStep";
import SpecifySettings from "./steps/SpecifySettings";
import SpecifyOpenSearchCluster, {
  AOSInputValidRes,
  checkOpenSearchInput,
  covertParametersByKeyAndConditions,
} from "../common/SpecifyCluster";
import CreateTags from "../common/CreateTags";
import Button from "components/Button";

import Breadcrumb from "components/Breadcrumb";
import { appSyncRequestMutation } from "assets/js/request";
import { createServicePipeline } from "graphql/mutations";
import { CODEC, DestinationType, EngineType, ServiceType, Tag } from "API";
import {
  WarmTransitionType,
  YesNo,
  AmplifyConfigType,
  SERVICE_LOG_INDEX_SUFFIX,
} from "types";
import { OptionType } from "components/AutoComplete/autoComplete";
import {
  CreateLogMethod,
  RDS_LOG_GROUP_SUFFIX_AUDIT,
  RDS_LOG_GROUP_SUFFIX_ERROR,
  RDS_LOG_GROUP_SUFFIX_GENERAL,
  RDS_LOG_GROUP_SUFFIX_SLOWQUERY,
  ServiceLogType,
} from "assets/js/const";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

const EXCLUDE_PARAMS = [
  "esDomainId",
  "rdsObj",
  "taskType",
  "manualDBIdentifier",
  "manualDBType",
  "warmEnable",
  "coldEnable",
  "autoLogGroupPrefix",
  "errorLogEnable",
  "queryLogEnable",
  "generalLogEnable",
  "auditLogEnable",
  "kdsShardNumber",
  "kdsRetentionHours",
  "errorLogARN",
  "queryLogARN",
  "generalLogARN",
  "auditLogARN",
  "rolloverSizeNotSupport",
];
export interface RDSTaskProps {
  type: ServiceType;
  tags: Tag[];
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  destinationType: string;
  params: {
    // [index: string]: string | any;
    engineType: string;
    warmEnable: boolean;
    coldEnable: boolean;
    rdsObj: OptionType | null;
    taskType: string;
    autoLogGroupPrefix: string;
    errorLogEnable: boolean;
    errorLogARN: string;
    queryLogEnable: boolean;
    queryLogARN: string;
    generalLogEnable: boolean;
    generalLogARN: string;
    auditLogEnable: boolean;
    auditLogARN: string;
    kdsShardNumber: string;
    kdsRetentionHours: string;
    manualDBIdentifier: string;
    manualDBType: string;
    endpoint: string;
    domainName: string;
    esDomainId: string;
    indexPrefix: string;
    createDashboard: string;
    vpcId: string;
    subnetIds: string;
    securityGroupId: string;

    logBucketName: string;
    logBucketPrefix: string;
    shardNumbers: string;
    replicaNumbers: string;

    enableRolloverByCapacity: boolean;
    warmTransitionType: string;
    warmAge: string;
    coldAge: string;
    retainAge: string;
    rolloverSize: string;
    indexSuffix: string;
    codec: string;
    refreshInterval: string;

    rolloverSizeNotSupport: boolean;
  };
}

const DEFAULT_TASK_VALUE: RDSTaskProps = {
  type: ServiceType.RDS,
  source: "",
  target: "",
  tags: [],
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: DestinationType.CloudWatch,
  params: {
    engineType: "",
    warmEnable: false,
    coldEnable: false,
    rdsObj: null,
    taskType: CreateLogMethod.Automatic,
    autoLogGroupPrefix: "",
    errorLogEnable: false,
    errorLogARN: "",
    queryLogEnable: false,
    queryLogARN: "",
    generalLogEnable: false,
    generalLogARN: "",
    auditLogEnable: false,
    auditLogARN: "",
    kdsShardNumber: "",
    kdsRetentionHours: "",
    manualDBIdentifier: "",
    manualDBType: "",
    endpoint: "",
    domainName: "",
    esDomainId: "",
    indexPrefix: "",
    createDashboard: YesNo.Yes,
    vpcId: "",
    subnetIds: "",
    securityGroupId: "",

    logBucketName: "",
    logBucketPrefix: "",
    shardNumbers: "1",
    replicaNumbers: "1",

    enableRolloverByCapacity: true,
    warmTransitionType: WarmTransitionType.IMMEDIATELY,
    warmAge: "0",
    coldAge: "60",
    retainAge: "180",
    rolloverSize: "30",
    indexSuffix: SERVICE_LOG_INDEX_SUFFIX.yyyy_MM_dd,
    codec: CODEC.best_compression,
    refreshInterval: "1s",

    rolloverSizeNotSupport: false,
  },
};

const CreateRDS: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("servicelog:name"),
      link: "/log-pipeline/service-log",
    },
    {
      name: t("servicelog:create.name"),
      link: "/log-pipeline/service-log/create",
    },
    { name: t("servicelog:create.service.rds") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  const [curStep, setCurStep] = useState(0);
  const history = useHistory();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [rdsPipelineTask, setRDSPipelineTask] =
    useState<RDSTaskProps>(DEFAULT_TASK_VALUE);

  const [autoRDSEmptyError, setAutoRDSEmptyError] = useState(false);
  const [manualRDSEmpryError, setManualRDSEmpryError] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);

  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [rdsIsChanging, setRDSIsChanging] = useState(false);
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);

  const [aosInputValidRes, setAosInputValidRes] = useState<AOSInputValidRes>({
    shardsInvalidError: false,
    warmLogInvalidError: false,
    coldLogInvalidError: false,
    logRetentionInvalidError: false,
    coldMustLargeThanWarm: false,
    logRetentionMustThanColdAndWarm: false,
    capacityInvalidError: false,
    indexEmptyError: false,
    indexNameFormatError: false,
  });

  const confirmCreatePipeline = async () => {
    console.info("rdsPipelineTask:", rdsPipelineTask);
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.RDS;
    createPipelineParams.source = rdsPipelineTask.source;
    createPipelineParams.target = rdsPipelineTask.target;
    createPipelineParams.tags = rdsPipelineTask.tags;
    createPipelineParams.logSourceAccountId =
      rdsPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = rdsPipelineTask.destinationType;

    const tmpParamList: any = covertParametersByKeyAndConditions(
      rdsPipelineTask,
      EXCLUDE_PARAMS
    );

    // Automatic Task
    const tmpLogGroupNameArr: string[] = [];
    if (rdsPipelineTask.params.taskType === CreateLogMethod.Automatic) {
      // Add logGroupNames by User Select
      if (rdsPipelineTask.params.errorLogEnable) {
        tmpLogGroupNameArr.push(
          rdsPipelineTask.params.autoLogGroupPrefix + RDS_LOG_GROUP_SUFFIX_ERROR
        );
      }
      if (rdsPipelineTask.params.queryLogEnable) {
        tmpLogGroupNameArr.push(
          rdsPipelineTask.params.autoLogGroupPrefix +
            RDS_LOG_GROUP_SUFFIX_SLOWQUERY
        );
      }
      if (rdsPipelineTask.params.generalLogEnable) {
        tmpLogGroupNameArr.push(
          rdsPipelineTask.params.autoLogGroupPrefix +
            RDS_LOG_GROUP_SUFFIX_GENERAL
        );
      }
      if (rdsPipelineTask.params.auditLogEnable) {
        tmpLogGroupNameArr.push(
          rdsPipelineTask.params.autoLogGroupPrefix + RDS_LOG_GROUP_SUFFIX_AUDIT
        );
      }
    }

    // Manual Task
    if (rdsPipelineTask.params.taskType === CreateLogMethod.Manual) {
      // Add logGroupNames by User Select
      if (rdsPipelineTask.params.errorLogEnable) {
        tmpLogGroupNameArr.push(rdsPipelineTask.params.errorLogARN);
      }
      if (rdsPipelineTask.params.queryLogEnable) {
        tmpLogGroupNameArr.push(rdsPipelineTask.params.queryLogARN);
      }
      if (rdsPipelineTask.params.generalLogEnable) {
        tmpLogGroupNameArr.push(rdsPipelineTask.params.generalLogARN);
      }
      if (rdsPipelineTask.params.auditLogEnable) {
        tmpLogGroupNameArr.push(rdsPipelineTask.params.auditLogARN);
      }
    }

    // Add logGroupNames
    tmpParamList.push({
      parameterKey: "logGroupNames",
      parameterValue: tmpLogGroupNameArr.join(","),
    });

    // Add Default Failed Log Bucket
    tmpParamList.push({
      parameterKey: "backupBucketName",
      parameterValue: amplifyConfig.default_logging_bucket,
    });

    // Add defaultCmkArnParam
    tmpParamList.push({
      parameterKey: "defaultCmkArnParam",
      parameterValue: amplifyConfig.default_cmk_arn,
    });

    createPipelineParams.parameters = tmpParamList;
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createServicePipeline,
        createPipelineParams
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      history.push({
        pathname: "/log-pipeline/service-log",
      });
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  useEffect(() => {
    console.info("rdsPipelineTask:", rdsPipelineTask);
  }, [rdsPipelineTask]);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="lh-create-log">
            <Breadcrumb list={breadCrumbList} />
            <div className="create-wrapper">
              <div className="create-step">
                <CreateStep
                  list={[
                    {
                      name: t("servicelog:create.step.specifySetting"),
                    },
                    {
                      name: t("servicelog:create.step.specifyDomain"),
                    },
                    {
                      name: t("servicelog:create.step.createTags"),
                    },
                  ]}
                  activeIndex={curStep}
                  selectStep={(step: number) => {
                    if (curStep === 0) {
                      if (nextStepDisable || rdsIsChanging) {
                        return;
                      }
                      if (
                        rdsPipelineTask.params.taskType ===
                        CreateLogMethod.Automatic
                      ) {
                        if (!rdsPipelineTask.params.rdsObj) {
                          setAutoRDSEmptyError(true);
                          return;
                        }
                      }
                      if (
                        rdsPipelineTask.params.taskType ===
                        CreateLogMethod.Manual
                      ) {
                        if (!rdsPipelineTask.params.manualDBIdentifier) {
                          setManualRDSEmpryError(true);
                          return;
                        }
                      }
                    }
                    if (curStep === 1) {
                      if (!rdsPipelineTask.params.domainName) {
                        setEsDomainEmptyError(true);
                        return;
                      } else {
                        setEsDomainEmptyError(false);
                      }
                    }
                    setCurStep(step);
                  }}
                />
              </div>
              <div className="create-content m-w-800">
                {curStep === 0 && (
                  <SpecifySettings
                    rdsTask={rdsPipelineTask}
                    setISChanging={(status) => {
                      setRDSIsChanging(status);
                    }}
                    manualRDSEmptyError={manualRDSEmpryError}
                    autoRDSEmptyError={autoRDSEmptyError}
                    changeCrossAccount={(id) => {
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          logSourceAccountId: id,
                        };
                      });
                    }}
                    manualChangeDBIdentifier={(dbIdentifier) => {
                      setAutoRDSEmptyError(false);
                      setManualRDSEmpryError(false);
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          source: dbIdentifier,
                          params: {
                            ...prev.params,
                            manualDBIdentifier: dbIdentifier,
                            indexPrefix: dbIdentifier.toLowerCase(),
                          },
                        };
                      });
                    }}
                    manualChangeDBType={(type: string) => {
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            errorLogEnable: true,
                            queryLogEnable: true,
                            generalLogEnable: false,
                            auditLogEnable: false,
                            manualDBType: type,
                          },
                        };
                      });
                    }}
                    changeErrorARN={(arn: string) => {
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            errorLogARN: arn,
                          },
                        };
                      });
                    }}
                    changeQeuryARN={(arn: string) => {
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            queryLogARN: arn,
                          },
                        };
                      });
                    }}
                    changeGeneralARN={(arn: string) => {
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            generalLogARN: arn,
                          },
                        };
                      });
                    }}
                    changeAuditARN={(arn: string) => {
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            auditLogARN: arn,
                          },
                        };
                      });
                    }}
                    changeTaskType={(taskType) => {
                      console.info("taskType:", taskType);
                      setRDSPipelineTask({
                        ...DEFAULT_TASK_VALUE,
                        params: {
                          ...DEFAULT_TASK_VALUE.params,
                          taskType: taskType,
                        },
                      });
                    }}
                    changeRDSObj={(rdsObj) => {
                      console.info("rdsObj:", rdsObj);
                      setAutoRDSEmptyError(false);
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          source: rdsObj?.name || "",
                          params: {
                            ...prev.params,
                            indexPrefix: rdsObj?.value?.toLowerCase() || "",
                            rdsObj: rdsObj,
                            autoLogGroupPrefix: rdsObj?.description || "",
                            // Reset Select
                            errorLogEnable: true,
                            queryLogEnable: true,
                            generalLogEnable: false,
                            auditLogEnable: false,
                          },
                        };
                      });
                    }}
                    changeRDSBucket={(bucket, prefix) => {
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            logBucketName: bucket,
                            logBucketPrefix: prefix,
                          },
                        };
                      });
                    }}
                    errorLogEnabled={(enable) => {
                      console.info("enable:", enable);
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            errorLogEnable: enable,
                          },
                        };
                      });
                    }}
                    queryLogEnabled={(enable) => {
                      console.info("enable:", enable);
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            queryLogEnable: enable,
                          },
                        };
                      });
                    }}
                    generalLogEnabled={(enable) => {
                      console.info("enable:", enable);
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            generalLogEnable: enable,
                          },
                        };
                      });
                    }}
                    auditLogEnabled={(enable) => {
                      console.info("enable:", enable);
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            auditLogEnable: enable,
                          },
                        };
                      });
                    }}
                    changeS3Bucket={(bucketName) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            logBucket: bucketName,
                            indexPrefix: bucketName,
                          },
                        };
                      });
                    }}
                    setNextStepDisableStatus={(status) => {
                      setNextStepDisable(status);
                    }}
                  />
                )}
                {curStep === 1 && (
                  <SpecifyOpenSearchCluster
                    taskType={ServiceLogType.Amazon_RDS}
                    pipelineTask={rdsPipelineTask}
                    esDomainEmptyError={esDomainEmptyError}
                    changeLoadingDomain={(loading) => {
                      setDomainListIsLoading(loading);
                    }}
                    aosInputValidRes={aosInputValidRes}
                    changeShards={(shards) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          shardsInvalidError: false,
                        };
                      });
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            shardNumbers: shards,
                          },
                        };
                      });
                    }}
                    changeReplicas={(replicas) => {
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            replicaNumbers: replicas,
                          },
                        };
                      });
                    }}
                    changeBucketIndex={(indexPrefix) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            indexPrefix: indexPrefix,
                          },
                        };
                      });
                    }}
                    changeOpenSearchCluster={(cluster) => {
                      const NOT_SUPPORT_VERSION =
                        cluster?.engine === EngineType.Elasticsearch ||
                        parseFloat(cluster?.version || "") < 1.3;
                      setEsDomainEmptyError(false);
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          target: cluster?.domainName || "",
                          engine: cluster?.engine || "",
                          params: {
                            ...prev.params,
                            engineType: cluster?.engine || "",
                            domainName: cluster?.domainName || "",
                            esDomainId: cluster?.id || "",
                            endpoint: cluster?.endpoint || "",
                            securityGroupId:
                              cluster?.vpc?.securityGroupId || "",
                            subnetIds: cluster?.vpc?.privateSubnetIds || "",
                            vpcId: cluster?.vpc?.vpcId || "",
                            warmEnable: cluster?.nodes?.warmEnabled || false,
                            coldEnable: cluster?.nodes?.coldEnabled || false,
                            rolloverSizeNotSupport: NOT_SUPPORT_VERSION,
                            enableRolloverByCapacity: !NOT_SUPPORT_VERSION,
                            rolloverSize: NOT_SUPPORT_VERSION ? "" : "30",
                          },
                        };
                      });
                    }}
                    changeSampleDashboard={(yesNo) => {
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            createDashboard: yesNo,
                          },
                        };
                      });
                    }}
                    changeWarnLogTransition={(value: string) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          warmLogInvalidError: false,
                        };
                      });
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            warmAge: value,
                          },
                        };
                      });
                    }}
                    changeColdLogTransition={(value: string) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          coldLogInvalidError: false,
                          coldMustLargeThanWarm: false,
                        };
                      });
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            coldAge: value,
                          },
                        };
                      });
                    }}
                    changeLogRetention={(value: string) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          logRetentionInvalidError: false,
                          logRetentionMustThanColdAndWarm: false,
                        };
                      });
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            retainAge: value,
                          },
                        };
                      });
                    }}
                    changeIndexSuffix={(suffix: string) => {
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            indexSuffix: suffix,
                          },
                        };
                      });
                    }}
                    changeEnableRollover={(enable: boolean) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          capacityInvalidError: false,
                        };
                      });
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            enableRolloverByCapacity: enable,
                          },
                        };
                      });
                    }}
                    changeRolloverSize={(size: string) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          capacityInvalidError: false,
                        };
                      });
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            rolloverSize: size,
                          },
                        };
                      });
                    }}
                    changeCompressionType={(codec: string) => {
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            codec: codec,
                          },
                        };
                      });
                    }}
                    changeWarmSettings={(type: string) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          coldMustLargeThanWarm: false,
                        };
                      });
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            warmTransitionType: type,
                          },
                        };
                      });
                    }}
                  />
                )}
                {curStep === 2 && (
                  <CreateTags
                    pipelineTask={rdsPipelineTask}
                    changeTags={(tags) => {
                      setRDSPipelineTask((prev: RDSTaskProps) => {
                        return { ...prev, tags: tags };
                      });
                    }}
                  />
                )}
                <div className="button-action text-right">
                  <Button
                    btnType="text"
                    onClick={() => {
                      history.push({
                        pathname: "/log-pipeline/service-log/create",
                      });
                    }}
                  >
                    {t("button.cancel")}
                  </Button>
                  {curStep > 0 && (
                    <Button
                      onClick={() => {
                        setCurStep((curStep) => {
                          return curStep - 1 < 0 ? 0 : curStep - 1;
                        });
                      }}
                    >
                      {t("button.previous")}
                    </Button>
                  )}

                  {curStep < 2 && (
                    <Button
                      disabled={rdsIsChanging || domainListIsLoading}
                      btnType="primary"
                      onClick={() => {
                        if (curStep === 0) {
                          if (nextStepDisable) {
                            return;
                          }
                          if (
                            rdsPipelineTask.params.taskType ===
                            CreateLogMethod.Automatic
                          ) {
                            if (!rdsPipelineTask.params.rdsObj) {
                              setAutoRDSEmptyError(true);
                              return;
                            }
                          }
                          if (
                            rdsPipelineTask.params.taskType ===
                            CreateLogMethod.Manual
                          ) {
                            if (!rdsPipelineTask.params.manualDBIdentifier) {
                              setManualRDSEmpryError(true);
                              return;
                            }
                          }
                        }
                        if (curStep === 1) {
                          if (!rdsPipelineTask.params.domainName) {
                            setEsDomainEmptyError(true);
                            return;
                          } else {
                            setEsDomainEmptyError(false);
                          }
                          const validRes =
                            checkOpenSearchInput(rdsPipelineTask);
                          setAosInputValidRes(validRes);
                          if (Object.values(validRes).indexOf(true) >= 0) {
                            return;
                          }
                        }
                        setCurStep((curStep) => {
                          return curStep + 1 > 2 ? 2 : curStep + 1;
                        });
                      }}
                    >
                      {t("button.next")}
                    </Button>
                  )}
                  {curStep === 2 && (
                    <Button
                      loading={loadingCreate}
                      btnType="primary"
                      onClick={() => {
                        confirmCreatePipeline();
                      }}
                    >
                      {t("button.create")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default CreateRDS;
