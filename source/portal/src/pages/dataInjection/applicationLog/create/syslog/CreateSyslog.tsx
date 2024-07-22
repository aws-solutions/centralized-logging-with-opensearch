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
import { useNavigate, useSearchParams } from "react-router-dom";
import CreateStep from "components/CreateStep";
import { appSyncRequestMutation, refineErrorMessage } from "assets/js/request";
import {
  createAppLogIngestion,
  createAppPipeline,
  createLogSource,
} from "graphql/mutations";
import {
  BufferType,
  CreateAppLogIngestionMutationVariables,
  CreateAppPipelineMutationVariables,
  LogSourceType,
  LogType,
  ProtocolType,
  Tag,
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
  ternary,
} from "assets/js/utils";
import Button from "components/Button";
import HeaderPanel from "components/HeaderPanel";
import Tiles from "components/Tiles";
import ExtLink from "components/ExtLink";
import InfoSpan from "components/InfoSpan";
import PagePanel from "components/PagePanel";
import { ConfigValidateType } from "assets/js/applog";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import { checkCustomPort } from "graphql/queries";
import ChooseBufferLayer from "../ec2/ChooseBufferLayer";
import StepChooseSyslogSource from "./steps/StepChooseSyslogSource";
import { Alert } from "assets/js/alert";
import LogConfigSelector from "../../common/LogConfigSelector";
import IndexName from "../../common/IndexName";
import { Validator } from "pages/comps/Validator";
import { buildInitPipelineData } from "assets/js/init";
import AlarmAndTags from "pages/pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
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
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import { useGrafana } from "assets/js/hooks/useGrafana";
import ConfigOpenSearch from "pages/dataInjection/serviceLog/create/common/ConfigOpenSearch";
import { AppDispatch } from "reducer/store";
import { useOpenSearch } from "assets/js/hooks/useOpenSearch";
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
  convertS3BufferParameters,
  logBucketPrefixChanged,
  setLogBucketAndCMKArn,
  validateS3Buffer,
  validateS3BufferParams,
} from "reducer/configBufferS3";
import {
  convertKDSBufferParameters,
  validateKDSBuffer,
  validateKDSBufferParams,
} from "reducer/configBufferKDS";
import CommonLayout from "pages/layout/CommonLayout";
import { DOMAIN_ALLOW_STATUS } from "assets/js/const";
import IndexPrefixHandler from "../../common/IndexPrefixHandler";

export interface IngestionFromSysLogPropsType {
  syslogProtocol: ProtocolType | string;
  syslogPort: string;
  syslogPortEnable: boolean;
  logSourceId: string;
  sourceType: LogSourceType;

  logConfigMethod: CreationMethod | string;
  curLogConfig: ExLogConf;
  logConfigError: ConfigValidateType;
  logPathEmptyError: boolean;
  showChooseExistsError: boolean;
  createDashboard: string;

  force: boolean;
  logPath: string;
  tags: Tag[];
}

