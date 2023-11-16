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
import React, { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
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
  BufferType,
  CreateAppLogIngestionMutationVariables,
  CreateAppPipelineMutationVariables,
  DomainDetails,
  EngineType,
  LogSource,
  LogType,
  PipelineAlarmStatus,
  ErrorCode,
  AppPipeline,
  CreatePipelineAlarmMutationVariables,
  PipelineType,
  DomainStatusCheckType,
  DomainStatusCheckResponse,
  CompressionType,
  SubAccountLink,
} from "API";
import {
  WarmTransitionType,
  AmplifyConfigType,
  YesNo,
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
} from "assets/js/utils";
import Button from "components/Button";
import HeaderPanel from "components/HeaderPanel";
import SpecifyDomain from "../steps/SpecifyDomain";
import PagePanel from "components/PagePanel";
import { CovertObjToParameterKeyValue } from "assets/js/applog";
import ChooseInstanceGroupTable from "./ChooseInstanceGroupTable";
import PermissionsModeSelector, {
  AUTO,
  MANUAL,
} from "./PermissionsModeSelector";
import ExpandableSection from "components/ExpandableSection";
import { LogConfigSelector } from "../../common/LogConfigSelector";
import LogPathInput from "../../common/LogPathInput";
import ChooseBufferLayer from "./ChooseBufferLayer";
import CreateSampleDashboard from "../../common/CreateSampleDashboard";
import Swal from "sweetalert2";
import { getAppPipeline } from "graphql/queries";
import IndexName from "../../common/IndexName";
import { Validator } from "pages/comps/Validator";
import { buildInitPipelineData } from "assets/js/init";
import AlarmAndTags from "pages/pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import { UnmodifiableLogConfigSelector } from "../../common/UnmodifiableLogConfigSelector";
import Permission from "../../detail/Permission";
import cloneDeep from "lodash.clonedeep";
import {
  CreateAlarmActionTypes,
  validateAalrmInput,
} from "reducer/createAlarm";
import { useAlarm } from "assets/js/hooks/useAlarm";
import { Dispatch } from "redux";
import { useLightEngine } from "assets/js/hooks/useLightEngine";
import { AnalyticEngineTypes } from "pages/dataInjection/serviceLog/create/common/SpecifyAnalyticsEngine";
import ConfigLightEngine from "pages/dataInjection/serviceLog/create/common/ConfigLightEngine";
import {
  CreateLightEngineActionTypes,
  validateLightEngine,
} from "reducer/createLightEngine";
import { createLightEngineApplicationPipeline } from "assets/js/helpers/lightEngineHelper";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import { useGrafana } from "assets/js/hooks/useGrafana";
import UpdateSubAccountModal from "pages/comps/account/UpdateSubAccountModal";

