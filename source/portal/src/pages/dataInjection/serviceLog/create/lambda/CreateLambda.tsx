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
import { ServiceType, Tag } from "API";
import { YesNo } from "types";
import { appSyncRequestMutation } from "assets/js/request";
import { createServicePipeline } from "graphql/mutations";
import { OptionType } from "components/AutoComplete/autoComplete";
import { LAMBDA_TASK_GROUP_PREFIX, ServiceLogType } from "assets/js/const";

import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";

import { AmplifyConfigType } from "types";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

const EXCLUDE_PARAMS = [
  "esDomainId",
  "warmEnable",
  "coldEnable",
  "curLambdaObj",
  "kdsShardNumber",
  "kdsRetentionHours",
];
export interface LambdaTaskProps {
  type: ServiceType;
  tags: Tag[];
  source: string;
  target: string;
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
    daysToWarm: string;
    daysToCold: string;
    daysToRetain: string;
    shardNumbers: string;
    replicaNumbers: string;
  };
}

const DEFAULT_LAMBDA_TASK_VALUE: LambdaTaskProps = {
  type: ServiceType.Lambda,
  tags: [],
  source: "",
  target: "",
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
    createDashboard: YesNo.No,
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
    (state: AppStateProps) => state.amplifyConfig
  );

  const [lambdaPipelineTask, setLambdaPipelineTask] = useState<LambdaTaskProps>(
    DEFAULT_LAMBDA_TASK_VALUE
  );

  const [curStep, setCurStep] = useState(0);
  const history = useHistory();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [lambdaEmptyError, setLambdaEmptyError] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);

  const [aosInputValidRes, setAosInputValidRes] = useState<AOSInputValidRes>({
    shardsInvalidError: false,
    warmLogInvalidError: false,
    coldLogInvalidError: false,
    logRetentionInvalidError: false,
  });

  const confirmCreatePipeline = async () => {
    console.info("lambdaPipelineTask:", lambdaPipelineTask);
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.Lambda;
    createPipelineParams.source = lambdaPipelineTask.source;
    createPipelineParams.target = lambdaPipelineTask.target;
    createPipelineParams.tags = lambdaPipelineTask.tags;
    // lambdaPipelineTask.params.
    const tmpParamList: any = [];
    Object.keys(lambdaPipelineTask.params).forEach((key) => {
      console.info("key");
      if (EXCLUDE_PARAMS.indexOf(key) < 0) {
        tmpParamList.push({
          parameterKey: key,
          parameterValue: (lambdaPipelineTask.params as any)?.[key] || "",
        });
      }
    });
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
      history.push({
        pathname: "/log-pipeline/service-log",
      });
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  useEffect(() => {
    console.info("lambdaPipelineTask:", lambdaPipelineTask);
  }, [lambdaPipelineTask]);

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
                    changeLambdaObj={(lambda) => {
                      console.info("changeLambdaObj:", lambda);
                      setLambdaEmptyError(false);
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
                        return {
                          ...prev,
                          source: lambda?.value,
                          params: {
                            ...prev.params,
                            logGroupNames:
                              LAMBDA_TASK_GROUP_PREFIX + (lambda?.value || ""),
                            curLambdaObj: lambda,
                            indexPrefix: lambda?.value || "",
                          },
                        };
                      });
                    }}
                    LambdaTask={lambdaPipelineTask}
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
                      // setPiplineBucketPrefix(prefix);
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
                          },
                        };
                      });
                    }}
                    changeSampleDashboard={(yesNo) => {
                      // setPiplineBucketPrefix(prefix);
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
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
                    pipelineTask={lambdaPipelineTask}
                    changeTags={(tags) => {
                      setLambdaPipelineTask((prev: LambdaTaskProps) => {
                        return { ...prev, tags: tags };
                      });
                    }}
                  />
                )}
                <div className="button-action text-right">
                  <Button
                    disabled={loadingCreate}
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

                  {curStep < 2 && (
                    <Button
                      disabled={domainListIsLoading}
                      btnType="primary"
                      onClick={() => {
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
                          const validRes =
                            checkOpenSearchInput(lambdaPipelineTask);
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

export default CreateLambda;
