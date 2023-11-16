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
import {
  bucketNameIsValid,
  buildOSIParamsValue,
  splitStringToBucketAndPrefix,
} from "assets/js/utils";
import { IngestOption } from "./steps/IngestOptionSelect";
import SpecifyAnalyticsEngine, {
  AnalyticEngineTypes,
} from "../common/SpecifyAnalyticsEngine";
import { covertSvcTaskToLightEngine } from "../common/ConfigLightEngine";
import AlarmAndTags from "pages/pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import { MONITOR_ALARM_INIT_DATA } from "assets/js/init";
import { useLightEngine } from "assets/js/hooks/useLightEngine";
import {
  CreateLightEngineActionTypes,
  validateLightEngine,
} from "reducer/createLightEngine";
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

const EXCLUDE_PARAMS_COMMON = [
  "esDomainId",
  "wafObj",
  "taskType",
  "manualBucketWAFPath",
  "manualBucketName",
  "warmEnable",
  "coldEnable",
  "needCreateLogging",
  "ingestOption",
  "logSource",
  "rolloverSizeNotSupport",
];

const EXCLUDE_PARAMS_FULL = [
  ...EXCLUDE_PARAMS_COMMON,
  "webACLNames",
  "interval",
  "webACLScope",
];

const EXCLUDE_PARAMS_SAMPLED = [
  ...EXCLUDE_PARAMS_COMMON,
  "logBucketPrefix",
  "defaultCmkArnParam",
  "logBucketName",
  "backupBucketName",
];

