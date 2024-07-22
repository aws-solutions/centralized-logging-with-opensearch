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
  LogSource,
  PipelineAlarmStatus,
  AppPipeline,
  CreatePipelineAlarmMutationVariables,
  PipelineType,
  SubAccountLink,
  LogSourceType,
  LogType,
  EC2GroupPlatform,
  IISlogParser,
} from "API";
import {
  AmplifyConfigType,
  YesNo,
  ApplicationLogType,
  AnalyticEngineTypes,
  SupportPlugin,
} from "types";
import { ActionType, InfoBarTypes } from "reducer/appReducer";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  buildLambdaConcurrency,
  buildOSIParamsValue,
  checkIndexNameValidate,
  linkAccountMissingFields,
  ternary,
} from "assets/js/utils";
import Button from "components/Button";
import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import ChooseInstanceGroupTable from "./ChooseInstanceGroupTable";
import PermissionsModeSelector, {
  AUTO,
  MANUAL,
} from "./PermissionsModeSelector";
import ExpandableSection from "components/ExpandableSection";
import LogConfigSelector from "../../common/LogConfigSelector";
import LogPathInput from "../../common/LogPathInput";
import ChooseBufferLayer from "./ChooseBufferLayer";
import CreateSampleDashboard from "../../common/CreateSampleDashboard";
import { getAppPipeline } from "graphql/queries";
import IndexName from "../../common/IndexName";
import { Validator } from "pages/comps/Validator";
import { buildInitPipelineData } from "assets/js/init";
import AlarmAndTags from "pages/pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import UnmodifiableLogConfigSelector from "../../common/UnmodifiableLogConfigSelector";
import Permission from "../../detail/Permission";
import {
  CreateAlarmActionTypes,
  validateAlarmInput,
} from "reducer/createAlarm";
import { useAlarm } from "assets/js/hooks/useAlarm";
import { Dispatch } from "redux";
import { useLightEngine } from "assets/js/hooks/useLightEngine";
import ConfigLightEngine from "pages/dataInjection/serviceLog/create/common/ConfigLightEngine";
import {
  CreateLightEngineActionTypes,
  validateLightEngine,
} from "reducer/createLightEngine";
import { createLightEngineApplicationPipeline } from "assets/js/helpers/lightEngineHelper";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  LogProcessorType,
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import { useGrafana } from "assets/js/hooks/useGrafana";
import UpdateSubAccountModal from "pages/comps/account/UpdateSubAccountModal";
import ConfigOpenSearch from "pages/dataInjection/serviceLog/create/common/ConfigOpenSearch";
import { useOpenSearch } from "assets/js/hooks/useOpenSearch";
import {
  convertOpenSearchStateToAppLogOpenSearchParam,
  indexPrefixChanged,
  isIndexDuplicated,
  isIndexPrefixOverlap,
  validateOpenSearch,
  validateOpenSearchParams,
} from "reducer/createOpenSearch";
import { AppDispatch } from "reducer/store";
import {
  convertS3BufferParameters,
  logBucketPrefixChanged,
  setLogBucketAndCMKArn,
  validateS3Buffer,
  validateS3BufferParams,
} from "reducer/configBufferS3";
import { useS3Buffer } from "assets/js/hooks/useS3Buffer";
import {
  convertKDSBufferParameters,
  validateKDSBuffer,
  validateKDSBufferParams,
} from "reducer/configBufferKDS";
import { useKDSBuffer } from "assets/js/hooks/useKDSBuffer";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import CommonLayout from "pages/layout/CommonLayout";
import { DOMAIN_ALLOW_STATUS } from "assets/js/const";
import { isWindowsEvent, isWindowsIISLog } from "reducer/createLogConfig";
import EnrichedFields from "pages/dataInjection/common/EnrichFields";
import IndexPrefixHandler from "../../common/IndexPrefixHandler";

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
  const [subAccountInfo, setSubAccountInfo] = useState<SubAccountLink | null>(
    null
  );
  const [subAccountList, setSubAccountList] = useState<SubAccountLink[]>([]);
  const [needUpdateSubAccount, setNeedUpdateSubAccount] = useState(false);

  const [currentIndexOverlap, setCurrentIndexOverlap] = useState(false);
  const [currentIndexDuplicated, setCurrentIndexDuplicated] = useState(false);
  const [indexErrorMessage, setIndexErrorMessage] = useState("");

  const tags = useTags();
  const monitor = useAlarm();
  const lightEngine = useLightEngine();
  const osiParams = useSelectProcessor();
  const grafana = useGrafana();
  const openSearch = useOpenSearch();
  const s3Buffer = useS3Buffer();
  const kdsBuffer = useKDSBuffer();
  const appDispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const engineType =
    (searchParams.get("engineType") as AnalyticEngineTypes | null) ??
    AnalyticEngineTypes.OPENSEARCH;
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );

  const isWindowsEventConfig = useMemo(() => {
    if (!logConfigJSON) {
      return false;
    }
    return isWindowsEvent(JSON.parse(logConfigJSON)?.logType);
  }, [logConfigJSON]);

  const isWindowsIISLogWithW3CConfig = useMemo(() => {
    if (!logConfigJSON) {
      return false;
    }
    return (
      JSON.parse(logConfigJSON)?.logType === LogType.IIS &&
      JSON.parse(logConfigJSON)?.iisLogParser === IISlogParser.W3C
    );
  }, [logConfigJSON]);

  const isSupportEnrichField = () => {
    return (
      isWindowsIISLogWithW3CConfig &&
      !isLightEngine &&
      curApplicationLog.bufferType !== BufferType.None &&
      osiParams.logProcessorType === LogProcessorType.LAMBDA
    );
  };

  const isWindowsInstanceGroup = useMemo(() => {
    if (currentInstanceGroups.length === 0) {
      return false;
    }
    return (
      currentInstanceGroups?.[0]?.ec2?.groupPlatform ===
      EC2GroupPlatform.Windows
    );
  }, [currentInstanceGroups]);

  const instanceGroupValidator = new Validator(() => {
    // check sub account has upload event sns
    const curInstanceGroupAccountId = currentInstanceGroups[0]?.accountId;
    const curInstanceGroupAccountInfo = subAccountList.find(
      (element) => element.subAccountId === curInstanceGroupAccountId
    );
    if (
      subAccountList.length > 0 &&
      curInstanceGroupAccountInfo &&
      linkAccountMissingFields(curInstanceGroupAccountInfo)
    ) {
      setSubAccountInfo(curInstanceGroupAccountInfo);
      setNeedUpdateSubAccount(true);
      throw new Error("");
    } else {
      setNeedUpdateSubAccount(false);
    }
    if (currentInstanceGroups.length === 0) {
      throw new Error(t("error.instanceGroupEmpty"));
    }
  });

  const isWindowsDrivePath = (str: string) => {
    const regex = /^[A-Za-z]:\\/;
    return regex.test(str);
  };

  const logPathValidator = new Validator(() => {
    if (isWindowsEventConfig) {
      return true;
    }
    if (!logPath) {
      throw new Error(t("applog:ingestion.applyConfig.inputLogPath") || "");
    }

    if (
      currentInstanceGroups?.[0]?.ec2?.groupPlatform ===
        EC2GroupPlatform.Linux &&
      !logPath.startsWith("/")
    ) {
      throw new Error(
        t("applog:ingestion.applyConfig.logPathMustBeginWithSlash") || ""
      );
    }

    if (
      currentInstanceGroups?.[0]?.ec2?.groupPlatform ===
        EC2GroupPlatform.Windows &&
      !isWindowsDrivePath(logPath)
    ) {
      throw new Error(
        t("applog:ingestion.applyConfig.logPathMustBeginWithDriver") || ""
      );
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
    if (!validateOpenSearchParams(openSearch)) {
      appDispatch(validateOpenSearch());
      throw new Error();
    }
    return true;
  });

  const bufferLayerValidator = new Validator(() => {
    // Check KDS Input when buffer type is KDS
    if (curApplicationLog.bufferType === BufferType.KDS) {
      if (!validateKDSBufferParams(kdsBuffer)) {
        appDispatch(validateKDSBuffer());
        throw new Error();
      }
    }

    // Check S3 Input when buffer type is S3
    if (curApplicationLog.bufferType === BufferType.S3) {
      if (!validateS3BufferParams(s3Buffer)) {
        appDispatch(validateS3Buffer());
        throw new Error();
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

  const onlyCreateIngestion = async () => {
    const ingestionRes = await appSyncRequestMutation(createAppLogIngestion, {
      sourceId: currentInstanceGroups[0].sourceId,
      appPipelineId: state?.pipelineId,
      logPath: logPath,
      autoAddPermission: permissionsMode === AUTO,
    } as CreateAppLogIngestionMutationVariables);

    console.log("ingestionRes", ingestionRes);

    // Trigger the pipeline alarm system to update the alarm on new ingestion
    const resPipelineData = await appSyncRequestQuery(getAppPipeline, {
      id: state?.pipelineId,
    });
    const tmpPipelineData: AppPipeline = resPipelineData?.data?.getAppPipeline;
    if (
      tmpPipelineData.monitor?.pipelineAlarmStatus ===
      PipelineAlarmStatus.ENABLED
    ) {
      await appSyncRequestMutation(createPipelineAlarm, {
        pipelineId: state?.pipelineId,
        pipelineType: PipelineType.APP,
        snsTopicArn: tmpPipelineData.monitor.snsTopicArn,
      } as CreatePipelineAlarmMutationVariables);
    }
    setLoadingCreate(false);
    navigate("/log-pipeline/application-log/detail/" + state?.pipelineId);
  };

  const createApplicationPipeline = async (
    createPipelineParams: CreateAppPipelineMutationVariables,
    logConfigObj: ExLogConf,
    isForce: boolean
  ) => {
    let appPipelineId: string;
    if (engineType === AnalyticEngineTypes.LIGHT_ENGINE) {
      appPipelineId = await createLightEngineApplicationPipeline(
        lightEngine,
        s3Buffer,
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
  };

  const buildBufferParametersByBufferType = (logType: LogType) => {
    if (curApplicationLog.bufferType === BufferType.S3) {
      return convertS3BufferParameters(
        s3Buffer,
        logType,
        shouldCreateDashboard
      );
    }
    if (curApplicationLog.bufferType === BufferType.KDS) {
      return convertKDSBufferParameters(
        kdsBuffer,
        logType,
        shouldCreateDashboard
      );
    }
    return [];
  };

  const closeIndexHandlerModal = () => {
    setCurrentIndexDuplicated(false);
    setCurrentIndexOverlap(false);
  };

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

  useEffect(() => {
    if (amplifyConfig.default_logging_bucket && amplifyConfig.default_cmk_arn) {
      appDispatch(setLogBucketAndCMKArn(amplifyConfig));
    }
  }, [amplifyConfig]);

  const isWindowsLogConfig = () => {
    if (logConfigJSON) {
      const tmpConfig: ExLogConf = JSON.parse(logConfigJSON);
      return (
        isWindowsIISLog(tmpConfig.logType) || isWindowsEvent(tmpConfig.logType)
      );
    } else {
      return false;
    }
  };

  const stepComps = [
    {
      name: t("applog:logSourceDesc.ec2.step1.naviTitle"),
      element: (
        <PagePanel title={t("applog:logSourceDesc.ec2.step1.title")}>
          <ChooseInstanceGroupTable
            value={currentInstanceGroups}
            setValue={(instanceGroup) => {
              // reset log config if create pipeline
              if (!state) {
                setLogConfigJSON("");
              }
              setCurrentInstanceGroups(instanceGroup);
            }}
            validator={instanceGroupValidator}
            isIngestion={!!state}
            isWindowsLog={isWindowsLogConfig()}
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
                engineType={engineType}
                logType={LogSourceType.EC2}
                isWindowsInstanceGroup={isWindowsInstanceGroup}
              />
            )}
            <>
              {!state && !isLightEngine && (
                <CreateSampleDashboard
                  showCreateSample={isWindowsIISLogWithW3CConfig}
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
          <>
            {logConfigJSON && !isWindowsEventConfig && (
              <HeaderPanel title={t("resource:config.common.logPath")}>
                <LogPathInput
                  value={logPath}
                  setValue={setLogPath}
                  validator={logPathValidator}
                  logSourceType={LogSourceType.EC2}
                  instanceGroupPlatform={
                    currentInstanceGroups?.[0]?.ec2?.groupPlatform
                  }
                />
              </HeaderPanel>
            )}
          </>
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
                  appDispatch(indexPrefixChanged(value as string));
                  appDispatch(
                    logBucketPrefixChanged(
                      `AppLogs/${value}/year=%Y/month=%m/day=%d/`
                    )
                  );
                  setCurApplicationLog((prev) => {
                    return {
                      ...prev,
                      aosParams: {
                        ...prev.aosParams,
                        indexPrefix: value as string,
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
        <ConfigOpenSearch taskType={LogSourceType.EC2} />
      ),
      validators: [
        isLightEngine ? lightEngineValidator : openSearchInputValidator,
      ],
    },
    {
      name: t("processor.logProcessorSettings"),
      disabled: !!state || engineType === AnalyticEngineTypes.LIGHT_ENGINE,
      element: (
        <>
          <SelectLogProcessor
            supportOSI={
              curApplicationLog.bufferType === BufferType.S3 &&
              engineType === AnalyticEngineTypes.OPENSEARCH
            }
          />
          {isSupportEnrichField() && (
            <EnrichedFields
              pipelineTask={curApplicationLog}
              changePluginSelect={(plugin, enable) => {
                if (plugin === SupportPlugin.Geo) {
                  setCurApplicationLog((prev: ApplicationLogType) => {
                    return {
                      ...prev,
                      params: {
                        ...prev.params,
                        geoPlugin: enable,
                      },
                    };
                  });
                }
                if (plugin === SupportPlugin.UserAgent) {
                  setCurApplicationLog((prev: ApplicationLogType) => {
                    return {
                      ...prev,
                      params: {
                        ...prev.params,
                        userAgentPlugin: enable,
                      },
                    };
                  });
                }
              }}
            />
          )}
        </>
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
    if (curApplicationLog.kdsBufferParams.enableAutoScaling !== "true") {
      curApplicationLog.kdsBufferParams.maxCapacity =
        curApplicationLog.kdsBufferParams.minCapacity;
    }
    const logConfigObj = JSON.parse(logConfigJSON);
    const logConfigId = logConfigObj.id;
    const logConfigVersionNumber = logConfigObj.version;

    // Add Plugin in parameters
    const parameters = [];
    const pluginList = [];
    if (curApplicationLog.params.geoPlugin) {
      pluginList.push(SupportPlugin.Geo);
    }
    if (curApplicationLog.params.userAgentPlugin) {
      pluginList.push(SupportPlugin.UserAgent);
    }
    if (pluginList.length > 0 && isSupportEnrichField()) {
      parameters.push({
        parameterKey: "enrichmentPlugins",
        parameterValue: pluginList.join(","),
      });
    }

    const createPipelineParams: CreateAppPipelineMutationVariables = {
      bufferType: curApplicationLog.bufferType as BufferType,
      aosParams: {
        ...convertOpenSearchStateToAppLogOpenSearchParam(openSearch),
        failedLogBucket: amplifyConfig.default_logging_bucket,
      } as any,
      logConfigId: logConfigId,
      logConfigVersionNumber: parseInt(logConfigVersionNumber, 10),
      bufferParams: buildBufferParametersByBufferType(logConfigObj.logType),
      monitor: monitor.monitor,
      osiParams: buildOSIParamsValue(osiParams),
      logProcessorConcurrency: buildLambdaConcurrency(osiParams),
      tags,
      force: isForce,
      parameters,
    };

    setLoadingCreate(true);
    const isCreateIngestionOnly = !!state;
    if (isCreateIngestionOnly) {
      onlyCreateIngestion();
    } else {
      try {
        await createApplicationPipeline(
          createPipelineParams,
          logConfigObj,
          isForce
        );
      } catch (error: any) {
        const { errorCode, message } = refineErrorMessage(error.message);
        setLoadingCreate(false);
        console.error(error.message);
        if (isIndexPrefixOverlap(errorCode)) {
          setCurrentIndexOverlap(true);
          setIndexErrorMessage(message);
        }
        if (isIndexDuplicated(errorCode)) {
          setCurrentIndexDuplicated(true);
        }
      }
    }
  };

  const isNextDisabled = () => {
    return (
      openSearch.domainLoading ||
      (currentStep === 3 &&
        !isLightEngine &&
        !DOMAIN_ALLOW_STATUS.includes(
          openSearch.domainCheckedStatus?.status
        )) ||
      osiParams.serviceAvailableCheckedLoading
    );
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-wrapper">
        <div className="create-step" data-testid="test-create-app-ec2">
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
                    setCurrentStep(Math.min(currentStep + 1, stepComps.length));
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
                  if (!validateAlarmInput(monitor)) {
                    dispatch({
                      type: CreateAlarmActionTypes.VALIDATE_ALARM_INPUT,
                    });
                    return;
                  }
                  if (
                    !stepComps[currentStep].validators
                      .map((each) => each.validate())
                      .every(Boolean)
                  ) {
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
      <IndexPrefixHandler
        openModal={currentIndexDuplicated || currentIndexOverlap}
        alertContent={ternary(
          currentIndexDuplicated,
          t("applog:create.ingestSetting.duplicatedIndexError"),
          t("applog:create.ingestSetting.overlapIndexError", {
            message: indexErrorMessage,
          })
        )}
        showContinue={currentIndexDuplicated}
        clickCancel={() => {
          closeIndexHandlerModal();
        }}
        clickConfirm={() => {
          confirmCreatePipeline(true);
          closeIndexHandlerModal();
        }}
        clickEditIndex={() => {
          closeIndexHandlerModal();
          setCurrentStep(2);
        }}
      />
      <UpdateSubAccountModal
        accountInfo={subAccountInfo}
        showModal={needUpdateSubAccount}
        closeModal={() => {
          setNeedUpdateSubAccount(false);
        }}
      />
    </CommonLayout>
  );
};

export default AppLogCreateEC2;
