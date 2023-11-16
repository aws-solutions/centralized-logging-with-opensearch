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
  CloudFrontFieldType,
} from "types";
import { OptionType } from "components/AutoComplete/autoComplete";
import {
  CloudFrontFieldTypeList,
  CreateLogMethod,
  FieldSortingArr,
  ServiceLogType,
} from "assets/js/const";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import LogProcessing from "../common/LogProcessing";
import {
  bucketNameIsValid,
  buildOSIParamsValue,
  splitStringToBucketAndPrefix,
} from "assets/js/utils";
import { SelectItem } from "components/Select/select";
import { S3SourceType } from "../cloudtrail/steps/comp/SourceType";
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
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";

const BASE_EXCLUDE_PARAMS = [
  "esDomainId",
  "cloudFrontObj",
  "taskType",
  "manualBucketS3Path",
  "manualBucketName",
  "warmEnable",
  "coldEnable",
  "geoPlugin",
  "userAgentPlugin",
  "fieldType",
  "customFields",
  "userIsConfirmed",
  "s3SourceType",
  "successTextType",
  "tmpFlowList",
  "rolloverSizeNotSupport",
];

const EXCLUDE_PARAMS_S3 = [
  ...BASE_EXCLUDE_PARAMS,
  "minCapacity",
  "maxCapacity",
  "samplingRate",
  "shardCount",
];

const EXCLUDE_PARAMS_KDS = [
  ...BASE_EXCLUDE_PARAMS,
  "logBucketName",
  "logBucketPrefix",
];
export interface CloudFrontTaskProps {
  type: ServiceType;
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
    logBucketName: string;
    cloudFrontObj: OptionType | null;
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

    geoPlugin: boolean;
    userAgentPlugin: boolean;
    shardNumbers: string;
    replicaNumbers: string;

    // logType: string;
    userIsConfirmed: boolean;
    fieldType: string;
    customFields: string[]; // to convert fieldNames
    samplingRate: string;
    shardCount: string;
    minCapacity: string;
    enableAutoScaling: string;
    maxCapacity: string;

    enableRolloverByCapacity: boolean;
    warmTransitionType: string;
    warmAge: string;
    coldAge: string;
    retainAge: string;
    rolloverSize: string;
    indexSuffix: string;
    codec: string;
    refreshInterval: string;
    tmpFlowList: SelectItem[];
    s3SourceType: string;
    successTextType: string;

    rolloverSizeNotSupport: boolean;
  };
  monitor: MonitorInput;
}

