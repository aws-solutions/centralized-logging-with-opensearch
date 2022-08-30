/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import CreateStep from "components/CreateStep";
import SpecifySettings from "./steps/SpecifySettings";
import SpecifyOpenSearchCluster, {
  AOSInputValidRes,
  checkOpenSearchInput,
} from "../common/SpecifyCluster";
import CreateTags from "../common/CreateTags";
import Button from "components/Button";

import Breadcrumb from "components/Breadcrumb";
import { appSyncRequestMutation } from "assets/js/request";
import { createServicePipeline } from "graphql/mutations";
import { ServiceType, Tag } from "API";
import { YesNo } from "types";
import { OptionType } from "components/AutoComplete/autoComplete";
import { CreateLogMethod, ServiceLogType } from "assets/js/const";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { AmplifyConfigType } from "types";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Alert } from "assets/js/alert";
import { splitStringToBucketAndPrefix } from "assets/js/utils";
import { IngestOption } from "./steps/IngestOptionSelect";

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
  "webACLType",
  "logSource",
];

const EXCLUDE_PARAMS_FULL = [
  ...EXCLUDE_PARAMS_COMMON,
  "webACLNames",
  "interval",
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
  tags: Tag[];
  arnId: string;
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
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
    daysToWarm: string;
    daysToCold: string;
    daysToRetain: string;
    shardNumbers: string;
    replicaNumbers: string;
    webACLNames: string;
    ingestOption: string;
    interval: string;
    webACLType: string;
    logSource: string;
  };
}

