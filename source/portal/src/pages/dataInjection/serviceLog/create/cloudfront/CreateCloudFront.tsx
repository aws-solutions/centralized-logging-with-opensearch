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
import LogProcessing from "../common/LogProcessing";
import { splitStringToBucketAndPrefix } from "assets/js/utils";

const EXCLUDE_PARAMS = [
  "esDomainId",
  "cloudFrontObj",
  "taskType",
  "manualBucketS3Path",
  "manualBucketName",
  "warmEnable",
  "coldEnable",
  "geoPlugin",
  "userAgentPlugin",
];
export interface CloudFrontTaskProps {
  type: ServiceType;
  tags: Tag[];
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  params: {
    // [index: string]: string | any;
    engineType: string;
    warmEnable: boolean;
    coldEnable: boolean;
    logBucketName: string;
    cloudFrontObj: OptionType | null;
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

const DEFAULT_TASK_VALUE: CloudFrontTaskProps = {
  type: ServiceType.CloudFront,
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
    cloudFrontObj: null,
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

const CreateCloudFront: React.FC = () => {
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
    { name: t("servicelog:create.service.cloudfront") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  const [curStep, setCurStep] = useState(0);
  const history = useHistory();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [cloudFrontPipelineTask, setCloudFrontPipelineTask] =
    useState<CloudFrontTaskProps>(DEFAULT_TASK_VALUE);

  const [autoS3EmptyError, setAutoS3EmptyError] = useState(false);
  const [manualS3EmpryError, setManualS3EmpryError] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);

  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [cloudFrontIsChanging, setCloudFrontIsChanging] = useState(false);
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);

  const [aosInputValidRes, setAosInputValidRes] = useState<AOSInputValidRes>({
    shardsInvalidError: false,
    warmLogInvalidError: false,
    coldLogInvalidError: false,
    logRetentionInvalidError: false,
  });

  const confirmCreatePipeline = async () => {
    console.info("cloudFrontPipelineTask:", cloudFrontPipelineTask);
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.CloudFront;
    createPipelineParams.source = cloudFrontPipelineTask.source;
    createPipelineParams.target = cloudFrontPipelineTask.target;
    createPipelineParams.tags = cloudFrontPipelineTask.tags;
    createPipelineParams.logSourceAccountId =
      cloudFrontPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;

    const tmpParamList: any = [];
    Object.keys(cloudFrontPipelineTask.params).forEach((key) => {
      console.info("key");
      if (EXCLUDE_PARAMS.indexOf(key) < 0) {
        tmpParamList.push({
          parameterKey: key,
          parameterValue: (cloudFrontPipelineTask.params as any)?.[key] || "",
        });
      }
    });
    // Add Plugin in parameters
    const pluginList = [];
    if (cloudFrontPipelineTask.params.geoPlugin) {
      pluginList.push(SupportPlugin.Geo);
    }
    if (cloudFrontPipelineTask.params.userAgentPlugin) {
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
    console.info("cloudFrontPipelineTask:", cloudFrontPipelineTask);
  }, [cloudFrontPipelineTask]);

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
                      if (nextStepDisable || cloudFrontIsChanging) {
                        return;
                      }
                      if (
                        cloudFrontPipelineTask.params.taskType ===
                        CreateLogMethod.Automatic
                      ) {
                        if (!cloudFrontPipelineTask.params.cloudFrontObj) {
                          setAutoS3EmptyError(true);
                          return;
                        }
                      }
                      if (
                        cloudFrontPipelineTask.params.taskType ===
                        CreateLogMethod.Manual
                      ) {
                        if (!cloudFrontPipelineTask.params.logBucketName) {
                          setManualS3EmpryError(true);
                          return;
                        }
                      }
                    }
                    if (curStep === 2) {
                      if (!cloudFrontPipelineTask.params.domainName) {
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
                    cloudFrontTask={cloudFrontPipelineTask}
                    setISChanging={(status) => {
                      setCloudFrontIsChanging(status);
                    }}
                    manualS3EmptyError={manualS3EmpryError}
                    autoS3EmptyError={autoS3EmptyError}
                    changeCrossAccount={(id) => {
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          logSourceAccountId: id,
                        };
                      });
                    }}
                    manualChangeBucket={(srcBucketName) => {
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setAutoS3EmptyError(false);
                      setManualS3EmpryError(false);
                      setCloudFrontPipelineTask({
                        ...DEFAULT_TASK_VALUE,
                        params: {
                          ...DEFAULT_TASK_VALUE.params,
                          taskType: taskType,
                        },
                      });
                    }}
                    changeCloudFrontObj={(cloudFrontObj) => {
                      console.info("cloudFrontObj:", cloudFrontObj);
                      setAutoS3EmptyError(false);
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          source: cloudFrontObj?.value || "",
                          params: {
                            ...prev.params,
                            indexPrefix: cloudFrontObj?.value || "",
                            cloudFrontObj: cloudFrontObj,
                          },
                        };
                      });
                    }}
                    changeS3Bucket={(bucketName) => {
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
                        return {
                          ...prev,
                          // source: bucketName,
                          params: {
                            ...prev.params,
                            logBucketName: bucketName,
                            // indexPrefix: bucketName,
                          },
                        };
                      });
                    }}
                    changeLogPath={(logPath) => {
                      console.info("LOGPATH:", logPath);
                      if (
                        cloudFrontPipelineTask.params.taskType ===
                        CreateLogMethod.Manual
                      ) {
                        setManualS3EmpryError(false);
                        const { bucket, prefix } =
                          splitStringToBucketAndPrefix(logPath);
                        setCloudFrontPipelineTask(
                          (prev: CloudFrontTaskProps) => {
                            return {
                              ...prev,
                              params: {
                                ...prev.params,
                                manualBucketS3Path: logPath,
                                // indexPrefix: tmpLogBucket,
                                logBucketName: bucket,
                                logBucketPrefix: prefix,
                              },
                            };
                          }
                        );
                      } else {
                        setCloudFrontPipelineTask(
                          (prev: CloudFrontTaskProps) => {
                            return {
                              ...prev,
                              params: {
                                ...prev.params,
                                logBucketPrefix: logPath,
                              },
                            };
                          }
                        );
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
                        setCloudFrontPipelineTask(
                          (prev: CloudFrontTaskProps) => {
                            return {
                              ...prev,
                              params: {
                                ...prev.params,
                                geoPlugin: enable,
                              },
                            };
                          }
                        );
                      }
                      if (plugin === SupportPlugin.UserAgent) {
                        setCloudFrontPipelineTask(
                          (prev: CloudFrontTaskProps) => {
                            return {
                              ...prev,
                              params: {
                                ...prev.params,
                                userAgentPlugin: enable,
                              },
                            };
                          }
                        );
                      }
                    }}
                    pipelineTask={cloudFrontPipelineTask}
                  />
                )}
                {curStep === 2 && (
                  <SpecifyOpenSearchCluster
                    taskType={ServiceLogType.Amazon_CloudFront}
                    pipelineTask={cloudFrontPipelineTask}
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      // setPiplineBucketPrefix(prefix);
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                    pipelineTask={cloudFrontPipelineTask}
                    changeTags={(tags) => {
                      setCloudFrontPipelineTask((prev: CloudFrontTaskProps) => {
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
                      disabled={cloudFrontIsChanging || domainListIsLoading}
                      btnType="primary"
                      onClick={() => {
                        if (curStep === 0) {
                          if (nextStepDisable) {
                            return;
                          }
                          if (
                            cloudFrontPipelineTask.params.taskType ===
                            CreateLogMethod.Automatic
                          ) {
                            if (!cloudFrontPipelineTask.params.cloudFrontObj) {
                              setAutoS3EmptyError(true);
                              return;
                            }
                          }
                          if (
                            cloudFrontPipelineTask.params.taskType ===
                            CreateLogMethod.Manual
                          ) {
                            if (!cloudFrontPipelineTask.params.logBucketName) {
                              setManualS3EmpryError(true);
                              return;
                            }
                          }
                        }
                        if (curStep === 2) {
                          if (!cloudFrontPipelineTask.params.domainName) {
                            setEsDomainEmptyError(true);
                            return;
                          } else {
                            setEsDomainEmptyError(false);
                          }
                          const validRes = checkOpenSearchInput(
                            cloudFrontPipelineTask
                          );
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

export default CreateCloudFront;
