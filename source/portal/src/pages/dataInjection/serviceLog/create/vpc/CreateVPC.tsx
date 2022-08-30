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
import { ServiceType, Tag } from "API";
import { CreateLogMethod, ServiceLogType } from "assets/js/const";
import { Alert } from "assets/js/alert";
import { OptionType } from "components/AutoComplete/autoComplete";
import Breadcrumb from "components/Breadcrumb";
import Button from "components/Button";
import CreateStep from "components/CreateStep";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { AmplifyConfigType, YesNo } from "types";
import CreateTags from "../common/CreateTags";
import SpecifyOpenSearchCluster, {
  AOSInputValidRes,
  checkOpenSearchInput,
} from "../common/SpecifyCluster";
import SpecifySettings from "./steps/SpecifySettings";
import { useSelector } from "react-redux";
import { AppStateProps } from "reducer/appReducer";
import { appSyncRequestMutation } from "assets/js/request";
import { createServicePipeline } from "graphql/mutations";

const EXCLUDE_PARAMS = [
  "esDomainId",
  "vpcLogObj",
  "taskType",
  "manualBucketS3Path",
  "manualBucketName",
  "warmEnable",
  "coldEnable",
  "geoPlugin",
  "userAgentPlugin",
];

export interface VpcLogTaskProps {
  type: ServiceType;
  tags: Tag[];
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  params: {
    engineType: string;
    warmEnable: boolean;
    coldEnable: boolean;
    logBucketName: string;
    vpcLogObj: OptionType | null;
    taskType: string;
    manualBucketS3Path: string;
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

const DEFAULT_TASK_VALUE: VpcLogTaskProps = {
  type: ServiceType.VPC,
  source: "",
  target: "",
  tags: [],
  logSourceAccountId: "",
  logSourceRegion: "",
  params: {
    engineType: "",
    warmEnable: false,
    coldEnable: false,
    logBucketName: "",
    vpcLogObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketS3Path: "",
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

const CreateVPCLog: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
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
    (state: AppStateProps) => state.amplifyConfig
  );

  const [curStep, setCurStep] = useState(0);
  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [vpcLogIsChanging, setVpcLogIsChanging] = useState(false);
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);

  const [vpcLogPipelineTask, setVpcLogPipelineTask] =
    useState<VpcLogTaskProps>(DEFAULT_TASK_VALUE);

  const [autoVpcEmptyError, setAutoVpcEmptyError] = useState(false);
  const [manualVpcEmptyError, setManualVpcEmptyError] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);

  const [aosInputValidRes, setAosInputValidRes] = useState<AOSInputValidRes>({
    shardsInvalidError: false,
    warmLogInvalidError: false,
    coldLogInvalidError: false,
    logRetentionInvalidError: false,
  });

  const confirmCreatePipeline = async () => {
    console.info("vpcLogPipelineTask:", vpcLogPipelineTask);
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.VPC;
    createPipelineParams.source = vpcLogPipelineTask.source;
    createPipelineParams.target = vpcLogPipelineTask.target;
    createPipelineParams.tags = vpcLogPipelineTask.tags;
    createPipelineParams.logSourceAccountId =
      vpcLogPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;

    const tmpParamList: any = [];
    Object.keys(vpcLogPipelineTask.params).forEach((key) => {
      console.info("key");
      if (EXCLUDE_PARAMS.indexOf(key) < 0) {
        tmpParamList.push({
          parameterKey: key,
          parameterValue: (vpcLogPipelineTask.params as any)?.[key] || "",
        });
      }
    });
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

  const isVpcSettingValid = () => {
    if (nextStepDisable) {
      return false;
    }
    if (vpcLogPipelineTask.params.taskType === CreateLogMethod.Automatic) {
      if (!vpcLogPipelineTask.params.vpcLogObj) {
        setAutoVpcEmptyError(true);
        return false;
      }
    }
    if (!vpcLogPipelineTask.params.logBucketName) {
      if (vpcLogPipelineTask.params.taskType === CreateLogMethod.Manual) {
        setManualVpcEmptyError(true);
        return false;
      }
      Alert(t("servicelog:vpc.needEnableLogging"));
      console.error("need enablle vpc log");
      return false;
    }
    return true;
  };

  const isClusterValid = () => {
    if (!vpcLogPipelineTask.params.domainName) {
      setEsDomainEmptyError(true);
      return false;
    } else {
      setEsDomainEmptyError(false);
    }
    const validRes = checkOpenSearchInput(vpcLogPipelineTask);
    setAosInputValidRes(validRes);
    if (Object.values(validRes).indexOf(true) >= 0) {
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
                      name: t("servicelog:create.step.createTags"),
                    },
                  ]}
                  activeIndex={curStep}
                  selectStep={(step: number) => {
                    if (curStep === 0 && !isVpcSettingValid()) {
                      return;
                    }
                    if (curStep === 1 && !isClusterValid()) {
                      return;
                    }
                    setCurStep(step);
                  }}
                />
              </div>
              <div className="create-content m-w-800">
                {curStep === 0 && (
                  <SpecifySettings
                    vpcLogTask={vpcLogPipelineTask}
                    manualVpcEmptyError={manualVpcEmptyError}
                    autoVpcEmptyError={autoVpcEmptyError}
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
                      console.info("taskType:", taskType);
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
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          source: vpcLogObj?.value || "",
                          params: {
                            ...prev.params,
                            indexPrefix: vpcLogObj?.value || "",
                            vpcLogObj: vpcLogObj,
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
                    changeManualBucketName={(manualName) => {
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          source: manualName,
                          params: {
                            ...prev.params,
                            manualBucketName: manualName,
                            indexPrefix: manualName,
                          },
                        };
                      });
                    }}
                    changeManualBucketS3Path={(manualPath) => {
                      setManualVpcEmptyError(false);
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            manualBucketS3Path: manualPath,
                          },
                        };
                      });
                    }}
                    setNextStepDisableStatus={(status) => {
                      setNextStepDisable(status);
                    }}
                  />
                )}
                {curStep === 1 && (
                  <SpecifyOpenSearchCluster
                    taskType={ServiceLogType.Amazon_VPCLogs}
                    pipelineTask={vpcLogPipelineTask}
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
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
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
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
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
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
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
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
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
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
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
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
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
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
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
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
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
                    pipelineTask={vpcLogPipelineTask}
                    changeTags={(tags) => {
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
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
                      disabled={vpcLogIsChanging || domainListIsLoading}
                      btnType="primary"
                      onClick={() => {
                        if (curStep === 0 && !isVpcSettingValid()) {
                          return;
                        }
                        if (curStep === 1 && !isClusterValid()) {
                          return;
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

export default CreateVPCLog;
