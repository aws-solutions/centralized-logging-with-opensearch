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
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CreateStep from "components/CreateStep";
import SpecifySettings from "./steps/SpecifySettings";
import Button from "components/Button";

import { DestinationType, ServiceType, MonitorInput } from "API";
import { YesNo, AmplifyConfigType, AnalyticEngineTypes } from "types";
import { appSyncRequestMutation } from "assets/js/request";
import {
  createLightEngineServicePipeline,
  createServicePipeline,
} from "graphql/mutations";
import { OptionType } from "components/AutoComplete/autoComplete";
import {
  CreateLogMethod,
  DOMAIN_ALLOW_STATUS,
  ServiceLogType,
} from "assets/js/const";

import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { SelectItem } from "components/Select/select";
import { Alert } from "assets/js/alert";
import { S3SourceType } from "./steps/comp/SourceType";
import { MONITOR_ALARM_INIT_DATA } from "assets/js/init";
import AlarmAndTags from "../../../../pipelineAlarm/AlarmAndTags";
import ConfigLightEngine, {
  covertSvcTaskToLightEngine,
} from "../common/ConfigLightEngine";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
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
  validateAlarmInput,
} from "reducer/createAlarm";
import {
  buildLambdaConcurrency,
  buildOSIParamsValue,
  defaultStr,
  splitStringToBucketAndPrefix,
} from "assets/js/utils";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  LogProcessorType,
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";
import { useGrafana } from "assets/js/hooks/useGrafana";
import ConfigOpenSearch from "../common/ConfigOpenSearch";
import {
  INIT_OPENSEARCH_DATA,
  OpenSearchState,
  convertOpenSearchTaskParameters,
  indexPrefixChanged,
  validateOpenSearch,
  validateOpenSearchParams,
} from "reducer/createOpenSearch";
import { useOpenSearch } from "assets/js/hooks/useOpenSearch";
import { AppDispatch } from "reducer/store";
import CommonLayout from "pages/layout/CommonLayout";

const BASE_EXCLUDE_PARAMS = [
  "esDomainId",
  "warmEnable",
  "coldEnable",
  "taskType",
  "manualBucketS3Path",
  "curTrailObj",
  "enableRolloverByCapacity",
  "warmTransitionType",
  "tmpFlowList",
  "s3SourceType",
  "successTextType",
  "rolloverSizeNotSupport",
];

const S3_EXCLUDE_PARAMS = [
  ...BASE_EXCLUDE_PARAMS,
  "logType",
  "logSource",
  "minCapacity",
  "maxCapacity",
  "shardCount",
];
const CWL_EXCLUDE_PARAMS = [
  ...BASE_EXCLUDE_PARAMS,
  "logBucketName",
  "logBucketPrefix",
];

export interface CloudTrailTaskProps {
  type: ServiceType;
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  destinationType: string;
  params: {
    taskType: string;
    manualBucketS3Path: string;
    curTrailObj: OptionType | null;
    logBucketName: string;
    logBucketPrefix: string;

    logSource: string;
    shardCount: string;
    minCapacity: string;
    enableAutoScaling: string;
    maxCapacity: string;

    logType: string;
    s3SourceType: string;
    successTextType: string;
    tmpFlowList: SelectItem[];
  } & OpenSearchState;
  monitor: MonitorInput;
}

