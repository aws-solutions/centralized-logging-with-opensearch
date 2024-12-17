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
import Alert from "components/Alert";
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
  IngestionMode,
  LogSourceType,
  LogType,
  AppPipeline,
  LogStructure,
} from "API";
import {
  YesNo,
  AmplifyConfigType,
  ApplicationLogType,
  AnalyticEngineTypes,
} from "types";
import { OptionType } from "components/AutoComplete/autoComplete";
import { ActionType } from "reducer/appReducer";
import { useDispatch, useSelector } from "react-redux";
import { Trans, useTranslation } from "react-i18next";
import Button from "components/Button";
import HeaderPanel from "components/HeaderPanel";
import CompressionFormatSelector from "./CompressionFormatSelector";
import FilePathPrefixFilter from "./FilePathPrefixFilter";
import { S3BucketSelector } from "./S3BucketSelector";
import LogConfigSelector from "../../common/LogConfigSelector";
import ExtLink from "components/ExtLink";
import PagePanel from "components/PagePanel";
import { CovertObjToParameterKeyValue, ParamListToObj } from "assets/js/applog";
import CreateSampleDashboard from "../../common/CreateSampleDashboard";
import { Validator } from "pages/comps/Validator";
import { buildInitPipelineData } from "assets/js/init";
import AlarmAndTags from "pages/pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import UnmodifiableLogConfigSelector from "../../common/UnmodifiableLogConfigSelector";
import {
  CreateAlarmActionTypes,
  validateAlarmInput,
} from "reducer/createAlarm";
import { Dispatch } from "redux";
import ConfigOpenSearch from "pages/dataInjection/serviceLog/create/common/ConfigOpenSearch";
import { useOpenSearch } from "assets/js/hooks/useOpenSearch";
import { AppDispatch } from "reducer/store";
import {
  convertOpenSearchStateToAppLogOpenSearchParam,
  isIndexDuplicated,
  isIndexPrefixOverlap,
  validateOpenSearch,
  validateOpenSearchParams,
} from "reducer/createOpenSearch";
import ConfigLightEngine from "pages/dataInjection/serviceLog/create/common/ConfigLightEngine";
import {
  CreateLightEngineActionTypes,
  validateLightEngine,
} from "reducer/createLightEngine";
import { useGrafana } from "assets/js/hooks/useGrafana";
import { useLightEngine } from "assets/js/hooks/useLightEngine";
import { createLightEngineApplicationPipeline } from "assets/js/helpers/lightEngineHelper";
import FormItem from "components/FormItem";
import { ATHENA_FORMAT_LINK, DOMAIN_ALLOW_STATUS } from "assets/js/const";
import CommonLayout from "pages/layout/CommonLayout";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import { buildLambdaConcurrency, ternary } from "assets/js/utils";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import { useS3Buffer } from "assets/js/hooks/useS3Buffer";
import IndexPrefixHandler from "../../common/IndexPrefixHandler";
import { LogProcessorType } from "reducer/selectProcessor";
import ConfigDetailComps from "pages/resources/logConfig/ConfigDetailComps";

