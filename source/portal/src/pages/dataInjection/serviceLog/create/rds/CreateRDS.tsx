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
import { AmplifyConfigType, AnalyticEngineTypes, RDSIngestOption } from "types";
import { OptionType } from "components/AutoComplete/autoComplete";
import {
  CreateLogMethod,
  DOMAIN_ALLOW_STATUS,
  genSvcStepTitle,
  ServiceLogType,
} from "assets/js/const";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { MONITOR_ALARM_INIT_DATA } from "assets/js/init";
import AlarmAndTags from "../../../../pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import { Dispatch } from "redux";
import { ActionType } from "reducer/appReducer";
import {
  CreateAlarmActionTypes,
  validateAlarmInput,
} from "reducer/createAlarm";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import {
  buildLambdaConcurrency,
  buildOSIParamsValue,
  defaultStr,
} from "assets/js/utils";
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
import { useLightEngine } from "assets/js/hooks/useLightEngine";
import { useGrafana } from "assets/js/hooks/useGrafana";
import ConfigLightEngine, {
  covertSvcTaskToLightEngine,
} from "../common/ConfigLightEngine";
import {
  CreateLightEngineActionTypes,
  validateLightEngine,
} from "reducer/createLightEngine";

const EXCLUDE_PARAMS = [
  "rdsObj",
  "taskType",
  "manualDBIdentifier",
  "manualDBType",
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
];
export interface RDSTaskProps {
  type: ServiceType;
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  destinationType: string;
  params: {
    taskType: string;
    rdsObj: OptionType | null;
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
    logBucketName: string;
    logBucketPrefix: string;
  } & OpenSearchState;
  monitor: MonitorInput;
}

