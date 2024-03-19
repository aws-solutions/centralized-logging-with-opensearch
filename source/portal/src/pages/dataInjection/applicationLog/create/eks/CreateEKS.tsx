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
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import CreateStep from "components/CreateStep";
import Breadcrumb from "components/Breadcrumb";
import {
  appSyncRequestMutation,
  appSyncRequestQuery,
  refineErrorMessage,
} from "assets/js/request";
import {
  createAppLogIngestion,
  createAppPipeline,
  createPipelineAlarm,
} from "graphql/mutations";
import {
  AppPipeline,
  BufferType,
  CreateAppLogIngestionMutationVariables,
  CreateAppPipelineMutationVariables,
  DomainDetails,
  EngineType,
  LogSourceType,
  LogType,
  Tag,
  PipelineAlarmStatus,
  EKSDeployKind,
  ErrorCode,
  PipelineType,
  CreatePipelineAlarmMutationVariables,
  DomainStatusCheckType,
  DomainStatusCheckResponse,
  CompressionType,
} from "API";
import {
  WarmTransitionType,
  YesNo,
  AmplifyConfigType,
  CreationMethod,
  ApplicationLogType,
} from "types";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { ActionType, InfoBarTypes } from "reducer/appReducer";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  buildOSIParamsValue,
  checkIndexNameValidate,
  defaultStr,
  hasSamePrefix,
} from "assets/js/utils";
import Button from "components/Button";
import HeaderPanel from "components/HeaderPanel";
import SpecifyDomain from "../steps/SpecifyDomain";
import PagePanel from "components/PagePanel";
import {
  ConfigValidateType,
  CovertObjToParameterKeyValue,
} from "assets/js/applog";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import ChooseBufferLayer from "../ec2/ChooseBufferLayer";
import { SelectItem } from "components/Select/select";
import StepChooseEKSSource from "./steps/StepChooseEKSSource";
import { LogConfigSelector } from "../../common/LogConfigSelector";
import LogPathInput from "../../common/LogPathInput";
import CreateSampleDashboard from "../../common/CreateSampleDashboard";
import { getAppPipeline, getLogSource } from "graphql/queries";
import Swal from "sweetalert2";
import IndexName from "../../common/IndexName";
import { Validator } from "pages/comps/Validator";
import { buildInitPipelineData } from "assets/js/init";
import AlarmAndTags from "pages/pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import { UnmodifiableLogConfigSelector } from "../../common/UnmodifiableLogConfigSelector";
import cloneDeep from "lodash.clonedeep";
import { useAlarm } from "assets/js/hooks/useAlarm";
import {
  CreateAlarmActionTypes,
  validateAalrmInput,
} from "reducer/createAlarm";
import { Dispatch } from "redux";
import { useLightEngine } from "assets/js/hooks/useLightEngine";
import { AnalyticEngineTypes } from "pages/dataInjection/serviceLog/create/common/SpecifyAnalyticsEngine";
import ConfigLightEngine from "pages/dataInjection/serviceLog/create/common/ConfigLightEngine";
import {
  CreateLightEngineActionTypes,
  validateLightEngine,
} from "reducer/createLightEngine";
import { createLightEngineApplicationPipeline } from "assets/js/helpers/lightEngineHelper";
import { useGrafana } from "assets/js/hooks/useGrafana";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import {
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import { DUPLICATE_OVERLAP_COMMON_SETTING } from "assets/js/const";

export interface IngestionFromEKSPropsType {
  eksObject: SelectItem | null;
  logSourceId: string;
  logConfigId: string;
  accountId: string;

  logConfigMethod: CreationMethod | string;
  curLogConfig: ExLogConf;
  logConfigError: ConfigValidateType;
  logPathEmptyError: boolean;
  showChooseExistsError: boolean;
  createDashboard: string;

  logPath: string;
  tags: Tag[];
}

const AppLogCreateEks: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const state = location.state;

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
    { name: t("applog:logSourceDesc.eks.title") },
  ].filter((each) => each.name);

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const dispatch = useDispatch<Dispatch<Actions>>();
  const [loadingCreate, setLoadingCreate] = useState(false);

  const [curApplicationLog, setCurApplicationLog] =
    useState<ApplicationLogType>(buildInitPipelineData(amplifyConfig));
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);
  const [warmLogInvalidError, setWarmLogInvalidError] = useState(false);
  const [coldLogInvalidError, setColdLogInvalidError] = useState(false);
  const [logRetentionInvalidError, setLogRetentionInvalidError] =
    useState(false);
  const [shardsError, setShardsError] = useState(false);
  const [coldMustLargeThanWarm, setColdMustLargeThanWarm] = useState(false);
  const [logRetentionMustThanColdAndWarm, setLogRetentionMustThanColdAndWarm] =
    useState(false);
  const [rolloverSizeError, setRolloverSizeError] = useState(false);
  const [shardInvalidError, setShardInvalidError] = useState(false);
  const [maxShardInvalidError, setMaxShardInvalidError] = useState(false);
  const [s3BucketEmptyError, setS3BucketEmptyError] = useState(false);
  const [s3PrefixError, setS3PrefixError] = useState(false);
  const [bufferSizeError, setBufferSizeError] = useState(false);
  const [bufferIntervalError, setBufferIntervalError] = useState(false);
  const [notConfirmNetworkError, setNotConfirmNetworkError] = useState(false);

  const [logConfigJSON, setLogConfigJSON] = useState("");
  const [shouldCreateDashboard, setShouldCreateDashboard] = useState<string>(
    YesNo.Yes
  );
  const tags = useTags();
  const monitor = useAlarm();
  const osiParams = useSelectProcessor();
  const lightEngine = useLightEngine();
  const grafana = useGrafana();
  const [searchParams] = useSearchParams();
  const engineType =
    (searchParams.get("engineType") as AnalyticEngineTypes | null) ??
    AnalyticEngineTypes.OPENSEARCH;
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );

  const [ingestionInfo, setIngestionInfo] = useState<IngestionFromEKSPropsType>(
    {
      eksObject: null,
      logSourceId: "",
      logConfigMethod: CreationMethod.New,
      curLogConfig: {
        __typename: "LogConfig",
        id: "",
        name: "",
        logType: null,
        multilineLogParser: null,
        createdAt: null,
        userSampleLog: "",
        userLogFormat: "",
        regex: "",
        regexFieldSpecs: [],
        filterConfigMap: {
          enabled: false,
          filters: [],
        },
      },
      logConfigError: {
        logConfigNameError: false,
        logConfigTypeError: false,
        showSampleLogRequiredError: false,
        showUserLogFormatError: false,
        showSampleLogInvalidError: false,
        showRegexLogParseError: false,
      },
      logPathEmptyError: false,
      showChooseExistsError: false,
      logConfigId: "",
      accountId: "",
      logPath: "",
      createDashboard: YesNo.Yes,
      tags: [],
    }
  );

  const [eksRequireError, setEksRequireError] = useState(false);
  const [domainCheckStatus, setDomainCheckStatus] =
    useState<DomainStatusCheckResponse>();

  const logPathValidator = new Validator(() => {
    console.info("ingestionInfo:", ingestionInfo);
    if (!ingestionInfo.logPath) {
      throw new Error(t("applog:ingestion.applyConfig.inputLogPath") || "");
    }

    // check esk sidecar path
    if (ingestionInfo.eksObject?.description === EKSDeployKind.Sidecar) {
      const multiPathArray = ingestionInfo.logPath?.split(",");
      if (multiPathArray.length > 1 && !hasSamePrefix(multiPathArray)) {
        throw new Error(t("error.sideCarPathInvalid") || "");
      }
    }

    if (!ingestionInfo.logPath.startsWith("/")) {
      throw new Error(
        t("applog:ingestion.applyConfig.logPathMustBeginWithSlash") || ""
      );
    }
  });

  const logSourceValidator = new Validator(() => {
    if (!ingestionInfo.eksObject) {
      throw new Error(t("error.eksEmpty"));
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

  const lightEngineValidator = new Validator(() => {
    if (!validateLightEngine(lightEngine, grafana)) {
      dispatch({
        type: CreateLightEngineActionTypes.VALIDATE_LIGHT_ENGINE,
      });
      throw new Error();
    }
  });

  const selectProcessorValidator = new Validator(() => {
    if (!validateOCUInput(osiParams)) {
      dispatch({
        type: SelectProcessorActionTypes.VALIDATE_OCU_INPUT,
      });
      throw new Error();
    }
  });

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  const bufferLayerValidator = new Validator(() => {
    // Check KDS Input when buffer type is KDS
    if (curApplicationLog.bufferType === BufferType.KDS) {
      if (
        curApplicationLog.kdsBufferParams.minCapacity === "" ||
        parseInt(curApplicationLog.kdsBufferParams.minCapacity) <= 0
      ) {
        setShardInvalidError(true);
        throw new Error();
      } else {
        setShardInvalidError(false);
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
        throw new Error();
      } else {
        setMaxShardInvalidError(false);
      }
    }

    // Check S3 Input when buffer type is S3
    if (curApplicationLog.bufferType === BufferType.S3) {
      if (!curApplicationLog.s3BufferBucketObj) {
        setS3BucketEmptyError(true);
        throw new Error();
      } else {
        setS3BucketEmptyError(false);
      }

      if (
        curApplicationLog.s3BufferParams.logBucketPrefix &&
        (curApplicationLog.s3BufferParams.logBucketPrefix === "/" ||
          !curApplicationLog.s3BufferParams.logBucketPrefix.endsWith("/"))
      ) {
        setS3PrefixError(true);
        throw new Error();
      } else {
        setS3PrefixError(false);
      }

      if (
        parseInt(curApplicationLog.s3BufferParams.maxFileSize) < 1 ||
        parseInt(curApplicationLog.s3BufferParams.maxFileSize) > 50
      ) {
        setBufferSizeError(true);
        throw new Error();
      } else {
        setBufferSizeError(false);
      }
      if (
        parseInt(curApplicationLog.s3BufferParams.uploadTimeout) < 1 ||
        parseInt(curApplicationLog.s3BufferParams.uploadTimeout) > 86400
      ) {
        setBufferIntervalError(true);
        throw new Error();
      } else {
        setBufferIntervalError(false);
      }
    }

    // Check networking requirement when buffer type is None
    if (curApplicationLog.bufferType === BufferType.None) {
      if (!curApplicationLog.confirmNetworkChecked) {
        setNotConfirmNetworkError(true);
        throw new Error();
      } else {
        setNotConfirmNetworkError(false);
      }
    }
  });

  const stepComps = [
    {
      name: t("applog:logSourceDesc.eks.step1.naviTitle"),
      element: (
        <PagePanel
          title={t("applog:logSourceDesc.eks.step1.title")}
          desc={t("applog:logSourceDesc.eks.step1.titleDesc")}
        >
          <StepChooseEKSSource
            ingestionInfo={ingestionInfo}
            changeEKSObject={(eks) => {
              setEksRequireError(false);
              setIngestionInfo((prev) => {
                return {
                  ...prev,
                  logSourceId: eks?.id || "",
                  eksObject: eks,
                };
              });
            }}
            changeCurAccount={(id, account) => {
              setIngestionInfo((prev) => {
                return {
                  ...prev,
                  accountId: id,
                  subAccountLinkId: account?.id || "",
                  subAccountVpcId: account?.subAccountVpcId || "",
                  subAccountPublicSubnetIds:
                    account?.subAccountPublicSubnetIds || "",
                };
              });
            }}
            eksRequireError={eksRequireError}
          />
        </PagePanel>
      ),
      validators: [logSourceValidator],
    },
    {
      name: t("applog:logSourceDesc.eks.step2.naviTitle"),
      disabled: !!state,
      element: (
        <PagePanel
          title={t("applog:logSourceDesc.eks.step2.title")}
          desc={state ? "" : t("applog:logSourceDesc.eks.step2.titleDesc")}
        >
          <HeaderPanel title={t("resource:config.common.logPath")}>
            <LogPathInput
              value={ingestionInfo.logPath}
              setValue={(value) => {
                setIngestionInfo((prev) => {
                  return {
                    ...prev,
                    logPath: value as string,
                  };
                });
              }}
              logSourceType={LogSourceType.EKSCluster}
              validator={logPathValidator}
            />
          </HeaderPanel>
          <HeaderPanel title={t("applog:logSourceDesc.eks.step2.panelName")}>
            <LogConfigSelector
              title={t("applog:logSourceDesc.eks.step2.logConfig")}
              desc={t("applog:logSourceDesc.eks.step2.logConfigDesc")}
              value={logConfigJSON}
              setValue={setLogConfigJSON}
              createNewLink="/resources/log-config/create"
              validator={logConfigValidator}
            />
            <>
              {!isLightEngine && (
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
      validators: [logConfigValidator, logPathValidator],
    },
    {
      name: t("applog:logSourceDesc.eks.step2.naviTitle"),
      disabled: !state,
      element: (
        <PagePanel
          title={t("applog:logSourceDesc.eks.step2.title")}
          desc={t("")}
        >
          <HeaderPanel title={t("resource:config.common.logPath")}>
            <LogPathInput
              value={ingestionInfo.logPath}
              setValue={(value) => {
                setIngestionInfo((prev) => {
                  return {
                    ...prev,
                    logPath: value as string,
                  };
                });
              }}
              logSourceType={LogSourceType.EKSCluster}
              validator={logPathValidator}
            />
          </HeaderPanel>
          <HeaderPanel title={"Log config"}>
            {state ? (
              <UnmodifiableLogConfigSelector
                configId={state.logConfigId ?? ""}
                configVersion={state.logConfigVersionNumber ?? 0}
                title={t("applog:logSourceDesc.s3.step2.logConfig")}
                desc={t("applog:logSourceDesc.s3.step2.logConfigDesc")}
                hideViewDetailButton
                hideRefreshButton
              />
            ) : (
              <LogConfigSelector
                title={t("applog:logSourceDesc.s3.step2.logConfig")}
                desc={t("applog:logSourceDesc.s3.step2.logConfigDesc")}
                value={logConfigJSON}
                setValue={setLogConfigJSON}
                createNewLink="/resources/log-config/create"
                validator={logConfigValidator}
                forceLogConfig={undefined}
              />
            )}
          </HeaderPanel>
        </PagePanel>
      ),
      validators: [logPathValidator],
    },
    {
      name: t("applog:logSourceDesc.eks.step3.naviTitle"),
      disabled: !!state,
      element: (
        <PagePanel title={t("applog:logSourceDesc.ec2.step3.panelTitle")}>
          {isLightEngine ? (
            <></>
          ) : (
            <HeaderPanel title={t("applog:create.ingestSetting.indexName")}>
              <IndexName
                value={curApplicationLog.aosParams.indexPrefix}
                setValue={(value) => {
                  setCurApplicationLog((prev) => {
                    return {
                      ...prev,
                      aosParams: {
                        ...prev.aosParams,
                        indexPrefix: value as string,
                      },
                      s3BufferParams: {
                        ...prev.s3BufferParams,
                        logBucketPrefix: `AppLogs/${value}/year=%Y/month=%m/day=%d/`,
                      },
                    };
                  });
                }}
                validator={indexNameValidator}
              />
            </HeaderPanel>
          )}
          <HeaderPanel
            title={t("applog:logSourceDesc.eks.step3.title")}
            desc={t("applog:logSourceDesc.eks.step3.desc")}
            infoType={InfoBarTypes.BUFFER_LAYER}
          >
            <ChooseBufferLayer
              engineType={engineType}
              maxShardNumInvalidError={maxShardInvalidError}
              s3BucketEmptyError={s3BucketEmptyError}
              s3PrefixError={s3PrefixError}
              bufferSizeError={bufferSizeError}
              bufferIntervalError={bufferIntervalError}
              shardNumInvalidError={shardInvalidError}
              notConfirmNetworkError={notConfirmNetworkError}
              applicationLog={curApplicationLog}
              setApplicationLog={setCurApplicationLog}
            />
          </HeaderPanel>
        </PagePanel>
      ),
      validators: [bufferLayerValidator].concat(
        isLightEngine ? [] : [indexNameValidator]
      ),
    },
    {
      name: isLightEngine
        ? t("applog:logSourceDesc.eks.step4.lightEngineTitle")
        : t("applog:logSourceDesc.eks.step4.naviTitle"),
      disabled: !!state,
      element: isLightEngine ? (
        <ConfigLightEngine />
      ) : (
        <SpecifyDomain
          applicationLog={curApplicationLog}
          changeOpenSearchCluster={(cluster: DomainDetails | undefined) => {
            const NOT_SUPPORT_VERSION =
              cluster?.engine === EngineType.Elasticsearch ||
              parseFloat(cluster?.version || "") < 1.3;
            setCurApplicationLog((prev) => {
              return {
                ...prev,
                openSearchId: defaultStr(cluster?.id),
                warmEnable: cluster?.nodes?.warmEnabled || false,
                coldEnable: cluster?.nodes?.coldEnabled || false,
                rolloverSizeNotSupport: NOT_SUPPORT_VERSION,
                enableRolloverByCapacity: !NOT_SUPPORT_VERSION,
                aosParams: {
                  ...prev.aosParams,
                  rolloverSize: NOT_SUPPORT_VERSION ? "" : "30",
                  domainName: defaultStr(cluster?.domainName),
                  opensearchArn: defaultStr(cluster?.domainArn),
                  opensearchEndpoint: defaultStr(cluster?.endpoint),
                  engine: defaultStr(cluster?.engine),
                  vpc: {
                    privateSubnetIds: defaultStr(
                      cluster?.vpc?.privateSubnetIds
                    ),
                    publicSubnetIds: defaultStr(cluster?.vpc?.publicSubnetIds),
                    securityGroupId: defaultStr(cluster?.vpc?.securityGroupId),
                    vpcId: defaultStr(cluster?.vpc?.vpcId),
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
        />
      ),
      validators: [
        isLightEngine ? lightEngineValidator : openSearchInputValidator,
      ],
    },
    {
      name: t("processor.logProcessorSettings"),
      disabled: !!state,
      element: (
        <SelectLogProcessor
          supportOSI={
            curApplicationLog.bufferType === BufferType.S3 &&
            engineType === AnalyticEngineTypes.OPENSEARCH
          }
        />
      ),
      validators: [selectProcessorValidator],
    },
    {
      name: t("applog:logSourceDesc.eks.step5.naviTitle"),
      disabled: !!state,
      element: (
        <AlarmAndTags
          applicationPipeline={curApplicationLog}
          engineType={engineType}
          osiParams={osiParams}
        />
      ),
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

      const resData: any = await appSyncRequestQuery(getLogSource, {
        type: LogSourceType.EKSCluster,
        sourceId: ingestionInfo.logSourceId,
      });
      const eksClusterInfo = resData.data.getLogSource;
      const isShowEKSDaemonSetModal: boolean =
        eksClusterInfo.eks?.deploymentKind === EKSDeployKind.DaemonSet;

      const isCreateIngestionOnly = state;
      if (isCreateIngestionOnly) {
        const ingestionParams: CreateAppLogIngestionMutationVariables = {
          sourceId: ingestionInfo.logSourceId,
          appPipelineId: state.pipelineId,
          logPath: ingestionInfo.logPath,
          autoAddPermission: false,
        };
        console.info("ingestionParams:", ingestionParams);

        const ingestionRes = await appSyncRequestMutation(
          createAppLogIngestion,
          ingestionParams
        );

        console.log("ingestionRes", ingestionRes);

        // Trigger the pipeline alarm system to update the alarm on new ingestion
        const resPipelineData = await appSyncRequestQuery(getAppPipeline, {
          id: state.pipelineId,
        });
        const tmpPipelineData: AppPipeline =
          resPipelineData?.data?.getAppPipeline;
        if (
          tmpPipelineData.monitor?.pipelineAlarmStatus ===
          PipelineAlarmStatus.ENABLED
        ) {
          await appSyncRequestMutation(createPipelineAlarm, {
            pipelineId: state.pipelineId,
            pipelineType: PipelineType.APP,
            snsTopicArn: tmpPipelineData.monitor.snsTopicArn,
          } as CreatePipelineAlarmMutationVariables);
        }
        navigate(`/log-pipeline/application-log/detail/${state.pipelineId}`, {
          state: {
            showEKSDaemonSetModal: isShowEKSDaemonSetModal,
            eksSourceId: ingestionInfo.logSourceId,
          },
        });
      } else {
        const logConfigObj = JSON.parse(logConfigJSON);
        const logConfigId = logConfigObj.id;
        const logConfigVersionNumber = logConfigObj.version;

        let appPipelineId: string;
        if (engineType === AnalyticEngineTypes.LIGHT_ENGINE) {
          appPipelineId = await createLightEngineApplicationPipeline(
            lightEngine,
            curApplicationLog,
            logConfigObj,
            monitor,
            tags,
            isForce
          );
        } else {
          const createPipelineParams: CreateAppPipelineMutationVariables = {
            bufferType: curApplicationLog.bufferType as BufferType,
            aosParams: {
              ...(curApplicationLog.aosParams as any),
              ...p,
            },
            logConfigId: logConfigId,
            logConfigVersionNumber: parseInt(logConfigVersionNumber, 10),
            bufferParams: CovertObjToParameterKeyValue(
              (() => {
                if (curApplicationLog.bufferType === BufferType.S3) {
                  return Object.assign(
                    cloneDeep(curApplicationLog.s3BufferParams),
                    {
                      compressionType:
                        curApplicationLog.s3BufferParams.compressionType ===
                        CompressionType.NONE
                          ? undefined
                          : curApplicationLog.s3BufferParams.compressionType,
                      createDashboard: [LogType.Nginx, LogType.Apache].includes(
                        logConfigObj.logType
                      )
                        ? shouldCreateDashboard
                        : YesNo.No,
                    }
                  );
                } else if (curApplicationLog.bufferType === BufferType.KDS) {
                  return Object.assign(
                    cloneDeep(curApplicationLog.kdsBufferParams),
                    {
                      createDashboard: [LogType.Nginx, LogType.Apache].includes(
                        logConfigObj.logType
                      )
                        ? shouldCreateDashboard
                        : YesNo.No,
                    }
                  );
                }
                return {};
              })()
            ),
            monitor: monitor.monitor,
            osiParams: buildOSIParamsValue(osiParams),
            tags,
            force: isForce,
          };

          createPipelineParams.monitor = curApplicationLog.monitor;

          console.info("createPipelineParams", createPipelineParams);

          const createRes = await appSyncRequestMutation(
            createAppPipeline,
            createPipelineParams
          );
          console.info("createAppPipeline:", createRes);
          appPipelineId = createRes.data.createAppPipeline;
        }

        const ingestionParams: CreateAppLogIngestionMutationVariables = {
          sourceId: ingestionInfo.logSourceId,
          appPipelineId,
          tags: ingestionInfo.tags,
          logPath: ingestionInfo.logPath,
          autoAddPermission: false,
        };
        console.info("ingestionParams:", ingestionParams);

        const ingestionRes = await appSyncRequestMutation(
          createAppLogIngestion,
          ingestionParams
        );
        console.log("ingestionRes", ingestionRes);
        navigate(`/log-pipeline/application-log/detail/${appPipelineId}`, {
          state: {
            showEKSDaemonSetModal: isShowEKSDaemonSetModal,
            eksSourceId: ingestionInfo.logSourceId,
          },
        });
      }

      setLoadingCreate(false);
    } catch (error: any) {
      const { errorCode, message } = refineErrorMessage(error.message);
      if (
        errorCode === ErrorCode.OVERLAP_WITH_INACTIVE_INDEX_PREFIX ||
        errorCode === ErrorCode.OVERLAP_INDEX_PREFIX
      ) {
        Swal.fire({
          ...DUPLICATE_OVERLAP_COMMON_SETTING,
          title: defaultStr(t("warning")),
          confirmButtonText: defaultStr(t("button.cancel")),
          cancelButtonText: defaultStr(t("button.edit")),
          text: t("applog:create.ingestSetting.overlapIndexError", {
            message: message,
          }),
        }).then((result) => {
          if (result.isDismissed) {
            setCurrentStep(2);
          }
        });
      }
      if (
        errorCode === ErrorCode.DUPLICATED_WITH_INACTIVE_INDEX_PREFIX ||
        errorCode === ErrorCode.DUPLICATED_INDEX_PREFIX
      ) {
        Swal.fire({
          ...DUPLICATE_OVERLAP_COMMON_SETTING,
          title: defaultStr(t("warning")),
          confirmButtonText: defaultStr(t("button.cancel")),
          cancelButtonText: defaultStr(t("button.edit")),
          showDenyButton: true,
          denyButtonText: defaultStr(t("button.continueCreate")),
          text: t("applog:create.ingestSetting.duplicatedIndexError"),
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
      (currentStep === 3 &&
        !isLightEngine &&
        domainCheckStatus?.status !== DomainStatusCheckType.PASSED) ||
      osiParams.serviceAvailableCheckedLoading
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
                        if (currentStep === 0) {
                          if (!ingestionInfo.eksObject) {
                            setEksRequireError(true);
                          } else {
                            setCurrentStep(1);
                          }
                        }
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

export default AppLogCreateEks;
