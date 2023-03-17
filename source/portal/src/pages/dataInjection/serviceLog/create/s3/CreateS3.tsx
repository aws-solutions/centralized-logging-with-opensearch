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
import { CreateLogMethod, ServiceLogType } from "assets/js/const";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Alert } from "assets/js/alert";
import {
  bucketNameIsValid,
  splitStringToBucketAndPrefix,
} from "assets/js/utils";

const EXCLUDE_PARAMS = [
  "esDomainId",
  "logBucketObj",
  "taskType",
  "manualBucketS3Path",
  "manualBucketName",
  "warmEnable",
  "coldEnable",
  "needCreateLogging",
  "rolloverSizeNotSupport",
];
export interface S3TaskProps {
  type: ServiceType;
  tags: Tag[];
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  destinationType: string;
  params: {
    needCreateLogging: boolean;
    engineType: string;
    warmEnable: boolean;
    coldEnable: boolean;
    logBucketName: string;
    logBucketObj: OptionType | null;
    taskType: string;
    manualBucketS3Path: string;
    manualBucketName: string;
    logBucketPrefix: string;
    endpoint: string;
    domainName: string;
    esDomainId: string;
    indexPrefix: string;
    createDashboard: string;
    vpcId: string;
    subnetIds: string;
    securityGroupId: string;

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

const DEFAULT_TASK_VALUE: S3TaskProps = {
  type: ServiceType.S3,
  source: "",
  target: "",
  tags: [],
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: DestinationType.S3,
  params: {
    needCreateLogging: false,
    engineType: "",
    warmEnable: false,
    coldEnable: false,
    logBucketName: "",
    logBucketObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketS3Path: "",
    manualBucketName: "",
    logBucketPrefix: "",
    endpoint: "",
    domainName: "",
    esDomainId: "",
    indexPrefix: "",
    createDashboard: YesNo.Yes,
    vpcId: "",
    subnetIds: "",
    securityGroupId: "",

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

const CreateS3: React.FC = () => {
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
    { name: t("servicelog:create.service.s3") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  const [curStep, setCurStep] = useState(0);
  const history = useHistory();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [s3PipelineTask, setS3PipelineTask] =
    useState<S3TaskProps>(DEFAULT_TASK_VALUE);

  const [autoS3EmptyError, setAutoS3EmptyError] = useState(false);
  const [manualS3EmpryError, setManualS3EmpryError] = useState(false);
  const [manualS3PathInvalid, setManualS3PathInvalid] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);

  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [bucketISChanging, setBucketISChanging] = useState(false);
  const [needEnableAccessLog, setNeedEnableAccessLog] = useState(false);
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
    console.info("s3PipelineTask:", s3PipelineTask);
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.S3;
    createPipelineParams.source = s3PipelineTask.source;
    createPipelineParams.target = s3PipelineTask.target;
    createPipelineParams.tags = s3PipelineTask.tags;
    createPipelineParams.logSourceAccountId = s3PipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = s3PipelineTask.destinationType;

    const tmpParamList: any = covertParametersByKeyAndConditions(
      s3PipelineTask,
      EXCLUDE_PARAMS
    );

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
    console.info("s3PipelineTask:", s3PipelineTask);
  }, [s3PipelineTask]);

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
                />
              </div>
              <div className="create-content m-w-800">
                {curStep === 0 && (
                  <SpecifySettings
                    s3Task={s3PipelineTask}
                    setISChanging={(status) => {
                      setBucketISChanging(status);
                    }}
                    manualS3EmptyError={manualS3EmpryError}
                    manualS3PathInvalid={manualS3PathInvalid}
                    autoS3EmptyError={autoS3EmptyError}
                    changeNeedEnableLogging={(need: boolean) => {
                      setNeedEnableAccessLog(need);
                    }}
                    changeCrossAccount={(id) => {
                      setS3PipelineTask((prev: S3TaskProps) => {
                        return {
                          ...prev,
                          logSourceAccountId: id,
                        };
                      });
                    }}
                    manualChangeBucket={(srcBucketName) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setS3PipelineTask((prev: S3TaskProps) => {
                        return {
                          ...prev,
                          source: srcBucketName,
                          params: {
                            ...prev.params,
                            manualBucketName: srcBucketName,
                            indexPrefix: srcBucketName.toLowerCase(),
                          },
                        };
                      });
                    }}
                    changeTaskType={(taskType) => {
                      console.info("taskType:", taskType);
                      setAutoS3EmptyError(false);
                      setManualS3EmpryError(false);
                      setS3PipelineTask({
                        ...DEFAULT_TASK_VALUE,
                        params: {
                          ...DEFAULT_TASK_VALUE.params,
                          taskType: taskType,
                        },
                      });
                    }}
                    changeLogBucketObj={(s3BucketObj) => {
                      console.info("s3BucketObj:", s3BucketObj);
                      setAutoS3EmptyError(false);
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setS3PipelineTask((prev: S3TaskProps) => {
                        return {
                          ...prev,
                          source: s3BucketObj?.value || "",
                          params: {
                            ...prev.params,
                            indexPrefix:
                              s3BucketObj?.value?.toLowerCase() || "",
                            logBucketObj: s3BucketObj,
                          },
                        };
                      });
                    }}
                    changeS3Bucket={(bucketName) => {
                      setS3PipelineTask((prev: S3TaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            logBucketName: bucketName,
                          },
                        };
                      });
                    }}
                    changeLogPath={(logPath) => {
                      console.info("LOGPATH:", logPath);
                      if (
                        s3PipelineTask.params.taskType ===
                        CreateLogMethod.Manual
                      ) {
                        setManualS3EmpryError(false);
                        setManualS3PathInvalid(false);
                        const { bucket, prefix } =
                          splitStringToBucketAndPrefix(logPath);
                        setS3PipelineTask((prev: S3TaskProps) => {
                          return {
                            ...prev,
                            params: {
                              ...prev.params,
                              manualBucketS3Path: logPath,
                              logBucketName: bucket,
                              logBucketPrefix: prefix,
                            },
                          };
                        });
                      } else {
                        setS3PipelineTask((prev: S3TaskProps) => {
                          return {
                            ...prev,
                            params: {
                              ...prev.params,
                              logBucketPrefix: logPath,
                            },
                          };
                        });
                      }
                    }}
                    setNextStepDisableStatus={(status) => {
                      setNextStepDisable(status);
                    }}
                  />
                )}
                {curStep === 1 && (
                  <SpecifyOpenSearchCluster
                    taskType={ServiceLogType.Amazon_S3}
                    pipelineTask={s3PipelineTask}
                    esDomainEmptyError={esDomainEmptyError}
                    aosInputValidRes={aosInputValidRes}
                    changeLoadingDomain={(loading) => {
                      setDomainListIsLoading(loading);
                    }}
                    changeShards={(shards) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          shardsInvalidError: false,
                        };
                      });
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                    pipelineTask={s3PipelineTask}
                    changeTags={(tags) => {
                      setS3PipelineTask((prev: S3TaskProps) => {
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
                      disabled={bucketISChanging || domainListIsLoading}
                      btnType="primary"
                      onClick={() => {
                        if (curStep === 0) {
                          if (nextStepDisable) {
                            return;
                          }
                          if (needEnableAccessLog) {
                            Alert(t("servicelog:s3.needEnableLogging"));
                            return;
                          }
                          if (
                            s3PipelineTask.params.taskType ===
                            CreateLogMethod.Automatic
                          ) {
                            if (!s3PipelineTask.params.logBucketObj) {
                              setAutoS3EmptyError(true);
                              return;
                            }
                          }
                          if (
                            s3PipelineTask.params.taskType ===
                            CreateLogMethod.Manual
                          ) {
                            if (!s3PipelineTask.params.logBucketName) {
                              setManualS3EmpryError(true);
                              return;
                            }
                            if (
                              !s3PipelineTask.params.manualBucketS3Path
                                .toLowerCase()
                                .startsWith("s3") ||
                              !bucketNameIsValid(
                                s3PipelineTask.params.logBucketName
                              )
                            ) {
                              setManualS3PathInvalid(true);
                              return;
                            }
                          }
                        }
                        if (curStep === 1) {
                          if (!s3PipelineTask.params.domainName) {
                            setEsDomainEmptyError(true);
                            return;
                          } else {
                            setEsDomainEmptyError(false);
                          }
                          const validRes = checkOpenSearchInput(s3PipelineTask);
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

export default CreateS3;