const DEFAULT_TASK_VALUE: CloudFrontTaskProps = {
  type: ServiceType.CloudFront,
  source: "",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: "",
  params: {
    engineType: "",
    warmEnable: false,
    coldEnable: false,
    logBucketName: "",
    cloudFrontObj: null,
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

    geoPlugin: false,
    userAgentPlugin: false,
    shardNumbers: "1",
    replicaNumbers: "1",

    // logType: "",
    userIsConfirmed: false,
    fieldType: CloudFrontFieldType.ALL,
    customFields: [],
    samplingRate: "1",
    shardCount: "1",
    minCapacity: "1",
    enableAutoScaling: YesNo.No,
    maxCapacity: "1",

    enableRolloverByCapacity: true,
    warmTransitionType: WarmTransitionType.IMMEDIATELY,
    warmAge: "0",
    coldAge: "60",
    retainAge: "180",
    rolloverSize: "30",
    indexSuffix: SERVICE_LOG_INDEX_SUFFIX.yyyy_MM_dd,
    codec: Codec.best_compression,
    refreshInterval: "1s",
    tmpFlowList: [],

    successTextType: "",
    s3SourceType: S3SourceType.NONE,

    rolloverSizeNotSupport: false,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
};

const CreateCloudFront: React.FC = () => {
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
    { name: t("servicelog:create.service.cloudfront") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const dispatch = useDispatch<Dispatch<Actions>>();
  const [searchParams] = useSearchParams();
  const engineType =
    (searchParams.get("engineType") as AnalyticEngineTypes | null) ??
    AnalyticEngineTypes.OPENSEARCH;

  const [curStep, setCurStep] = useState(0);
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [cloudFrontPipelineTask, setCloudFrontPipelineTask] =
    useState<CloudFrontTaskProps>(DEFAULT_TASK_VALUE);
  const [domainCheckStatus, setDomainCheckStatus] =
    useState<DomainStatusCheckResponse>();

  const [autoS3EmptyError, setAutoS3EmptyError] = useState(false);
  const [manualS3EmpryError, setManualS3EmpryError] = useState(false);
  const [manualS3PathInvalid, setManualS3PathInvalid] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);

  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [cloudFrontIsChanging, setCloudFrontIsChanging] = useState(false);
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);

  const [showConfirmError, setShowConfirmError] = useState(false);
  const [logTypeEmptyError, setLogTypeEmptyError] = useState(false);
  const [samplingRateError, setSamplingRateError] = useState(false);
  const [shardNumError, setShardNumError] = useState(false);
  const [maxShardNumError, setMaxShardNumError] = useState(false);

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
  const tags = useTags();
  const monitor = useAlarm();
  const osiParams = useSelectProcessor();
  const lightEngine = useLightEngine();
  const grafana = useGrafana();

  const sortCloudFrontArray = (arr: string[]) => {
    return arr.sort((a: string, b: string) => {
      return FieldSortingArr.indexOf(a) - FieldSortingArr.indexOf(b);
    });
  };

  const confirmCreateLightEnginePipeline = useCallback(async () => {
    const params = covertSvcTaskToLightEngine(
      cloudFrontPipelineTask,
      lightEngine
    );
    // Add Plugin in parameters
    const pluginList = [];
    if (cloudFrontPipelineTask.params.geoPlugin) {
      pluginList.push(SupportPlugin.Geo);
    }
    if (cloudFrontPipelineTask.params.userAgentPlugin) {
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
      type: ServiceType.CloudFront,
      tags,
      logSourceRegion: amplifyConfig.aws_project_region,
      logSourceAccountId: cloudFrontPipelineTask.logSourceAccountId,
      source: cloudFrontPipelineTask.source,
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
  }, [lightEngine, cloudFrontPipelineTask, tags, monitor]);

  const confirmCreatePipeline = async () => {
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.CloudFront;
    createPipelineParams.source = cloudFrontPipelineTask.source;
    createPipelineParams.target = cloudFrontPipelineTask.target;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      cloudFrontPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType =
      cloudFrontPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);

    // Set max capacity to min when auto scaling is false
    if (cloudFrontPipelineTask.params.enableAutoScaling === YesNo.No) {
      cloudFrontPipelineTask.params.maxCapacity =
        cloudFrontPipelineTask.params.minCapacity;
    }

    let tmpParamList: any = [];

    if (cloudFrontPipelineTask.destinationType === DestinationType.S3) {
      tmpParamList = covertParametersByKeyAndConditions(
        cloudFrontPipelineTask,
        EXCLUDE_PARAMS_S3
      );
      // Add defaultCmkArnParam
      tmpParamList.push({
        parameterKey: "defaultCmkArnParam",
        parameterValue: amplifyConfig.default_cmk_arn,
      });

      // Add Plugin in parameters
      const pluginList = [];
      if (cloudFrontPipelineTask.params.geoPlugin) {
        pluginList.push(SupportPlugin.Geo);
      }
      if (cloudFrontPipelineTask.params.userAgentPlugin) {
        pluginList.push(SupportPlugin.UserAgent);
      }
      if (pluginList.length > 0) {
        tmpParamList.push({
          parameterKey: "plugins",
          parameterValue: pluginList.join(","),
        });
      }
    }

    if (cloudFrontPipelineTask.destinationType === DestinationType.KDS) {
      tmpParamList = covertParametersByKeyAndConditions(
        cloudFrontPipelineTask,
        EXCLUDE_PARAMS_KDS
      );
      // Add fieldNames in parameters
      if (cloudFrontPipelineTask.params.fieldType === CloudFrontFieldType.ALL) {
        const allFieldArray = CloudFrontFieldTypeList.map(
          (element) => element.value
        );
        const sortedArray = sortCloudFrontArray(allFieldArray);
        tmpParamList.push({
          parameterKey: "fieldNames",
          parameterValue: sortedArray.join(","),
        });
      }
      if (
        cloudFrontPipelineTask.params.fieldType === CloudFrontFieldType.CUSTOM
      ) {
        const sortedArray = sortCloudFrontArray(
          cloudFrontPipelineTask.params.customFields
        );
        tmpParamList.push({
          parameterKey: "fieldNames",
          parameterValue: sortedArray.join(","),
        });
      }
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
      value: `cloudfront_${cloudFrontPipelineTask.source}`,
    });
  }, [cloudFrontPipelineTask.source]);

  const isLightEngineValid = useMemo(
    () => validateLightEngine(lightEngine, grafana),
    [lightEngine, grafana]
  );

  useEffect(() => {
    console.info("cloudFrontPipelineTask:", cloudFrontPipelineTask);
  }, [cloudFrontPipelineTask]);

  const isNextDisabled = () => {
    if (curStep === 2 && engineType === AnalyticEngineTypes.LIGHT_ENGINE) {
      return false;
    }
    return (
      cloudFrontIsChanging ||
      domainListIsLoading ||
      nextStepDisable ||
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
                    cloudFrontTask={cloudFrontPipelineTask}
                    setISChanging={(status) => {
                      setCloudFrontIsChanging(status);
                    }}
                    standardOnly={
                      engineType === AnalyticEngineTypes.LIGHT_ENGINE
                    }
                    manualS3EmptyError={manualS3EmpryError}
                    manualS3PathInvalid={manualS3PathInvalid}
                    autoS3EmptyError={autoS3EmptyError}
                    showConfirmError={showConfirmError}
                    logTypeEmptyError={logTypeEmptyError}
                    samplingRateError={samplingRateError}
                    shardNumError={shardNumError}
                    maxShardNumError={maxShardNumError}
                    changeCrossAccount={(id) => {
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          logSourceAccountId: id,
                          destinationType: "",
                        };
                      });
                    }}
                    changeLogType={(type) => {
                      setLogTypeEmptyError(false);
                      setNextStepDisable(false);
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          destinationType: type,
                        };
                      });
                    }}
                    changeFieldType={(type) => {
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            fieldType: type,
                          },
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setAutoS3EmptyError(false);
                      setManualS3EmpryError(false);
                      setCloudFrontPipelineTask({
                        ...DEFAULT_TASK_VALUE,
                        params: {
                          ...DEFAULT_TASK_VALUE.params,
                          taskType: taskType,
                        },
                      });
                    }}
                    changeCloudFrontObj={(cloudFrontObj) => {
                      setAutoS3EmptyError(false);
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          source: cloudFrontObj?.value || "",
                          destinationType: "",
                          params: {
                            ...prev.params,
                            indexPrefix:
                              cloudFrontObj?.value?.toLowerCase() || "",
                            cloudFrontObj: cloudFrontObj,
                            userIsConfirmed: false,
                            fieldType: CloudFrontFieldType.ALL,
                            enableAutoScaling: YesNo.No,
                            s3SourceType: "",
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                        cloudFrontPipelineTask.params.taskType ===
                        CreateLogMethod.Manual
                      ) {
                        setManualS3EmpryError(false);
                        setManualS3PathInvalid(false);
                        const { bucket, prefix } =
                          splitStringToBucketAndPrefix(logPath);
                        setAosInputValidRes((prev) => {
                          return {
                            ...prev,
                            indexEmptyError: false,
                            indexNameFormatError: false,
                          };
                        });
                        setCloudFrontPipelineTask(
                          (prev: CloudFrontTaskProps) => {
                            return {
                              ...prev,
                              params: {
                                ...prev.params,
                                manualBucketS3Path: logPath,
                                logBucketName: bucket,
                                logBucketPrefix: prefix,
                              },
                            };
                          }
                        );
                      } else {
                        setCloudFrontPipelineTask(
                          (prev: CloudFrontTaskProps) => {
                            return {
                              ...prev,
                              params: {
                                ...prev.params,
                                logBucketPrefix: logPath,
                              },
                            };
                          }
                        );
                      }
                    }}
                    setNextStepDisableStatus={(status) => {
                      setNextStepDisable(status);
                    }}
                    changeSamplingRate={(rate) => {
                      setSamplingRateError(false);
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            samplingRate: rate,
                          },
                        };
                      });
                    }}
                    changeCustomFields={(fileds) => {
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            customFields: fileds,
                          },
                        };
                      });
                    }}
                    changeMinCapacity={(num) => {
                      setShardNumError(false);
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            shardCount: num,
                            minCapacity: num,
                          },
                        };
                      });
                    }}
                    changeEnableAS={(enable) => {
                      setMaxShardNumError(false);
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            enableAutoScaling: enable,
                          },
                        };
                      });
                    }}
                    changeMaxCapacity={(num) => {
                      setMaxShardNumError(false);
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            maxCapacity: num,
                          },
                        };
                      });
                    }}
                    changeUserConfirm={(confirm) => {
                      setShowConfirmError(false);
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            userIsConfirmed: confirm,
                          },
                        };
                      });
                    }}
                    changeTmpFlowList={(list) => {
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            tmpFlowList: list,
                          },
                        };
                      });
                    }}
                    changeS3SourceType={(type) => {
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            s3SourceType: type,
                          },
                        };
                      });
                    }}
                    changeSuccessTextType={(type) => {
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            successTextType: type,
                          },
                        };
                      });
                    }}
                  />
                )}
                {curStep === 1 && (
                  <LogProcessing
                    changePluginSelect={(plugin, enable) => {
                      if (plugin === SupportPlugin.Geo) {
                        setCloudFrontPipelineTask(
                          (prev: CloudFrontTaskProps) => {
                            return {
                              ...prev,
                              params: {
                                ...prev.params,
                                geoPlugin: enable,
                              },
                            };
                          }
                        );
                      }
                      if (plugin === SupportPlugin.UserAgent) {
                        setCloudFrontPipelineTask(
                          (prev: CloudFrontTaskProps) => {
                            return {
                              ...prev,
                              params: {
                                ...prev.params,
                                userAgentPlugin: enable,
                              },
                            };
                          }
                        );
                      }
                    }}
                    pipelineTask={cloudFrontPipelineTask}
                  />
                )}
                {curStep === 2 && (
                  <SpecifyAnalyticsEngine
                    engineType={engineType}
                    taskType={ServiceLogType.Amazon_CloudFront}
                    pipelineTask={cloudFrontPipelineTask}
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                    <SelectLogProcessor supportOSI={false} />
                  </div>
                )}
                {curStep === 4 && (
                  <div>
                    <AlarmAndTags
                      engineType={engineType}
                      pipelineTask={cloudFrontPipelineTask}
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
                      disabled={isNextDisabled()}
                      btnType="primary"
                      onClick={() => {
                        if (curStep === 0) {
                          if (nextStepDisable) {
                            return;
                          }
                          if (
                            cloudFrontPipelineTask.params.taskType ===
                            CreateLogMethod.Automatic
                          ) {
                            if (!cloudFrontPipelineTask.params.cloudFrontObj) {
                              setAutoS3EmptyError(true);
                              return;
                            }
                          }
                          if (
                            cloudFrontPipelineTask.params.taskType ===
                            CreateLogMethod.Automatic
                          ) {
                            if (
                              cloudFrontPipelineTask.destinationType ===
                                DestinationType.KDS &&
                              !cloudFrontPipelineTask.params.userIsConfirmed
                            ) {
                              setShowConfirmError(true);
                              return;
                            }
                          }
                          if (
                            cloudFrontPipelineTask.params.taskType ===
                            CreateLogMethod.Manual
                          ) {
                            if (!cloudFrontPipelineTask.params.logBucketName) {
                              setManualS3EmpryError(true);
                              return;
                            }
                            if (
                              !cloudFrontPipelineTask.params.manualBucketS3Path
                                .toLowerCase()
                                .startsWith("s3") ||
                              !bucketNameIsValid(
                                cloudFrontPipelineTask.params.logBucketName
                              )
                            ) {
                              setManualS3PathInvalid(true);
                              return;
                            }

                            // Manual creation method does not support Realtime
                            if (
                              cloudFrontPipelineTask.destinationType ===
                              DestinationType.KDS
                            ) {
                              return;
                            }
                          }
                          // show error when destination type is empty
                          if (!cloudFrontPipelineTask.destinationType) {
                            setLogTypeEmptyError(true);
                            return;
                          }
                          // check realtime logs input
                          if (
                            cloudFrontPipelineTask.destinationType ===
                            DestinationType.KDS
                          ) {
                            // Check sampling rate
                            if (
                              parseInt(
                                cloudFrontPipelineTask.params.samplingRate
                              ) < 1 ||
                              parseInt(
                                cloudFrontPipelineTask.params.samplingRate
                              ) > 100
                            ) {
                              setSamplingRateError(true);
                              return;
                            }

                            // check min shard
                            if (
                              cloudFrontPipelineTask.params.minCapacity ===
                                "" ||
                              parseInt(
                                cloudFrontPipelineTask.params.minCapacity
                              ) < 1
                            ) {
                              setShardNumError(true);
                              return;
                            }
                            const intStartShardNum = parseInt(
                              cloudFrontPipelineTask.params.minCapacity
                            );
                            const intMaxShardNum = parseInt(
                              cloudFrontPipelineTask.params.maxCapacity
                            );

                            // check max shard
                            if (
                              cloudFrontPipelineTask.params
                                .enableAutoScaling === YesNo.Yes &&
                              (intMaxShardNum <= 0 ||
                                Number.isNaN(intMaxShardNum) ||
                                intMaxShardNum <= intStartShardNum)
                            ) {
                              setMaxShardNumError(true);
                              return;
                            }
                          }
                        }
                        if (curStep === 2) {
                          if (engineType === AnalyticEngineTypes.LIGHT_ENGINE) {
                            // validate light engine and display error message
                            if (!isLightEngineValid) {
                              dispatch({
                                type: CreateLightEngineActionTypes.VALIDATE_LIGHT_ENGINE,
                              });
                              return;
                            }
                          } else {
                            if (!cloudFrontPipelineTask.params.domainName) {
                              setEsDomainEmptyError(true);
                              return;
                            } else {
                              setEsDomainEmptyError(false);
                            }
                            const validRes = checkOpenSearchInput(
                              cloudFrontPipelineTask
                            );
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

export default CreateCloudFront;
