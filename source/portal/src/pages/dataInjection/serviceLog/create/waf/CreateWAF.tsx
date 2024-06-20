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
import { AmplifyConfigType, AnalyticEngineTypes } from "types";
import { OptionType } from "components/AutoComplete/autoComplete";
import {
  CreateLogMethod,
  DOMAIN_ALLOW_STATUS,
  ServiceLogType,
} from "assets/js/const";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Alert } from "assets/js/alert";
import {
  bucketNameIsValid,
  buildLambdaConcurrency,
  buildOSIParamsValue,
  defaultStr,
  splitStringToBucketAndPrefix,
} from "assets/js/utils";
import { IngestOption } from "./steps/IngestOptionSelect";
import ConfigLightEngine, {
  covertSvcTaskToLightEngine,
} from "../common/ConfigLightEngine";
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
  validateAlarmInput,
} from "reducer/createAlarm";
import { useGrafana } from "assets/js/hooks/useGrafana";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";
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
import ConfigOpenSearch from "../common/ConfigOpenSearch";
import CommonLayout from "pages/layout/CommonLayout";

const EXCLUDE_PARAMS_COMMON = [
  "wafObj",
  "taskType",
  "manualBucketWAFPath",
  "manualBucketName",
  "ingestOption",
  "logSource",
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
    logBucketName: string;
    wafObj: OptionType | null;
    taskType: string;
    manualBucketWAFPath: string;
    manualBucketName: string;
    logBucketPrefix: string;
    webACLNames: string;
    ingestOption: string;
    interval: string;
    webACLScope: string;
    logSource: string;
  } & OpenSearchState;
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
    logBucketName: "",
    wafObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketWAFPath: "",
    manualBucketName: "",
    logBucketPrefix: "",
    webACLNames: "",
    ingestOption: IngestOption.SampledRequest,
    interval: "",
    webACLScope: "",
    logSource: "",
    ...INIT_OPENSEARCH_DATA,
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
  const [manualWAFEmptyError, setManualWAFEmptyError] = useState(false);
  const [manualS3PathInvalid, setManualS3PathInvalid] = useState(false);

  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [wafISChanging, setWAFISChanging] = useState(false);
  const [needEnableAccessLog, setNeedEnableAccessLog] = useState(false);
  const [intervalValueError, setIntervalValueError] = useState(false);

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

  const totalStep =
    searchParams.get("engineType") === AnalyticEngineTypes.LIGHT_ENGINE ? 2 : 3;
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
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
  const openSearch = useOpenSearch();
  const appDispatch = useDispatch<AppDispatch>();

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
    wafPipelineTask.params = {
      ...wafPipelineTask.params,
      ...openSearch,
    };
    const createPipelineParams: any = {};
    createPipelineParams.type =
      wafPipelineTask.params.ingestOption === IngestOption.SampledRequest
        ? ServiceType.WAFSampled
        : ServiceType.WAF;
    createPipelineParams.source = wafPipelineTask.source;
    // Update domain name and engine type from openSearch
    createPipelineParams.target = openSearch.domainName;
    createPipelineParams.engine = openSearch.engineType;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      wafPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = wafPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);
    createPipelineParams.logProcessorConcurrency =
      buildLambdaConcurrency(osiParams);

    let tmpParamList: any = [];
    if (wafPipelineTask.params.ingestOption === IngestOption.SampledRequest) {
      tmpParamList = convertOpenSearchTaskParameters(
        wafPipelineTask,
        EXCLUDE_PARAMS_SAMPLED,
        openSearch
      );
    } else {
      tmpParamList = convertOpenSearchTaskParameters(
        wafPipelineTask,
        EXCLUDE_PARAMS_FULL,
        openSearch
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

  const isOpenSearchValid = useMemo(
    () => validateOpenSearchParams(openSearch),
    [openSearch]
  );

  const isLightEngineValid = useMemo(
    () => validateLightEngine(lightEngine, grafana),
    [lightEngine]
  );
  const isNextDisabled = () => {
    if (curStep === 1 && isLightEngine) {
      return false;
    }
    return (
      wafISChanging ||
      openSearch.domainLoading ||
      (curStep === 1 &&
        !DOMAIN_ALLOW_STATUS.includes(
          openSearch.domainCheckedStatus?.status
        )) ||
      osiParams.serviceAvailableCheckedLoading
    );
  };

  const validateWAFManualInput = () => {
    if (wafPipelineTask.params.taskType === CreateLogMethod.Manual) {
      if (!wafPipelineTask.params.webACLNames) {
        setManualWebACLEmptyError(true);
        return false;
      }
      if (
        !wafPipelineTask.params.logBucketName &&
        wafPipelineTask.params.ingestOption === IngestOption.FullRequest
      ) {
        setManualWAFEmptyError(true);
        return false;
      }
      if (
        wafPipelineTask.params.ingestOption === IngestOption.FullRequest &&
        (!wafPipelineTask.params.manualBucketWAFPath
          .toLowerCase()
          .startsWith("s3") ||
          !bucketNameIsValid(wafPipelineTask.params.logBucketName))
      ) {
        setManualS3PathInvalid(true);
        return false;
      }
    }
    return true;
  };

  const validateWAFInput = () => {
    if (nextStepDisable) {
      return false;
    }
    if (needEnableAccessLog) {
      Alert(t("servicelog:waf.needEnableLogging"));
      return false;
    }
    if (wafPipelineTask.params.taskType === CreateLogMethod.Automatic) {
      if (!wafPipelineTask.params.wafObj) {
        setAutoWAFEmptyError(true);
        return false;
      }
    }
    if (!validateWAFManualInput()) {
      return false;
    }
    if (!checkSampleScheduleValue()) {
      return false;
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
      <div className="create-wrapper" data-testid="test-create-waf">
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
              engineType={engineType}
              wafTask={wafPipelineTask}
              setISChanging={(status) => {
                setWAFISChanging(status);
              }}
              manualAclEmptyError={manualWebACLEmptyError}
              manualWAFEmptyError={manualWAFEmptyError}
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
                appDispatch(indexPrefixChanged(webACLName.toLowerCase()));
                setWAFPipelineTask((prev: WAFTaskProps) => {
                  return {
                    ...prev,
                    source: webACLName,
                    params: {
                      ...prev.params,
                      webACLNames: webACLName,
                      manualBucketName: webACLName,
                    },
                  };
                });
              }}
              changeTaskType={(taskType) => {
                console.info("taskType:", taskType);
                setAutoWAFEmptyError(false);
                setManualWAFEmptyError(false);
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
                appDispatch(
                  indexPrefixChanged(wafObj?.name?.toLowerCase() ?? "")
                );
                setWAFPipelineTask((prev: WAFTaskProps) => {
                  return {
                    ...prev,
                    source: defaultStr(wafObj?.name),
                    arnId: defaultStr(wafObj?.value),
                    params: {
                      ...prev.params,
                      webACLNames: defaultStr(wafObj?.name),
                      wafObj: wafObj,
                      webACLScope: defaultStr(wafObj?.description),
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
                  wafPipelineTask.params.taskType === CreateLogMethod.Manual
                ) {
                  setManualWAFEmptyError(false);
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
            <>
              {isLightEngine ? (
                <ConfigLightEngine />
              ) : (
                <ConfigOpenSearch taskType={ServiceLogType.Amazon_WAF} />
              )}
            </>
          )}
          {curStep === 2 && !isLightEngine && (
            <div>
              <SelectLogProcessor
                supportOSI={
                  !wafPipelineTask.logSourceAccountId &&
                  !isLightEngine &&
                  wafPipelineTask.params.ingestOption !==
                    IngestOption.SampledRequest
                }
              />
            </div>
          )}
          {curStep === totalStep && (
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

            {curStep < totalStep && (
              <Button
                // loading={autoCreating}
                disabled={isNextDisabled()}
                btnType="primary"
                onClick={() => {
                  if (curStep === 0) {
                    if (!validateWAFInput()) {
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

export default CreateWAF;
