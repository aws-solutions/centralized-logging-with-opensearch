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
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreateStep from "components/CreateStep";
import SpecifySettings from "./steps/SpecifySettings";
import {
  AOSInputValidRes,
  SpecifyOSCluster,
  checkOpenSearchInput,
  covertParametersByKeyAndConditions,
} from "../common/SpecifyCluster";
import Button from "components/Button";

import Breadcrumb from "components/Breadcrumb";
import {
  Codec,
  DestinationType,
  ServiceType,
  MonitorInput,
  DomainStatusCheckType,
  DomainStatusCheckResponse,
} from "API";
import {
  WarmTransitionType,
  YesNo,
  SERVICE_LOG_INDEX_SUFFIX,
  AmplifyConfigType,
} from "types";
import { appSyncRequestMutation } from "assets/js/request";
import { createServicePipeline } from "graphql/mutations";
import { OptionType } from "components/AutoComplete/autoComplete";
import { CreateLogMethod, ServiceLogType } from "assets/js/const";

import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { SelectItem } from "components/Select/select";
import { Alert } from "assets/js/alert";
import { S3SourceType } from "./steps/comp/SourceType";
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
import {
  buildOSIParamsValue,
  splitStringToBucketAndPrefix,
} from "assets/js/utils";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  LogProcessorType,
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";

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
    engineType: string;
    esDomainId: string;
    warmEnable: boolean;
    coldEnable: boolean;
    curTrailObj: OptionType | null;
    logBucketName: string;
    logBucketPrefix: string;
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
    logSource: string;

    shardCount: string;
    minCapacity: string;
    enableAutoScaling: string;
    maxCapacity: string;

    logType: string;
    s3SourceType: string;
    successTextType: string;
    tmpFlowList: SelectItem[];

    rolloverSizeNotSupport: boolean;
  };
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
    engineType: "",
    manualBucketS3Path: "",
    esDomainId: "",
    warmEnable: false,
    coldEnable: false,
    curTrailObj: null,
    logBucketName: "",
    logBucketPrefix: "",
    endpoint: "",
    domainName: "",
    indexPrefix: "",
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
    logSource: "",

    shardCount: "1",
    minCapacity: "1",
    enableAutoScaling: YesNo.No,
    maxCapacity: "1",

    logType: ServiceType.CloudTrail,
    successTextType: "",
    s3SourceType: S3SourceType.NONE,
    tmpFlowList: [],

    rolloverSizeNotSupport: false,
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

  const [cloudTrailPipelineTask, setCloudTrailPipelineTask] =
    useState<CloudTrailTaskProps>(DEFAULT_TRAIL_TASK_VALUE);

  const [curStep, setCurStep] = useState(0);
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [trailEmptyError, setTrailEmptyError] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);
  const [sourceTypeEmptyError, setSourceTypeEmptyError] = useState(false);

  const [trailISChanging, setTrailISChanging] = useState(false);
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);

  const [shardNumError, setShardNumError] = useState(false);
  const [maxShardNumError, setMaxShardNumError] = useState(false);

  const [manualS3EmptyError, setManualS3EmptyError] = useState(false);
  const [manualCwlArnEmptyError, setManualCwlArnEmptyError] = useState(false);

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

  const aosSettingsValidate = () => {
    if (!cloudTrailPipelineTask.params.domainName) {
      setEsDomainEmptyError(true);
      return false;
    } else {
      setEsDomainEmptyError(false);
    }
    const validRes = checkOpenSearchInput(cloudTrailPipelineTask);
    setAosInputValidRes(validRes);
    if (Object.values(validRes).indexOf(true) >= 0) {
      return false;
    }
    return true;
  };

  const confirmCreatePipeline = async () => {
    console.info("cloudTrailPipelineTask:", cloudTrailPipelineTask);
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.CloudTrail;
    createPipelineParams.source = cloudTrailPipelineTask.source;
    createPipelineParams.target = cloudTrailPipelineTask.target;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      cloudTrailPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType =
      cloudTrailPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);

    // Set max capacity to min when auto scaling is false
    if (cloudTrailPipelineTask.params.enableAutoScaling === YesNo.No) {
      cloudTrailPipelineTask.params.maxCapacity =
        cloudTrailPipelineTask.params.minCapacity;
    }

    let tmpParamList: any = [];
    if (cloudTrailPipelineTask.destinationType === DestinationType.S3) {
      tmpParamList = covertParametersByKeyAndConditions(
        cloudTrailPipelineTask,
        S3_EXCLUDE_PARAMS
      );

      // Add defaultCmkArnParam
      tmpParamList.push({
        parameterKey: "defaultCmkArnParam",
        parameterValue: amplifyConfig.default_cmk_arn,
      });
    }

    if (cloudTrailPipelineTask.destinationType === DestinationType.CloudWatch) {
      tmpParamList = covertParametersByKeyAndConditions(
        cloudTrailPipelineTask,
        CWL_EXCLUDE_PARAMS
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

  const isNextDisabled = () => {
    return (
      trailISChanging ||
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
                  selectStep={(step: number) => {
                    if (curStep === 0) {
                      if (trailISChanging) {
                        return;
                      }
                      if (!cloudTrailPipelineTask.params.curTrailObj) {
                        setTrailEmptyError(true);
                        return;
                      }
                    }
                    if (curStep === 1) {
                      if (!cloudTrailPipelineTask.params.domainName) {
                        setEsDomainEmptyError(true);
                        return;
                      } else {
                        setEsDomainEmptyError(false);
                      }
                    }
                    setCurStep(step);
                  }}
                />
              </div>
              <div className="create-content m-w-800">
                {curStep === 0 && (
                  <SpecifySettings
                    setISChanging={(status) => {
                      setTrailISChanging(status);
                    }}
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
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setCloudTrailPipelineTask((prev: CloudTrailTaskProps) => {
                        return {
                          ...prev,
                          source: trail?.name || "",
                          destinationType: "",
                          params: {
                            ...prev.params,
                            curTrailObj: trail,
                            logBucketName: "",
                            logBucketPrefix: "",
                            indexPrefix: trail?.name?.toLowerCase() || "",
                            successTextType: "",
                          },
                        };
                      });
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
                  <SpecifyOSCluster<CloudTrailTaskProps>
                    taskType={ServiceLogType.Amazon_CloudTrail}
                    pipelineTask={cloudTrailPipelineTask}
                    setPipelineTask={setCloudTrailPipelineTask}
                    aosInputValidRes={aosInputValidRes}
                    setAosInputValidRes={setAosInputValidRes}
                    esDomainEmptyError={esDomainEmptyError}
                    setEsDomainEmptyError={setEsDomainEmptyError}
                    setDomainListIsLoading={setDomainListIsLoading}
                    domainCheckStatus={domainCheckStatus}
                    setDomainCheckStatus={setDomainCheckStatus}
                  />
                )}
                {curStep === 2 && (
                  <div>
                    <SelectLogProcessor
                      supportOSI={
                        !cloudTrailPipelineTask.logSourceAccountId &&
                        cloudTrailPipelineTask.destinationType ===
                          DestinationType.S3
                      }
                    />
                  </div>
                )}
                {curStep === 3 && (
                  <div>
                    <AlarmAndTags
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

                  {curStep < 3 && (
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
                          if (!aosSettingsValidate()) {
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

export default CreateCloudTrail;