export interface WAFTaskProps {
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
    wafObj: OptionType | null;
    taskType: string;
    manualBucketWAFPath: string;
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
    webACLNames: string;
    ingestOption: string;
    interval: string;
    webACLScope: string;
    logSource: string;

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

const DEFAULT_TASK_VALUE: WAFTaskProps = {
  type: ServiceType.WAF,
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
    wafObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketWAFPath: "",
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
    webACLNames: "",
    ingestOption: IngestOption.SampledRequest,
    interval: "",
    webACLScope: "",
    logSource: "",

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

const CreateWAF: React.FC = () => {
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
    { name: t("servicelog:create.service.waf") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const dispatch = useDispatch<Dispatch<Actions>>();

  const [curStep, setCurStep] = useState(0);
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [wafPipelineTask, setWAFPipelineTask] =
    useState<WAFTaskProps>(DEFAULT_TASK_VALUE);

  const [autoWAFEmptyError, setAutoWAFEmptyError] = useState(false);
  const [manualWebACLEmptyError, setManualWebACLEmptyError] = useState(false);
  const [manualWAFEmpryError, setManualWAFEmpryError] = useState(false);
  const [manualS3PathInvalid, setManualS3PathInvalid] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);

  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [wafISChanging, setWAFISChanging] = useState(false);
  const [needEnableAccessLog, setNeedEnableAccessLog] = useState(false);
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);
  const [intervalValueError, setIntervalValueError] = useState(false);

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
  const [searchParams] = useSearchParams();
  const engineType =
    (searchParams.get("engineType") as AnalyticEngineTypes | null) ??
    AnalyticEngineTypes.OPENSEARCH;
  useEffect(() => {
    if (engineType === AnalyticEngineTypes.LIGHT_ENGINE) {
      setWAFPipelineTask({
        ...wafPipelineTask,
        params: {
          ...wafPipelineTask.params,
          ingestOption: IngestOption.FullRequest,
        },
      });
    }
  }, [engineType]);
  const defaultIngestionOption = useMemo(
    () =>
      engineType === AnalyticEngineTypes.OPENSEARCH
        ? IngestOption.SampledRequest
        : IngestOption.FullRequest,
    [engineType]
  );

  const checkSampleScheduleValue = () => {
    // Check Sample Schedule Interval
    if (wafPipelineTask.params.ingestOption === IngestOption.SampledRequest) {
      if (
        !wafPipelineTask.params.interval.trim() ||
        parseInt(wafPipelineTask.params.interval) < 2 ||
        parseInt(wafPipelineTask.params.interval) > 180
      ) {
        setIntervalValueError(true);
        return false;
      }
    }
    return true;
  };

  const lightEngine = useLightEngine();
  const grafana = useGrafana();
  const tags = useTags();
  const monitor = useAlarm();
  const osiParams = useSelectProcessor();

  const confirmCreateLightEnginePipeline = useCallback(async () => {
    console.info("wafPipelineTask:", wafPipelineTask);
    const params = covertSvcTaskToLightEngine(wafPipelineTask, lightEngine);
    if (wafPipelineTask.params.wafObj?.description) {
      params.parameters.push({
        parameterKey: "webACLScope",
        parameterValue: wafPipelineTask.params.wafObj.description,
      });
    }
    const createPipelineParams = {
      ...params,
      type: ServiceType.WAF,
      tags,
      logSourceRegion: amplifyConfig.aws_project_region,
      logSourceAccountId: wafPipelineTask.logSourceAccountId,
      source: wafPipelineTask.source,
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
  }, [lightEngine, wafPipelineTask, tags, monitor]);

  const confirmCreatePipeline = async () => {
    console.info("wafPipelineTask:", wafPipelineTask);
    const createPipelineParams: any = {};
    createPipelineParams.type =
      wafPipelineTask.params.ingestOption === IngestOption.SampledRequest
        ? ServiceType.WAFSampled
        : ServiceType.WAF;
    createPipelineParams.source = wafPipelineTask.source;
    createPipelineParams.target = wafPipelineTask.target;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      wafPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = wafPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);

    let tmpParamList: any = [];
    if (wafPipelineTask.params.ingestOption === IngestOption.SampledRequest) {
      tmpParamList = covertParametersByKeyAndConditions(
        wafPipelineTask,
        EXCLUDE_PARAMS_SAMPLED
      );
    } else {
      tmpParamList = covertParametersByKeyAndConditions(
        wafPipelineTask,
        EXCLUDE_PARAMS_FULL
      );
    }

    if (wafPipelineTask.params.ingestOption === IngestOption.FullRequest) {
      // Add defaultCmkArnParam
      tmpParamList.push({
        parameterKey: "defaultCmkArnParam",
        parameterValue: amplifyConfig.default_cmk_arn,
      });
    }

    // Add Default Failed Log Bucket
    tmpParamList.push({
      parameterKey: "backupBucketName",
      parameterValue: amplifyConfig.default_logging_bucket,
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

  useEffect(() => {
    dispatch({
      type: CreateLightEngineActionTypes.CENTRALIZED_TABLE_NAME_CHANGED,
      value: `waf_${wafPipelineTask.source}`,
    });
  }, [wafPipelineTask.source]);

  const isLightEngineValid = useMemo(
    () => validateLightEngine(lightEngine, grafana),
    [lightEngine]
  );
  const isNextDisabled = () => {
    if (curStep === 1 && engineType === AnalyticEngineTypes.LIGHT_ENGINE) {
      return false;
    }
    return (
      wafISChanging ||
      domainListIsLoading ||
      (curStep === 1 &&
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
                    engineType={engineType}
                    wafTask={wafPipelineTask}
                    setISChanging={(status) => {
                      setWAFISChanging(status);
                    }}
                    manualAclEmptyError={manualWebACLEmptyError}
                    manualWAFEmptyError={manualWAFEmpryError}
                    manualS3PathInvalid={manualS3PathInvalid}
                    autoWAFEmptyError={autoWAFEmptyError}
                    changeNeedEnableLogging={(need: boolean) => {
                      setNeedEnableAccessLog(need);
                    }}
                    changeLogSource={(source) => {
                      setWAFPipelineTask((prev: WAFTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            logSource: source,
                          },
                        };
                      });
                    }}
                    changeCrossAccount={(id) => {
                      setWAFPipelineTask((prev: WAFTaskProps) => {
                        return {
                          ...prev,
                          logSourceAccountId: id,
                        };
                      });
                    }}
                    changeIngestionOption={(option) => {
                      setWAFPipelineTask((prev: WAFTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            ingestOption: option,
                          },
                        };
                      });
                    }}
                    intervalValueError={intervalValueError}
                    changeScheduleInterval={(interval) => {
                      setIntervalValueError(false);
                      setWAFPipelineTask((prev: WAFTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            interval: interval,
                          },
                        };
                      });
                    }}
                    manualChangeACL={(webACLName) => {
                      setManualWebACLEmptyError(false);
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setWAFPipelineTask((prev: WAFTaskProps) => {
                        return {
                          ...prev,
                          source: webACLName,
                          params: {
                            ...prev.params,
                            webACLNames: webACLName,
                            manualBucketName: webACLName,
                            indexPrefix: webACLName.toLowerCase(),
                          },
                        };
                      });
                    }}
                    changeTaskType={(taskType) => {
                      console.info("taskType:", taskType);
                      setAutoWAFEmptyError(false);
                      setManualWAFEmpryError(false);
                      setWAFPipelineTask({
                        ...DEFAULT_TASK_VALUE,
                        params: {
                          ...DEFAULT_TASK_VALUE.params,
                          taskType: taskType,
                          ingestOption: defaultIngestionOption,
                        },
                      });
                    }}
                    changeWAFObj={(wafObj) => {
                      setAutoWAFEmptyError(false);
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setWAFPipelineTask((prev: WAFTaskProps) => {
                        return {
                          ...prev,
                          source: wafObj?.name || "",
                          arnId: wafObj?.value || "",
                          params: {
                            ...prev.params,
                            webACLNames: wafObj?.name || "",
                            indexPrefix: wafObj?.name?.toLowerCase() || "",
                            wafObj: wafObj,
                            webACLScope: wafObj?.description || "",
                            ingestOption: defaultIngestionOption,
                          },
                        };
                      });
                    }}
                    changeWAFBucket={(bucketName) => {
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                        wafPipelineTask.params.taskType ===
                        CreateLogMethod.Manual
                      ) {
                        setManualWAFEmpryError(false);
                        setManualS3PathInvalid(false);
                        const { bucket, prefix } =
                          splitStringToBucketAndPrefix(logPath);
                        setWAFPipelineTask((prev: WAFTaskProps) => {
                          return {
                            ...prev,
                            params: {
                              ...prev.params,
                              manualBucketWAFPath: logPath,
                              logBucketName: bucket,
                              logBucketPrefix: prefix,
                            },
                          };
                        });
                      } else {
                        setWAFPipelineTask((prev: WAFTaskProps) => {
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
                  <SpecifyAnalyticsEngine
                    engineType={engineType}
                    taskType={ServiceLogType.Amazon_WAF}
                    pipelineTask={wafPipelineTask}
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
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
                    <SelectLogProcessor
                      supportOSI={
                        !wafPipelineTask.logSourceAccountId &&
                        engineType === AnalyticEngineTypes.OPENSEARCH &&
                        wafPipelineTask.params.ingestOption !==
                          IngestOption.SampledRequest
                      }
                    />
                  </div>
                )}
                {curStep === 3 && (
                  <div>
                    <AlarmAndTags
                      engineType={engineType}
                      pipelineTask={wafPipelineTask}
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
                      // loading={autoCreating}
                      disabled={isNextDisabled()}
                      btnType="primary"
                      onClick={() => {
                        if (curStep === 0) {
                          if (nextStepDisable) {
                            return;
                          }
                          if (needEnableAccessLog) {
                            Alert(t("servicelog:waf.needEnableLogging"));
                            return;
                          }
                          if (
                            wafPipelineTask.params.taskType ===
                            CreateLogMethod.Automatic
                          ) {
                            if (!wafPipelineTask.params.wafObj) {
                              setAutoWAFEmptyError(true);
                              return;
                            }
                          }
                          if (
                            wafPipelineTask.params.taskType ===
                            CreateLogMethod.Manual
                          ) {
                            if (!wafPipelineTask.params.webACLNames) {
                              setManualWebACLEmptyError(true);
                              return;
                            }
                            if (
                              !wafPipelineTask.params.logBucketName &&
                              wafPipelineTask.params.ingestOption ===
                                IngestOption.FullRequest
                            ) {
                              setManualWAFEmpryError(true);
                              return;
                            }
                            if (
                              wafPipelineTask.params.ingestOption ===
                                IngestOption.FullRequest &&
                              (!wafPipelineTask.params.manualBucketWAFPath
                                .toLowerCase()
                                .startsWith("s3") ||
                                !bucketNameIsValid(
                                  wafPipelineTask.params.logBucketName
                                ))
                            ) {
                              setManualS3PathInvalid(true);
                              return;
                            }
                          }
                          if (!checkSampleScheduleValue()) {
                            return;
                          }
                        }
                        if (curStep === 1) {
                          if (engineType === AnalyticEngineTypes.LIGHT_ENGINE) {
                            // validate light engine and display error message
                            if (!isLightEngineValid) {
                              dispatch({
                                type: CreateLightEngineActionTypes.VALIDATE_LIGHT_ENGINE,
                              });
                              return;
                            }
                          } else {
                            if (!wafPipelineTask.params.domainName) {
                              setEsDomainEmptyError(true);
                              return;
                            } else {
                              setEsDomainEmptyError(false);
                            }
                            const validRes =
                              checkOpenSearchInput(wafPipelineTask);
                            setAosInputValidRes(validRes);
                            if (Object.values(validRes).indexOf(true) >= 0) {
                              return;
                            }
                            // Check domain connection status
                            if (
                              domainCheckStatus?.status !==
                              DomainStatusCheckType.PASSED
                            ) {
                              return;
                            }
                          }
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

export default CreateWAF;
