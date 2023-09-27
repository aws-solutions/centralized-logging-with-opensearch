/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CreateStep from "components/CreateStep";
import Alert from "components/Alert";
import Breadcrumb from "components/Breadcrumb";
import { appSyncRequestMutation, refineErrorMessage } from "assets/js/request";
import {
  createAppLogIngestion,
  createAppPipeline,
  createLogSource,
} from "graphql/mutations";
import {
  BufferType,
  CompressionType,
  CreateAppLogIngestionMutationVariables,
  CreateAppPipelineMutationVariables,
  CreateLogSourceMutationVariables,
  DomainDetails,
  EngineType,
  IngestionMode,
  LogSourceType,
  LogType,
  ErrorCode,
  AppPipeline,
  DomainStatusCheckType,
  DomainStatusCheckResponse,
} from "API";
import {
  WarmTransitionType,
  YesNo,
  AmplifyConfigType,
  ApplicationLogType,
} from "types";
import { OptionType } from "components/AutoComplete/autoComplete";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { ActionType, InfoBarTypes } from "reducer/appReducer";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { checkIndexNameValidate } from "assets/js/utils";
import Button from "components/Button";
import HeaderPanel from "components/HeaderPanel";
import { CompressionFormatSelector } from "./CompressionFormatSelector";
import { IngestionModeSelector } from "./IngestionModeSelector";
import { FilePathPrefixFilter } from "./FilePathPrefixFilter";
import { S3BucketSelector } from "./S3BucketSelector";
import { LogConfigSelector } from "../../common/LogConfigSelector";
import Tiles from "components/Tiles";
import ExtLink from "components/ExtLink";
import InfoSpan from "components/InfoSpan";
import SpecifyDomain from "../steps/SpecifyDomain";
import PagePanel from "components/PagePanel";
import { CovertObjToParameterKeyValue, ParamListToObj } from "assets/js/applog";
import CreateSampleDashboard from "../../common/CreateSampleDashboard";
import Swal from "sweetalert2";
import { Validator } from "pages/comps/Validator";
import { buildInitPipelineData } from "assets/js/init";
import AlarmAndTags from "pages/pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import { UnmodifiableLogConfigSelector } from "../../common/UnmodifiableLogConfigSelector";
import {
  CreateAlarmActionTypes,
  validateAalrmInput,
} from "reducer/createAlarm";
import { useAlarm } from "assets/js/hooks/useAlarm";
import { Dispatch } from "redux";

