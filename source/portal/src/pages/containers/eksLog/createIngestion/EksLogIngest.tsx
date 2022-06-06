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
import Breadcrumb from "components/Breadcrumb";
import CreateStep from "components/CreateStep";
import SideMenu from "components/SideMenu";
import SpecifySettings from "./step/SpecifySettings";
import SpecifyLogConfig from "./step/SpecifyLogConfig";
import CreateTags from "./step/CreateTags";
import Button from "components/Button";
import { useHistory, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HelpPanel from "components/HelpPanel";
import { EKSClusterLogSource, LogSourceType, Tag } from "API";
import { ActionType, AppStateProps } from "reducer/appReducer";
import { useDispatch, useSelector } from "react-redux";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { getDomainDetails, getEKSClusterDetails } from "graphql/queries";
import { AmplifyConfigType, CreationMethod } from "types";
import LoadingText from "components/LoadingText";
import {
  createAppLogIngestion,
  createEKSClusterPodLogIngestion,
} from "graphql/mutations";
import { OptionType } from "components/AutoComplete/autoComplete";
import { checkIndexNameValidate } from "assets/js/utils";

interface MatchParams {
  id: string;
}

export interface EksIngestionPropsType {
  indexPrefixRequiredError?: boolean;
  indexPrefixFormatError?: boolean;
  shardNumFormatError?: boolean;
  maxShardNumFormatError?: boolean;
  warmTransError?: boolean;
  coldTransError?: boolean;
  retentionError?: boolean;
  shardsError?: boolean;
  pipelineRequiredError?: boolean;
  configRequiredError?: boolean;

  createMethod: string;
  existsPipeline: OptionType;
  warmEnable: boolean;
  coldEnable: boolean;
  confId: string;
  eksClusterId: string;
  aosParas: {
    opensearchArn: string;
    domainName: string;
    opensearchEndpoint: string;
    indexPrefix: string;
    warmLogTransition: string;
    coldLogTransition: string;
    logRetention: string;
    shardNumbers: string;
    replicaNumbers: string;
    engine: string;
    vpc: {
      privateSubnetIds: string;
      publicSubnetIds: string;
      securityGroupId: string;
      vpcId: string;
    };
  };
  kdsParas: {
    kdsArn: string;
    streamName: string;
    enableAutoScaling: boolean;
    startShardNumber: string;
    maxShardNumber: string;
    regionName: string;
  };
  tags: Tag[];
}

const EksLogIngest: React.FC = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const { id }: MatchParams = useParams();
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  const [loadingEKSData, setLoadingEKSData] = useState(false);
  const [curStep, setCurStep] = useState(0);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [curEksLogSource, setCurEksLogSource] = useState<
    EKSClusterLogSource | undefined
  >();

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("menu.eksLog"),
      link: "/containers/eks-log",
    },
    {
      name: curEksLogSource?.eksClusterName || "",
      link: "/containers/eks-log/detail/" + id,
    },
    {
      name: t("ekslog:ingest.ingest"),
    },
  ];

  const [eksIngestionInfo, setEksIngestionInfo] =
    useState<EksIngestionPropsType>({
      createMethod: CreationMethod.New,
      existsPipeline: {
        name: "",
        value: "",
      },
      warmEnable: false,
      coldEnable: false,
      confId: "",
      eksClusterId: "",
      aosParas: {
        opensearchArn: "",
        domainName: "",
        opensearchEndpoint: "",
        indexPrefix: "",
        warmLogTransition: "",
        coldLogTransition: "",
        logRetention: "",
        shardNumbers: "5",
        replicaNumbers: "1",
        engine: "",
        vpc: {
          privateSubnetIds: "",
          publicSubnetIds: "",
          securityGroupId: "",
          vpcId: "",
        },
      },
      kdsParas: {
        kdsArn: "",
        streamName: "",
        enableAutoScaling: false,
        startShardNumber: "",
        maxShardNumber: "",
        regionName: "",
      },
      tags: [],
    });

  const getEksLogById = async () => {
    try {
      setLoadingEKSData(true);
      const resEksData: any = await appSyncRequestQuery(getEKSClusterDetails, {
        eksClusterId: id,
      });
      const resAosData: any = await appSyncRequestQuery(getDomainDetails, {
        id: resEksData.data.getEKSClusterDetails.aosDomain.id,
      });
      const eksData = resEksData.data?.getEKSClusterDetails;
      const aosData = resAosData.data?.getDomainDetails;
      setCurEksLogSource(eksData);
      setEksIngestionInfo((prev) => {
        return {
          ...prev,
          eksClusterId: id,
          warmEnable: aosData?.nodes?.warmEnabled || false,
          coldEnable: aosData?.nodes?.coldEnabled || false,
          aosParas: {
            ...prev.aosParas,
            domainName: aosData?.domainName || "",
            opensearchArn: aosData?.domainArn || "",
            opensearchEndpoint: aosData?.endpoint || "",
            engine: aosData?.engine || "",
            vpc: {
              privateSubnetIds: aosData?.vpc?.privateSubnetIds || "",
              publicSubnetIds: aosData?.vpc?.publicSubnetIds || "",
              securityGroupId: aosData?.vpc?.securityGroupId || "",
              vpcId: aosData?.vpc?.vpcId || "",
            },
          },
        };
      });

      setLoadingEKSData(false);
    } catch (error) {
      setLoadingEKSData(false);
      console.error(error);
    }
  };

  // Check New Pipeline Ingestion Form Data Input
  const checkNewPipelineIngestionInput = () => {
    // check index name empty
    if (!eksIngestionInfo.aosParas.indexPrefix) {
      setEksIngestionInfo((prev) => {
        return {
          ...prev,
          indexPrefixRequiredError: true,
        };
      });
      setCurStep(0);
      return false;
    }
    // check index name format
    if (!checkIndexNameValidate(eksIngestionInfo.aosParas.indexPrefix)) {
      setEksIngestionInfo((prev) => {
        return {
          ...prev,
          indexPrefixFormatError: true,
        };
      });
      setCurStep(0);
      return;
    }
    if (
      eksIngestionInfo.kdsParas.startShardNumber === "" ||
      parseInt(eksIngestionInfo.kdsParas.startShardNumber) <= 0
    ) {
      setEksIngestionInfo((prev) => {
        return {
          ...prev,
          shardNumFormatError: true,
        };
      });
      setCurStep(0);
      return false;
    }
    const intStartShardNum = parseInt(
      eksIngestionInfo.kdsParas.startShardNumber
    );
    const intMaxShardNum = parseInt(eksIngestionInfo.kdsParas.maxShardNumber);
    if (
      eksIngestionInfo.kdsParas.enableAutoScaling &&
      (intMaxShardNum <= 0 ||
        Number.isNaN(intMaxShardNum) ||
        intMaxShardNum <= intStartShardNum)
    ) {
      setEksIngestionInfo((prev) => {
        return {
          ...prev,
          maxShardNumFormatError: true,
        };
      });
      setCurStep(0);
      return false;
    }

    // Check number of shard error
    if (parseInt(eksIngestionInfo.aosParas.shardNumbers) <= 0) {
      setEksIngestionInfo((prev) => {
        return {
          ...prev,
          shardsError: true,
        };
      });
      setCurStep(0);
      return false;
    }

    if (parseInt(eksIngestionInfo.aosParas.warmLogTransition) < 0) {
      setEksIngestionInfo((prev) => {
        return {
          ...prev,
          warmTransError: true,
        };
      });
      setCurStep(0);
      return false;
    }
    if (parseInt(eksIngestionInfo.aosParas.coldLogTransition) < 0) {
      setEksIngestionInfo((prev) => {
        return {
          ...prev,
          coldTransError: true,
        };
      });
      setCurStep(0);
      return false;
    }
    if (parseInt(eksIngestionInfo.aosParas.logRetention) < 0) {
      setEksIngestionInfo((prev) => {
        return {
          ...prev,
          retentionError: true,
        };
      });
      setCurStep(0);
      return false;
    }
    return true;
  };

  const confirmCreateEksLogIngestionWithPipeline = async () => {
    // set warm age and code age as number
    const createEKSLogParam = JSON.parse(JSON.stringify(eksIngestionInfo));
    createEKSLogParam.aosParas.warmLogTransition =
      parseInt(createEKSLogParam.aosParas.warmLogTransition) || 0;
    createEKSLogParam.aosParas.coldLogTransition =
      parseInt(createEKSLogParam.aosParas.coldLogTransition) || 0;
    createEKSLogParam.aosParas.logRetention =
      parseInt(createEKSLogParam.aosParas.logRetention) || 0;

    // set shard number and replicas as number
    createEKSLogParam.aosParas.shardNumbers =
      parseInt(createEKSLogParam.aosParas.shardNumbers) || 0;
    createEKSLogParam.aosParas.replicaNumbers =
      parseInt(createEKSLogParam.aosParas.replicaNumbers) || 0;

    // Add Default Failed Log Bucket
    createEKSLogParam.aosParas.failedLogBucket =
      amplifyConfig.default_logging_bucket;

    // format shardNumber as number
    createEKSLogParam.kdsParas.startShardNumber =
      parseInt(createEKSLogParam.kdsParas.startShardNumber) || 0;
    createEKSLogParam.kdsParas.maxShardNumber =
      parseInt(createEKSLogParam.kdsParas.maxShardNumber) || 0;
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createEKSClusterPodLogIngestion,
        createEKSLogParam
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      history.push({
        pathname: `/containers/eks-log/detail/${id}`,
      });
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  const confirmCreateEksLogIngestionWithExistsPipeline = async () => {
    const logIngestionParams = {
      sourceType: LogSourceType.EKSCluster,
      sourceIds: [eksIngestionInfo.eksClusterId],
      appPipelineId: eksIngestionInfo.existsPipeline.value,
      confId: eksIngestionInfo.confId,
      stackId: "",
      stackName: "",
      tags: eksIngestionInfo.tags,
    };
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createAppLogIngestion,
        logIngestionParams
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      history.push({
        pathname: `/containers/eks-log/detail/${id}`,
      });
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getEksLogById();
  }, []);

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  useEffect(() => {
    console.info("eksIngestionInfo:", eksIngestionInfo);
  }, [eksIngestionInfo]);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="lh-import-cluster">
            <Breadcrumb list={breadCrumbList} />

            {loadingEKSData ? (
              <LoadingText />
            ) : (
              <div className="create-wrapper">
                <div className="create-step">
                  <CreateStep
                    list={[
                      {
                        name: t("ekslog:ingest.step.specifyPipeline"),
                      },
                      {
                        name: t("ekslog:ingest.step.specifyConfig"),
                      },
                      {
                        name: t("ekslog:ingest.step.createTags"),
                      },
                    ]}
                    activeIndex={curStep}
                    selectStep={(step: number) => {
                      if (curStep === 0) {
                        if (
                          eksIngestionInfo.createMethod ===
                            CreationMethod.Exists &&
                          !checkNewPipelineIngestionInput()
                        ) {
                          return;
                        }
                        if (
                          eksIngestionInfo.createMethod ===
                            CreationMethod.Exists &&
                          !eksIngestionInfo.existsPipeline?.value
                        ) {
                          setEksIngestionInfo((prev) => {
                            return {
                              ...prev,
                              pipelineRequiredError: true,
                            };
                          });
                          return;
                        }
                      }
                      if (curStep === 1) {
                        if (!eksIngestionInfo.confId) {
                          setEksIngestionInfo((prev) => {
                            return {
                              ...prev,
                              configRequiredError: true,
                            };
                          });
                          return;
                        }
                      }
                      setCurStep(step);
                    }}
                  />
                </div>
                <div className="create-content m-w-1024">
                  {curStep === 0 && (
                    <SpecifySettings
                      eksIngestionInfo={eksIngestionInfo}
                      changeCreationMethod={(method) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            createMethod: method,
                            indexPrefixRequiredError: false,
                            indexPrefixFormatError: false,
                            shardNumFormatError: false,
                            maxShardNumFormatError: false,
                            warmTransError: false,
                            coldTransError: false,
                            retentionError: false,
                            pipelineRequiredError: false,
                          };
                        });
                      }}
                      changeIndexPrefix={(prefix: string) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            indexPrefixRequiredError: false,
                            indexPrefixFormatError: false,
                            aosParas: {
                              ...prev.aosParas,
                              indexPrefix: prefix,
                            },
                          };
                        });
                      }}
                      changeShards={(shards) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            shardsError: false,
                            aosParas: {
                              ...prev.aosParas,
                              shardNumbers: shards,
                            },
                          };
                        });
                      }}
                      changeReplicas={(replicas) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            aosParas: {
                              ...prev.aosParas,
                              replicaNumbers: replicas,
                            },
                          };
                        });
                      }}
                      changeStartShardNum={(num: string) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            shardNumFormatError: false,
                            kdsParas: {
                              ...prev.kdsParas,
                              startShardNumber: num,
                            },
                          };
                        });
                      }}
                      changeEnableAS={(enable: boolean) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            kdsParas: {
                              ...prev.kdsParas,
                              enableAutoScaling: enable,
                            },
                          };
                        });
                      }}
                      changeMaxShardNum={(num: string) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            maxShardNumFormatError: false,
                            kdsParas: {
                              ...prev.kdsParas,
                              maxShardNumber: num,
                            },
                          };
                        });
                      }}
                      changeWarmTransition={(warmTrans: string) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            warmTransError: false,
                            aosParas: {
                              ...prev.aosParas,
                              warmLogTransition: warmTrans,
                            },
                          };
                        });
                      }}
                      changeColdTransition={(coldTrans: string) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            coldTransError: false,
                            aosParas: {
                              ...prev.aosParas,
                              coldLogTransition: coldTrans,
                            },
                          };
                        });
                      }}
                      changeLogRetention={(retention: string) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            retentionError: false,
                            aosParas: {
                              ...prev.aosParas,
                              logRetention: retention,
                            },
                          };
                        });
                      }}
                      changeExistsPipeline={(pipeline) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            pipelineRequiredError: false,
                            existsPipeline: pipeline,
                          };
                        });
                      }}
                    />
                  )}
                  {curStep === 1 && (
                    <SpecifyLogConfig
                      eksIngestionInfo={eksIngestionInfo}
                      changeLogConfig={(confId) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            configRequiredError: false,
                            confId: confId,
                          };
                        });
                      }}
                    />
                  )}
                  {curStep === 2 && (
                    <CreateTags
                      eksIngestionInfo={eksIngestionInfo}
                      changeTags={(tags) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            tags: tags,
                          };
                        });
                      }}
                    />
                  )}
                  <div className="button-action text-right">
                    <Button
                      btnType="text"
                      onClick={() => {
                        history.push({
                          pathname: `/containers/eks-log/detail/${id}`,
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
                        btnType="primary"
                        onClick={() => {
                          if (curStep === 0) {
                            if (
                              eksIngestionInfo.createMethod ===
                                CreationMethod.New &&
                              !checkNewPipelineIngestionInput()
                            ) {
                              return;
                            }
                            if (
                              eksIngestionInfo.createMethod ===
                                CreationMethod.Exists &&
                              !eksIngestionInfo.existsPipeline?.value
                            ) {
                              setEksIngestionInfo((prev) => {
                                return {
                                  ...prev,
                                  pipelineRequiredError: true,
                                };
                              });
                              return;
                            }
                          }
                          if (curStep === 1) {
                            if (!eksIngestionInfo.confId) {
                              setEksIngestionInfo((prev) => {
                                return {
                                  ...prev,
                                  configRequiredError: true,
                                };
                              });
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
                          console.info("confirm to create");
                          if (
                            eksIngestionInfo.createMethod === CreationMethod.New
                          ) {
                            confirmCreateEksLogIngestionWithPipeline();
                          } else {
                            confirmCreateEksLogIngestionWithExistsPipeline();
                          }
                        }}
                      >
                        {t("button.create")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default EksLogIngest;
