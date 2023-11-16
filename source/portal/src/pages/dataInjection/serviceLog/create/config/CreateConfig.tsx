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
import {
  Codec,
  DestinationType,
  EngineType,
  ServiceType,
  MonitorInput,
  DomainStatusCheckType,
  DomainStatusCheckResponse,
} from "API";
import { Alert } from "assets/js/alert";
import { CreateLogMethod, ServiceLogType } from "assets/js/const";
import { appSyncRequestMutation } from "assets/js/request";
import Breadcrumb from "components/Breadcrumb";
import Button from "components/Button";
import CreateStep from "components/CreateStep";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { createServicePipeline } from "graphql/mutations";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  AmplifyConfigType,
  WarmTransitionType,
  YesNo,
  SERVICE_LOG_INDEX_SUFFIX,
} from "types";
import SpecifyOpenSearchCluster, {
  AOSInputValidRes,
  checkOpenSearchInput,
  covertParametersByKeyAndConditions,
} from "../common/SpecifyCluster";
import SpecifySettings from "./steps/SpecifySettings";
import {
  bucketNameIsValid,
  buildOSIParamsValue,
  splitStringToBucketAndPrefix,
} from "assets/js/utils";
import { MONITOR_ALARM_INIT_DATA } from "assets/js/init";
import AlarmAndTags from "../../../../pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import { Dispatch } from "redux";
import { useAlarm } from "assets/js/hooks/useAlarm";
import { ActionType } from "reducer/appReducer";
import {
  CreateAlarmActionTypes,
  validateAalrmInput,
} from "reducer/createAlarm";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";

const EXCLUDE_PARAMS = [
  "esDomainId",
  "warmEnable",
  "coldEnable",
  "manualBucketS3Path",
  "taskType",
  "rolloverSizeNotSupport",
];

