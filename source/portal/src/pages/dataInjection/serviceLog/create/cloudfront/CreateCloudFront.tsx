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
import Button from "components/Button";

import { appSyncRequestMutation } from "assets/js/request";
import {
  createLightEngineServicePipeline,
  createServicePipeline,
} from "graphql/mutations";
import { DestinationType, ServiceType, MonitorInput } from "API";
import {
  SupportPlugin,
  YesNo,
  AmplifyConfigType,
  CloudFrontFieldType,
  AnalyticEngineTypes,
} from "types";
import { OptionType } from "components/AutoComplete/autoComplete";
import {
  CloudFrontFieldTypeList,
  CreateLogMethod,
  DOMAIN_ALLOW_STATUS,
  FieldSortingArr,
  genSvcStepTitle,
  ServiceLogType,
} from "assets/js/const";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  bucketNameIsValid,
  buildLambdaConcurrency,
  buildOSIParamsValue,
  defaultStr,
  splitStringToBucketAndPrefix,
} from "assets/js/utils";
import { SelectItem } from "components/Select/select";
import { S3SourceType } from "../cloudtrail/steps/comp/SourceType";
import { MONITOR_ALARM_INIT_DATA } from "assets/js/init";
import AlarmAndTags from "../../../../pipelineAlarm/AlarmAndTags";
import ConfigLightEngine, {
  covertSvcTaskToLightEngine,
} from "pages/dataInjection/serviceLog/create/common/ConfigLightEngine";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import {
  CreateLightEngineActionTypes,
  validateLightEngine,
} from "reducer/createLightEngine";
import { useLightEngine } from "assets/js/hooks/useLightEngine";
import { Dispatch } from "redux";
import { ActionType } from "reducer/appReducer";
import {
  CreateAlarmActionTypes,
  validateAlarmInput,
} from "reducer/createAlarm";
import { useGrafana } from "assets/js/hooks/useGrafana";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  LogProcessorType,
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import {
  INIT_OPENSEARCH_DATA,
  OpenSearchState,
  convertOpenSearchTaskParameters,
  indexPrefixChanged,
  validateOpenSearch,
  validateOpenSearchParams,
} from "reducer/createOpenSearch";
import { AppDispatch } from "reducer/store";
import ConfigOpenSearch from "../common/ConfigOpenSearch";
import { useOpenSearch } from "assets/js/hooks/useOpenSearch";
import CommonLayout from "pages/layout/CommonLayout";
import EnrichedFields from "pages/dataInjection/common/EnrichFields";

