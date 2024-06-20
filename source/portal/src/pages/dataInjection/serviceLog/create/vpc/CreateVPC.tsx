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
import { DestinationType, ServiceType, MonitorInput } from "API";
import {
  CreateLogMethod,
  DOMAIN_ALLOW_STATUS,
  ServiceLogType,
} from "assets/js/const";
import { Alert } from "assets/js/alert";
import { OptionType } from "components/AutoComplete/autoComplete";
import Button from "components/Button";
import CreateStep from "components/CreateStep";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AmplifyConfigType, AnalyticEngineTypes, YesNo } from "types";
import SpecifySettings from "./steps/SpecifySettings";
import { useDispatch, useSelector } from "react-redux";
import { appSyncRequestMutation } from "assets/js/request";
import {
  createLightEngineServicePipeline,
  createServicePipeline,
} from "graphql/mutations";
import {
  bucketNameIsValid,
  buildLambdaConcurrency,
  buildOSIParamsValue,
  defaultStr,
  splitStringToBucketAndPrefix,
} from "assets/js/utils";
import { SelectItem } from "components/Select/select";
import { VPCLogSourceType } from "./steps/comp/SourceType";
import { MONITOR_ALARM_INIT_DATA } from "assets/js/init";
import AlarmAndTags from "../../../../pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import { Dispatch } from "redux";
import { useAlarm } from "assets/js/hooks/useAlarm";
import {
  CreateAlarmActionTypes,
  validateAlarmInput,
} from "reducer/createAlarm";
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
import ConfigOpenSearch from "../common/ConfigOpenSearch";
import { useOpenSearch } from "assets/js/hooks/useOpenSearch";
import { AppDispatch } from "reducer/store";
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

const BASE_EXCLUDE_PARAMS = [
  "vpcLogObj",
  "taskType",
  "manualBucketS3Path",
  "tmpFlowList",
  "vpcLogSourceType",
  "s3FLowList",
  "cwlFlowList",
  "vpcLogSourceType",
  "showSuccessTextType",
];

const S3_EXCLUDE_PARAMS = [
  ...BASE_EXCLUDE_PARAMS,
  "logSource",
  "logFormat",
  "logType",
  "minCapacity",
  "maxCapacity",
  "shardCount",
];
const CWL_EXCLUDE_PARAMS = [
  ...BASE_EXCLUDE_PARAMS,
  "logBucketName",
  "logBucketPrefix",
];

export interface VpcLogTaskProps {
  type: ServiceType;
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  destinationType: string;
  params: {
    logBucketName: string;
    vpcLogObj: OptionType | null;
    taskType: string;
    manualBucketS3Path: string;
    logBucketPrefix: string;
    s3FLowList: SelectItem[];
    cwlFlowList: SelectItem[];
    tmpFlowList: SelectItem[];
    vpcLogSourceType: string;
    showSuccessTextType: string;
    shardCount: string;
    minCapacity: string;
    enableAutoScaling: string;
    maxCapacity: string;
    logType: string;
    logSource: string;
    logFormat: string;
  } & OpenSearchState;
  monitor: MonitorInput;
}