const DEFAULT_TASK_VALUE: WAFTaskProps = {
  type: ServiceType.WAF,
  source: "",
  target: "",
  arnId: "",
  tags: [],
  logSourceAccountId: "",
  logSourceRegion: "",
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
    daysToWarm: "0",
    daysToCold: "0",
    daysToRetain: "0",
    shardNumbers: "5",
    replicaNumbers: "1",
    webACLNames: "",
    ingestOption: IngestOption.SampledRequest,
    interval: "",
    webACLType: "",
    logSource: "",
  },
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
    (state: AppStateProps) => state.amplifyConfig
  );

  const [curStep, setCurStep] = useState(0);
  const history = useHistory();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [wafPipelineTask, setWAFPipelineTask] =
    useState<WAFTaskProps>(DEFAULT_TASK_VALUE);

  const [autoWAFEmptyError, setAutoWAFEmptyError] = useState(false);
  const [manualWebACLEmptyError, setManualWebACLEmptyError] = useState(false);
  const [manualWAFEmpryError, setManualWAFEmpryError] = useState(false);
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
  });

  const checkSampleScheduleValue = () => {
    // Check Sample Schedule Interval
    console.info(
      "wafPipelineTask.params.ingestOption === IngestOption.SampledRequest",
      wafPipelineTask.params.ingestOption === IngestOption.SampledRequest
    );
    console.info(
      "parseInt(wafPipelineTask.params.interval):",
      parseInt(wafPipelineTask.params.interval)
    );
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

  const confirmCreatePipeline = async () => {
    console.info("wafPipelineTask:", wafPipelineTask);
    const createPipelineParams: any = {};
    createPipelineParams.type =
      wafPipelineTask.params.ingestOption === IngestOption.SampledRequest
        ? ServiceType.WAFSampled
        : ServiceType.WAF;
    createPipelineParams.source = wafPipelineTask.source;
    createPipelineParams.target = wafPipelineTask.target;
    createPipelineParams.tags = wafPipelineTask.tags;
    createPipelineParams.logSourceAccountId =
      wafPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;

    const tmpParamList: any = [];
    if (wafPipelineTask.params.ingestOption === IngestOption.SampledRequest) {
      Object.keys(wafPipelineTask.params).forEach((key) => {
        console.info("key");
        if (EXCLUDE_PARAMS_SAMPLED.indexOf(key) < 0) {
          tmpParamList.push({
            parameterKey: key,
            parameterValue: (wafPipelineTask.params as any)?.[key] || "",
          });
        }
      });
    } else {
      Object.keys(wafPipelineTask.params).forEach((key) => {
        console.info("key");
        if (EXCLUDE_PARAMS_FULL.indexOf(key) < 0) {
          tmpParamList.push({
            parameterKey: key,
            parameterValue: (wafPipelineTask.params as any)?.[key] || "",
          });
        }
      });
    }

    if (wafPipelineTask.params.ingestOption === IngestOption.FullRequest) {
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
      history.push({
        pathname: "/log-pipeline/service-log",
      });
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  useEffect(() => {
    console.info("wafPipelineTask:", wafPipelineTask);
  }, [wafPipelineTask]);

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
                      name: t("servicelog:create.step.createTags"),
                    },
                  ]}
                  activeIndex={curStep}
                  selectStep={(step: number) => {
                    if (curStep === 0) {
                      if (nextStepDisable || wafISChanging) {
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
                      }
                      if (!checkSampleScheduleValue()) {
                        return;
                      }
                    }
                    if (curStep === 1) {
                      if (!wafPipelineTask.params.domainName) {
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
                    wafTask={wafPipelineTask}
                    setISChanging={(status) => {
                      setWAFISChanging(status);
                    }}
                    manualAclEmptyError={manualWebACLEmptyError}
                    manualWAFEmptyError={manualWAFEmpryError}
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
                      setWAFPipelineTask((prev: WAFTaskProps) => {
                        return {
                          ...prev,
                          source: webACLName,
                          params: {
                            ...prev.params,
                            webACLNames: webACLName,
                            manualBucketName: webACLName,
                            indexPrefix: webACLName,
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
                        },
                      });
                    }}
                    changeWAFObj={(wafObj) => {
                      setAutoWAFEmptyError(false);
                      console.info("wafObj:", wafObj);
                      setWAFPipelineTask((prev: WAFTaskProps) => {
                        return {
                          ...prev,
                          source: wafObj?.name || "",
                          arnId: wafObj?.value || "",
                          params: {
                            ...prev.params,
                            webACLNames: wafObj?.name || "",
                            indexPrefix: wafObj?.name || "",
                            wafObj: wafObj,
                            webACLType: wafObj?.description || "",
                            ingestOption: IngestOption.SampledRequest,
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
                  <SpecifyOpenSearchCluster
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
                      console.info("cluster:", cluster);
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
                          },
                        };
                      });
                    }}
                    changeSampleDashboard={(yesNo) => {
                      // setPiplineBucketPrefix(prefix);
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
                            daysToWarm: value,
                          },
                        };
                      });
                    }}
                    changeColdLogTransition={(value: string) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          coldLogInvalidError: false,
                        };
                      });
                      setWAFPipelineTask((prev: WAFTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            daysToCold: value,
                          },
                        };
                      });
                    }}
                    changeLogRetention={(value: string) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          logRetentionInvalidError: false,
                        };
                      });
                      setWAFPipelineTask((prev: WAFTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            daysToRetain: value,
                          },
                        };
                      });
                    }}
                  />
                )}
                {curStep === 2 && (
                  <CreateTags
                    pipelineTask={wafPipelineTask}
                    changeTags={(tags) => {
                      setWAFPipelineTask((prev: WAFTaskProps) => {
                        return { ...prev, tags: tags };
                      });
                    }}
                  />
                )}
                <div className="button-action text-right">
                  <Button
                    btnType="text"
                    onClick={() => {
                      history.push({
                        pathname: "/log-pipeline/service-log/create",
                      });
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

                  {curStep < 2 && (
                    <Button
                      // loading={autoCreating}
                      disabled={wafISChanging || domainListIsLoading}
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
                          }
                          if (!checkSampleScheduleValue()) {
                            return;
                          }
                        }
                        if (curStep === 1) {
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
                        }
                        setCurStep((curStep) => {
                          return curStep + 1 > 2 ? 2 : curStep + 1;
                        });
                      }}
                    >
                      {t("button.next")}
                    </Button>
                  )}
                  {curStep === 2 && (
                    <Button
                      loading={loadingCreate}
                      btnType="primary"
                      onClick={() => {
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

export default CreateWAF;
