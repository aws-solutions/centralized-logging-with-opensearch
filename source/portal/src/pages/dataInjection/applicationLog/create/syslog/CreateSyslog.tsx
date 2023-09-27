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
import { useNavigate } from "react-router-dom";
import CreateStep from "components/CreateStep";
import Breadcrumb from "components/Breadcrumb";
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
  DomainDetails,
  EngineType,
  LogSourceType,
  LogType,
  ProtocolType,
  Tag,
  ErrorCode,
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
import { checkIndexNameValidate, ternary } from "assets/js/utils";
import Button from "components/Button";
import HeaderPanel from "components/HeaderPanel";
import Tiles from "components/Tiles";
import ExtLink from "components/ExtLink";
import InfoSpan from "components/InfoSpan";
import SpecifyDomain from "../steps/SpecifyDomain";
import PagePanel from "components/PagePanel";
import {
  ConfigValidateType,
  CovertObjToParameterKeyValue,
} from "assets/js/applog";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import { checkCustomPort } from "graphql/queries";
import ChooseBufferLayer from "../ec2/ChooseBufferLayer";
import StepChooseSyslogSource from "./steps/StepChooseSyslogSource";
import { Alert } from "assets/js/alert";
import { LogConfigSelector } from "../../common/LogConfigSelector";
import Swal from "sweetalert2";
import IndexName from "../../common/IndexName";
import { Validator } from "pages/comps/Validator";
import { buildInitPipelineData } from "assets/js/init";
import AlarmAndTags from "pages/pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import cloneDeep from "lodash.clonedeep";
import { useAlarm } from "assets/js/hooks/useAlarm";
import {
  CreateAlarmActionTypes,
  validateAalrmInput,
} from "reducer/createAlarm";
import { Dispatch } from "redux";

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

  const [loadingProtocol, setLoadingProtocol] = useState(false);
  const [loadingCreateSource, setLoadingCreateSource] = useState(false);
  const [loadingCheckPort, setLoadingCheckPort] = useState(false);
  const [protocolRequireError, setProtocolRequireError] = useState(false);
  const [portConfictError, setPortConfictError] = useState(false);
  const [portOutofRangeError, setPortOutofRangeError] = useState(false);

  const [portChanged, setPortChanged] = useState(false);
  const tags = useTags();
  const monitor = useAlarm();

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
  const [domainCheckStatus, setDomainCheckStatus] =
    useState<DomainStatusCheckResponse>();

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

  const filterLogConfigs = (each: any): boolean => {
    return [LogType.JSON, LogType.SingleLineText, LogType.Syslog].includes(
      each.logType
    );
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
      console.info("checkRes", checkRes);
      console.info("isInit", isInit);
      if (isInit && checkRes?.data?.checkCustomPort?.recommendedPort) {
        setIngestionInfo((prev) => {
          return {
            ...prev,
            syslogPort: checkRes.data.checkCustomPort.recommendedPort,
            syslogPortEnable: false,
          };
        });
      } else {
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
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ingestionInfo.syslogProtocol) {
      checkSysLogCustomPort(true);
    }
  }, [ingestionInfo.syslogProtocol]);

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

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
      if (createRes.data && createRes.data.createLogSource) {
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
              onFilter={filterLogConfigs}
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
              error={indexNameValidator.error}
            />
          </HeaderPanel>
          <HeaderPanel
            title={t("applog:logSourceDesc.syslog.step3.title")}
            desc={t("applog:logSourceDesc.syslog.step3.desc")}
            infoType={InfoBarTypes.BUFFER_LAYER}
          >
            <ChooseBufferLayer
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
      validators: [bufferLayerValidator, indexNameValidator],
    },
    {
      name: t("applog:logSourceDesc.syslog.step4.naviTitle"),
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
      validators: [openSearchInputValidator],
    },
    {
      name: t("applog:logSourceDesc.syslog.step5.naviTitle"),
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
            });
          } else if (curApplicationLog.bufferType === BufferType.KDS) {
            return curApplicationLog.kdsBufferParams;
          }
          return [];
        })()
      ),
      monitor: monitor.monitor,
      tags,
      force: isForce,
    };

    try {
      setLoadingCreate(true);

      const createRes = await appSyncRequestMutation(
        createAppPipeline,
        createPipelineParams
      );
      console.info("createRes:", createRes);

      const ingestionParams: CreateAppLogIngestionMutationVariables = {
        sourceId: ingestionInfo.logSourceId,
        appPipelineId: createRes.data.createAppPipeline,
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

      navigate(
        `/log-pipeline/application-log/detail/${createRes.data.createAppPipeline}`
      );
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
      loadingProtocol ||
      domainListIsLoading ||
      (currentStep === 3 &&
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

export default AppLogCreateSyslog;