const BASE_EXCLUDE_PARAMS = [
  "taskType",
  "cloudFrontObj",
  "manualBucketS3Path",
  "manualBucketName",
  "geoPlugin",
  "userAgentPlugin",
  "fieldType",
  "customFields",
  "userIsConfirmed",
  "s3SourceType",
  "successTextType",
  "tmpFlowList",
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
    logBucketName: string;
    cloudFrontObj: OptionType | null;
    taskType: string;
    manualBucketS3Path: string;
    manualBucketName: string;
    logBucketPrefix: string;

    geoPlugin: boolean;
    userAgentPlugin: boolean;

    userIsConfirmed: boolean;
    fieldType: string;
    customFields: string[]; // to convert fieldNames
    samplingRate: string;
    shardCount: string;
    minCapacity: string;
    enableAutoScaling: string;
    maxCapacity: string;

    tmpFlowList: SelectItem[];
    s3SourceType: string;
    successTextType: string;
  } & OpenSearchState;
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
    logBucketName: "",
    cloudFrontObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketS3Path: "",
    manualBucketName: "",
    logBucketPrefix: "",

    geoPlugin: false,
    userAgentPlugin: false,

    userIsConfirmed: false,
    fieldType: CloudFrontFieldType.ALL,
    customFields: [],
    samplingRate: "1",
    shardCount: "1",
    minCapacity: "1",
    enableAutoScaling: YesNo.No,
    maxCapacity: "1",

    tmpFlowList: [],
    s3SourceType: S3SourceType.NONE,
    successTextType: "",
    ...INIT_OPENSEARCH_DATA,
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
  const logIngestType = searchParams.get("ingestLogType") ?? DestinationType.S3;
  console.info("logIngestType:", logIngestType);
  const totalStep = 3;
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );

  const [curStep, setCurStep] = useState(0);
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [cloudFrontPipelineTask, setCloudFrontPipelineTask] =
    useState<CloudFrontTaskProps>({
      ...DEFAULT_TASK_VALUE,
      destinationType: logIngestType,
    });

  const [autoS3EmptyError, setAutoS3EmptyError] = useState(false);
  const [manualS3EmptyError, setManualS3EmptyError] = useState(false);
  const [manualS3PathInvalid, setManualS3PathInvalid] = useState(false);

  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [showConfirmError, setShowConfirmError] = useState(false);
  const [samplingRateError, setSamplingRateError] = useState(false);
  const [shardNumError, setShardNumError] = useState(false);
  const [maxShardNumError, setMaxShardNumError] = useState(false);

  const tags = useTags();
  const monitor = useSelector((state: RootState) => state.createAlarm);
  const osiParams = useSelectProcessor();
  const lightEngine = useLightEngine();
  const grafana = useGrafana();
  const openSearch = useOpenSearch();
  const appDispatch = useDispatch<AppDispatch>();

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
      params?.parameters.push({
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
    cloudFrontPipelineTask.params = {
      ...cloudFrontPipelineTask.params,
      ...openSearch,
    };
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.CloudFront;
    createPipelineParams.source = cloudFrontPipelineTask.source;
    // Update domain name and engine type from openSearch
    createPipelineParams.target = openSearch.domainName;
    createPipelineParams.engine = openSearch.engineType;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      cloudFrontPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType =
      cloudFrontPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);
    createPipelineParams.logProcessorConcurrency =
      buildLambdaConcurrency(osiParams);

    // Set max capacity to min when auto scaling is false
    if (cloudFrontPipelineTask.params.enableAutoScaling === YesNo.No) {
      cloudFrontPipelineTask.params.maxCapacity =
        cloudFrontPipelineTask.params.minCapacity;
    }

    let tmpParamList: any = [];

    if (cloudFrontPipelineTask.destinationType === DestinationType.S3) {
      tmpParamList = convertOpenSearchTaskParameters(
        cloudFrontPipelineTask,
        EXCLUDE_PARAMS_S3,
        openSearch
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
      tmpParamList = convertOpenSearchTaskParameters(
        cloudFrontPipelineTask,
        EXCLUDE_PARAMS_KDS,
        openSearch
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
    dispatch({
      type: CreateAlarmActionTypes.CLEAR_ALARM,
    });
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

  const isOpenSearchValid = useMemo(
    () => validateOpenSearchParams(openSearch),
    [openSearch]
  );

  const isNextDisabled = () => {
    if (curStep === 2 && isLightEngine) {
      return false;
    }
    console.info("nextStepDisable:", nextStepDisable);
    return (
      openSearch.domainLoading ||
      nextStepDisable ||
      (curStep === 2 &&
        !DOMAIN_ALLOW_STATUS.includes(
          openSearch.domainCheckedStatus?.status
        )) ||
      osiParams.serviceAvailableCheckedLoading
    );
  };

  const checkAutomaticParams = () => {
    if (cloudFrontPipelineTask.params.taskType === CreateLogMethod.Automatic) {
      if (!cloudFrontPipelineTask.params.cloudFrontObj) {
        setAutoS3EmptyError(true);
        return false;
      }
      if (
        cloudFrontPipelineTask.destinationType === DestinationType.KDS &&
        !cloudFrontPipelineTask.params.userIsConfirmed
      ) {
        setShowConfirmError(true);
        return false;
      }
    }
    return true;
  };

  const checkManualParams = () => {
    if (cloudFrontPipelineTask.params.taskType === CreateLogMethod.Manual) {
      if (!cloudFrontPipelineTask.params.logBucketName) {
        setManualS3EmptyError(true);
        return false;
      }
      if (
        !cloudFrontPipelineTask.params.manualBucketS3Path
          .toLowerCase()
          .startsWith("s3") ||
        !bucketNameIsValid(cloudFrontPipelineTask.params.logBucketName)
      ) {
        setManualS3PathInvalid(true);
        return false;
      }

      // Manual creation method does not support Realtime
      if (cloudFrontPipelineTask.destinationType === DestinationType.KDS) {
        return false;
      }
    }
    return true;
  };

  const validateCloudFrontInput = () => {
    if (nextStepDisable) {
      return false;
    }

    if (!checkAutomaticParams()) {
      return false;
    }

    if (!checkManualParams()) {
      return false;
    }

    // check realtime logs input
    if (cloudFrontPipelineTask.destinationType === DestinationType.KDS) {
      // Check sampling rate
      if (
        parseInt(cloudFrontPipelineTask.params.samplingRate) < 1 ||
        parseInt(cloudFrontPipelineTask.params.samplingRate) > 100
      ) {
        setSamplingRateError(true);
        return false;
      }

      // check min shard
      if (
        cloudFrontPipelineTask.params.minCapacity === "" ||
        parseInt(cloudFrontPipelineTask.params.minCapacity) < 1
      ) {
        setShardNumError(true);
        return false;
      }
      const intStartShardNum = parseInt(
        cloudFrontPipelineTask.params.minCapacity
      );
      const intMaxShardNum = parseInt(
        cloudFrontPipelineTask.params.maxCapacity
      );

      // check max shard
      if (
        cloudFrontPipelineTask.params.enableAutoScaling === YesNo.Yes &&
        (intMaxShardNum <= 0 ||
          Number.isNaN(intMaxShardNum) ||
          intMaxShardNum <= intStartShardNum)
      ) {
        setMaxShardNumError(true);
        return false;
      }
    }
    return true;
  };

  const validateAnalyticsEngine = () => {
    if (isLightEngine) {
      // validate light engine and display error message
      if (!isLightEngineValid) {
        dispatch({
          type: CreateLightEngineActionTypes.VALIDATE_LIGHT_ENGINE,
        });
        return false;
      }
    } else if (!isOpenSearchValid) {
      appDispatch(validateOpenSearch());
      return false;
    }
    return true;
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-wrapper" data-testid="test-create-cloudfront">
        <div className="create-step">
          <CreateStep
            list={genSvcStepTitle(
              osiParams.logProcessorType === LogProcessorType.OSI
            ).map((item) => {
              return {
                name: t(item),
              };
            })}
            activeIndex={curStep}
          />
        </div>
        <div className="create-content m-w-1024">
          {curStep === 0 && (
            <SpecifySettings
              cloudFrontTask={cloudFrontPipelineTask}
              manualS3EmptyError={manualS3EmptyError}
              manualS3PathInvalid={manualS3PathInvalid}
              autoS3EmptyError={autoS3EmptyError}
              showConfirmError={showConfirmError}
              samplingRateError={samplingRateError}
              shardNumError={shardNumError}
              maxShardNumError={maxShardNumError}
              changeCrossAccount={(id) => {
                setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                  return {
                    ...prev,
                    logSourceAccountId: id,
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
                // dispatch update index prefix
                appDispatch(indexPrefixChanged(srcBucketName.toLowerCase()));
                setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                  return {
                    ...prev,
                    source: srcBucketName,
                    params: {
                      ...prev.params,
                      manualBucketName: srcBucketName,
                    },
                  };
                });
              }}
              changeTaskType={(taskType) => {
                setAutoS3EmptyError(false);
                setManualS3EmptyError(false);
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
                // dispatch update index prefix
                appDispatch(
                  indexPrefixChanged(cloudFrontObj?.value?.toLowerCase() ?? "")
                );
                setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                  return {
                    ...prev,
                    source: defaultStr(cloudFrontObj?.value),
                    params: {
                      ...prev.params,
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
                  setManualS3EmptyError(false);
                  setManualS3PathInvalid(false);
                  const { bucket, prefix } =
                    splitStringToBucketAndPrefix(logPath);
                  setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                  setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
              changeCustomFields={(fields) => {
                setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      customFields: fields,
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
            />
          )}
          {curStep === 1 && (
            <>
              {isLightEngine ? (
                <ConfigLightEngine />
              ) : (
                <ConfigOpenSearch taskType={ServiceLogType.Amazon_CloudFront} />
              )}
            </>
          )}
          {curStep === 2 && (
            <div>
              {!isLightEngine && <SelectLogProcessor supportOSI={false} />}
              <EnrichedFields
                pipelineTask={cloudFrontPipelineTask}
                changePluginSelect={(plugin, enable) => {
                  if (plugin === SupportPlugin.Geo) {
                    setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                    setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
              />
            </div>
          )}
          {curStep === totalStep && (
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

            {curStep < totalStep && (
              <Button
                data-testid="cloudfront-next-button"
                disabled={isNextDisabled()}
                btnType="primary"
                onClick={() => {
                  if (curStep === 0) {
                    if (!validateCloudFrontInput()) {
                      return;
                    }
                  }
                  if (curStep === 1) {
                    if (!validateAnalyticsEngine()) {
                      return;
                    }
                  }
                  if (curStep === 2 && !isLightEngine) {
                    dispatch({
                      type: SelectProcessorActionTypes.VALIDATE_OCU_INPUT,
                    });
                    if (!validateOCUInput(osiParams)) {
                      return;
                    }
                  }
                  setCurStep((curStep) => {
                    return curStep + 1 > totalStep ? totalStep : curStep + 1;
                  });
                }}
              >
                {t("button.next")}
              </Button>
            )}
            {curStep === totalStep && (
              <Button
                data-testid="cloudfront-create-button"
                loading={loadingCreate}
                btnType="primary"
                onClick={() => {
                  if (!validateAlarmInput(monitor)) {
                    dispatch({
                      type: CreateAlarmActionTypes.VALIDATE_ALARM_INPUT,
                    });
                    return;
                  }
                  isLightEngine
                    ? confirmCreateLightEnginePipeline()
                    : confirmCreatePipeline();
                }}
              >
                {t("button.create")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </CommonLayout>
  );
};

export default CreateCloudFront;