const AppLogCreateEC2: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { id } = useParams();
  const state: AppPipeline | undefined = location.state;
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("applog:name"),
      link: "/log-pipeline/application-log",
    },
    {
      name: id,
      link: "/log-pipeline/application-log/detail/" + id,
    },
    { name: t("applog:logSourceDesc.ec2.title") },
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

  const [currentInstanceGroups, setCurrentInstanceGroups] = useState<
    LogSource[]
  >([]);
  const [permissionsMode, setPermissionsMode] = useState("");
  const [logPath, setLogPath] = useState("");
  const [logConfigJSON, setLogConfigJSON] = useState(
    JSON.stringify(state?.logConfig)
  );
  const [shouldCreateDashboard, setShouldCreateDashboard] = useState<string>(
    YesNo.Yes
  );
  const [domainCheckStatus, setDomainCheckStatus] =
    useState<DomainStatusCheckResponse>();
  const [subAccountInfo, setSubAccountInfo] = useState<SubAccountLink | null>(
    null
  );
  const [subAccountList, setSubAccountList] = useState<SubAccountLink[]>([]);
  const [needUpdateSubAccount, setNeedUpdateSubAccount] = useState(false);

  const tags = useTags();
  const monitor = useAlarm();
  const lightEngine = useLightEngine();
  const osiParams = useSelectProcessor();
  const grafana = useGrafana();
  console.log(lightEngine);
  const [searchParams] = useSearchParams();
  const engineType =
    (searchParams.get("engineType") as AnalyticEngineTypes | null) ??
    AnalyticEngineTypes.OPENSEARCH;
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );

  const instanceGroupValidator = new Validator(() => {
    // check sub account has upload event sns
    const curInstanceGroupAccountId = currentInstanceGroups[0].accountId;
    const curInstanceGroupAccountInfo = subAccountList.find(
      (element) => element.subAccountId === curInstanceGroupAccountId
    );
    if (
      subAccountList.length > 0 &&
      curInstanceGroupAccountInfo &&
      !curInstanceGroupAccountInfo.subAccountFlbConfUploadingEventTopicArn
    ) {
      setSubAccountInfo(curInstanceGroupAccountInfo);
      setNeedUpdateSubAccount(true);
      throw new Error("");
    } else {
      setNeedUpdateSubAccount(false);
    }
    if (currentInstanceGroups.length === 0) {
      throw new Error("Instance groups cannot be empty");
    }
  });

  const logPathValidator = new Validator(() => {
    if (!logPath) {
      throw new Error(t("applog:ingestion.applyConfig.inputLogPath") || "");
    }

    if (!logPath.startsWith("/")) {
      throw new Error(
        t("applog:ingestion.applyConfig.logPathMustBeginWithSlash") || ""
      );
    }
  });

  const logConfigValidator = new Validator(() => {
    if (!logConfigJSON) {
      throw new Error(t("error.instanceGroupEmpty"));
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
    if (
      currentInstanceGroups.length > 0 &&
      currentInstanceGroups[0].ec2?.groupType === "ASG"
    ) {
      setPermissionsMode(MANUAL);
    }
  }, [currentInstanceGroups]);

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  const stepComps = [
    {
      name: t("applog:logSourceDesc.ec2.step1.naviTitle"),
      element: (
        <PagePanel title={t("applog:logSourceDesc.ec2.step1.title")}>
          <ChooseInstanceGroupTable
            value={currentInstanceGroups}
            setValue={setCurrentInstanceGroups}
            validator={instanceGroupValidator}
          />

          <HeaderPanel title={t("applog:logSourceDesc.ec2.step1.permissions")}>
            <PermissionsModeSelector
              disableAuto={
                currentInstanceGroups.length > 0 &&
                currentInstanceGroups[0].ec2?.groupType === "ASG"
              }
              value={permissionsMode}
              setValue={setPermissionsMode}
            />
            <ExpandableSection
              defaultExpanded={false}
              headerText={t("applog:logSourceDesc.ec2.step1.permissionExpand")}
            >
              <Permission
                onUpdateAccountList={(accountList) => {
                  setSubAccountList(accountList);
                }}
              />
            </ExpandableSection>
          </HeaderPanel>
        </PagePanel>
      ),
      validators: [instanceGroupValidator],
    },
    {
      name: t("applog:logSourceDesc.s3.step2.naviTitle"),
      element: (
        <PagePanel
          title={t("applog:logSourceDesc.s3.step2.title")}
          desc={state ? "" : t("applog:logSourceDesc.eks.step2.titleDesc")}
        >
          <HeaderPanel title={t("resource:config.common.logPath")}>
            <LogPathInput
              value={logPath}
              setValue={setLogPath}
              validator={logPathValidator}
            />
          </HeaderPanel>
          <HeaderPanel title={t("applog:logSourceDesc.s3.step2.panelName")}>
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
            <>
              {!state && !isLightEngine && (
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
      name: t("applog:logSourceDesc.ec2.step3.naviTitle"),
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
            title={t("applog:logSourceDesc.ec2.step3.title")}
            desc={t("applog:logSourceDesc.ec2.step3.desc")}
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
      name: t("applog:logSourceDesc.s3.step5.naviTitle"),
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

    if (curApplicationLog.kdsBufferParams.enableAutoScaling !== "true") {
      curApplicationLog.kdsBufferParams.maxCapacity =
        curApplicationLog.kdsBufferParams.minCapacity;
    }

    const logConfigObj = JSON.parse(logConfigJSON);
    const logConfigId = logConfigObj.id;
    const logConfigVersionNumber = logConfigObj.version;

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
            return Object.assign(cloneDeep(curApplicationLog.s3BufferParams), {
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
            });
          } else if (curApplicationLog.bufferType === BufferType.KDS) {
            return Object.assign(cloneDeep(curApplicationLog.kdsBufferParams), {
              createDashboard: [LogType.Nginx, LogType.Apache].includes(
                logConfigObj.logType
              )
                ? shouldCreateDashboard
                : YesNo.No,
            });
          }
          return {};
        })()
      ),
      monitor: monitor.monitor,
      osiParams: buildOSIParamsValue(osiParams),
      tags,
      force: isForce,
    };

    try {
      setLoadingCreate(true);

      const isCreateIngestionOnly = !!state;

      if (isCreateIngestionOnly) {
        const ingestionRes = await appSyncRequestMutation(
          createAppLogIngestion,
          {
            sourceId: currentInstanceGroups[0].sourceId,
            appPipelineId: state.pipelineId,
            logPath: logPath,
            autoAddPermission: permissionsMode === AUTO,
          } as CreateAppLogIngestionMutationVariables
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
        setLoadingCreate(false);
        navigate("/log-pipeline/application-log/detail/" + state?.pipelineId);
      } else {
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
          const createRes = await appSyncRequestMutation(
            createAppPipeline,
            createPipelineParams
          );

          console.info("createRes:", createRes);
          appPipelineId = createRes.data.createAppPipeline;
        }

        await appSyncRequestMutation(createAppLogIngestion, {
          sourceId: currentInstanceGroups[0].sourceId,
          appPipelineId,
          tags,
          logPath: logPath,
          autoAddPermission: permissionsMode === AUTO,
        } as CreateAppLogIngestionMutationVariables);
        setLoadingCreate(false);
        navigate("/log-pipeline/application-log");
      }
    } catch (error: any) {
      const { errorCode, message } = refineErrorMessage(error.message);
      if (
        errorCode === ErrorCode.OVERLAP_WITH_INACTIVE_INDEX_PREFIX ||
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
            (errorCode === ErrorCode.OVERLAP_WITH_INACTIVE_INDEX_PREFIX
              ? t("applog:create.ingestSetting.overlapWithInvalidPrefix")
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
        errorCode === ErrorCode.DUPLICATED_INDEX_PREFIX
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
            errorCode === ErrorCode.DUPLICATED_WITH_INACTIVE_INDEX_PREFIX
              ? t("applog:create.ingestSetting.duplicatedWithInvalidPrefix")
              : t("applog:create.ingestSetting.duplicatedWithPrefix"),
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
              <div className="create-content m-w-75p">
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
                      btnType="primary"
                      disabled={isNextDisabled()}
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
      <UpdateSubAccountModal
        accountInfo={subAccountInfo}
        showModal={needUpdateSubAccount}
        closeModal={() => {
          setNeedUpdateSubAccount(false);
        }}
      />
      <HelpPanel />
    </div>
  );
};

export default AppLogCreateEC2;
