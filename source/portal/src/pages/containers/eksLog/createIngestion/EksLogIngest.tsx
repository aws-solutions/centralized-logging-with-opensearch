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
import { EKSClusterLogSource, ErrorCode, LogSourceType, Tag } from "API";
import { ActionType, AppStateProps } from "reducer/appReducer";
import { useDispatch, useSelector } from "react-redux";
import {
  appSyncRequestMutation,
  appSyncRequestQuery,
  refineErrorMessage,
} from "assets/js/request";
import { getDomainDetails, getEKSClusterDetails } from "graphql/queries";
import { AmplifyConfigType, CreationMethod, YesNo } from "types";
import LoadingText from "components/LoadingText";
import {
  createAppLogIngestion,
  createEKSClusterPodLogWithoutDataBufferIngestion,
  upgradeAppPipeline,
} from "graphql/mutations";
import { OptionType } from "components/AutoComplete/autoComplete";
import { checkIndexNameValidate } from "assets/js/utils";
import Swal from "sweetalert2";
import Modal from "components/Modal";
import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";

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
  logPathEmptyError?: boolean;

  createMethod: string;
  existsPipeline: OptionType;
  warmEnable: boolean;
  coldEnable: boolean;
  confId: string;
  createDashboard: string;
  eksClusterId: string;
  logPath: string;
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
  const [indexDuplicatedError, setIndexDuplicatedError] = useState(false);
  const [curEksLogSource, setCurEksLogSource] = useState<
    EKSClusterLogSource | undefined
  >();
  const [openNotice, setOpenNotice] = useState(false);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);

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
      createDashboard: YesNo.Yes,
      eksClusterId: "",
      logPath: "",
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

  const confirmCreateEksLogIngestionWithPipeline = async (isForce = false) => {
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

    createEKSLogParam.force = isForce;
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createEKSClusterPodLogWithoutDataBufferIngestion,
        createEKSLogParam
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      history.push({
        pathname: `/containers/eks-log/detail/${id}`,
      });
    } catch (error: any) {
      const { errorCode, message } = refineErrorMessage(error.message);
      if (
        errorCode === ErrorCode.DuplicatedIndexPrefix ||
        errorCode === ErrorCode.OverlapIndexPrefix
      ) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          cancelButtonColor: "#ec7211",
          showCancelButton: true,
          confirmButtonText: t("button.cancel"),
          cancelButtonText: t("button.changeIndex"),
          text:
            (errorCode === ErrorCode.DuplicatedIndexPrefix
              ? t("applog:create.ingestSetting.duplicatedWithPrefix")
              : t("applog:create.ingestSetting.overlapWithPrefix")) +
            `(${message})`,
        }).then((result) => {
          if (result.isDismissed) {
            setCurStep(0);
            setIndexDuplicatedError(true);
          }
        });
      }
      if (
        errorCode === ErrorCode.DuplicatedWithInactiveIndexPrefix ||
        errorCode === ErrorCode.OverlapWithInactiveIndexPrefix
      ) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          cancelButtonColor: "#ec7211",
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: t("button.cancel"),
          denyButtonText: t("button.forceCreate"),
          cancelButtonText: t("button.changeIndex"),
          text:
            (errorCode === ErrorCode.DuplicatedWithInactiveIndexPrefix
              ? t("applog:create.ingestSetting.duplicatedWithInvalidPrefix")
              : t("applog:create.ingestSetting.overlapWithInvalidPrefix")) +
            `(${message})`,
        }).then((result) => {
          if (result.isDismissed) {
            setCurStep(0);
            setIndexDuplicatedError(true);
          } else if (result.isDenied) {
            confirmCreateEksLogIngestionWithPipeline(true);
          }
        });
      }
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
      logPath: eksIngestionInfo.logPath,
      createDashboard: eksIngestionInfo.createDashboard,
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
    } catch (error: any) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  const upgradePipelines = async () => {
    try {
      setLoadingUpgrade(true);
      const upgradeRes = await appSyncRequestMutation(upgradeAppPipeline, {
        ids: [eksIngestionInfo.existsPipeline.value],
      });
      console.info("upgradeRes:", upgradeRes);
      setLoadingUpgrade(false);
      setOpenNotice(false);
      setEksIngestionInfo((prev) => {
        return {
          ...prev,
          existsPipeline: {
            name: "",
            value: "",
          },
        };
      });
      getEksLogById();
    } catch (error) {
      setLoadingUpgrade(false);
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
                        if (!eksIngestionInfo.logPath) {
                          setEksIngestionInfo((prev) => {
                            return {
                              ...prev,
                              logPathEmptyError: true,
                            };
                          });
                          return;
                        }
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
                        setIndexDuplicatedError(false);
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
                        setIndexDuplicatedError(false);
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
                      indexDuplicatedError={indexDuplicatedError}
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
                      changeSampleDashboard={(yesNo) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            createDashboard: yesNo,
                          };
                        });
                      }}
                      changeLogConfPath={(path) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            logPathEmptyError: false,
                            logPath: path,
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
                            if (
                              eksIngestionInfo.createMethod ===
                                CreationMethod.Exists &&
                              !eksIngestionInfo.existsPipeline?.description &&
                              !eksIngestionInfo.existsPipeline?.ec2RoleArn
                            ) {
                              setOpenNotice(true);
                              return;
                            }
                          }
                          if (curStep === 1) {
                            if (!eksIngestionInfo.logPath) {
                              setEksIngestionInfo((prev) => {
                                return {
                                  ...prev,
                                  logPathEmptyError: true,
                                };
                              });
                              return;
                            }
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

      <Modal
        title={t("applog:detail.ingestion.upgradeNotice")}
        fullWidth={false}
        isOpen={openNotice}
        closeModal={() => {
          setOpenNotice(false);
        }}
        actions={
          <div className="button-action no-pb text-right">
            <Button
              btnType="text"
              onClick={() => {
                setOpenNotice(false);
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              loading={loadingUpgrade}
              btnType="primary"
              onClick={() => {
                upgradePipelines();
              }}
            >
              {t("button.upgrade")}
            </Button>
          </div>
        }
      >
        <div className="modal-content alert-content">
          <Alert
            noMargin
            type={AlertType.Error}
            content={
              <div>
                {t(
                  "applog:detail.ingestion.upgradeNoticeDescEKSExistsPipeline"
                )}
              </div>
            }
          />
        </div>
      </Modal>
    </div>
  );
};

export default EksLogIngest;
