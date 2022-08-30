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
import { Alert } from "assets/js/alert";
import { CreateLogMethod, ServiceLogType } from "assets/js/const";
import { appSyncRequestMutation } from "assets/js/request";
import Breadcrumb from "components/Breadcrumb";
import Button from "components/Button";
import CreateStep from "components/CreateStep";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { createServicePipeline } from "graphql/mutations";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { AppStateProps } from "reducer/appReducer";
import { AmplifyConfigType, YesNo } from "types";
import CreateTags from "../common/CreateTags";
import SpecifyOpenSearchCluster, {
  AOSInputValidRes,
  checkOpenSearchInput,
} from "../common/SpecifyCluster";
import SpecifySettings from "./steps/SpecifySettings";

const EXCLUDE_PARAMS = [
  "esDomainId",
  "warmEnable",
  "coldEnable",
  "manualBucketS3Path",
  "taskType",
];

export interface ConfigTaskProps {
  type: ServiceType;
  tags: Tag[];
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  params: {
    // [index: string]: string | any;
    engineType: string;
    esDomainId: string;
    warmEnable: boolean;
    coldEnable: boolean;
    taskType: string;
    logBucketName: string;
    logBucketPrefix: string;
    manualBucketS3Path: string;
    endpoint: string;
    domainName: string;
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
  };
}

const DEFAULT_CONFIG_TASK_VALUE: ConfigTaskProps = {
  type: ServiceType.Config,
  tags: [],
  source: "Default",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  params: {
    engineType: "",
    esDomainId: "",
    warmEnable: false,
    coldEnable: false,
    taskType: CreateLogMethod.Automatic,
    manualBucketS3Path: "",
    logBucketName: "",
    logBucketPrefix: "",
    endpoint: "",
    domainName: "",
    indexPrefix: "Default",
    createDashboard: YesNo.Yes,
    vpcId: "",
    subnetIds: "",
    securityGroupId: "",
    daysToWarm: "0",
    daysToCold: "0",
    daysToRetain: "0",
    shardNumbers: "5",
    replicaNumbers: "1",
  },
};

const CreateConfig: React.FC = () => {
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
    { name: t("servicelog:create.service.config") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const history = useHistory();

  const [configPipelineTask, setConfigPipelineTask] = useState<ConfigTaskProps>(
    DEFAULT_CONFIG_TASK_VALUE
  );
  const [curStep, setCurStep] = useState(0);
  const [nextStepDisable, setNextStepDisable] = useState(false);

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [configEmptyError, setConfigEmptyError] = useState(false);
  const [manualConfigEmptyError, setManualConfigEmptyError] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);

  const [domainListIsLoading, setDomainListIsLoading] = useState(false);
  const [aosInputValidRes, setAosInputValidRes] = useState<AOSInputValidRes>({
    shardsInvalidError: false,
    warmLogInvalidError: false,
    coldLogInvalidError: false,
    logRetentionInvalidError: false,
  });

  const confirmCreatePipeline = async () => {
    console.info("configPipelineTask:", configPipelineTask);
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.Config;
    createPipelineParams.source = configPipelineTask.source;
    createPipelineParams.target = configPipelineTask.target;
    createPipelineParams.tags = configPipelineTask.tags;
    createPipelineParams.logSourceAccountId =
      configPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;

    const tmpParamList: any = [];
    Object.keys(configPipelineTask.params).forEach((key) => {
      console.info("key");
      if (EXCLUDE_PARAMS.indexOf(key) < 0) {
        tmpParamList.push({
          parameterKey: key,
          parameterValue: (configPipelineTask.params as any)?.[key] || "",
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

  const isConfigSettingValid = () => {
    if (nextStepDisable) {
      return false;
    }
    if (!configPipelineTask.source) {
      setConfigEmptyError(true);
      return false;
    }
    if (!configPipelineTask.params.logBucketName) {
      if (configPipelineTask.params.taskType === CreateLogMethod.Manual) {
        setManualConfigEmptyError(true);
        return false;
      }
      Alert(t("servicelog:config.needEnableLogging"));
      console.error("need enablle aws config");
      return false;
    }
    return true;
  };

  const isClusterValid = () => {
    if (!configPipelineTask.params.domainName) {
      setEsDomainEmptyError(true);
      return false;
    } else {
      setEsDomainEmptyError(false);
    }
    const validRes = checkOpenSearchInput(configPipelineTask);
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
                    if (curStep === 0 && !isConfigSettingValid()) {
                      return;
                    }
                    if (curStep === 2 && !isClusterValid()) {
                      return;
                    }
                    setCurStep(step);
                  }}
                />
              </div>
              <div className="create-content m-w-800">
                {curStep === 0 && (
                  <SpecifySettings
                    configTask={configPipelineTask}
                    configEmptyError={configEmptyError}
                    manualConfigEmptyError={manualConfigEmptyError}
                    changeCrossAccount={(id) => {
                      setConfigPipelineTask((prev) => {
                        return {
                          ...prev,
                          logSourceAccountId: id,
                        };
                      });
                    }}
                    changeTaskType={(taskType) => {
                      console.info("taskType:", taskType);
                      setConfigEmptyError(false);
                      setManualConfigEmptyError(false);
                      setConfigPipelineTask({
                        ...DEFAULT_CONFIG_TASK_VALUE,
                        params: {
                          ...DEFAULT_CONFIG_TASK_VALUE.params,
                          taskType: taskType,
                        },
                      });
                    }}
                    changeConfigName={(name) => {
                      setConfigEmptyError(false);
                      setConfigPipelineTask((prev) => {
                        return {
                          ...prev,
                          source: name,
                          params: {
                            ...prev.params,
                            indexPrefix: name,
                          },
                        };
                      });
                    }}
                    changeManualBucketS3Path={(manualPath) => {
                      setManualConfigEmptyError(false);
                      setConfigPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            manualBucketS3Path: manualPath,
                          },
                        };
                      });
                    }}
                    changeLogBucket={(bucketName) => {
                      setConfigPipelineTask((prev) => {
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
                      setConfigPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            logBucketPrefix: prefix,
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
                    taskType={ServiceLogType.Amazon_Config}
                    pipelineTask={configPipelineTask}
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                    pipelineTask={configPipelineTask}
                    changeTags={(tags) => {
                      setConfigPipelineTask((prev: ConfigTaskProps) => {
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
                      disabled={domainListIsLoading || nextStepDisable}
                      btnType="primary"
                      onClick={() => {
                        if (curStep === 0 && !isConfigSettingValid()) {
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

export default CreateConfig;
