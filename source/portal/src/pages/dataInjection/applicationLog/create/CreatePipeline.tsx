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
import CreateStep from "components/CreateStep";
import IngestSetting from "./steps/IngestSetting";
import SpecifyDomain from "./steps/SpecifyDomain";
import CreateTags from "./steps/CreateTags";
import Button from "components/Button";
import Breadcrumb from "components/Breadcrumb";
import { appSyncRequestMutation, refineErrorMessage } from "assets/js/request";
import { useHistory } from "react-router-dom";
import { ErrorCode, Tag } from "API";
import { ActionType, AppStateProps } from "reducer/appReducer";
import { useDispatch, useSelector } from "react-redux";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { createAppPipeline } from "graphql/mutations";
import { AmplifyConfigType } from "types";
import { useTranslation } from "react-i18next";
import { checkIndexNameValidate } from "assets/js/utils";
import Swal from "sweetalert2";
export interface ApplicationLogType {
  warmEnable: boolean;
  coldEnable: boolean;
  openSearchId: string;
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

export const DEFAULT_EMPTY_APP_LOG = {
  openSearchId: "",
  warmEnable: false,
  coldEnable: false,
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
};

const ImportOpenSearchCluster: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("applog:name"),
      link: "/log-pipeline/application-log",
    },
    {
      name: t("applog:create.name"),
    },
  ];
  const history = useHistory();
  const dispatch = useDispatch();

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  const [curStep, setCurStep] = useState(0);
  const [curApplicationLog, setCurApplicationLog] =
    useState<ApplicationLogType>(DEFAULT_EMPTY_APP_LOG);

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [indexEmptyError, setIndexEmptyError] = useState(false);
  const [indexNameFormatError, setIndexNameFormatError] = useState(false);
  const [indexDuplicatedError, setIndexDuplicatedError] = useState(false);
  const [shardInvalidError, setShardInvalidError] = useState(false);
  const [maxShardInvalidError, setMaxShardInvalidError] = useState(false);
  const [warmLogInvalidError, setWarmLogInvalidError] = useState(false);
  const [coldLogInvalidError, setColdLogInvalidError] = useState(false);
  const [logRetentionInvalidError, setLogRetentionInvalidError] =
    useState(false);
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);
  const [shardsError, setShardsError] = useState(false);

  const checkIngestionInput = () => {
    // check index name empty
    if (!curApplicationLog.aosParas.indexPrefix) {
      setIndexEmptyError(true);
      setCurStep(0);
      return false;
    }
    // check index name format
    if (!checkIndexNameValidate(curApplicationLog.aosParas.indexPrefix)) {
      setIndexNameFormatError(true);
      setCurStep(0);
      return;
    }
    if (
      curApplicationLog.kdsParas.startShardNumber === "" ||
      parseInt(curApplicationLog.kdsParas.startShardNumber) <= 0
    ) {
      setShardInvalidError(true);
      setCurStep(0);
      return false;
    }
    const intStartShardNum = parseInt(
      curApplicationLog.kdsParas.startShardNumber
    );
    const intMaxShardNum = parseInt(curApplicationLog.kdsParas.maxShardNumber);
    if (
      curApplicationLog.kdsParas.enableAutoScaling &&
      (intMaxShardNum <= 0 ||
        Number.isNaN(intMaxShardNum) ||
        intMaxShardNum <= intStartShardNum)
    ) {
      setMaxShardInvalidError(true);
      setCurStep(0);
      return false;
    }
    return true;
  };

  const checkOpenSearchInput = () => {
    // check number of shards
    if (parseInt(curApplicationLog.aosParas.shardNumbers) <= 0) {
      setShardsError(true);
      setCurStep(1);
      return false;
    }

    if (parseInt(curApplicationLog.aosParas.warmLogTransition) < 0) {
      setWarmLogInvalidError(true);
      setCurStep(1);
      return false;
    }
    if (parseInt(curApplicationLog.aosParas.coldLogTransition) < 0) {
      setColdLogInvalidError(true);
      setCurStep(1);
      return false;
    }
    if (parseInt(curApplicationLog.aosParas.logRetention) < 0) {
      setLogRetentionInvalidError(true);
      setCurStep(1);
      return false;
    }
    return true;
  };

  const confirmCreateApplicationLog = async (isForce = false) => {
    // set warm age and code age as number
    const createAppLogParam = JSON.parse(JSON.stringify(curApplicationLog));
    createAppLogParam.aosParas.warmLogTransition =
      parseInt(createAppLogParam.aosParas.warmLogTransition) || 0;
    createAppLogParam.aosParas.coldLogTransition =
      parseInt(createAppLogParam.aosParas.coldLogTransition) || 0;
    createAppLogParam.aosParas.logRetention =
      parseInt(createAppLogParam.aosParas.logRetention) || 0;

    // set shard number and replicas as number
    createAppLogParam.aosParas.shardNumbers =
      parseInt(createAppLogParam.aosParas.shardNumbers) || 0;
    createAppLogParam.aosParas.replicaNumbers =
      parseInt(createAppLogParam.aosParas.replicaNumbers) || 0;

    // Add Default Failed Log Bucket
    createAppLogParam.aosParas.failedLogBucket =
      amplifyConfig.default_logging_bucket;

    // format shardNumber as number
    createAppLogParam.kdsParas.startShardNumber =
      parseInt(createAppLogParam.kdsParas.startShardNumber) || 0;
    createAppLogParam.kdsParas.maxShardNumber =
      parseInt(createAppLogParam.kdsParas.maxShardNumber) || 0;
    createAppLogParam.force = isForce;
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createAppPipeline,
        createAppLogParam
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      history.push({
        pathname: "/log-pipeline/application-log",
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
            confirmCreateApplicationLog(true);
          }
        });
      }
      setLoadingCreate(false);
      console.error(error.message);
    }
  };

  useEffect(() => {
    console.info("curApplicationLog:", curApplicationLog);
  }, [curApplicationLog]);

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="lh-import-cluster">
            <Breadcrumb list={breadCrumbList} />
            <div className="create-wrapper">
              <div className="create-step">
                <CreateStep
                  list={[
                    {
                      name: t("applog:create.step.ingestSetting"),
                    },
                    {
                      name: t("applog:create.step.specifyOS"),
                    },
                    {
                      name: t("applog:create.step.createTags"),
                    },
                  ]}
                  activeIndex={curStep}
                  selectStep={(step: number) => {
                    if (curStep === 0) {
                      if (!checkIngestionInput()) {
                        return;
                      }
                    }
                    if (curStep === 1) {
                      if (!checkOpenSearchInput()) {
                        return;
                      }
                    }
                    console.info("step:", step);
                    setCurStep(step);
                  }}
                />
              </div>
              <div className="create-content m-w-1024">
                {curStep === 0 && (
                  <IngestSetting
                    applicationLog={curApplicationLog}
                    changeIndexPrefix={(index) => {
                      setIndexEmptyError(false);
                      setIndexNameFormatError(false);
                      setIndexDuplicatedError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          aosParas: {
                            ...prev.aosParas,
                            indexPrefix: index,
                          },
                        };
                      });
                    }}
                    changeShardNumber={(shardNum) => {
                      setShardInvalidError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          kdsParas: {
                            ...prev.kdsParas,
                            startShardNumber: shardNum,
                          },
                        };
                      });
                    }}
                    changeMaxShardNum={(maxShardNum) => {
                      setMaxShardInvalidError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          kdsParas: {
                            ...prev.kdsParas,
                            maxShardNumber: maxShardNum,
                          },
                        };
                      });
                    }}
                    changeEnableAS={(enableAS) => {
                      setMaxShardInvalidError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          kdsParas: {
                            ...prev.kdsParas,
                            enableAutoScaling: enableAS,
                          },
                        };
                      });
                    }}
                    indexFormatError={indexNameFormatError}
                    indexEmptyError={indexEmptyError}
                    indexDuplicatedError={indexDuplicatedError}
                    shardNumInvalidError={shardInvalidError}
                    maxShardNumInvalidError={maxShardInvalidError}
                  />
                )}
                {curStep === 1 && (
                  <SpecifyDomain
                    applicationLog={curApplicationLog}
                    changeLoadingDomain={(loading) => {
                      setDomainListIsLoading(loading);
                    }}
                    changeShards={(shards) => {
                      setShardsError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          aosParas: {
                            ...prev.aosParas,
                            shardNumbers: shards,
                          },
                        };
                      });
                    }}
                    changeReplicas={(replicas) => {
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          aosParas: {
                            ...prev.aosParas,
                            replicaNumbers: replicas,
                          },
                        };
                      });
                    }}
                    changeOpenSearchCluster={(cluster) => {
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          openSearchId: cluster?.id || "",
                          warmEnable: cluster?.nodes?.warmEnabled || false,
                          coldEnable: cluster?.nodes?.coldEnabled || false,
                          aosParas: {
                            ...prev.aosParas,
                            domainName: cluster?.domainName || "",
                            opensearchArn: cluster?.domainArn || "",
                            opensearchEndpoint: cluster?.endpoint || "",
                            engine: cluster?.engine || "",
                            vpc: {
                              privateSubnetIds:
                                cluster?.vpc?.privateSubnetIds || "",
                              publicSubnetIds:
                                cluster?.vpc?.publicSubnetIds || "",
                              securityGroupId:
                                cluster?.vpc?.securityGroupId || "",
                              vpcId: cluster?.vpc?.vpcId || "",
                            },
                          },
                        };
                      });
                    }}
                    changeWarnLogTransition={(warnTrans) => {
                      setWarmLogInvalidError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          aosParas: {
                            ...prev.aosParas,
                            warmLogTransition: warnTrans,
                          },
                        };
                      });
                    }}
                    changeColdLogTransition={(coldTrans) => {
                      setColdLogInvalidError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          aosParas: {
                            ...prev.aosParas,
                            coldLogTransition: coldTrans,
                          },
                        };
                      });
                    }}
                    changeLogRetention={(retention) => {
                      setLogRetentionInvalidError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          aosParas: {
                            ...prev.aosParas,
                            logRetention: retention,
                          },
                        };
                      });
                    }}
                    esDomainEmptyError={false}
                    warmLogInvalidError={warmLogInvalidError}
                    coldLogInvalidError={coldLogInvalidError}
                    logRetentionInvalidError={logRetentionInvalidError}
                    shardsInvalidError={shardsError}
                  />
                )}
                {curStep === 2 && (
                  <CreateTags
                    importedCluster={curApplicationLog}
                    changeTags={(tags) => {
                      setCurApplicationLog((prev) => {
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
                        pathname: "/log-pipeline/application-log",
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
                      disabled={domainListIsLoading}
                      onClick={() => {
                        if (curStep === 0) {
                          if (!checkIngestionInput()) {
                            return;
                          }
                        }
                        if (curStep === 1) {
                          if (!checkOpenSearchInput()) {
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
                        confirmCreateApplicationLog();
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

export default ImportOpenSearchCluster;
