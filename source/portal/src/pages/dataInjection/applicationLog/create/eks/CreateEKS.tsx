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
  LogSourceType,
  LogType,
  Tag,
  PipelineAlarmStatus,
  EKSDeployKind,
  PipelineType,
  CreatePipelineAlarmMutationVariables,
} from "API";
import {
  YesNo,
  AmplifyConfigType,
  CreationMethod,
  ApplicationLogType,
  AnalyticEngineTypes,
} from "types";
import { ActionType, InfoBarTypes } from "reducer/appReducer";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  buildLambdaConcurrency,
  buildOSIParamsValue,
  checkIndexNameValidate,
  defaultStr,
  hasSamePrefix,
  ternary,
} from "assets/js/utils";
import Button from "components/Button";
import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import { ConfigValidateType } from "assets/js/applog";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import ChooseBufferLayer from "../ec2/ChooseBufferLayer";
import { SelectItem } from "components/Select/select";
import StepChooseEKSSource from "./steps/StepChooseEKSSource";
import LogConfigSelector from "../../common/LogConfigSelector";
import LogPathInput from "../../common/LogPathInput";
import CreateSampleDashboard from "../../common/CreateSampleDashboard";
import { getAppPipeline, getLogSource } from "graphql/queries";
import IndexName from "../../common/IndexName";
import { Validator } from "pages/comps/Validator";
import { buildInitPipelineData } from "assets/js/init";
import AlarmAndTags from "pages/pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import UnmodifiableLogConfigSelector from "../../common/UnmodifiableLogConfigSelector";
import { useAlarm } from "assets/js/hooks/useAlarm";
import {
  CreateAlarmActionTypes,
  validateAlarmInput,
} from "reducer/createAlarm";
import { Dispatch } from "redux";
import { useLightEngine } from "assets/js/hooks/useLightEngine";
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
import ConfigOpenSearch from "pages/dataInjection/serviceLog/create/common/ConfigOpenSearch";
import { useOpenSearch } from "assets/js/hooks/useOpenSearch";
import { AppDispatch } from "reducer/store";
import {
  convertOpenSearchStateToAppLogOpenSearchParam,
  indexPrefixChanged,
  isIndexDuplicated,
  isIndexPrefixOverlap,
  validateOpenSearch,
  validateOpenSearchParams,
} from "reducer/createOpenSearch";
import { useS3Buffer } from "assets/js/hooks/useS3Buffer";
import { useKDSBuffer } from "assets/js/hooks/useKDSBuffer";
import {
  convertKDSBufferParameters,
  validateKDSBuffer,
  validateKDSBufferParams,
} from "reducer/configBufferKDS";
import {
  convertS3BufferParameters,
  logBucketPrefixChanged,
  setLogBucketAndCMKArn,
  validateS3Buffer,
  validateS3BufferParams,
} from "reducer/configBufferS3";
import CommonLayout from "pages/layout/CommonLayout";
import { DOMAIN_ALLOW_STATUS } from "assets/js/const";
import IndexPrefixHandler from "../../common/IndexPrefixHandler";

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

  const [notConfirmNetworkError, setNotConfirmNetworkError] = useState(false);

  const [logConfigJSON, setLogConfigJSON] = useState(
    JSON.stringify(state?.logConfig)
  );
  const [shouldCreateDashboard, setShouldCreateDashboard] = useState<string>(
    YesNo.Yes
  );
  const [currentIndexOverlap, setCurrentIndexOverlap] = useState(false);
  const [currentIndexDuplicated, setCurrentIndexDuplicated] = useState(false);
  const [indexErrorMessage, setIndexErrorMessage] = useState("");

  const tags = useTags();
  const monitor = useAlarm();
  const osiParams = useSelectProcessor();
  const lightEngine = useLightEngine();
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
    if (!validateOpenSearchParams(openSearch)) {
      appDispatch(validateOpenSearch());
      throw new Error();
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
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  useEffect(() => {
    if (amplifyConfig.default_logging_bucket && amplifyConfig.default_cmk_arn) {
      appDispatch(setLogBucketAndCMKArn(amplifyConfig));
    }
  }, [amplifyConfig]);

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

  const onlyCreateIngestion = async (isShowEKSDaemonSetModal: boolean) => {
    const ingestionParams: CreateAppLogIngestionMutationVariables = {
      sourceId: ingestionInfo.logSourceId,
      appPipelineId: state.pipelineId,
      logPath: ingestionInfo.logPath,
      autoAddPermission: false,
    };
    await appSyncRequestMutation(createAppLogIngestion, ingestionParams);
    // Trigger the pipeline alarm system to update the alarm on new ingestion
    const resPipelineData = await appSyncRequestQuery(getAppPipeline, {
      id: state.pipelineId,
    });
    const tmpPipelineData: AppPipeline = resPipelineData?.data?.getAppPipeline;
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
                  logSourceId: defaultStr(eks?.id),
                  eksObject: eks,
                };
              });
            }}
            changeCurAccount={(id, account) => {
              setIngestionInfo((prev) => {
                return {
                  ...prev,
                  accountId: id,
                  subAccountLinkId: defaultStr(account?.id),
                  subAccountVpcId: defaultStr(account?.subAccountVpcId),
                  subAccountPublicSubnetIds: defaultStr(
                    account?.subAccountPublicSubnetIds
                  ),
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
              engineType={engineType}
              logType={LogSourceType.EKSCluster}
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
                engineType={engineType}
                logType={LogSourceType.EKSCluster}
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
            title={t("applog:logSourceDesc.eks.step3.title")}
            desc={t("applog:logSourceDesc.eks.step3.desc")}
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
        <ConfigOpenSearch taskType={LogSourceType.EKSCluster} />
      ),
      validators: [
        isLightEngine ? lightEngineValidator : openSearchInputValidator,
      ],
    },
    {
      name: t("processor.logProcessorSettings"),
      disabled: !!state || engineType === AnalyticEngineTypes.LIGHT_ENGINE,
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
        onlyCreateIngestion(isShowEKSDaemonSetModal);
      } else {
        const logConfigObj = JSON.parse(logConfigJSON);
        const logConfigId = logConfigObj.id;
        const logConfigVersionNumber = logConfigObj.version;

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
          const createPipelineParams: CreateAppPipelineMutationVariables = {
            bufferType: curApplicationLog.bufferType as BufferType,
            aosParams: {
              ...convertOpenSearchStateToAppLogOpenSearchParam(openSearch),
              failedLogBucket: amplifyConfig.default_logging_bucket,
            } as any,
            logConfigId: logConfigId,
            logConfigVersionNumber: parseInt(logConfigVersionNumber, 10),
            bufferParams: buildBufferParametersByBufferType(
              logConfigObj.logType
            ),
            monitor: monitor.monitor,
            osiParams: buildOSIParamsValue(osiParams),
            logProcessorConcurrency: buildLambdaConcurrency(osiParams),
            tags,
            force: isForce,
            parameters: [],
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
      setLoadingCreate(false);
      console.error(error.message);
      const { errorCode, message } = refineErrorMessage(error.message);
      if (isIndexPrefixOverlap(errorCode)) {
        setCurrentIndexOverlap(true);
        setIndexErrorMessage(message);
      }
      if (isIndexDuplicated(errorCode)) {
        setCurrentIndexDuplicated(true);
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
        <div className="create-step" data-testid="test-create-app-eks">
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
    </CommonLayout>
  );
};

export default AppLogCreateEks;