const AppLogCreateS3: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const state: AppPipeline | undefined = location.state;
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("applog:name"),
      link: "/log-pipeline/application-log",
    },
    {
      name: state?.pipelineId,
      link: "/log-pipeline/application-log/detail/" + state?.pipelineId,
    },
    { name: t("applog:logSourceDesc.s3.title") },
  ].filter((each) => each.name);

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const dispatch = useDispatch<Dispatch<Actions>>();

  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);

  const [curApplicationLog, setCurApplicationLog] =
    useState<ApplicationLogType>(buildInitPipelineData(amplifyConfig));
  const [warmLogInvalidError, setWarmLogInvalidError] = useState(false);
  const [coldLogInvalidError, setColdLogInvalidError] = useState(false);
  const [logRetentionInvalidError, setLogRetentionInvalidError] =
    useState(false);
  const [shardsError, setShardsError] = useState(false);
  const [coldMustLargeThanWarm, setColdMustLargeThanWarm] = useState(false);
  const [logRetentionMustThanColdAndWarm, setLogRetentionMustThanColdAndWarm] =
    useState(false);
  const [rolloverSizeError, setRolloverSizeError] = useState(false);

  const [currentBucket, setCurrentBucket] = useState<OptionType | null>(null);
  const [filePathPrefix, setFilePathPrefix] = useState("");
  const [ingestionMode, setIngestionMode] = useState("");
  const [compressionFormat, setCompressionFormat] = useState("");
  const [logConfigJSON, setLogConfigJSON] = useState("");
  const [shouldCreateDashboard, setShouldCreateDashboard] = useState<string>(
    YesNo.Yes
  );
  const [domainCheckStatus, setDomainCheckStatus] =
    useState<DomainStatusCheckResponse>();
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);

  const tags = useTags();
  const monitor = useAlarm();

  const bucketValidator = new Validator(() => {
    if (!currentBucket || !currentBucket.value) {
      throw new Error(t("error.bucketEmpty"));
    }
  });
  const filePathValidator = new Validator(() => {
    if (filePathPrefix.startsWith("/")) {
      throw new Error(t("error.filePathNotBegin"));
    }
    const parts = filePathPrefix.split("*");
    if (parts.length > 2) {
      throw new Error(t("error.filePathContainStar"));
    }
  });
  const logConfigValidator = new Validator(() => {
    if (!logConfigJSON) {
      throw new Error(t("applog:logSourceDesc.eks.step2.selectConfig"));
    }
  });
  const indexNameValidator = new Validator(() => {
    if (!curApplicationLog.aosParams.indexPrefix) {
      throw new Error(t("error.indexNameEmpty"));
    }
    if (!checkIndexNameValidate(curApplicationLog.aosParams.indexPrefix)) {
      throw new Error(t("error.invalidIndexName"));
    }
  });
  const openSearchInputValidator = new Validator(() => {
    // check number of shards
    if (parseInt(curApplicationLog.aosParams.shardNumbers) <= 0) {
      setShardsError(true);
      throw new Error();
    }

    if (parseInt(curApplicationLog.aosParams.warmLogTransition) < 0) {
      setWarmLogInvalidError(true);
      throw new Error();
    }
    if (parseInt(curApplicationLog.aosParams.coldLogTransition) < 0) {
      setColdLogInvalidError(true);
      throw new Error();
    }

    if (curApplicationLog.warmTransitionType === WarmTransitionType.BY_DAYS) {
      if (
        parseInt(curApplicationLog.aosParams.coldLogTransition) <
        parseInt(curApplicationLog.aosParams.warmLogTransition)
      ) {
        setColdMustLargeThanWarm(true);
        throw new Error();
      }
    }

    if (curApplicationLog.warmTransitionType === WarmTransitionType.BY_DAYS) {
      if (
        parseInt(curApplicationLog.aosParams.coldLogTransition) <
        parseInt(curApplicationLog.aosParams.warmLogTransition)
      ) {
        if (
          (curApplicationLog.warmEnable &&
            parseInt(curApplicationLog.aosParams.logRetention) <
              parseInt(curApplicationLog.aosParams.warmLogTransition)) ||
          (curApplicationLog.coldEnable &&
            parseInt(curApplicationLog.aosParams.logRetention) <
              parseInt(curApplicationLog.aosParams.coldLogTransition))
        ) {
          setLogRetentionMustThanColdAndWarm(true);
          throw new Error();
        }
      }
    } else {
      if (
        curApplicationLog.coldEnable &&
        parseInt(curApplicationLog.aosParams.logRetention) <
          parseInt(curApplicationLog.aosParams.coldLogTransition)
      ) {
        setLogRetentionMustThanColdAndWarm(true);
        throw new Error();
      }
    }

    if (parseInt(curApplicationLog.aosParams.logRetention) < 0) {
      setLogRetentionInvalidError(true);
      throw new Error();
    }

    // check rollover size
    if (
      curApplicationLog.enableRolloverByCapacity &&
      parseFloat(curApplicationLog.aosParams.rolloverSize) <= 0
    ) {
      setRolloverSizeError(true);
      throw new Error();
    }

    // Check domain connection status
    if (domainCheckStatus?.status !== DomainStatusCheckType.PASSED) {
      throw new Error();
    }

    return true;
  });

  useEffect(() => {
    if (currentBucket) {
      const [prefix, suffix] = filePathPrefix.split("*");
      setCurApplicationLog({
        ...curApplicationLog,
        s3BufferParams: {
          ...curApplicationLog.s3BufferParams,
          logBucketName: currentBucket.name,
          logBucketPrefix: prefix || "",
          logBucketSuffix: suffix || "",
        },
        s3BufferBucketObj: currentBucket,
      });
    }
  }, [currentBucket, filePathPrefix]);

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
    if (state) {
      setCompressionFormat(
        ParamListToObj(state.bufferParams as any).compressionType as string
      );
    }
  }, [state]);

  const stepComps = [
    {
      name: t("applog:logSourceDesc.s3.step1.naviTitle"),
      element: (
        <PagePanel title={t("applog:logSourceDesc.s3.step1.title")}>
          <HeaderPanel title={t("applog:logSourceDesc.s3.step1.panelName")}>
            <S3BucketSelector
              value={currentBucket}
              setValue={setCurrentBucket}
              validator={bucketValidator}
            />
            <FilePathPrefixFilter
              value={filePathPrefix}
              setValue={setFilePathPrefix}
              validator={filePathValidator}
            />
            <IngestionModeSelector
              value={ingestionMode}
              setValue={setIngestionMode}
            />
            <CompressionFormatSelector
              disabled={!!state}
              value={compressionFormat}
              setValue={(value) => {
                setCompressionFormat(value);
                setCurApplicationLog((prev: any) => {
                  return {
                    ...prev,
                    s3BufferParams: {
                      ...prev.s3BufferParams,
                      compressionType: value,
                    },
                  };
                });
              }}
            />
            <>
              {state && (
                <Alert
                  content={t(
                    "applog:logSourceDesc.s3.step1.alertCompressionType"
                  )}
                />
              )}
            </>
          </HeaderPanel>
        </PagePanel>
      ),
      validators: [bucketValidator, filePathValidator],
    },
    {
      name: t("applog:logSourceDesc.s3.step2.naviTitle"),
      element: (
        <PagePanel
          title={t("applog:logSourceDesc.s3.step2.title")}
          desc={state ? "" : t("applog:logSourceDesc.eks.step2.titleDesc")}
        >
          <HeaderPanel title={t("applog:logSourceDesc.s3.step2.panelName")}>
            {state ? (
              <UnmodifiableLogConfigSelector
                logType={LogSourceType.S3}
                configId={state.logConfigId ?? ""}
                configVersion={state.logConfigVersionNumber ?? 0}
                title={t("applog:logSourceDesc.s3.step2.logConfig")}
                desc={t("applog:logSourceDesc.s3.step2.logConfigDesc")}
                hideViewDetailButton
                hideRefreshButton
              />
            ) : (
              <LogConfigSelector
                logType={LogSourceType.S3}
                title={t("applog:logSourceDesc.s3.step2.logConfig")}
                desc={t("applog:logSourceDesc.s3.step2.logConfigDesc")}
                value={logConfigJSON}
                setValue={setLogConfigJSON}
                createNewLink="/resources/log-config/create"
                validator={logConfigValidator}
                forceLogConfig={undefined}
              />
            )}
            <>
              {!state && (
                <CreateSampleDashboard
                  createDashboard={shouldCreateDashboard}
                  logType={
                    logConfigJSON ? JSON.parse(logConfigJSON).logType : ""
                  }
                  changeSampleDashboard={(yesNo: string) => {
                    setShouldCreateDashboard(yesNo);
                  }}
                />
              )}
            </>
          </HeaderPanel>
        </PagePanel>
      ),
      validators: [logConfigValidator],
    },
    {
      name: t("applog:logSourceDesc.s3.step3.title"),
      disabled: true,
      validators: [],
      element: (
        <HeaderPanel title={t("applog:logSourceDesc.s3.step3.title")}>
          <>
            <p>
              {t("applog:logSourceDesc.s3.step3.desc")}{" "}
              <InfoSpan spanType={InfoBarTypes.PROCESSOR_TYPE} />
            </p>
            <Tiles
              value={""}
              items={[
                {
                  label: t("applog:logSourceDesc.s3.step3.lambda"),
                  description: t("applog:logSourceDesc.s3.step3.lambdaDesc"),
                  value: "lambda",
                },
                {
                  label: t("applog:logSourceDesc.s3.step3.osis"),
                  description: (
                    <>
                      {t("applog:logSourceDesc.s3.step3.osisDesc")}{" "}
                      <ExtLink to="">{t("learnMore")}</ExtLink>
                    </>
                  ),
                  value: "opensearch-ingestion-service",
                },
              ]}
            />
          </>
        </HeaderPanel>
      ),
    },
    {
      name: t("applog:logSourceDesc.s3.step4.naviTitle"),
      disabled: !!state,
      element: (
        <SpecifyDomain
          applicationLog={curApplicationLog}
          changeOpenSearchCluster={(cluster: DomainDetails | undefined) => {
            const NOT_SUPPORT_VERSION =
              cluster?.engine === EngineType.Elasticsearch ||
              parseFloat(cluster?.version || "") < 1.3;
            setCurApplicationLog((prev) => {
              return {
                ...prev,
                openSearchId: cluster?.id || "",
                warmEnable: cluster?.nodes?.warmEnabled || false,
                coldEnable: cluster?.nodes?.coldEnabled || false,
                rolloverSizeNotSupport: NOT_SUPPORT_VERSION,
                enableRolloverByCapacity: !NOT_SUPPORT_VERSION,
                aosParams: {
                  ...prev.aosParams,
                  rolloverSize: NOT_SUPPORT_VERSION ? "" : "30",
                  domainName: cluster?.domainName || "",
                  opensearchArn: cluster?.domainArn || "",
                  opensearchEndpoint: cluster?.endpoint || "",
                  engine: cluster?.engine || "",
                  vpc: {
                    privateSubnetIds: cluster?.vpc?.privateSubnetIds || "",
                    publicSubnetIds: cluster?.vpc?.publicSubnetIds || "",
                    securityGroupId: cluster?.vpc?.securityGroupId || "",
                    vpcId: cluster?.vpc?.vpcId || "",
                  },
                },
              };
            });
          }}
          changeWarnLogTransition={function (value: string): void {
            setWarmLogInvalidError(false);
            setCurApplicationLog((prev) => {
              return {
                ...prev,
                aosParams: {
                  ...prev.aosParams,
                  warmLogTransition: value,
                },
              };
            });
          }}
          changeColdLogTransition={function (value: string): void {
            setColdLogInvalidError(false);
            setColdMustLargeThanWarm(false);
            setCurApplicationLog((prev) => {
              return {
                ...prev,
                aosParams: {
                  ...prev.aosParams,
                  coldLogTransition: value,
                },
              };
            });
          }}
          changeLogRetention={function (value: string): void {
            setLogRetentionInvalidError(false);
            setLogRetentionMustThanColdAndWarm(false);
            setCurApplicationLog((prev) => {
              return {
                ...prev,
                aosParams: {
                  ...prev.aosParams,
                  logRetention: value,
                },
              };
            });
          }}
          changeLoadingDomain={(loading) => {
            setDomainListIsLoading(loading);
          }}
          changeShards={function (shards: string): void {
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
          changeReplicas={function (replicas: string): void {
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
          changeIndexSuffix={function (suffix: string): void {
            setCurApplicationLog((prev) => {
              return {
                ...prev,
                aosParams: {
                  ...prev.aosParams,
                  indexSuffix: suffix,
                },
              };
            });
          }}
          changeEnableRollover={function (enable: boolean): void {
            setRolloverSizeError(false);
            setCurApplicationLog((prev) => {
              return {
                ...prev,
                enableRolloverByCapacity: enable,
              };
            });
          }}
          changeRolloverSize={function (size: string): void {
            setRolloverSizeError(false);
            setCurApplicationLog((prev) => {
              return {
                ...prev,
                aosParams: {
                  ...prev.aosParams,
                  rolloverSize: size,
                },
              };
            });
          }}
          changeCompressionType={function (codec: string): void {
            setCurApplicationLog((prev) => {
              return {
                ...prev,
                aosParams: {
                  ...prev.aosParams,
                  codec: codec,
                },
              };
            });
          }}
          changeWarmSettings={function (type: string): void {
            setColdMustLargeThanWarm(false);
            setCurApplicationLog((prev) => {
              return {
                ...prev,
                warmTransitionType: type,
              };
            });
          }}
          onIndexNameChanged={(value) => {
            setCurApplicationLog((prev) => {
              return {
                ...prev,
                aosParams: {
                  ...prev.aosParams,
                  indexPrefix: value,
                },
              };
            });
          }}
          domainCheckedStatus={domainCheckStatus}
          changeOSDomainCheckStatus={(status) => {
            setCurApplicationLog((prev) => {
              return {
                ...prev,
                aosParams: {
                  ...prev.aosParams,
                  replicaNumbers: status.multiAZWithStandbyEnabled ? "2" : "1",
                },
              };
            });
            setDomainCheckStatus(status);
          }}
          esDomainEmptyError={false}
          warmLogInvalidError={warmLogInvalidError}
          coldLogInvalidError={coldLogInvalidError}
          logRetentionInvalidError={logRetentionInvalidError}
          shardsInvalidError={shardsError}
          coldMustLargeThanWarm={coldMustLargeThanWarm}
          logRetentionMustThanColdAndWarm={logRetentionMustThanColdAndWarm}
          rolloverSizeError={rolloverSizeError}
          indexNameError={indexNameValidator.error}
        />
      ),
      validators: [openSearchInputValidator, indexNameValidator],
    },
    {
      name: t("applog:logSourceDesc.s3.step5.naviTitle"),
      disabled: !!state,
      element: <AlarmAndTags applicationPipeline={curApplicationLog} />,
      validators: [],
    },
  ].filter((each) => !each.disabled);

  const confirmCreatePipeline = async (isForce = false) => {
    const p = {
      rolloverSize: curApplicationLog.enableRolloverByCapacity
        ? curApplicationLog.aosParams.rolloverSize + "gb"
        : "",
      warmLogTransition: (() => {
        const userInputWarmAge = curApplicationLog.aosParams.warmLogTransition;
        if (curApplicationLog.warmEnable && userInputWarmAge) {
          if (
            curApplicationLog.warmTransitionType ===
            WarmTransitionType.IMMEDIATELY
          ) {
            return "1s";
          } else if (userInputWarmAge !== "0") {
            return userInputWarmAge + "d";
          }
        }
        return "";
      })(),
      coldLogTransition: (() => {
        const userInputCodeAge = curApplicationLog.aosParams.coldLogTransition;
        if (
          curApplicationLog.coldEnable &&
          userInputCodeAge &&
          userInputCodeAge !== "0"
        ) {
          return userInputCodeAge + "d";
        }
        return "";
      })(),
      logRetention: (() => {
        const userInputRetainAge = curApplicationLog.aosParams.logRetention;
        if (userInputRetainAge && userInputRetainAge !== "0") {
          return userInputRetainAge + "d";
        }
        return "";
      })(),
    };

    try {
      setLoadingCreate(true);

      const sourceRes = await appSyncRequestMutation(createLogSource, {
        type: LogSourceType.S3,
        s3: {
          mode: IngestionMode[ingestionMode as keyof typeof IngestionMode],
          bucketName: currentBucket?.value,
          keyPrefix: curApplicationLog.s3BufferParams.logBucketPrefix,
          keySuffix: curApplicationLog.s3BufferParams.logBucketSuffix,
          compressionType:
            CompressionType[compressionFormat as keyof typeof CompressionType],
        },
      } as CreateLogSourceMutationVariables);

      console.log("Create log source", sourceRes);

      const isCreateIngestionOnly = state;
      if (isCreateIngestionOnly) {
        const ingestionRes = await appSyncRequestMutation(
          createAppLogIngestion,
          {
            sourceId: sourceRes.data.createLogSource,
            appPipelineId: state.pipelineId,
            logPath: "",
            autoAddPermission: false,
          } as CreateAppLogIngestionMutationVariables
        );
        console.log("ingestionRes", ingestionRes);
      } else {
        const logConfigObj = JSON.parse(logConfigJSON);
        const logConfigId = logConfigObj.id;
        const logConfigVersionNumber = logConfigObj.version;

        const createPipelineParams: CreateAppPipelineMutationVariables = {
          bufferType: BufferType.S3,
          aosParams: {
            ...(curApplicationLog.aosParams as any),
            ...p,
          },
          logConfigId: logConfigId,
          logConfigVersionNumber: parseInt(logConfigVersionNumber, 10),
          bufferParams: CovertObjToParameterKeyValue({
            ...Object.assign(curApplicationLog.s3BufferParams, {
              createDashboard: [LogType.Nginx, LogType.Apache].includes(
                logConfigObj.logType
              )
                ? shouldCreateDashboard
                : YesNo.No,
            }),
            isS3Source: true,
            compressionType: compressionFormat,
            EnableS3Notification:
              ingestionMode === IngestionMode.ONE_TIME ? "False" : "True",
          }),
          tags,
          monitor: monitor.monitor,
          force: isForce,
        };

        const createRes = await appSyncRequestMutation(
          createAppPipeline,
          createPipelineParams
        );
        console.info("createAppPipeline:", createRes);

        const ingestionRes = await appSyncRequestMutation(
          createAppLogIngestion,
          {
            sourceId: sourceRes.data.createLogSource,
            appPipelineId: createRes.data.createAppPipeline,
            tags,
            logPath: "",
            autoAddPermission: false,
          } as CreateAppLogIngestionMutationVariables
        );
        console.log("ingestionRes", ingestionRes);
      }

      setLoadingCreate(false);

      if (state) {
        navigate(-1);
      } else {
        navigate("/log-pipeline/application-log");
      }
    } catch (error: any) {
      const { errorCode, message } = refineErrorMessage(error.message);
      if (
        errorCode === ErrorCode.DUPLICATED_INDEX_PREFIX ||
        errorCode === ErrorCode.OVERLAP_INDEX_PREFIX
      ) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          cancelButtonColor: "#ec7211",
          showCancelButton: true,
          confirmButtonText: t("button.cancel") || "",
          cancelButtonText: t("button.changeIndex") || "",
          text:
            (errorCode === ErrorCode.DUPLICATED_INDEX_PREFIX
              ? t("applog:create.ingestSetting.duplicatedWithPrefix")
              : t("applog:create.ingestSetting.overlapWithPrefix")) +
            `(${message})`,
        }).then((result) => {
          if (result.isDismissed) {
            setCurrentStep(2);
          }
        });
      }
      if (
        errorCode === ErrorCode.DUPLICATED_WITH_INACTIVE_INDEX_PREFIX ||
        errorCode === ErrorCode.OVERLAP_WITH_INACTIVE_INDEX_PREFIX
      ) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          cancelButtonColor: "#ec7211",
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: t("button.cancel") || "",
          denyButtonText: t("button.forceCreate") || "",
          cancelButtonText: t("button.changeIndex") || "",
          text:
            (errorCode === ErrorCode.DUPLICATED_WITH_INACTIVE_INDEX_PREFIX
              ? t("applog:create.ingestSetting.duplicatedWithInvalidPrefix")
              : t("applog:create.ingestSetting.overlapWithInvalidPrefix")) +
            `(${message})`,
        }).then((result) => {
          if (result.isDismissed) {
            setCurrentStep(2);
          } else if (result.isDenied) {
            confirmCreatePipeline(true);
          }
        });
      }
      setLoadingCreate(false);
      console.error(error.message);
    }
  };

  const isNextDisabled = () => {
    return (
      domainListIsLoading ||
      (currentStep === 2 &&
        domainCheckStatus?.status !== DomainStatusCheckType.PASSED)
    );
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
                <CreateStep list={stepComps} activeIndex={currentStep} />
              </div>
              <div className="create-content">
                {stepComps[currentStep].element}
                <div className="button-action text-right">
                  <Button
                    btnType="text"
                    onClick={() => {
                      navigate("/log-pipeline/application-log");
                    }}
                  >
                    {t("button.cancel")}
                  </Button>
                  {currentStep > 0 && (
                    <Button
                      onClick={() => {
                        setCurrentStep(Math.max(currentStep - 1, 0));
                      }}
                    >
                      {t("button.previous")}
                    </Button>
                  )}
                  {currentStep < stepComps.length - 1 && (
                    <Button
                      disabled={isNextDisabled()}
                      btnType="primary"
                      onClick={() => {
                        if (
                          stepComps[currentStep].validators
                            .map((each) => each.validate())
                            .every(Boolean)
                        ) {
                          setCurrentStep(
                            Math.min(currentStep + 1, stepComps.length)
                          );
                        }
                      }}
                    >
                      {t("button.next")}
                    </Button>
                  )}
                  {currentStep === stepComps.length - 1 && (
                    <Button
                      loading={loadingCreate}
                      btnType="primary"
                      onClick={() => {
                        if (!validateAalrmInput(monitor)) {
                          dispatch({
                            type: CreateAlarmActionTypes.VALIDATE_ALARM_INPUT,
                          });
                          return;
                        }
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

export default AppLogCreateS3;
