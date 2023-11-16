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
import SpecifyOpenSearchCluster, {
  AOSInputValidRes,
  checkOpenSearchInput,
  covertParametersByKeyAndConditions,
} from "../common/SpecifyCluster";
import Button from "components/Button";

import Breadcrumb from "components/Breadcrumb";
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
import { appSyncRequestMutation } from "assets/js/request";
import { createServicePipeline } from "graphql/mutations";
import { OptionType } from "components/AutoComplete/autoComplete";
import { LAMBDA_TASK_GROUP_PREFIX, ServiceLogType } from "assets/js/const";

import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";

import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
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
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import { buildOSIParamsValue } from "assets/js/utils";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";

const EXCLUDE_PARAMS = [
  "esDomainId",
  "warmEnable",
  "coldEnable",
  "curLambdaObj",
  "kdsShardNumber",
  "kdsRetentionHours",
  "rolloverSizeNotSupport",
];
export interface LambdaTaskProps {
  type: ServiceType;
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  destinationType: string;
  params: {
    // [index: string]: string | any;
    engineType: string;
    esDomainId: string;
    warmEnable: boolean;
    coldEnable: boolean;
    curLambdaObj: OptionType | null;
    endpoint: string;
    domainName: string;
    logGroupNames: string;
    kdsShardNumber: string;
    kdsRetentionHours: string;
    indexPrefix: string;
    createDashboard: string;
    vpcId: string;
    subnetIds: string;
    securityGroupId: string;

    logBucketName: string;
    logBucketPrefix: string;
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
  monitor: MonitorInput;
}

const DEFAULT_LAMBDA_TASK_VALUE: LambdaTaskProps = {
  type: ServiceType.Lambda,
  source: "",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: DestinationType.CloudWatch,
  params: {
    engineType: "",
    esDomainId: "",
    warmEnable: false,
    coldEnable: false,
    curLambdaObj: null,
    endpoint: "",
    domainName: "",
    logGroupNames: "",
    kdsShardNumber: "",
    kdsRetentionHours: "",
    indexPrefix: "",
    createDashboard: YesNo.Yes,
    vpcId: "",
    subnetIds: "",
    securityGroupId: "",

    logBucketName: "",
    logBucketPrefix: "",
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

const CreateLambda: React.FC = () => {
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
    { name: t("servicelog:create.service.lambda") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const dispatch = useDispatch<Dispatch<Actions>>();

  const [lambdaPipelineTask, setLambdaPipelineTask] = useState<LambdaTaskProps>(
    DEFAULT_LAMBDA_TASK_VALUE
  );

  const [curStep, setCurStep] = useState(0);
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [lambdaEmptyError, setLambdaEmptyError] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);
  const [lambdaIsChanging, setLambdaIsChanging] = useState(false);

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

  const confirmCreatePipeline = async () => {
    console.info("lambdaPipelineTask:", lambdaPipelineTask);
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.Lambda;
    createPipelineParams.source = lambdaPipelineTask.source;
    createPipelineParams.target = lambdaPipelineTask.target;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      lambdaPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = lambdaPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);

    const tmpParamList: any = covertParametersByKeyAndConditions(
      lambdaPipelineTask,
      EXCLUDE_PARAMS
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
      lambdaIsChanging ||
      domainListIsLoading ||
      (curStep === 1 &&
        domainCheckStatus?.status !== DomainStatusCheckType.PASSED) ||
      osiParams.serviceAvailableCheckedLoading
    );
  };

  const validateStep1 = () => {
    if (!lambdaPipelineTask.params.domainName) {
      setEsDomainEmptyError(true);
      return false;
    } else {
      setEsDomainEmptyError(false);
    }
    const validRes = checkOpenSearchInput(lambdaPipelineTask);
    setAosInputValidRes(validRes);
    if (Object.values(validRes).indexOf(true) >= 0) {
      return false;
    }
    // Check domain connection status
    if (domainCheckStatus?.status !== DomainStatusCheckType.PASSED) {
      return false;
    }
    return true;
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
                      if (!lambdaPipelineTask.params.curLambdaObj) {
                        setLambdaEmptyError(true);
                        return;
                      }
                    }
                    if (curStep === 1) {
                      if (!lambdaPipelineTask.params.domainName) {
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
                    lambdaEmptyError={lambdaEmptyError}
                    setISChanging={(status) => {
                      setLambdaIsChanging(status);
                    }}
                    changeCrossAccount={(id) => {
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
                        return {
                          ...prev,
                          logSourceAccountId: id,
                        };
                      });
                    }}
                    changeLambdaBucket={(bucket, prefix) => {
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                    changeLambdaObj={(lambda) => {
                      console.info("changeLambdaObj:", lambda);
                      setLambdaEmptyError(false);
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
                        return {
                          ...prev,
                          source: lambda?.value || "",
                          params: {
                            ...prev.params,
                            logGroupNames:
                              LAMBDA_TASK_GROUP_PREFIX + (lambda?.value || ""),
                            curLambdaObj: lambda,
                            indexPrefix: lambda?.value?.toLowerCase() || "",
                          },
                        };
                      });
                    }}
                    lambdaTask={lambdaPipelineTask}
                  />
                )}
                {curStep === 1 && (
                  <SpecifyOpenSearchCluster
                    taskType={ServiceLogType.Amazon_Lambda}
                    pipelineTask={lambdaPipelineTask}
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                    <SelectLogProcessor supportOSI={false} />
                  </div>
                )}
                {curStep === 3 && (
                  <div>
                    <AlarmAndTags
                      pipelineTask={lambdaPipelineTask}
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
                          if (!lambdaPipelineTask.params.curLambdaObj) {
                            setLambdaEmptyError(true);
                            return;
                          }
                        }
                        if (curStep === 1) {
                          if (!validateStep1()) {
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

export default CreateLambda;