const DEFAULT_TASK_VALUE: RDSTaskProps = {
  type: ServiceType.RDS,
  source: "",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: DestinationType.S3,
  params: {
    taskType: CreateLogMethod.Automatic,
    rdsObj: null,
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
    logBucketName: "",
    logBucketPrefix: "",
    ...INIT_OPENSEARCH_DATA,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
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
    (state: RootState) => state.app.amplifyConfig
  );
  const [searchParams] = useSearchParams();
  const engineType =
    (searchParams.get("engineType") as AnalyticEngineTypes | null) ??
    AnalyticEngineTypes.OPENSEARCH;
  const ingestLogType =
    searchParams.get("ingestLogType") ?? RDSIngestOption.MySQL;
  const totalStep =
    searchParams.get("engineType") === AnalyticEngineTypes.LIGHT_ENGINE ? 2 : 3;
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );

  const dispatch = useDispatch<Dispatch<Actions>>();

  const [curStep, setCurStep] = useState(0);
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [rdsPipelineTask, setRDSPipelineTask] =
    useState<RDSTaskProps>(DEFAULT_TASK_VALUE);

  const [autoRDSEmptyError, setAutoRDSEmptyError] = useState(false);
  const [manualRDSEmptyError, setManualRDSEmptyError] = useState(false);

  const [rdsIsChanging, setRDSIsChanging] = useState(false);
  const [subAccountRoleArn, setSubAccountRoleArn] = useState("");

  const tags = useTags();
  const monitor = useSelector((state: RootState) => state.createAlarm);
  const osiParams = useSelectProcessor();
  const lightEngine = useLightEngine();
  const grafana = useGrafana();
  const openSearch = useOpenSearch();
  const appDispatch = useDispatch<AppDispatch>();

  const confirmCreateLightEnginePipeline = useCallback(async () => {
    const params = covertSvcTaskToLightEngine(rdsPipelineTask, lightEngine);

    const createPipelineParams = {
      ...params,
      type: ServiceType.RDS,
      tags,
      logSourceRegion: amplifyConfig.aws_project_region,
      logSourceAccountId: rdsPipelineTask.logSourceAccountId,
      source: rdsPipelineTask.source,
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
  }, [lightEngine, rdsPipelineTask, tags, monitor]);

  const confirmCreatePipeline = async () => {
    rdsPipelineTask.params = {
      ...rdsPipelineTask.params,
      ...openSearch,
    };
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.RDS;
    createPipelineParams.source = rdsPipelineTask.source;
    // Update domain name and engine type from openSearch
    createPipelineParams.target = openSearch.domainName;
    createPipelineParams.engine = openSearch.engineType;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      rdsPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = rdsPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);
    createPipelineParams.logProcessorConcurrency =
      buildLambdaConcurrency(osiParams);

    const tmpParamList: any = convertOpenSearchTaskParameters(
      rdsPipelineTask,
      EXCLUDE_PARAMS,
      openSearch
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

    if (isLightEngine) {
      // only for RDS task
      const paramValue = {
        DBIdentifiers: [rdsPipelineTask.source],
        role: subAccountRoleArn,
      };
      tmpParamList.push({
        parameterKey: "context",
        parameterValue: `${JSON.stringify(paramValue)}`,
      });
    }

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
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
    dispatch({
      type: CreateAlarmActionTypes.CLEAR_ALARM,
    });
  }, []);

  const validateRDSInput = () => {
    if (rdsPipelineTask?.params?.taskType === CreateLogMethod.Automatic) {
      if (!rdsPipelineTask?.params?.rdsObj) {
        setAutoRDSEmptyError(true);
        return false;
      }
    }
    if (rdsPipelineTask?.params?.taskType === CreateLogMethod.Manual) {
      if (!rdsPipelineTask?.params?.manualDBIdentifier) {
        setManualRDSEmptyError(true);
        return false;
      }
    }
    return true;
  };

  const isNextDisabled = () => {
    if (curStep === 1 && isLightEngine) {
      return false;
    }
    return (
      rdsIsChanging ||
      openSearch.domainLoading ||
      (curStep === 1 &&
        !DOMAIN_ALLOW_STATUS.includes(
          openSearch.domainCheckedStatus?.status
        )) ||
      osiParams.serviceAvailableCheckedLoading
    );
  };

  useEffect(() => {
    dispatch({
      type: CreateLightEngineActionTypes.CENTRALIZED_TABLE_NAME_CHANGED,
      value: `rds_${rdsPipelineTask.source}`,
    });
  }, [rdsPipelineTask.source]);

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-wrapper" data-testid="test-create-rds">
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
              ingestLogType={ingestLogType}
              engineType={engineType}
              rdsTask={rdsPipelineTask}
              setISChanging={(status) => {
                setRDSIsChanging(status);
              }}
              manualRDSEmptyError={manualRDSEmptyError}
              autoRDSEmptyError={autoRDSEmptyError}
              changeCrossAccount={(id, accountInfo) => {
                setSubAccountRoleArn(
                  defaultStr(accountInfo?.subAccountRoleArn)
                );
                setRDSPipelineTask((prev: RDSTaskProps) => {
                  return {
                    ...prev,
                    logSourceAccountId: id,
                  };
                });
              }}
              manualChangeDBIdentifier={(dbIdentifier) => {
                setAutoRDSEmptyError(false);
                setManualRDSEmptyError(false);
                appDispatch(indexPrefixChanged(dbIdentifier.toLowerCase()));
                setRDSPipelineTask((prev: RDSTaskProps) => {
                  return {
                    ...prev,
                    source: dbIdentifier,
                    params: {
                      ...prev.params,
                      manualDBIdentifier: dbIdentifier,
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
                appDispatch(
                  indexPrefixChanged(rdsObj?.value?.toLowerCase() ?? "")
                );
                setRDSPipelineTask((prev: RDSTaskProps) => {
                  return {
                    ...prev,
                    source: defaultStr(rdsObj?.value),
                    params: {
                      ...prev.params,
                      rdsObj: rdsObj,
                      autoLogGroupPrefix: defaultStr(rdsObj?.description),
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
            />
          )}
          {curStep === 1 && (
            <>
              {isLightEngine ? (
                <ConfigLightEngine />
              ) : (
                <ConfigOpenSearch taskType={ServiceLogType.Amazon_RDS} />
              )}
            </>
          )}
          {curStep === 2 && !isLightEngine && (
            <div>
              <SelectLogProcessor supportOSI={false} />
            </div>
          )}
          {curStep === totalStep && (
            <div>
              <AlarmAndTags
                pipelineTask={rdsPipelineTask}
                osiParams={osiParams}
              />
            </div>
          )}
          <div className="button-action text-right">
            <Button
              data-testid="rds-cancel-button"
              btnType="text"
              onClick={() => {
                navigate("/log-pipeline/service-log/create");
              }}
            >
              {t("button.cancel")}
            </Button>
            {curStep > 0 && (
              <Button
                data-testid="rds-previous-button"
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
                data-testid="rds-next-button"
                disabled={isNextDisabled()}
                btnType="primary"
                onClick={() => {
                  if (curStep === 0) {
                    if (!validateRDSInput()) {
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
                data-testid="rds-create-button"
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

export default CreateRDS;
