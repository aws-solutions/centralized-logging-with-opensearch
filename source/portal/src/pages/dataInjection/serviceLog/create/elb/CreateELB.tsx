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
import { SupportPlugin, YesNo } from "types";
import { OptionType } from "components/AutoComplete/autoComplete";
import { CreateLogMethod, ServiceLogType } from "assets/js/const";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { AmplifyConfigType } from "types";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Alert } from "assets/js/alert";
import LogProcessing from "../common/LogProcessing";
import { splitStringToBucketAndPrefix } from "assets/js/utils";

const EXCLUDE_PARAMS = [
  "esDomainId",
  "elbObj",
  "taskType",
  "manualBucketELBPath",
  "manualBucketName",
  "warmEnable",
  "coldEnable",
  "needCreateLogging",
  "geoPlugin",
  "userAgentPlugin",
];
export interface ELBTaskProps {
  type: ServiceType;
  tags: Tag[];
  arnId: string;
  source: string;
  target: string;
  params: {
    // [index: string]: string | any;
    needCreateLogging: boolean;
    engineType: string;
    warmEnable: boolean;
    coldEnable: boolean;
    logBucketName: string;
    elbObj: OptionType | null;
    taskType: string;
    manualBucketELBPath: string;
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
    geoPlugin: boolean;
    userAgentPlugin: boolean;
    shardNumbers: string;
    replicaNumbers: string;
  };
}

