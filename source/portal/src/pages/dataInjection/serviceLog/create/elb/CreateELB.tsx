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
import { SupportPlugin, AmplifyConfigType, AnalyticEngineTypes } from "types";
import { OptionType } from "components/AutoComplete/autoComplete";
import {
  CreateLogMethod,
  DOMAIN_ALLOW_STATUS,
  genSvcStepTitle,
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
import { ActionType } from "reducer/appReducer";
import {
  CreateAlarmActionTypes,
  validateAlarmInput,
} from "reducer/createAlarm";
import { useGrafana } from "assets/js/hooks/useGrafana";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  LogProcessorType,
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
import EnrichedFields from "pages/dataInjection/common/EnrichFields";

const EXCLUDE_PARAMS = [
  "elbObj",
  "taskType",
  "manualBucketELBPath",
  "manualBucketName",
  "geoPlugin",
  "userAgentPlugin",
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
    taskType: string;
    elbObj: OptionType | null;
    logBucketName: string;
    manualBucketELBPath: string;
    manualBucketName: string;
    logBucketPrefix: string;
    geoPlugin: boolean;
    userAgentPlugin: boolean;
  } & OpenSearchState;
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
    logBucketName: "",
    elbObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketELBPath: "",
    manualBucketName: "",
    logBucketPrefix: "",
    geoPlugin: false,
    userAgentPlugin: false,
    ...INIT_OPENSEARCH_DATA,
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
  const totalStep = 3;
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );

  const [curStep, setCurStep] = useState(0);
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [elbPipelineTask, setELBPipelineTask] =
    useState<ELBTaskProps>(DEFAULT_TASK_VALUE);

  const [autoELBEmptyError, setAutoELBEmptyError] = useState(false);
  const [manualELBEmptyError, setManualELBEmptyError] = useState(false);
  const [manualS3PathInvalid, setManualS3PathInvalid] = useState(false);

  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [elbISChanging, setELBISChanging] = useState(false);
  const [needEnableAccessLog, setNeedEnableAccessLog] = useState(false);

  const tags = useTags();
  const monitor = useSelector((state: RootState) => state.createAlarm);
  const osiParams = useSelectProcessor();
  const lightEngine = useLightEngine();
  const grafana = useGrafana();
  const openSearch = useOpenSearch();
  const appDispatch = useDispatch<AppDispatch>();
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
    if (pluginList.length > 0 && params?.parameters) {
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
    elbPipelineTask.params = {
      ...elbPipelineTask.params,
      ...openSearch,
    };
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.ELB;
    createPipelineParams.source = elbPipelineTask.source;
    // Update domain name and engine type from openSearch
    createPipelineParams.target = openSearch.domainName;
    createPipelineParams.engine = openSearch.engineType;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      elbPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = elbPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);
    createPipelineParams.logProcessorConcurrency =
      buildLambdaConcurrency(osiParams);

    const tmpParamList: any = convertOpenSearchTaskParameters(
      elbPipelineTask,
      EXCLUDE_PARAMS,
      openSearch
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
    dispatch({
      type: CreateAlarmActionTypes.CLEAR_ALARM,
    });
  }, []);

  const validateELBInput = () => {
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
        setManualELBEmptyError(true);
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

  const isOpenSearchValid = useMemo(
    () => validateOpenSearchParams(openSearch),
    [openSearch]
  );

  const isLightEngineValid = useMemo(
    () => validateLightEngine(lightEngine, grafana),
    [lightEngine]
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
    dispatch({
      type: CreateLightEngineActionTypes.CENTRALIZED_TABLE_NAME_CHANGED,
      value: `elb_${elbPipelineTask.source}`,
    });
  }, [elbPipelineTask.source]);

  const isNextDisabled = () => {
    if (curStep === 2 && isLightEngine) {
      return false;
    }
    return (
      elbISChanging ||
      openSearch.domainLoading ||
      (curStep === 2 &&
        !DOMAIN_ALLOW_STATUS.includes(
          openSearch.domainCheckedStatus?.status
        )) ||
      osiParams.serviceAvailableCheckedLoading
    );
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-wrapper" data-testid="test-create-elb">
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
              elbTask={elbPipelineTask}
              setISChanging={(status) => {
                setELBISChanging(status);
              }}
              manualELBEmptyError={manualELBEmptyError}
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
                appDispatch(indexPrefixChanged(srcBucketName.toLowerCase()));
                setELBPipelineTask((prev: ELBTaskProps) => {
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
                console.info("taskType:", taskType);
                setAutoELBEmptyError(false);
                setManualELBEmptyError(false);
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
                appDispatch(
                  indexPrefixChanged(elbObj?.name?.toLowerCase() ?? "")
                );
                setELBPipelineTask((prev: ELBTaskProps) => {
                  return {
                    ...prev,
                    source: defaultStr(elbObj?.name),
                    arnId: defaultStr(elbObj?.value),
                    params: {
                      ...prev.params,
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
                  elbPipelineTask.params.taskType === CreateLogMethod.Manual
                ) {
                  setManualELBEmptyError(false);
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
            <>
              {isLightEngine ? (
                <ConfigLightEngine />
              ) : (
                <ConfigOpenSearch taskType={ServiceLogType.Amazon_ELB} />
              )}
            </>
          )}
          {curStep === 2 && (
            <div>
              {!isLightEngine && (
                <SelectLogProcessor
                  supportOSI={
                    !elbPipelineTask.logSourceAccountId && !isLightEngine
                  }
                  enablePlugins={
                    elbPipelineTask.params.geoPlugin ||
                    elbPipelineTask.params.userAgentPlugin
                  }
                />
              )}
              <EnrichedFields
                pipelineTask={elbPipelineTask}
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
              />
            </div>
          )}
          {curStep === totalStep && (
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
              data-testid="elb-cancel-button"
              btnType="text"
              onClick={() => {
                navigate("/log-pipeline/service-log/create");
              }}
            >
              {t("button.cancel")}
            </Button>
            {curStep > 0 && (
              <Button
                data-testid="elb-previous-button"
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
                data-testid="elb-next-button"
                // loading={autoCreating}
                disabled={isNextDisabled()}
                btnType="primary"
                onClick={() => {
                  if (curStep === 0) {
                    if (!validateELBInput()) {
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
                data-testid="elb-create-button"
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

export default CreateELB;
