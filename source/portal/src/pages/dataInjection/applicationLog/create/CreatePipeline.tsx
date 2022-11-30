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
import {
  BufferInput,
  BufferType,
  CreateAppPipelineMutationVariables,
  ErrorCode,
  Tag,
} from "API";
import { ActionType, AppStateProps } from "reducer/appReducer";
import { useDispatch, useSelector } from "react-redux";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { createAppPipeline } from "graphql/mutations";
import { AmplifyConfigType } from "types";
import { useTranslation } from "react-i18next";
import { checkIndexNameValidate } from "assets/js/utils";
import Swal from "sweetalert2";
import { CovertObjToParameterKeyValue } from "assets/js/applog";
import { OptionType } from "components/AutoComplete/autoComplete";
import { CompressionType, S3_BUFFER_PREFIX } from "assets/js/const";
export interface ApplicationLogType {
  openSearchId: string;
  warmEnable: boolean;
  coldEnable: boolean;
  aosParams: {
    coldLogTransition: string;
    domainName: string;
    engine: string;
    failedLogBucket: string;
    indexPrefix: string;
    logRetention: string;
    opensearchArn: string;
    opensearchEndpoint: string;
    replicaNumbers: string;
    shardNumbers: string;
    vpc: {
      privateSubnetIds: string;
      securityGroupId: string;
      vpcId: string;
    };
    warmLogTransition: string;
  };
  bufferType: string;
  kdsBufferParams: {
    enableAutoScaling: string;
    shardCount: string;
    minCapacity: string;
    maxCapacity: string;
  };
  s3BufferBucketObj: OptionType | null;
  s3BufferParams: {
    logBucketName: string;
    logBucketPrefix: string;
    defaultCmkArn: string;
    maxFileSize: string;
    uploadTimeout: string;
    compressionType: CompressionType | string;
  };
  mskBufferParams: {
    mskClusterName: string;
    mskClusterArn: string;
    mskBrokerServers: string;
    topic: string;
  };
  tags: Tag[];
  force: boolean;
}

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

  const DEFAULT_EMPTY_APP_LOG = {
    openSearchId: "",
    warmEnable: false,
    coldEnable: false,
    aosParams: {
      coldLogTransition: "",
      domainName: "",
      engine: "",
      failedLogBucket: amplifyConfig.default_logging_bucket,
      indexPrefix: "",
      logRetention: "",
      opensearchArn: "",
      opensearchEndpoint: "",
      replicaNumbers: "1",
      shardNumbers: "5",
      vpc: {
        privateSubnetIds: "",
        securityGroupId: "",
        vpcId: "",
      },
      warmLogTransition: "",
    },
    bufferType: BufferType.S3,
    kdsBufferParams: {
      enableAutoScaling: "false",
      shardCount: "1",
      minCapacity: "1",
      maxCapacity: "",
    },
    s3BufferBucketObj: {
      name: amplifyConfig.default_logging_bucket,
      value: amplifyConfig.default_logging_bucket,
    },
    s3BufferParams: {
      logBucketName: amplifyConfig.default_logging_bucket,
      logBucketPrefix: S3_BUFFER_PREFIX,
      defaultCmkArn: amplifyConfig.default_cmk_arn,
      maxFileSize: "50",
      uploadTimeout: "60",
      compressionType: CompressionType.Gzip,
    },
    mskBufferParams: {
      mskClusterName: "",
      mskClusterArn: "",
      mskBrokerServers: "",
      topic: "",
    },
    tags: [],
    force: false,
  };

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
  const [s3BucketEmptyError, setS3BucketEmptyError] = useState(false);
  const [s3PrefixError, setS3PrefixError] = useState(false);
  const [bufferSizeError, setBufferSizeError] = useState(false);
  const [bufferIntervalError, setBufferIntervalError] = useState(false);

  const checkIngestionInput = () => {
    // check index name empty
    if (!curApplicationLog.aosParams.indexPrefix) {
      setIndexEmptyError(true);
      setCurStep(0);
      return false;
    }
    // check index name format
    if (!checkIndexNameValidate(curApplicationLog.aosParams.indexPrefix)) {
      setIndexNameFormatError(true);
      setCurStep(0);
      return false;
    }

    // Check KDS Input when buffer type is KDS
    if (curApplicationLog.bufferType === BufferType.KDS) {
      if (
        curApplicationLog.kdsBufferParams.minCapacity === "" ||
        parseInt(curApplicationLog.kdsBufferParams.minCapacity) <= 0
      ) {
        setShardInvalidError(true);
        setCurStep(0);
        return false;
      }
      const intStartShardNum = parseInt(
        curApplicationLog.kdsBufferParams.minCapacity
      );
      const intMaxShardNum = parseInt(
        curApplicationLog.kdsBufferParams.maxCapacity
      );
      if (
        curApplicationLog.kdsBufferParams.enableAutoScaling === "true" &&
        (intMaxShardNum <= 0 ||
          Number.isNaN(intMaxShardNum) ||
          intMaxShardNum <= intStartShardNum)
      ) {
        setMaxShardInvalidError(true);
        setCurStep(0);
        return false;
      }
    }

    // Check S3 Input when buffer type is S3
    if (curApplicationLog.bufferType === BufferType.S3) {
      if (!curApplicationLog.s3BufferBucketObj) {
        setS3BucketEmptyError(true);
        return false;
      }

      if (
        curApplicationLog.s3BufferParams.logBucketPrefix &&
        curApplicationLog.s3BufferParams.logBucketPrefix.endsWith("/")
      ) {
        setS3PrefixError(true);
        return false;
      }

      if (
        parseInt(curApplicationLog.s3BufferParams.maxFileSize) < 1 ||
        parseInt(curApplicationLog.s3BufferParams.maxFileSize) > 50
      ) {
        setBufferSizeError(true);
        return false;
      }
      if (
        parseInt(curApplicationLog.s3BufferParams.uploadTimeout) < 1 ||
        parseInt(curApplicationLog.s3BufferParams.uploadTimeout) > 86400
      ) {
        setBufferIntervalError(true);
        return false;
      }
    }

    return true;
  };

  const checkOpenSearchInput = () => {
    // check number of shards
    if (parseInt(curApplicationLog.kdsBufferParams.shardCount) <= 0) {
      setShardsError(true);
      setCurStep(1);
      return false;
    }

    if (parseInt(curApplicationLog.aosParams.warmLogTransition) < 0) {
      setWarmLogInvalidError(true);
      setCurStep(1);
      return false;
    }
    if (parseInt(curApplicationLog.aosParams.coldLogTransition) < 0) {
      setColdLogInvalidError(true);
      setCurStep(1);
      return false;
    }
    if (parseInt(curApplicationLog.aosParams.logRetention) < 0) {
      setLogRetentionInvalidError(true);
      setCurStep(1);
      return false;
    }
    return true;
  };

  const confirmCreateApplicationLog = async (isForce = false) => {
    const tmpAOSParams = JSON.parse(
      JSON.stringify(curApplicationLog.aosParams)
    );

    // set aos lifecycle as number
    tmpAOSParams.warmLogTransition =
      parseInt(curApplicationLog.aosParams.warmLogTransition) || 0;
    tmpAOSParams.coldLogTransition =
      parseInt(curApplicationLog.aosParams.coldLogTransition) || 0;
    tmpAOSParams.logRetention =
      parseInt(curApplicationLog.aosParams.logRetention) || 0;

    // set shard number and replicas as number
    tmpAOSParams.shardNumbers =
      parseInt(curApplicationLog.aosParams.shardNumbers) || 0;
    tmpAOSParams.replicaNumbers =
      parseInt(curApplicationLog.aosParams.replicaNumbers) || 0;

    let bufferParams: BufferInput[] = [];

    if (curApplicationLog.bufferType === BufferType.KDS) {
      // Set Max Shard Number to a Number when not enable auto scaling
      if (curApplicationLog.kdsBufferParams.enableAutoScaling !== "true") {
        curApplicationLog.kdsBufferParams.maxCapacity =
          curApplicationLog.kdsBufferParams.minCapacity;
      }

      bufferParams = CovertObjToParameterKeyValue(
        curApplicationLog.kdsBufferParams
      );
    }

    if (curApplicationLog.bufferType === BufferType.S3) {
      bufferParams = CovertObjToParameterKeyValue(
        curApplicationLog.s3BufferParams
      );
    }

    const createAppLogParam: CreateAppPipelineMutationVariables = {
      bufferType: curApplicationLog.bufferType as BufferType,
      aosParams: tmpAOSParams,
      bufferParams: bufferParams,
      tags: curApplicationLog.tags,
      force: isForce,
    };
    console.info("createAppLogParam:", createAppLogParam);
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
                    setCurStep(step);
                  }}
                />
              </div>
              <div className="create-content m-w-1024">
                {curStep === 0 && (
                  <IngestSetting
                    applicationLog={curApplicationLog}
                    s3BucketEmptyError={s3BucketEmptyError}
                    s3PrefixError={s3PrefixError}
                    bufferSizeError={bufferSizeError}
                    bufferIntervalError={bufferIntervalError}
                    changeS3BufferBucket={(bucket) => {
                      setS3BucketEmptyError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          s3BufferBucketObj: bucket,
                          s3BufferParams: {
                            ...prev.s3BufferParams,
                            logBucketName: bucket?.value || "",
                          },
                        };
                      });
                    }}
                    changeS3BufferPrefix={(prefix) => {
                      setS3PrefixError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          s3BufferParams: {
                            ...prev.s3BufferParams,
                            logBucketPrefix: prefix,
                          },
                        };
                      });
                    }}
                    changeS3BufferBufferSize={(size) => {
                      setBufferSizeError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          s3BufferParams: {
                            ...prev.s3BufferParams,
                            maxFileSize: size,
                          },
                        };
                      });
                    }}
                    changeS3BufferTimeout={(timeout) => {
                      setBufferIntervalError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          s3BufferParams: {
                            ...prev.s3BufferParams,
                            uploadTimeout: timeout,
                          },
                        };
                      });
                    }}
                    changeS3CompressionType={(type) => {
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          s3BufferParams: {
                            ...prev.s3BufferParams,
                            compressionType: type,
                          },
                        };
                      });
                    }}
                    changeBufferType={(type) => {
                      setShardInvalidError(false);
                      setMaxShardInvalidError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          bufferType: type,
                        };
                      });
                    }}
                    changeIndexPrefix={(index) => {
                      setIndexEmptyError(false);
                      setIndexNameFormatError(false);
                      setIndexDuplicatedError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          aosParams: {
                            ...prev.aosParams,
                            indexPrefix: index,
                          },
                          s3BufferParams: {
                            ...prev.s3BufferParams,
                            logBucketPrefix: `AppLogs/${index}/year=%Y/month=%m/day=%d`,
                          },
                        };
                      });
                    }}
                    changeShardNumber={(shardNum) => {
                      setShardInvalidError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          kdsBufferParams: {
                            ...prev.kdsBufferParams,
                            shardCount: shardNum,
                            minCapacity: shardNum,
                          },
                        };
                      });
                    }}
                    changeMaxShardNum={(maxShardNum) => {
                      setMaxShardInvalidError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          kdsBufferParams: {
                            ...prev.kdsBufferParams,
                            maxCapacity: maxShardNum,
                          },
                        };
                      });
                    }}
                    changeEnableAS={(enableAS) => {
                      setMaxShardInvalidError(false);
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          kdsBufferParams: {
                            ...prev.kdsBufferParams,
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
                          aosParams: {
                            ...prev.aosParams,
                            shardNumbers: shards,
                          },
                        };
                      });
                    }}
                    changeReplicas={(replicas) => {
                      setCurApplicationLog((prev) => {
                        return {
                          ...prev,
                          aosParams: {
                            ...prev.aosParams,
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
                          aosParams: {
                            ...prev.aosParams,
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
                          aosParams: {
                            ...prev.aosParams,
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
                          aosParams: {
                            ...prev.aosParams,
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
                          aosParams: {
                            ...prev.aosParams,
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