const AppLogCreateS3: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const state: AppPipeline | undefined = location.state;
  const [searchParams] = useSearchParams();
  const engineType =
    (searchParams.get("engineType") as AnalyticEngineTypes | null) ??
    AnalyticEngineTypes.OPENSEARCH;
  const ingestionMode =
    searchParams.get("ingestLogType") ?? IngestionMode.ON_GOING;
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );
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

  const [currentBucket, setCurrentBucket] = useState<OptionType | null>(null);
  const [filePathPrefix, setFilePathPrefix] = useState("");
  const [compressionFormat, setCompressionFormat] = useState("");
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
  const monitor = useSelector((state: RootState) => state.createAlarm);
  const openSearch = useOpenSearch();
  const lightEngine = useLightEngine();
  const grafana = useGrafana();
  const osiParams = useSelectProcessor();
  const appDispatch = useDispatch<AppDispatch>();
  const s3Buffer = useS3Buffer();

  const bucketValidator = new Validator(() => {
    if (!currentBucket?.value) {
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

  const openSearchInputValidator = new Validator(() => {
    if (!validateOpenSearchParams(openSearch)) {
      appDispatch(validateOpenSearch());
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

  const createApplicationPipeline = async (
    sourceRes: any,
    isForce: boolean
  ) => {
    const logConfigObj = JSON.parse(logConfigJSON);
    const logConfigId = logConfigObj.id;
    const logConfigVersionNumber = logConfigObj.version;

    const createPipelineParams: CreateAppPipelineMutationVariables = {
      bufferType: BufferType.S3,
      aosParams: {
        ...convertOpenSearchStateToAppLogOpenSearchParam(openSearch),
        failedLogBucket: amplifyConfig.default_logging_bucket,
      } as any,
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
        enableS3Notification:
          ingestionMode === IngestionMode.ONE_TIME ? "False" : "True",
      }),
      tags,
      monitor: monitor.monitor,
      logProcessorConcurrency: buildLambdaConcurrency(osiParams),
      force: isForce,
      parameters: [],
    };
    let appPipelineId: string;
    if (engineType === AnalyticEngineTypes.LIGHT_ENGINE) {
      appPipelineId = await createLightEngineApplicationPipeline(
        lightEngine,
        s3Buffer,
        logConfigObj,
        monitor,
        tags,
        isForce,
        LogStructure.RAW
      );
    } else {
      const createRes = await appSyncRequestMutation(
        createAppPipeline,
        createPipelineParams
      );
      appPipelineId = createRes.data.createAppPipeline;
    }
    const ingestionRes = await appSyncRequestMutation(createAppLogIngestion, {
      sourceId: sourceRes.data.createLogSource,
      appPipelineId: appPipelineId,
      tags,
      logPath: filePathPrefix,
      autoAddPermission: false,
    } as CreateAppLogIngestionMutationVariables);
    console.log("ingestionRes", ingestionRes);
  };

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

  const closeIndexHandlerModal = () => {
    setCurrentIndexDuplicated(false);
    setCurrentIndexOverlap(false);
  };

  const stepComps = [
    {
      name: t("step.logSource"),
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
            {isLightEngine ? (
              <FormItem optionTitle={t("applog:logSourceDesc.s3.step1.title4")}>
                <Alert
                  content={
                    <Trans
                      i18nKey="applog:logSourceDesc.s3.step1.athenaFormat"
                      components={[
                        <ExtLink key="1" to={`${ATHENA_FORMAT_LINK}`}>
                          1
                        </ExtLink>,
                      ]}
                    />
                  }
                />
              </FormItem>
            ) : (
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
            )}

            <>
              {state && !isLightEngine && (
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
      name: t("step.logConfig"),
      element: (
        <PagePanel
          title={t("step.logConfig")}
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
                engineType={engineType}
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
          <>
            {logConfigJSON && (
              <HeaderPanel title={t("resource:config.detail.logParser")}>
                <ConfigDetailComps
                  hideBasicInfo
                  curLogConfig={JSON.parse(logConfigJSON)}
                />
              </HeaderPanel>
            )}
          </>
        </PagePanel>
      ),
      validators: [logConfigValidator],
    },
    {
      name: t("step.analyticsEngine"),
      disabled: !!state,
      element: isLightEngine ? (
        <ConfigLightEngine />
      ) : (
        <ConfigOpenSearch
          onChangeIndexPrefix={(prefix) => {
            setCurApplicationLog((prev) => {
              return {
                ...prev,
                aosParams: {
                  ...prev.aosParams,
                  indexPrefix: prefix,
                },
              };
            });
          }}
          taskType={LogSourceType.S3}
        />
      ),
      validators: [
        isLightEngine ? lightEngineValidator : openSearchInputValidator,
      ],
    },
    {
      name: t("step.logProcessing"),
      disabled: !!state || engineType === AnalyticEngineTypes.LIGHT_ENGINE,
      validators: [],
      element: <SelectLogProcessor supportOSI={false} />,
    },
    {
      name:
        osiParams.logProcessorType === LogProcessorType.OSI
          ? t("step.tags")
          : t("step.alarmTags"),
      disabled: !!state,
      element: <AlarmAndTags applicationPipeline={curApplicationLog} />,
      validators: [],
    },
  ].filter((each) => !each.disabled);

  const getCompressionType = () => {
    if (isLightEngine) {
      return undefined;
    } else {
      return CompressionType[compressionFormat as keyof typeof CompressionType];
    }
  };

  const confirmCreatePipeline = async (isForce = false) => {
    try {
      setLoadingCreate(true);
      const sourceRes = await appSyncRequestMutation(createLogSource, {
        type: LogSourceType.S3,
        s3: {
          mode: IngestionMode[ingestionMode as keyof typeof IngestionMode],
          bucketName: currentBucket?.value,
          keyPrefix: curApplicationLog.s3BufferParams.logBucketPrefix,
          keySuffix: curApplicationLog.s3BufferParams.logBucketSuffix,
          compressionType: getCompressionType(),
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
            logPath: filePathPrefix,
            autoAddPermission: false,
          } as CreateAppLogIngestionMutationVariables
        );
        console.log("ingestionRes", ingestionRes);
      } else {
        await createApplicationPipeline(sourceRes, isForce);
      }
      setLoadingCreate(false);
      if (state) {
        navigate(-1);
      } else {
        navigate("/log-pipeline/application-log");
      }
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
      (currentStep === 2 &&
        !isLightEngine &&
        !DOMAIN_ALLOW_STATUS.includes(openSearch.domainCheckedStatus?.status))
    );
  };

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
    dispatch({
      type: CreateAlarmActionTypes.CLEAR_ALARM,
    });
  }, []);

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-wrapper">
        <div className="create-step" data-testid="test-create-app-s3">
          <CreateStep list={stepComps} activeIndex={currentStep} />
        </div>
        <div className="create-content">
          {stepComps[currentStep].element}
          <div className="button-action text-right">
            <Button
              data-testid="app-s3-cancel-button"
              btnType="text"
              onClick={() => {
                navigate("/log-pipeline/application-log");
              }}
            >
              {t("button.cancel")}
            </Button>
            {currentStep > 0 && (
              <Button
                data-testid="app-s3-previous-button"
                onClick={() => {
                  setCurrentStep(Math.max(currentStep - 1, 0));
                }}
              >
                {t("button.previous")}
              </Button>
            )}
            {currentStep < stepComps.length - 1 && (
              <Button
                data-testid="app-s3-next-button"
                disabled={isNextDisabled()}
                btnType="primary"
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
                data-testid="app-s3-create-button"
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

export default AppLogCreateS3;