const DEFAULT_TRAIL_TASK_VALUE: CloudTrailTaskProps = {
  type: ServiceType.CloudTrail,
  source: "",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: "",
  params: {
    taskType: CreateLogMethod.Automatic,
    manualBucketS3Path: "",
    curTrailObj: null,
    logBucketName: "",
    logBucketPrefix: "",

    logSource: "",
    shardCount: "1",
    minCapacity: "1",
    enableAutoScaling: YesNo.No,
    maxCapacity: "1",

    logType: ServiceType.CloudTrail,
    successTextType: "",
    s3SourceType: S3SourceType.NONE,
    tmpFlowList: [],

    ...INIT_OPENSEARCH_DATA,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
};

const CreateCloudTrail: React.FC = () => {
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
    { name: t("servicelog:create.service.trail") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const dispatch = useDispatch<Dispatch<Actions>>();
  const [searchParams] = useSearchParams();
  const engineType =
    (searchParams.get("engineType") as AnalyticEngineTypes | null) ??
    AnalyticEngineTypes.OPENSEARCH;

  const totalStep =
    searchParams.get("engineType") === AnalyticEngineTypes.LIGHT_ENGINE ? 2 : 3;
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );

  const [cloudTrailPipelineTask, setCloudTrailPipelineTask] =
    useState<CloudTrailTaskProps>(DEFAULT_TRAIL_TASK_VALUE);

  const [curStep, setCurStep] = useState(0);
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [trailEmptyError, setTrailEmptyError] = useState(false);
  const [sourceTypeEmptyError, setSourceTypeEmptyError] = useState(false);

  const [trailISChanging, setTrailISChanging] = useState(false);

  const [shardNumError, setShardNumError] = useState(false);
  const [maxShardNumError, setMaxShardNumError] = useState(false);

  const [manualS3EmptyError, setManualS3EmptyError] = useState(false);
  const [manualCwlArnEmptyError, setManualCwlArnEmptyError] = useState(false);

  const tags = useTags();
  const monitor = useAlarm();
  const osiParams = useSelectProcessor();
  const lightEngine = useLightEngine();
  const grafana = useGrafana();
  const openSearch = useOpenSearch();
  const appDispatch = useDispatch<AppDispatch>();

  const isOpenSearchValid = useMemo(
    () => validateOpenSearchParams(openSearch),
    [openSearch]
  );

  const confirmCreateLightEnginePipeline = useCallback(async () => {
    const params = covertSvcTaskToLightEngine(
      cloudTrailPipelineTask,
      lightEngine
    );
    const createPipelineParams = {
      ...params,
      type: ServiceType.CloudTrail,
      tags,
      logSourceRegion: amplifyConfig.aws_project_region,
      logSourceAccountId: cloudTrailPipelineTask.logSourceAccountId,
      source: cloudTrailPipelineTask.source,
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
  }, [lightEngine, cloudTrailPipelineTask, tags, monitor]);

  const checkTrailCloudWatchValidation = () => {
    if (
      cloudTrailPipelineTask.params.taskType === CreateLogMethod.Automatic &&
      cloudTrailPipelineTask.params.tmpFlowList.length <= 0
    ) {
      Alert(t("servicelog:trail.needEnableLogging"));
      return false;
    }

    // check min shard
    if (
      cloudTrailPipelineTask.params.minCapacity === "" ||
      parseInt(cloudTrailPipelineTask.params.minCapacity) < 1
    ) {
      setShardNumError(true);
      return false;
    }
    const intStartShardNum = parseInt(
      cloudTrailPipelineTask.params.minCapacity
    );
    const intMaxShardNum = parseInt(cloudTrailPipelineTask.params.maxCapacity);

    // check max shard
    if (
      cloudTrailPipelineTask.params.enableAutoScaling === YesNo.Yes &&
      (intMaxShardNum <= 0 ||
        Number.isNaN(intMaxShardNum) ||
        intMaxShardNum <= intStartShardNum)
    ) {
      setMaxShardNumError(true);
      return false;
    }
    return true;
  };

  const cloudTrailSettingsValidate = () => {
    if (trailISChanging) {
      return false;
    }
    if (
      cloudTrailPipelineTask.params.taskType === CreateLogMethod.Automatic &&
      !cloudTrailPipelineTask.params.curTrailObj
    ) {
      setTrailEmptyError(true);
      return false;
    }
    if (
      cloudTrailPipelineTask.params.taskType === CreateLogMethod.Manual &&
      !cloudTrailPipelineTask.source
    ) {
      setTrailEmptyError(true);
      return false;
    }

    if (!cloudTrailPipelineTask.destinationType) {
      setSourceTypeEmptyError(true);
      return false;
    }
    if (
      cloudTrailPipelineTask.params.taskType === CreateLogMethod.Manual &&
      cloudTrailPipelineTask.destinationType === DestinationType.S3 &&
      !cloudTrailPipelineTask.params.manualBucketS3Path.trim()
    ) {
      setManualS3EmptyError(true);
      return false;
    }
    if (
      cloudTrailPipelineTask.params.taskType === CreateLogMethod.Manual &&
      cloudTrailPipelineTask.destinationType === DestinationType.CloudWatch &&
      !cloudTrailPipelineTask.params.logSource
    ) {
      setManualCwlArnEmptyError(true);
      return false;
    }

    if (
      cloudTrailPipelineTask.params.taskType === CreateLogMethod.Automatic &&
      cloudTrailPipelineTask.destinationType === DestinationType.S3 &&
      !cloudTrailPipelineTask.params.logBucketName
    ) {
      Alert(t("servicelog:trail.needSameRegion"));
      return false;
    }
    if (cloudTrailPipelineTask.destinationType === DestinationType.CloudWatch) {
      return checkTrailCloudWatchValidation();
    }
    return true;
  };

  const confirmCreatePipeline = async () => {
    cloudTrailPipelineTask.params = {
      ...cloudTrailPipelineTask.params,
      ...openSearch,
    };
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.CloudTrail;
    createPipelineParams.source = cloudTrailPipelineTask.source;
    // Update domain name and engine type from openSearch
    createPipelineParams.target = openSearch.domainName;
    createPipelineParams.engine = openSearch.engineType;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      cloudTrailPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType =
      cloudTrailPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);
    createPipelineParams.logProcessorConcurrency =
      buildLambdaConcurrency(osiParams);

    // Set max capacity to min when auto scaling is false
    if (cloudTrailPipelineTask.params.enableAutoScaling === YesNo.No) {
      cloudTrailPipelineTask.params.maxCapacity =
        cloudTrailPipelineTask.params.minCapacity;
    }

    let tmpParamList: any = [];
    if (cloudTrailPipelineTask.destinationType === DestinationType.S3) {
      tmpParamList = convertOpenSearchTaskParameters(
        cloudTrailPipelineTask,
        S3_EXCLUDE_PARAMS,
        openSearch
      );

      // Add defaultCmkArnParam
      tmpParamList.push({
        parameterKey: "defaultCmkArnParam",
        parameterValue: amplifyConfig.default_cmk_arn,
      });
    }

    if (cloudTrailPipelineTask.destinationType === DestinationType.CloudWatch) {
      tmpParamList = convertOpenSearchTaskParameters(
        cloudTrailPipelineTask,
        CWL_EXCLUDE_PARAMS,
        openSearch
      );
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
      value: `cloudtrail_${cloudTrailPipelineTask.source}`,
    });
  }, [cloudTrailPipelineTask.source]);

  const isLightEngineValid = useMemo(
    () => validateLightEngine(lightEngine, grafana),
    [lightEngine, grafana]
  );

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

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  const isNextDisabled = () => {
    if (curStep === 1 && isLightEngine) {
      return false;
    }
    return (
      trailISChanging ||
      openSearch.domainLoading ||
      (curStep === 1 &&
        !DOMAIN_ALLOW_STATUS.includes(
          openSearch.domainCheckedStatus?.status
        )) ||
      osiParams.serviceAvailableCheckedLoading
    );
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-wrapper" data-testid="test-create-cloudtrail">
        <div className="create-step">
          <CreateStep
            list={[
              {
                name: t("servicelog:create.step.specifySetting"),
              },
              {
                name: isLightEngine
                  ? t("servicelog:create.step.specifyLightEngine")
                  : t("servicelog:create.step.specifyDomain"),
              },
              ...(!isLightEngine
                ? [
                    {
                      name: t("processor.logProcessorSettings"),
                    },
                  ]
                : []),
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
              setISChanging={(status) => {
                setTrailISChanging(status);
              }}
              standardOnly={isLightEngine}
              setCloudTrailPipelineTask={setCloudTrailPipelineTask}
              trailEmptyError={trailEmptyError}
              setTrailEmptyError={setTrailEmptyError}
              sourceTypeEmptyError={sourceTypeEmptyError}
              shardNumError={shardNumError}
              maxShardNumError={maxShardNumError}
              manualS3EmptyError={manualS3EmptyError}
              manualCwlArnEmptyError={manualCwlArnEmptyError}
              changeCrossAccount={(id) => {
                setCloudTrailPipelineTask((prev: CloudTrailTaskProps) => {
                  return {
                    ...prev,
                    logSourceAccountId: id,
                  };
                });
              }}
              changeCloudTrailObj={(trail) => {
                setTrailEmptyError(false);
                setSourceTypeEmptyError(false);
                appDispatch(
                  indexPrefixChanged(trail?.name?.toLowerCase() ?? "")
                );
                setCloudTrailPipelineTask((prev: CloudTrailTaskProps) => {
                  return {
                    ...prev,
                    source: defaultStr(trail?.name),
                    destinationType: "",
                    params: {
                      ...prev.params,
                      curTrailObj: trail,
                      logBucketName: "",
                      logBucketPrefix: "",
                      successTextType: "",
                    },
                  };
                });
              }}
              manualChangeCloudTrail={(trail) => {
                setCloudTrailPipelineTask((prev) => {
                  return {
                    ...prev,
                    source: trail,
                  };
                });
                appDispatch(
                  indexPrefixChanged(defaultStr(trail?.toLowerCase()))
                );
              }}
              cloudTrailTask={cloudTrailPipelineTask}
              changeBucket={(bucket) => {
                setCloudTrailPipelineTask((prev: CloudTrailTaskProps) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      logBucketName: bucket,
                    },
                  };
                });
              }}
              changeManualS3={(manualPath) => {
                setManualS3EmptyError(false);
                setManualCwlArnEmptyError(false);
                const { bucket, prefix } =
                  splitStringToBucketAndPrefix(manualPath);
                setCloudTrailPipelineTask((prev) => {
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
              changeLogPath={(logPath) => {
                setCloudTrailPipelineTask((prev: CloudTrailTaskProps) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      logBucketPrefix: logPath,
                    },
                  };
                });
              }}
              changeSourceType={(type) => {
                setSourceTypeEmptyError(false);
                // Update processor type to lambda when change buffer type
                dispatch({
                  type: SelectProcessorActionTypes.CHANGE_PROCESSOR_TYPE,
                  processorType: LogProcessorType.LAMBDA,
                });
                setCloudTrailPipelineTask((prev: CloudTrailTaskProps) => {
                  return {
                    ...prev,
                    destinationType: type,
                  };
                });
              }}
              changeTmpFlowList={(list) => {
                setCloudTrailPipelineTask((prev: CloudTrailTaskProps) => {
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
                setCloudTrailPipelineTask((prev: CloudTrailTaskProps) => {
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
                setCloudTrailPipelineTask((prev: CloudTrailTaskProps) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      successTextType: type,
                    },
                  };
                });
              }}
              changeLogSource={(source) => {
                setCloudTrailPipelineTask((prev: CloudTrailTaskProps) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      logSource: source,
                    },
                  };
                });
              }}
              changeMinCapacity={(num) => {
                setShardNumError(false);
                setCloudTrailPipelineTask((prev: CloudTrailTaskProps) => {
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
                setCloudTrailPipelineTask((prev: CloudTrailTaskProps) => {
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
                setCloudTrailPipelineTask((prev: CloudTrailTaskProps) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      maxCapacity: num,
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
                <ConfigOpenSearch taskType={ServiceLogType.Amazon_CloudTrail} />
              )}
            </>
          )}
          {curStep === 2 && !isLightEngine && (
            <div>
              <SelectLogProcessor
                supportOSI={
                  !isLightEngine &&
                  !cloudTrailPipelineTask.logSourceAccountId &&
                  cloudTrailPipelineTask.destinationType === DestinationType.S3
                }
              />
            </div>
          )}
          {curStep === totalStep && (
            <div>
              <AlarmAndTags
                engineType={engineType}
                pipelineTask={cloudTrailPipelineTask}
                osiParams={osiParams}
              />
            </div>
          )}
          <div className="button-action text-right">
            <Button
              disabled={loadingCreate}
              btnType="text"
              onClick={() => {
                navigate("/log-pipeline/service-log/create");
              }}
            >
              {t("button.cancel")}
            </Button>
            {curStep > 0 && (
              <Button
                disabled={loadingCreate}
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
                disabled={isNextDisabled()}
                btnType="primary"
                onClick={() => {
                  if (curStep === 0) {
                    if (!cloudTrailSettingsValidate()) {
                      return;
                    }
                  }
                  if (curStep === 1) {
                    if (!validateAnalyticsEngine()) {
                      return;
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
                    return curStep + 1 > totalStep ? totalStep : curStep + 1;
                  });
                }}
              >
                {t("button.next")}
              </Button>
            )}
            {curStep === totalStep && (
              <Button
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

export default CreateCloudTrail;