export interface ConfigTaskProps {
  type: ServiceType;
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  destinationType: string;
  params: {
    // [index: string]: string | any;
    engineType: string;
    esDomainId: string;
    warmEnable: boolean;
    coldEnable: boolean;
    taskType: string;
    logBucketName: string;
    logBucketPrefix: string;
    manualBucketS3Path: string;
    endpoint: string;
    domainName: string;
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
  monitor: MonitorInput;
}

const DEFAULT_CONFIG_TASK_VALUE: ConfigTaskProps = {
  type: ServiceType.Config,
  source: "Default",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: DestinationType.S3,
  params: {
    engineType: "",
    esDomainId: "",
    warmEnable: false,
    coldEnable: false,
    taskType: CreateLogMethod.Automatic,
    manualBucketS3Path: "",
    logBucketName: "",
    logBucketPrefix: "",
    endpoint: "",
    domainName: "",
    indexPrefix: "default",
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
    codec: Codec.best_compression,
    refreshInterval: "1s",

    rolloverSizeNotSupport: false,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
};

const CreateConfig: React.FC = () => {
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
    { name: t("servicelog:create.service.config") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const dispatch = useDispatch<Dispatch<Actions>>();
  const navigate = useNavigate();

  const [configPipelineTask, setConfigPipelineTask] = useState<ConfigTaskProps>(
    DEFAULT_CONFIG_TASK_VALUE
  );
  const [curStep, setCurStep] = useState(0);
  const [nextStepDisable, setNextStepDisable] = useState(false);

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [configEmptyError, setConfigEmptyError] = useState(false);
  const [manualConfigEmptyError, setManualConfigEmptyError] = useState(false);
  const [manualS3PathInvalid, setManualS3PathInvalid] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);

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
  const [domainCheckStatus, setDomainCheckStatus] =
    useState<DomainStatusCheckResponse>();
  const tags = useTags();
  const monitor = useAlarm();
  const osiParams = useSelectProcessor();

  const confirmCreatePipeline = async () => {
    console.info("configPipelineTask:", configPipelineTask);
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.Config;
    createPipelineParams.source = configPipelineTask.source;
    createPipelineParams.target = configPipelineTask.target;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      configPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = configPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);

    const tmpParamList: any = covertParametersByKeyAndConditions(
      configPipelineTask,
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
      navigate("/log-pipeline/service-log");
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  const isConfigSettingValid = () => {
    if (nextStepDisable) {
      return false;
    }
    if (!configPipelineTask.source) {
      setConfigEmptyError(true);
      return false;
    }
    if (!configPipelineTask.params.logBucketName) {
      if (configPipelineTask.params.taskType === CreateLogMethod.Manual) {
        setManualConfigEmptyError(true);
        return false;
      }
      Alert(t("servicelog:config.needEnableLogging"));
      console.error("need enablle aws config");
      return false;
    }
    if (
      configPipelineTask.params.taskType === CreateLogMethod.Manual &&
      (!configPipelineTask.params.manualBucketS3Path
        .toLowerCase()
        .startsWith("s3") ||
        !bucketNameIsValid(configPipelineTask.params.logBucketName))
    ) {
      setManualS3PathInvalid(true);
      return false;
    }
    return true;
  };

  const isClusterValid = () => {
    if (!configPipelineTask.params.domainName) {
      setEsDomainEmptyError(true);
      return false;
    } else {
      setEsDomainEmptyError(false);
    }
    const validRes = checkOpenSearchInput(configPipelineTask);
    setAosInputValidRes(validRes);
    if (Object.values(validRes).indexOf(true) >= 0) {
      return false;
    }
    return true;
  };

  const isNextDisabled = () => {
    return (
      domainListIsLoading ||
      nextStepDisable ||
      (curStep === 1 &&
        domainCheckStatus?.status !== DomainStatusCheckType.PASSED) ||
      osiParams.serviceAvailableCheckedLoading
    );
  };

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

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
                      name: t("processor.logProcessorSettings"),
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
                    configTask={configPipelineTask}
                    configEmptyError={configEmptyError}
                    manualConfigEmptyError={manualConfigEmptyError}
                    manualS3PathInvalid={manualS3PathInvalid}
                    changeCrossAccount={(id) => {
                      setConfigPipelineTask((prev) => {
                        return {
                          ...prev,
                          logSourceAccountId: id,
                        };
                      });
                    }}
                    changeTaskType={(taskType) => {
                      console.info("taskType:", taskType);
                      setConfigEmptyError(false);
                      setManualConfigEmptyError(false);
                      setConfigPipelineTask({
                        ...DEFAULT_CONFIG_TASK_VALUE,
                        params: {
                          ...DEFAULT_CONFIG_TASK_VALUE.params,
                          taskType: taskType,
                        },
                      });
                    }}
                    changeConfigName={(name) => {
                      setConfigEmptyError(false);
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setConfigPipelineTask((prev) => {
                        return {
                          ...prev,
                          source: name,
                          params: {
                            ...prev.params,
                            indexPrefix: name.toLowerCase(),
                          },
                        };
                      });
                    }}
                    changeManualBucketS3Path={(manualPath) => {
                      setManualConfigEmptyError(false);
                      setManualS3PathInvalid(false);
                      const { bucket, prefix } =
                        splitStringToBucketAndPrefix(manualPath);
                      setConfigPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            manualBucketS3Path: manualPath,
                            logBucketName: bucket,
                            logBucketPrefix: prefix,
                          },
                        };
                      });
                    }}
                    changeLogBucket={(bucketName) => {
                      setConfigPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            logBucketName: bucketName,
                          },
                        };
                      });
                    }}
                    changeLogPrefix={(prefix) => {
                      setConfigPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            logBucketPrefix: prefix,
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
                    taskType={ServiceLogType.Amazon_Config}
                    pipelineTask={configPipelineTask}
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            warmTransitionType: type,
                          },
                        };
                      });
                    }}
                    domainCheckedStatus={domainCheckStatus}
                    changeOSDomainCheckStatus={(status) => {
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            replicaNumbers: status.multiAZWithStandbyEnabled
                              ? "2"
                              : "1",
                          },
                        };
                      });
                      setDomainCheckStatus(status);
                    }}
                  />
                )}
                {curStep === 2 && (
                  <div>
                    <SelectLogProcessor supportOSI={false} />
                  </div>
                )}
                {curStep === 3 && (
                  <div>
                    <AlarmAndTags
                      pipelineTask={configPipelineTask}
                      osiParams={osiParams}
                    />
                  </div>
                )}
                <div className="button-action text-right">
                  <Button
                    btnType="text"
                    onClick={() => {
                      navigate("/log-pipeline/service-log/create");
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

                  {curStep < 3 && (
                    <Button
                      disabled={isNextDisabled()}
                      btnType="primary"
                      onClick={() => {
                        if (curStep === 0 && !isConfigSettingValid()) {
                          return;
                        }
                        if (curStep === 1 && !isClusterValid()) {
                          return;
                        }
                        // Check domain connection status
                        if (
                          curStep === 1 &&
                          domainCheckStatus?.status !==
                            DomainStatusCheckType.PASSED
                        ) {
                          return;
                        }
                        if (curStep === 2) {
                          dispatch({
                            type: SelectProcessorActionTypes.VALIDATE_OCU_INPUT,
                          });
                          if (!validateOCUInput(osiParams)) {
                            return;
                          }
                        }
                        setCurStep((curStep) => {
                          return curStep + 1 > 3 ? 3 : curStep + 1;
                        });
                      }}
                    >
                      {t("button.next")}
                    </Button>
                  )}
                  {curStep === 3 && (
                    <Button
                      loading={loadingCreate}
                      btnType="primary"
                      onClick={() => {
                        if (!validateAalrmInput(monitor)) {
                          dispatch({
                            type: CreateAlarmActionTypes.VALIDATE_ALARM_INPUT,
                          });
                          return;
                        }
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

export default CreateConfig;