const AppLogCreateSyslog: React.FC = () => {
  const { t } = useTranslation();

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("applog:name"),
      link: "/log-pipeline/application-log",
    },
    { name: t("applog:logSourceDesc.syslog.title") },
  ];

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

  const [logConfigJSON, setLogConfigJSON] = useState("");

  const [loadingProtocol, setLoadingProtocol] = useState(false);
  const [loadingCreateSource, setLoadingCreateSource] = useState(false);
  const [loadingCheckPort, setLoadingCheckPort] = useState(false);
  const [protocolRequireError, setProtocolRequireError] = useState(false);
  const [portConfictError, setPortConfictError] = useState(false);
  const [portOutofRangeError, setPortOutofRangeError] = useState(false);

  const [currentIndexOverlap, setCurrentIndexOverlap] = useState(false);
  const [currentIndexDuplicated, setCurrentIndexDuplicated] = useState(false);
  const [indexErrorMessage, setIndexErrorMessage] = useState("");

  const [portChanged, setPortChanged] = useState(false);
  const tags = useTags();
  const monitor = useAlarm();
  const lightEngine = useLightEngine();
  const grafana = useGrafana();
  const osiParams = useSelectProcessor();
  const openSearch = useOpenSearch();
  const s3Buffer = useS3Buffer();
  const kdsBuffer = useKDSBuffer();
  const appDispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const [ingestionInfo, setIngestionInfo] =
    useState<IngestionFromSysLogPropsType>({
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
      syslogProtocol: "",
      syslogPort: "",
      syslogPortEnable: false,
      logSourceId: "",
      sourceType: LogSourceType.Syslog,
      createDashboard: YesNo.No,
      force: false,
      logPath: "none",
      tags: [],
    });

  const engineType =
    (searchParams.get("engineType") as AnalyticEngineTypes | null) ??
    AnalyticEngineTypes.OPENSEARCH;

  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );

  const logSourceValidator = new Validator(() => {
    if (!ingestionInfo.syslogProtocol) {
      setProtocolRequireError(true);
      throw new Error(t("applog:ingestion.syslog.chooseProtocol"));
    }
    if (!portConfictError) {
      throw new Error(t("applog:ingestion.syslog.portConflict"));
    }
    if (!portOutofRangeError) {
      throw new Error(t("applog:ingestion.syslog.portOutofRange"));
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
    if (!validateOpenSearchParams(openSearch)) {
      appDispatch(validateOpenSearch());
      throw new Error();
    }
    return true;
  });

  const handleNotRecommendedPort = (checkRes: any) => {
    if (checkRes?.data?.checkCustomPort?.isAllowedPort) {
      createSysLogSource();
    } else if (
      checkRes?.data?.checkCustomPort?.isAllowedPort === false &&
      checkRes?.data?.checkCustomPort?.msg === "Conflict"
    ) {
      setPortConfictError(true);
    } else if (
      checkRes?.data?.checkCustomPort?.isAllowedPort === false &&
      checkRes?.data?.checkCustomPort?.msg === "OutofRange"
    ) {
      setPortOutofRangeError(true);
    } else {
      Alert(checkRes?.data?.checkCustomPort?.msg);
    }
  };

  const checkSysLogCustomPort = async (isInit?: boolean) => {
    const customPortParams = {
      sourceType: LogSourceType.Syslog,
      syslogProtocol: ingestionInfo.syslogProtocol,
      syslogPort: ternary(isInit, -1, parseInt(ingestionInfo.syslogPort)),
    };
    const setLoading = ternary(isInit, setLoadingProtocol, setLoadingCheckPort);
    setLoading(true);
    try {
      const checkRes = await appSyncRequestMutation(
        checkCustomPort,
        customPortParams
      );
      if (isInit && checkRes?.data?.checkCustomPort?.recommendedPort) {
        setIngestionInfo((prev) => {
          return {
            ...prev,
            syslogPort: checkRes.data.checkCustomPort.recommendedPort,
            syslogPortEnable: false,
          };
        });
      } else {
        handleNotRecommendedPort(checkRes);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectProcessorValidator = new Validator(() => {
    if (!validateOCUInput(osiParams)) {
      dispatch({
        type: SelectProcessorActionTypes.VALIDATE_OCU_INPUT,
      });
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

  useEffect(() => {
    if (ingestionInfo.syslogProtocol) {
      checkSysLogCustomPort(true);
    }
  }, [ingestionInfo.syslogProtocol]);

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  useEffect(() => {
    if (amplifyConfig.default_logging_bucket && amplifyConfig.default_cmk_arn) {
      appDispatch(setLogBucketAndCMKArn(amplifyConfig));
    }
  }, [amplifyConfig]);

  const createSysLogSource = async () => {
    const logSourceParams = {
      type: LogSourceType.Syslog,
      accountId: "",
      region: "",
      syslog: {
        protocol: ingestionInfo.syslogProtocol,
        port: ingestionInfo.syslogPort,
      },
      tags: [],
    };
    try {
      setLoadingCreateSource(true);
      const createRes = await appSyncRequestMutation(
        createLogSource,
        logSourceParams
      );
      setLoadingCreateSource(false);
      if (createRes.data?.createLogSource) {
        setIngestionInfo((prev) => {
          return {
            ...prev,
            logSourceId: createRes.data.createLogSource,
          };
        });
        setCurrentStep(1);
      }
    } catch (error) {
      setLoadingCreateSource(false);
      console.error(error);
    }
  };

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

  const buildBufferParametersByBufferType = (logType: LogType) => {
    if (curApplicationLog.bufferType === BufferType.S3) {
      return convertS3BufferParameters(s3Buffer, logType);
    }
    if (curApplicationLog.bufferType === BufferType.KDS) {
      return convertKDSBufferParameters(kdsBuffer, logType);
    }
    return [];
  };

  const closeIndexHandlerModal = () => {
    setCurrentIndexDuplicated(false);
    setCurrentIndexOverlap(false);
  };

  const stepComps = [
    {
      name: t("applog:logSourceDesc.syslog.step1.naviTitle"),
      element: (
        <PagePanel
          title={t("applog:logSourceDesc.syslog.step1.title")}
          desc={t("applog:logSourceDesc.syslog.step1.titleDesc")}
        >
          <StepChooseSyslogSource
            ingestionInfo={ingestionInfo}
            loadingProtocol={loadingProtocol}
            protocolRequireError={protocolRequireError}
            portConfictError={portConfictError}
            portOutofRangeError={portOutofRangeError}
            changeSyslogProtocol={(protocol) => {
              setProtocolRequireError(false);
              setIngestionInfo((prev) => {
                return {
                  ...prev,
                  syslogProtocol: protocol,
                };
              });
            }}
            enableCustomPort={(enable) => {
              setIngestionInfo((prev) => {
                return {
                  ...prev,
                  syslogPortEnable: enable,
                };
              });
            }}
            changeSyslogPort={(port) => {
              setPortChanged(true);
              setPortConfictError(false);
              setPortOutofRangeError(false);
              setIngestionInfo((prev) => {
                return {
                  ...prev,
                  syslogPort: port,
                };
              });
            }}
          />
        </PagePanel>
      ),
      validators: [logSourceValidator],
    },
    {
      name: t("applog:logSourceDesc.syslog.step2.naviTitle"),
      element: (
        <PagePanel title={t("applog:logSourceDesc.syslog.step2.title")}>
          <HeaderPanel title={t("applog:logSourceDesc.syslog.step2.panelName")}>
            <LogConfigSelector
              title={t("applog:logSourceDesc.syslog.step2.logConfig")}
              desc={t("applog:logSourceDesc.syslog.step2.logConfigDesc")}
              value={logConfigJSON}
              setValue={setLogConfigJSON}
              createNewLink="/resources/log-config/create"
              validator={logConfigValidator}
              logType={LogSourceType.Syslog}
              engineType={engineType}
            />
          </HeaderPanel>
        </PagePanel>
      ),
      validators: [logConfigValidator],
    },
    {
      name: t("applog:logSourceDesc.syslog.step3_1.title"),
      disabled: true,
      validators: [],
      element: (
        <HeaderPanel title={t("applog:logSourceDesc.syslog.step3_1.title")}>
          <>
            <p>
              {t("applog:logSourceDesc.syslog.step3_1.desc")}{" "}
              <InfoSpan spanType={InfoBarTypes.PROCESSOR_TYPE} />
            </p>
            <Tiles
              value={""}
              items={[
                {
                  label: t("applog:logSourceDesc.syslog.step3_1.lambda"),
                  description: t(
                    "applog:logSourceDesc.syslog.step3_1.lambdaDesc"
                  ),
                  value: "lambda",
                },
                {
                  label: t("applog:logSourceDesc.syslog.step3_1.osis"),
                  description: (
                    <>
                      {t("applog:logSourceDesc.syslog.step3_1.osisDesc")}{" "}
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
      name: t("applog:logSourceDesc.syslog.step3.naviTitle"),
      element: (
        <PagePanel title="">
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
                error={indexNameValidator.error}
              />
            </HeaderPanel>
          )}
          <HeaderPanel
            title={t("applog:logSourceDesc.syslog.step3.title")}
            desc={t("applog:logSourceDesc.syslog.step3.desc")}
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
        : t("applog:logSourceDesc.syslog.step4.naviTitle"),
      element: isLightEngine ? (
        <ConfigLightEngine />
      ) : (
        <ConfigOpenSearch taskType={LogSourceType.Syslog} />
      ),
      validators: [
        isLightEngine ? lightEngineValidator : openSearchInputValidator,
      ],
    },
    {
      name: t("processor.logProcessorSettings"),
      disabled: engineType === AnalyticEngineTypes.LIGHT_ENGINE,
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
      name: t("applog:logSourceDesc.syslog.step5.naviTitle"),
      element: (
        <AlarmAndTags
          engineType={engineType}
          applicationPipeline={curApplicationLog}
          osiParams={osiParams}
        />
      ),
      validators: [],
    },
  ].filter((each) => !each.disabled);

  const confirmCreatePipeline = async (isForce = false) => {
    const logConfigObj = JSON.parse(logConfigJSON);
    const logConfigId = logConfigObj.id;
    const logConfigVersionNumber = logConfigObj.version;

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
      parameters: [],
    };

    try {
      setLoadingCreate(true);
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

      const ingestionParams: CreateAppLogIngestionMutationVariables = {
        sourceId: ingestionInfo.logSourceId,
        appPipelineId,
        logPath: "",
        autoAddPermission: false,
      };
      console.info("ingestionParams", ingestionParams);
      const ingestionRes = await appSyncRequestMutation(
        createAppLogIngestion,
        ingestionParams
      );
      console.log("ingestionRes", ingestionRes);
      setLoadingCreate(false);
      navigate(`/log-pipeline/application-log/detail/${appPipelineId}`);
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
      loadingProtocol ||
      openSearch.domainLoading ||
      (currentStep === 3 &&
        !isLightEngine &&
        !DOMAIN_ALLOW_STATUS.includes(openSearch.domainCheckedStatus?.status))
    );
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-wrapper">
        <div className="create-step" data-testid="test-create-app-syslog">
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
                loading={loadingCheckPort || loadingCreateSource}
                disabled={isNextDisabled()}
                btnType="primary"
                onClick={() => {
                  if (currentStep === 0) {
                    // Handle the port check
                    if (!ingestionInfo.syslogProtocol) {
                      setProtocolRequireError(true);
                      return;
                    }
                    if (portChanged) {
                      checkSysLogCustomPort();
                    } else if (!ingestionInfo.logSourceId) {
                      createSysLogSource();
                    }
                    if (portConfictError || portOutofRangeError) {
                      return;
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

export default AppLogCreateSyslog;
