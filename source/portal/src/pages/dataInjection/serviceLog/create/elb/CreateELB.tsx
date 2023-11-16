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
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CreateStep from "components/CreateStep";
import SpecifySettings from "./steps/SpecifySettings";
import {
  AOSInputValidRes,
  checkOpenSearchInput,
  covertParametersByKeyAndConditions,
} from "../common/SpecifyCluster";
import Button from "components/Button";

import Breadcrumb from "components/Breadcrumb";
import { appSyncRequestMutation } from "assets/js/request";
import {
  createLightEngineServicePipeline,
  createServicePipeline,
} from "graphql/mutations";
import {
  Codec,
  DestinationType,
  EngineType,
  ServiceType,
  MonitorInput,
  DomainStatusCheckType,
  DomainStatusCheckResponse,
} from "API";
import {
  SupportPlugin,
  WarmTransitionType,
  YesNo,
  AmplifyConfigType,
  SERVICE_LOG_INDEX_SUFFIX,
} from "types";
import { OptionType } from "components/AutoComplete/autoComplete";
import { CreateLogMethod, ServiceLogType } from "assets/js/const";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Alert } from "assets/js/alert";
import LogProcessing from "../common/LogProcessing";
import {
  bucketNameIsValid,
  buildOSIParamsValue,
  splitStringToBucketAndPrefix,
} from "assets/js/utils";
import { MONITOR_ALARM_INIT_DATA } from "assets/js/init";
import AlarmAndTags from "../../../../pipelineAlarm/AlarmAndTags";
import { covertSvcTaskToLightEngine } from "../common/ConfigLightEngine";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import SpecifyAnalyticsEngine, {
  AnalyticEngineTypes,
} from "../common/SpecifyAnalyticsEngine";
import {
  CreateLightEngineActionTypes,
  validateLightEngine,
} from "reducer/createLightEngine";
import { useLightEngine } from "assets/js/hooks/useLightEngine";
import { Dispatch } from "redux";
import { useAlarm } from "assets/js/hooks/useAlarm";
import { ActionType } from "reducer/appReducer";
import {
  CreateAlarmActionTypes,
  validateAalrmInput,
} from "reducer/createAlarm";
import { useGrafana } from "assets/js/hooks/useGrafana";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";