const DEFAULT_TASK_VALUE: VpcLogTaskProps = {
  type: ServiceType.VPC,
  source: "",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: "",
  params: {
    logBucketName: "",
    vpcLogObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketS3Path: "",
    logBucketPrefix: "",
    s3FLowList: [],
    cwlFlowList: [],
    tmpFlowList: [],
    vpcLogSourceType: "",
    showSuccessTextType: "",
    shardCount: "1",
    minCapacity: "1",
    enableAutoScaling: YesNo.No,
    maxCapacity: "1",
    logType: "VPCFlow",
    logSource: "",
    logFormat: "",
    ...INIT_OPENSEARCH_DATA,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
};

const CreateVPCLog: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
    { name: t("servicelog:create.service.vpc") },
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

  const [curStep, setCurStep] = useState(0);
  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [vpcLogIsChanging, setVpcLogIsChanging] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);

  const [vpcLogPipelineTask, setVpcLogPipelineTask] =
    useState<VpcLogTaskProps>(DEFAULT_TASK_VALUE);

  const [autoVpcEmptyError, setAutoVpcEmptyError] = useState(false);
  const [manualVpcEmptyError, setManualVpcEmptyError] = useState(false);
  const [manualS3EmptyError, setManualS3EmptyError] = useState(false);
  const [manualS3PathInvalid, setManualS3PathInvalid] = useState(false);
  const [sourceTypeEmptyError, setSourceTypeEmptyError] = useState(false);
  const [vpcFlowLogEmptyError, setVpcFlowLogEmptyError] = useState(false);

  const [shardNumError, setShardNumError] = useState(false);
  const [maxShardNumError, setMaxShardNumError] = useState(false);

  const tags = useTags();
  const monitor = useAlarm();
  const osiParams = useSelectProcessor();
  const openSearch = useOpenSearch();
  const lightEngine = useLightEngine();
  const grafana = useGrafana();
  const appDispatch = useDispatch<AppDispatch>();

  const confirmCreateLightEnginePipeline = useCallback(async () => {
    const params = covertSvcTaskToLightEngine(vpcLogPipelineTask, lightEngine);
    const createPipelineParams = {
      ...params,
      type: ServiceType.VPC,
      tags,
      logSourceRegion: amplifyConfig.aws_project_region,
      logSourceAccountId: vpcLogPipelineTask.logSourceAccountId,
      source: vpcLogPipelineTask.source,
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
  }, [lightEngine, vpcLogPipelineTask, tags, monitor]);

  const confirmCreatePipeline = async () => {
    vpcLogPipelineTask.params = {
      ...vpcLogPipelineTask.params,
      ...openSearch,
    };
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.VPC;
    createPipelineParams.source = vpcLogPipelineTask.source;
    // Update domain name and engine type from openSearch
    createPipelineParams.target = openSearch.domainName;
    createPipelineParams.engine = openSearch.engineType;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      vpcLogPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = vpcLogPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);
    createPipelineParams.logProcessorConcurrency =
      buildLambdaConcurrency(osiParams);

    let tmpParamList: any = [];

    if (vpcLogPipelineTask.destinationType === DestinationType.S3) {
      tmpParamList = convertOpenSearchTaskParameters(
        vpcLogPipelineTask,
        S3_EXCLUDE_PARAMS,
        openSearch
      );

      // Add defaultCmkArnParam
      tmpParamList.push({
        parameterKey: "defaultCmkArnParam",
        parameterValue: amplifyConfig.default_cmk_arn,
      });
    }

    if (vpcLogPipelineTask.destinationType === DestinationType.CloudWatch) {
      tmpParamList = convertOpenSearchTaskParameters(
        vpcLogPipelineTask,
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

  const isLightEngineValid = useMemo(
    () => validateLightEngine(lightEngine, grafana),
    [lightEngine, grafana]
  );

  const isOpenSearchValid = useMemo(
    () => validateOpenSearchParams(openSearch),
    [openSearch]
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

  const checkVPCObjectAndSource = () => {
    if (vpcLogPipelineTask.params.taskType === CreateLogMethod.Automatic) {
      if (!vpcLogPipelineTask.params.vpcLogObj) {
        setAutoVpcEmptyError(true);
        return false;
      }
    }

    if (vpcLogPipelineTask.params.taskType === CreateLogMethod.Manual) {
      if (!vpcLogPipelineTask.source) {
        setManualVpcEmptyError(true);
        return false;
      }
    }

    // check source type
    if (!vpcLogPipelineTask.destinationType) {
      setSourceTypeEmptyError(true);
      return false;
    }

    return true;
  };

  const checkManualS3Params = () => {
    if (
      vpcLogPipelineTask.destinationType === DestinationType.S3 &&
      vpcLogPipelineTask.params.taskType === CreateLogMethod.Manual
    ) {
      // check manual s3 empty
      if (!vpcLogPipelineTask.params.manualBucketS3Path.trim()) {
        setManualS3EmptyError(true);
        return false;
      }
      // check manual s3 format invalid
      if (
        !vpcLogPipelineTask.params.manualBucketS3Path
          .toLowerCase()
          .startsWith("s3") ||
        !bucketNameIsValid(vpcLogPipelineTask.params.logBucketName)
      ) {
        setManualS3PathInvalid(true);
        return false;
      }
    }
    return true;
  };

  const checkCWLParams = () => {
    // check cwl log need logsource
    if (
      vpcLogPipelineTask.params.taskType === CreateLogMethod.Automatic &&
      vpcLogPipelineTask.destinationType === DestinationType.CloudWatch &&
      vpcLogPipelineTask.params.vpcLogSourceType === VPCLogSourceType.NONE &&
      !vpcLogPipelineTask.params.logSource
    ) {
      Alert(t("servicelog:vpc.needEnableLoggingCWL"));
      return false;
    }

    // check log source empty when flow log list length lager than 1
    if (
      vpcLogPipelineTask.params.taskType === CreateLogMethod.Automatic &&
      vpcLogPipelineTask.params.tmpFlowList.length > 1 &&
      !vpcLogPipelineTask.params.logSource
    ) {
      setVpcFlowLogEmptyError(true);
      return false;
    }
    return true;
  };

  const checkS3NeedBucket = () => {
    // check s3 log need bucket name
    if (
      (vpcLogPipelineTask.params.taskType === CreateLogMethod.Automatic &&
        vpcLogPipelineTask.params.vpcLogSourceType === VPCLogSourceType.NONE) ||
      ((vpcLogPipelineTask.params.vpcLogSourceType ===
        VPCLogSourceType.MULTI_S3_DIFF_REGION ||
        vpcLogPipelineTask.params.vpcLogSourceType ===
          VPCLogSourceType.ONE_S3_DIFF_REGION ||
        vpcLogPipelineTask.params.vpcLogSourceType === "") &&
        !vpcLogPipelineTask.params.logBucketName)
    ) {
      Alert(t("servicelog:vpc.needEnableLogging"));
      return false;
    }
    return true;
  };

  const checkManualS3Source = () => {
    // check manual log source empty
    if (vpcLogPipelineTask.params.taskType === CreateLogMethod.Manual) {
      if (
        vpcLogPipelineTask.destinationType === DestinationType.CloudWatch &&
        !vpcLogPipelineTask.params.logSource
      ) {
        setVpcFlowLogEmptyError(true);
        return false;
      }
    }
    return true;
  };

  const checkKDSSettings = () => {
    // check kds settings
    if (vpcLogPipelineTask.destinationType === DestinationType.CloudWatch) {
      // check min shard
      if (
        vpcLogPipelineTask.params.minCapacity === "" ||
        parseInt(vpcLogPipelineTask.params.minCapacity) < 1
      ) {
        setShardNumError(true);
        return false;
      }
      const intStartShardNum = parseInt(vpcLogPipelineTask.params.minCapacity);
      const intMaxShardNum = parseInt(vpcLogPipelineTask.params.maxCapacity);

      // check max shard
      if (
        vpcLogPipelineTask.params.enableAutoScaling === YesNo.Yes &&
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

  const isVpcSettingValid = () => {
    if (nextStepDisable) {
      return false;
    }
    if (!checkVPCObjectAndSource()) {
      return false;
    }
    if (!checkManualS3Params()) {
      return false;
    }
    if (!checkCWLParams()) {
      return false;
    }
    if (!checkS3NeedBucket()) {
      return false;
    }
    if (!checkManualS3Source()) {
      return false;
    }
    if (!checkKDSSettings()) {
      return false;
    }

    return true;
  };

  const isNextDisabled = () => {
    return (
      vpcLogIsChanging ||
      openSearch.domainLoading ||
      (curStep === 1 &&
        !isLightEngine &&
        !DOMAIN_ALLOW_STATUS.includes(
          openSearch.domainCheckedStatus?.status
        )) ||
      osiParams.serviceAvailableCheckedLoading
    );
  };

  useEffect(() => {
    dispatch({
      type: CreateLightEngineActionTypes.CENTRALIZED_TABLE_NAME_CHANGED,
      value: `vpc_${vpcLogPipelineTask.source}`,
    });
  }, [vpcLogPipelineTask.source]);

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-wrapper" data-testid="test-create-vpc">
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
              vpcLogTask={vpcLogPipelineTask}
              manualVpcEmptyError={manualVpcEmptyError}
              manualS3EmptyError={manualS3EmptyError}
              manualS3PathInvalid={manualS3PathInvalid}
              autoVpcEmptyError={autoVpcEmptyError}
              sourceTypeEmptyError={sourceTypeEmptyError}
              vpcFlowLogEmptyError={vpcFlowLogEmptyError}
              shardNumError={shardNumError}
              maxShardNumError={maxShardNumError}
              setISChanging={(status) => {
                setVpcLogIsChanging(status);
              }}
              changeCrossAccount={(id) => {
                setVpcLogPipelineTask((prev) => {
                  return {
                    ...prev,
                    logSourceAccountId: id,
                  };
                });
              }}
              changeTaskType={(taskType) => {
                setAutoVpcEmptyError(false);
                setManualVpcEmptyError(false);
                setVpcLogPipelineTask({
                  ...DEFAULT_TASK_VALUE,
                  params: {
                    ...DEFAULT_TASK_VALUE.params,
                    taskType: taskType,
                  },
                });
              }}
              changeVpcLogObj={(vpcLogObj) => {
                setAutoVpcEmptyError(false);
                setSourceTypeEmptyError(false);
                appDispatch(
                  indexPrefixChanged(vpcLogObj?.value?.toLowerCase() ?? "")
                );
                setVpcLogPipelineTask((prev) => {
                  return {
                    ...prev,
                    source: defaultStr(vpcLogObj?.value),
                    destinationType: "",
                    params: {
                      ...prev.params,
                      logBucketName: "",
                      logBucketPrefix: "",
                      vpcLogObj: vpcLogObj,
                      vpcLogSourceType: "",
                    },
                  };
                });
              }}
              changeLogBucket={(bucketName) => {
                setVpcLogPipelineTask((prev) => {
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
                setVpcLogPipelineTask((prev) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      logBucketPrefix: prefix,
                    },
                  };
                });
              }}
              changeManualS3={(manualPath) => {
                setManualS3EmptyError(false);
                setManualS3PathInvalid(false);
                const { bucket, prefix } =
                  splitStringToBucketAndPrefix(manualPath);
                setVpcLogPipelineTask((prev) => {
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
              setNextStepDisableStatus={(status) => {
                setNextStepDisable(status);
              }}
              changeSourceType={(type) => {
                setVpcFlowLogEmptyError(false);
                setSourceTypeEmptyError(false);
                // Update processor type to lambda when change buffer type
                dispatch({
                  type: SelectProcessorActionTypes.CHANGE_PROCESSOR_TYPE,
                  processorType: LogProcessorType.LAMBDA,
                });
                setVpcLogPipelineTask((prev) => {
                  return {
                    ...prev,
                    destinationType: type,
                    params: {
                      ...prev.params,
                      logSource: "",
                      logFormat: "",
                    },
                  };
                });
              }}
              changeVPCFLowLog={(flow) => {
                setVpcFlowLogEmptyError(false);
                setVpcLogPipelineTask((prev) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      logSource: flow,
                    },
                  };
                });
              }}
              changeS3FlowList={(list) => {
                setVpcLogPipelineTask((prev) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      s3FLowList: list,
                    },
                  };
                });
              }}
              changeCWLFlowList={(list) => {
                setVpcLogPipelineTask((prev) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      cwlFlowList: list,
                    },
                  };
                });
              }}
              changeTmpFlowList={(list) => {
                setVpcLogPipelineTask((prev) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      tmpFlowList: list,
                    },
                  };
                });
              }}
              changeVPCId={(vpcId) => {
                setManualVpcEmptyError(false);
                appDispatch(indexPrefixChanged(vpcId.toLowerCase()));
                setVpcLogPipelineTask((prev) => {
                  return {
                    ...prev,
                    source: vpcId,
                  };
                });
              }}
              changeLogFormat={(format) => {
                setVpcLogPipelineTask((prev) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      logFormat: format,
                    },
                  };
                });
              }}
              changeVpcLogSourceType={(type) => {
                setVpcLogPipelineTask((prev) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      vpcLogSourceType: type,
                    },
                  };
                });
              }}
              changeMinCapacity={(num) => {
                setShardNumError(false);
                setVpcLogPipelineTask((prev) => {
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
                setVpcLogPipelineTask((prev) => {
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
                setVpcLogPipelineTask((prev) => {
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
                <ConfigOpenSearch taskType={ServiceLogType.Amazon_VPCLogs} />
              )}
            </>
          )}
          {curStep === 2 && !isLightEngine && (
            <div>
              <SelectLogProcessor
                supportOSI={
                  !isLightEngine &&
                  !vpcLogPipelineTask.logSourceAccountId &&
                  vpcLogPipelineTask.destinationType === DestinationType.S3
                }
              />
            </div>
          )}
          {curStep === totalStep && (
            <div>
              <AlarmAndTags
                engineType={engineType}
                pipelineTask={vpcLogPipelineTask}
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
                disabled={isNextDisabled()}
                btnType="primary"
                onClick={() => {
                  if (curStep === 0 && !isVpcSettingValid()) {
                    return;
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

export default CreateVPCLog;