const DEFAULT_TASK_VALUE: ELBTaskProps = {
  type: ServiceType.ELB,
  source: "",
  target: "",
  arnId: "",
  tags: [],
  params: {
    needCreateLogging: false,
    engineType: "",
    warmEnable: false,
    coldEnable: false,
    logBucketName: "",
    elbObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketELBPath: "",
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
    geoPlugin: false,
    userAgentPlugin: false,
    shardNumbers: "5",
    replicaNumbers: "1",
  },
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
    (state: AppStateProps) => state.amplifyConfig
  );

  const [curStep, setCurStep] = useState(0);
  const history = useHistory();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [elbPipelineTask, setELBPipelineTask] =
    useState<ELBTaskProps>(DEFAULT_TASK_VALUE);

  const [autoELBEmptyError, setAutoELBEmptyError] = useState(false);
  const [manualELBEmpryError, setManualELBEmpryError] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);

  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [elbISChanging, setELBISChanging] = useState(false);
  const [needEnableAccessLog, setNeedEnableAccessLog] = useState(false);
  // const [needAutoCreateLogging, setNeedAutoCreateLogging] = useState(false);
  // const [autoCreating, setAutoCreating] = useState(false);
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);
  const [aosInputValidRes, setAosInputValidRes] = useState<AOSInputValidRes>({
    shardsInvalidError: false,
    warmLogInvalidError: false,
    coldLogInvalidError: false,
    logRetentionInvalidError: false,
  });

  const confirmCreatePipeline = async () => {
    console.info("elbPipelineTask:", elbPipelineTask);
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.ELB;
    createPipelineParams.source = elbPipelineTask.source;
    createPipelineParams.target = elbPipelineTask.target;
    createPipelineParams.tags = elbPipelineTask.tags;
    // elbPipelineTask.params.
    const tmpParamList: any = [];
    Object.keys(elbPipelineTask.params).forEach((key) => {
      console.info("key");
      if (EXCLUDE_PARAMS.indexOf(key) < 0) {
        tmpParamList.push({
          parameterKey: key,
          parameterValue: (elbPipelineTask.params as any)?.[key] || "",
        });
      }
    });
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
      history.push({
        pathname: "/log-pipeline/service-log",
      });
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  useEffect(() => {
    console.info("elbPipelineTask:", elbPipelineTask);
  }, [elbPipelineTask]);

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
                      name: t("servicelog:create.step.specifyDomain"),
                    },
                    {
                      name: t("servicelog:create.step.createTags"),
                    },
                  ]}
                  activeIndex={curStep}
                  selectStep={(step: number) => {
                    if (curStep === 0) {
                      if (nextStepDisable || elbISChanging) {
                        return;
                      }
                      if (needEnableAccessLog) {
                        Alert(t("servicelog:elb.needEnableLogging"));
                        return;
                      }
                      if (
                        elbPipelineTask.params.taskType ===
                        CreateLogMethod.Automatic
                      ) {
                        if (!elbPipelineTask.params.elbObj) {
                          setAutoELBEmptyError(true);
                          return;
                        }
                      }
                      if (
                        elbPipelineTask.params.taskType ===
                        CreateLogMethod.Manual
                      ) {
                        if (!elbPipelineTask.params.logBucketName) {
                          setManualELBEmpryError(true);
                          return;
                        }
                      }
                    }
                    if (curStep === 2) {
                      if (!elbPipelineTask.params.domainName) {
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
                    elbTask={elbPipelineTask}
                    setISChanging={(status) => {
                      setELBISChanging(status);
                    }}
                    manualELBEmptyError={manualELBEmpryError}
                    autoELBEmptyError={autoELBEmptyError}
                    changeNeedEnableLogging={(need: boolean) => {
                      setNeedEnableAccessLog(need);
                    }}
                    manualChangeBucket={(srcBucketName) => {
                      setELBPipelineTask((prev: ELBTaskProps) => {
                        return {
                          ...prev,
                          source: srcBucketName,
                          params: {
                            ...prev.params,
                            manualBucketName: srcBucketName,
                            indexPrefix: srcBucketName,
                          },
                        };
                      });
                    }}
                    changeTaskType={(taskType) => {
                      console.info("taskType:", taskType);
                      setAutoELBEmptyError(false);
                      setManualELBEmpryError(false);
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
                        return {
                          ...prev,
                          source: elbObj?.name,
                          arnId: elbObj?.value,
                          params: {
                            ...prev.params,
                            indexPrefix: elbObj?.name,
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
                        elbPipelineTask.params.taskType ===
                        CreateLogMethod.Manual
                      ) {
                        setManualELBEmpryError(false);
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
                  <LogProcessing
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
                    pipelineTask={elbPipelineTask}
                  />
                )}
                {curStep === 2 && (
                  <SpecifyOpenSearchCluster
                    taskType={ServiceLogType.Amazon_ELB}
                    pipelineTask={elbPipelineTask}
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                      setELBPipelineTask((prev: ELBTaskProps) => {
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
                {curStep === 3 && (
                  <CreateTags
                    pipelineTask={elbPipelineTask}
                    changeTags={(tags) => {
                      setELBPipelineTask((prev: ELBTaskProps) => {
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

                  {curStep < 3 && (
                    <Button
                      // loading={autoCreating}
                      disabled={elbISChanging || domainListIsLoading}
                      btnType="primary"
                      onClick={() => {
                        if (curStep === 0) {
                          if (nextStepDisable) {
                            return;
                          }
                          if (needEnableAccessLog) {
                            Alert(t("servicelog:elb.needEnableLogging"));
                            return;
                          }
                          if (
                            elbPipelineTask.params.taskType ===
                            CreateLogMethod.Automatic
                          ) {
                            if (!elbPipelineTask.params.elbObj) {
                              setAutoELBEmptyError(true);
                              return;
                            }
                          }
                          if (
                            elbPipelineTask.params.taskType ===
                            CreateLogMethod.Manual
                          ) {
                            if (!elbPipelineTask.params.logBucketName) {
                              setManualELBEmpryError(true);
                              return;
                            }
                          }
                        }
                        if (curStep === 2) {
                          if (!elbPipelineTask.params.domainName) {
                            setEsDomainEmptyError(true);
                            return;
                          } else {
                            setEsDomainEmptyError(false);
                          }
                          const validRes =
                            checkOpenSearchInput(elbPipelineTask);
                          setAosInputValidRes(validRes);
                          if (Object.values(validRes).indexOf(true) >= 0) {
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

export default CreateELB;