const EXCLUDE_PARAMS = [
  "esDomainId",
  "elbObj",
  "taskType",
  "manualBucketELBPath",
  "manualBucketName",
  "warmEnable",
  "coldEnable",
  "needCreateLogging",
  "geoPlugin",
  "userAgentPlugin",
  "rolloverSizeNotSupport",
];
export interface ELBTaskProps {
  type: ServiceType;
  arnId: string;
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  destinationType: string;
  params: {
    // [index: string]: string | any;
    needCreateLogging: boolean;
    engineType: string;
    warmEnable: boolean;
    coldEnable: boolean;
    logBucketName: string;
    elbObj: OptionType | null;
    taskType: string;
    manualBucketELBPath: string;
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

    geoPlugin: boolean;
    userAgentPlugin: boolean;
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
  monitor?: MonitorInput | null;
}

const DEFAULT_TASK_VALUE: ELBTaskProps = {
  type: ServiceType.ELB,
  source: "",
  target: "",
  arnId: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: DestinationType.S3,
  params: {
    needCreateLogging: false,
    engineType: "",
    warmEnable: false,
    coldEnable: false,
    logBucketName: "",
    elbObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketELBPath: "",
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

    geoPlugin: false,
    userAgentPlugin: false,
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

const CreateELB: React.FC = () => {
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
    { name: t("servicelog:create.service.elb") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const [searchParams] = useSearchParams();
  const engineType =
    (searchParams.get("engineType") as AnalyticEngineTypes | null) ??
    AnalyticEngineTypes.OPENSEARCH;

  const [curStep, setCurStep] = useState(0);
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [elbPipelineTask, setELBPipelineTask] =
    useState<ELBTaskProps>(DEFAULT_TASK_VALUE);

  const [autoELBEmptyError, setAutoELBEmptyError] = useState(false);
  const [manualELBEmpryError, setManualELBEmpryError] = useState(false);
  const [manualS3PathInvalid, setManualS3PathInvalid] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);

  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [elbISChanging, setELBISChanging] = useState(false);
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
  const [domainCheckStatus, setDomainCheckStatus] =
    useState<DomainStatusCheckResponse>();
  const tags = useTags();
  const monitor = useAlarm();
  const osiParams = useSelectProcessor();
  const lightEngine = useLightEngine();
  const grafana = useGrafana();
  const dispatch = useDispatch<Dispatch<Actions>>();

  const confirmCreateLightEnginePipeline = useCallback(async () => {
    const params = covertSvcTaskToLightEngine(elbPipelineTask, lightEngine);
    // Add Plugin in parameters
    const pluginList = [];
    if (elbPipelineTask.params.geoPlugin) {
      pluginList.push(SupportPlugin.Geo);
    }
    if (elbPipelineTask.params.userAgentPlugin) {
      pluginList.push(SupportPlugin.UserAgent);
    }
    if (pluginList.length > 0) {
      params.parameters.push({
        parameterKey: "enrichmentPlugins",
        parameterValue: pluginList.join(","),
      });
    }
    const createPipelineParams = {
      ...params,
      type: ServiceType.ELB,
      tags,
      logSourceRegion: amplifyConfig.aws_project_region,
      logSourceAccountId: elbPipelineTask.logSourceAccountId,
      source: elbPipelineTask.source,
      monitor: monitor.monitor,
    };
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createLightEngineServicePipeline,
        createPipelineParams
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      navigate("/log-pipeline/service-log");
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  }, [lightEngine, elbPipelineTask, tags, monitor]);

  const confirmCreatePipeline = async () => {
    console.info("elbPipelineTask:", elbPipelineTask);
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.ELB;
    createPipelineParams.source = elbPipelineTask.source;
    createPipelineParams.target = elbPipelineTask.target;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      elbPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = elbPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);

    const tmpParamList: any = covertParametersByKeyAndConditions(
      elbPipelineTask,
      EXCLUDE_PARAMS
    );

    // Add Plugin in parameters
    const pluginList = [];
    if (elbPipelineTask.params.geoPlugin) {
      pluginList.push(SupportPlugin.Geo);
    }
    if (elbPipelineTask.params.userAgentPlugin) {
      pluginList.push(SupportPlugin.UserAgent);
    }
    if (pluginList.length > 0) {
      tmpParamList.push({
        parameterKey: "plugins",
        parameterValue: pluginList.join(","),
      });
    }

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

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  const validateStep0 = () => {
    if (nextStepDisable) {
      return false;
    }
    if (needEnableAccessLog) {
      Alert(t("servicelog:elb.needEnableLogging"));
      return false;
    }
    if (elbPipelineTask.params.taskType === CreateLogMethod.Automatic) {
      if (!elbPipelineTask.params.elbObj) {
        setAutoELBEmptyError(true);
        return false;
      }
    }
    if (elbPipelineTask.params.taskType === CreateLogMethod.Manual) {
      if (!elbPipelineTask.params.logBucketName) {
        setManualELBEmpryError(true);
        return false;
      }
      if (
        !elbPipelineTask.params.manualBucketELBPath
          .toLowerCase()
          .startsWith("s3") ||
        !bucketNameIsValid(elbPipelineTask.params.logBucketName)
      ) {
        setManualS3PathInvalid(true);
        return false;
      }
    }
    return true;
  };

  const validateStep2 = () => {
    if (engineType === AnalyticEngineTypes.LIGHT_ENGINE) {
      // validate light engine and display error message
      if (!isLightEngineValid) {
        dispatch({
          type: CreateLightEngineActionTypes.VALIDATE_LIGHT_ENGINE,
        });
        return false;
      }
    } else {
      if (!elbPipelineTask.params.domainName) {
        setEsDomainEmptyError(true);
        return false;
      } else {
        setEsDomainEmptyError(false);
      }
      const validRes = checkOpenSearchInput(elbPipelineTask);
      setAosInputValidRes(validRes);
      if (Object.values(validRes).indexOf(true) >= 0) {
        return false;
      }
      // Check domain connection status
      if (domainCheckStatus?.status !== DomainStatusCheckType.PASSED) {
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    dispatch({
      type: CreateLightEngineActionTypes.CENTRALIZED_TABLE_NAME_CHANGED,
      value: `elb_${elbPipelineTask.source}`,
    });
  }, [elbPipelineTask.source]);

  const isLightEngineValid = useMemo(
    () => validateLightEngine(lightEngine, grafana),
    [lightEngine]
  );
  const isNextDisabled = () => {
    if (curStep === 2 && engineType === AnalyticEngineTypes.LIGHT_ENGINE) {
      return false;
    }
    return (
      elbISChanging ||
      domainListIsLoading ||
      (curStep === 2 &&
        domainCheckStatus?.status !== DomainStatusCheckType.PASSED) ||
      osiParams.serviceAvailableCheckedLoading
    );
  };

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
                      name: t("servicelog:create.step.logProcessing"),
                    },
                    {
                      name:
                        engineType === AnalyticEngineTypes.OPENSEARCH
                          ? t("servicelog:create.step.specifyDomain")
                          : t("servicelog:create.step.specifyLightEngine"),
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
                    elbTask={elbPipelineTask}
                    setISChanging={(status) => {
                      setELBISChanging(status);
                    }}
                    manualELBEmptyError={manualELBEmpryError}
                    manualS3PathInvalid={manualS3PathInvalid}
                    autoELBEmptyError={autoELBEmptyError}
                    changeNeedEnableLogging={(need: boolean) => {
                      setNeedEnableAccessLog(need);
                    }}
                    changeCrossAccount={(id) => {
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setAutoELBEmptyError(false);
                      setManualELBEmpryError(false);
                      setELBPipelineTask({
                        ...DEFAULT_TASK_VALUE,
                        params: {
                          ...DEFAULT_TASK_VALUE.params,
                          taskType: taskType,
                        },
                      });
                    }}
                    changeELBObj={(elbObj) => {
                      setAutoELBEmptyError(false);
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setELBPipelineTask((prev: ELBTaskProps) => {
                        return {
                          ...prev,
                          source: elbObj?.name || "",
                          arnId: elbObj?.value || "",
                          params: {
                            ...prev.params,
                            indexPrefix: elbObj?.name?.toLowerCase() || "",
                            elbObj: elbObj,
                          },
                        };
                      });
                    }}
                    changeELBBucket={(bucketName) => {
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      if (
                        elbPipelineTask.params.taskType ===
                        CreateLogMethod.Manual
                      ) {
                        setManualELBEmpryError(false);
                        setManualS3PathInvalid(false);
                        const { bucket, prefix } =
                          splitStringToBucketAndPrefix(logPath);
                        setELBPipelineTask((prev: ELBTaskProps) => {
                          return {
                            ...prev,
                            params: {
                              ...prev.params,
                              manualBucketELBPath: logPath,
                              logBucketName: bucket,
                              logBucketPrefix: prefix,
                            },
                          };
                        });
                      } else {
                        setELBPipelineTask((prev: ELBTaskProps) => {
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
                  <LogProcessing
                    changePluginSelect={(plugin, enable) => {
                      if (plugin === SupportPlugin.Geo) {
                        setELBPipelineTask((prev: ELBTaskProps) => {
                          return {
                            ...prev,
                            params: {
                              ...prev.params,
                              geoPlugin: enable,
                            },
                          };
                        });
                      }
                      if (plugin === SupportPlugin.UserAgent) {
                        setELBPipelineTask((prev: ELBTaskProps) => {
                          return {
                            ...prev,
                            params: {
                              ...prev.params,
                              userAgentPlugin: enable,
                            },
                          };
                        });
                      }
                    }}
                    pipelineTask={elbPipelineTask}
                  />
                )}
                {curStep === 2 && (
                  <SpecifyAnalyticsEngine
                    engineType={engineType}
                    taskType={ServiceLogType.Amazon_ELB}
                    pipelineTask={elbPipelineTask}
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                {curStep === 3 && (
                  <div>
                    <SelectLogProcessor
                      supportOSI={
                        !elbPipelineTask.logSourceAccountId &&
                        engineType === AnalyticEngineTypes.OPENSEARCH
                      }
                      enablePlugins={
                        elbPipelineTask.params.geoPlugin ||
                        elbPipelineTask.params.userAgentPlugin
                      }
                    />
                  </div>
                )}
                {curStep === 4 && (
                  <div>
                    <AlarmAndTags
                      engineType={engineType}
                      pipelineTask={elbPipelineTask}
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

                  {curStep < 4 && (
                    <Button
                      // loading={autoCreating}
                      disabled={isNextDisabled()}
                      btnType="primary"
                      onClick={() => {
                        if (curStep === 0) {
                          if (!validateStep0()) {
                            return;
                          }
                        }
                        if (curStep === 2) {
                          if (!validateStep2()) {
                            return;
                          }
                        }
                        if (curStep === 3) {
                          dispatch({
                            type: SelectProcessorActionTypes.VALIDATE_OCU_INPUT,
                          });
                          if (!validateOCUInput(osiParams)) {
                            return;
                          }
                        }
                        setCurStep((curStep) => {
                          return curStep + 1 > 4 ? 4 : curStep + 1;
                        });
                      }}
                    >
                      {t("button.next")}
                    </Button>
                  )}
                  {curStep === 4 && (
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
                        engineType === AnalyticEngineTypes.OPENSEARCH
                          ? confirmCreatePipeline()
                          : confirmCreateLightEnginePipeline();
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

export default CreateELB;
