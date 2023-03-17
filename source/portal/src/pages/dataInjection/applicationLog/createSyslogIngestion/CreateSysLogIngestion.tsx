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
import CreateTags from "./steps/CreateTags";
import Button from "components/Button";
import Breadcrumb from "components/Breadcrumb";
import { RouteComponentProps, useHistory } from "react-router-dom";
import {
  CreateAppLogIngestionMutationVariables,
  LogSourceType,
  ProtocolType,
  Tag,
} from "API";
import { ActionType } from "reducer/appReducer";
import { useDispatch } from "react-redux";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import StepChooseSource from "./steps/StepChooseSource";
import {
  createAppLogIngestion,
  createLogConf,
  createLogSource,
} from "graphql/mutations";
import { CreationMethod, YesNo } from "types";
import { appSyncRequestMutation } from "assets/js/request";
import ApplyLogConfig from "../common/ApplyLogConfig";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import { checkCustomPort } from "graphql/queries";

import {
  checkConfigInput,
  ConfigValidateType,
  removeNewLineBreack,
} from "assets/js/applog";
import { Alert } from "assets/js/alert";

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

interface MatchParams {
  id: string;
}

const CreateSysLogIngestion: React.FC<RouteComponentProps<MatchParams>> = (
  props: RouteComponentProps<MatchParams>
) => {
  const id: string = props.match.params.id;
  const { t } = useTranslation();
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
    {
      name: t("applog:ingestion.syslog.ingestFromSysLog"),
    },
  ];
  const history = useHistory();
  const dispatch = useDispatch();

  const [curStep, setCurStep] = useState(0);
  const [ingestionInfo, setIngestionInfo] =
    useState<IngestionFromSysLogPropsType>({
      logConfigMethod: CreationMethod.New,
      curLogConfig: {
        __typename: "LogConf",
        id: "",
        confName: "",
        logType: null,
        multilineLogParser: null,
        createdDt: null,
        userSampleLog: "",
        userLogFormat: "",
        regularExpression: "",
        regularSpecs: [],
        processorFilterRegex: {
          enable: false,
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

  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [loadingProtocol, setLoadingProtocol] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingCreateSource, setLoadingCreateSource] = useState(false);
  const [loadingCheckPort, setLoadingCheckPort] = useState(false);
  const [loadingCreateLogConfig, setLoadingCreateLogConfig] = useState(false);
  const [protocolRequireError, setProtocolRequireError] = useState(false);
  const [portConfictError, setPortConfictError] = useState(false);
  const [portOutofRangeError, setPortOutofRangeError] = useState(false);

  const [portChanged, setPortChanged] = useState(false);

  // Create Log Config
  const createLogConfig = async () => {
    console.info("ingestionInfo?.curLogConfig:", ingestionInfo?.curLogConfig);
    if (ingestionInfo?.curLogConfig) {
      const validateRes: any = checkConfigInput(ingestionInfo?.curLogConfig);
      setIngestionInfo((prev) => {
        return {
          ...prev,
          logConfigError: validateRes,
        };
      });

      // if validate result has true value, return because some filed invalidate
      console.info(
        "Object.keys(validateRes).map((key: string) => validateRes[key]):",
        Object.keys(validateRes).map((key: string) => validateRes[key])
      );
      if (
        Object.keys(validateRes)
          .map((key: string) => validateRes[key])
          .includes(true)
      ) {
        return;
      }

      // Remove \n\t\r from regularExpression and userLogFormat
      const createLogConfigParam: ExLogConf = removeNewLineBreack(
        ingestionInfo.curLogConfig
      );

      try {
        setLoadingCreateLogConfig(true);
        const createRes = await appSyncRequestMutation(
          createLogConf,
          createLogConfigParam
        );
        setIngestionInfo((prev: any) => {
          return {
            ...prev,
            curLogConfig: {
              ...prev.curLogConfig,
              id: createRes.data.createLogConf,
            },
          };
        });
        setLoadingCreateLogConfig(false);
        setCurStep(2);
      } catch (error) {
        setLoadingCreateLogConfig(false);
        console.error(error);
      }
    } else {
      // Set config name error when log config is null
      setIngestionInfo((prev) => {
        return {
          ...prev,
          logConfigError: {
            ...prev.logConfigError,
            logConfigNameError: true,
          },
        };
      });
    }
  };

  const createSysLogSource = async () => {
    const logSourceParams = {
      sourceType: "Syslog",
      accountId: "",
      region: "",
      sourceInfo: [
        {
          key: "syslogProtocol",
          value: ingestionInfo.syslogProtocol,
        },
        {
          key: "syslogPort",
          value: ingestionInfo.syslogPort,
        },
      ],
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
        setCurStep(1);
      }
    } catch (error) {
      setLoadingCreateSource(false);
      console.error(error);
    }
  };

  const createSysLogIngestion = async () => {
    const ingestionParams: CreateAppLogIngestionMutationVariables = {
      sourceType: LogSourceType.Syslog,
      appPipelineId: id,
      confId: ingestionInfo.curLogConfig?.id || "",
      sourceIds: [ingestionInfo.logSourceId],
      tags: ingestionInfo.tags,
      createDashboard: YesNo.No,
      logPath: ingestionInfo.logPath,
    };
    console.info("ingestionParams:", ingestionParams);
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createAppLogIngestion,
        ingestionParams
      );
      setLoadingCreate(false);
      console.info("createIngestionRes:", createRes);
      if (createRes.data) {
        history.push({
          pathname: `/log-pipeline/application-log/detail/${id}`,
        });
      }
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  const checkSysLogCustomPort = async (isInit?: boolean) => {
    const customPortParams = {
      sourceType: LogSourceType.Syslog,
      syslogProtocol: ingestionInfo.syslogProtocol,
      syslogPort: isInit ? -1 : parseInt(ingestionInfo.syslogPort),
    };
    if (isInit) {
      setLoadingProtocol(true);
    } else {
      setLoadingCheckPort(true);
    }
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
      if (isInit) {
        setLoadingProtocol(false);
      } else {
        setLoadingCheckPort(false);
      }
    } catch (error) {
      console.error(error);
      if (isInit) {
        setLoadingProtocol(false);
      } else {
        setLoadingCheckPort(false);
      }
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

  useEffect(() => {
    console.info("ingestionInfo:", ingestionInfo);
  }, [ingestionInfo]);

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
                      name: t("applog:ingestion.s3.step.specifySource"),
                    },
                    {
                      name: t("applog:ingestion.s3.step.specifyConfig"),
                    },
                    {
                      name: t("applog:ingestion.step.createTags"),
                    },
                  ]}
                  activeIndex={curStep}
                />
              </div>
              <div className="create-content m-w-1024">
                {curStep === 0 && (
                  <div>
                    <StepChooseSource
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
                  </div>
                )}
                {curStep === 1 && (
                  <div>
                    <ApplyLogConfig
                      hideLogPath
                      logSourceType={LogSourceType.Syslog}
                      ingestionInfo={ingestionInfo}
                      changeLogPath={(path) => {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            logPath: path,
                            logPathEmptyError: false,
                          };
                        });
                      }}
                      changeExistsConfig={(configId) => {
                        const tmpConf: ExLogConf = {
                          __typename: "LogConf",
                          id: configId,
                        };
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            curLogConfig: tmpConf,
                            showChooseExistsError: false,
                          };
                        });
                      }}
                      changeUserLogFormatError={(error) => {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            logConfigError: {
                              ...prev.logConfigError,
                              showUserLogFormatError: error,
                            },
                          };
                        });
                      }}
                      changeSampleLogFormatInvalid={(invalid) => {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            logConfigError: {
                              ...prev.logConfigError,
                              showSampleLogInvalidError: invalid,
                            },
                          };
                        });
                      }}
                      hideNameError={() => {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            logConfigError: {
                              ...prev.logConfigError,
                              logConfigNameError: false,
                            },
                          };
                        });
                      }}
                      hideTypeError={() => {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            logConfigError: {
                              ...prev.logConfigError,
                              logConfigTypeError: false,
                            },
                          };
                        });
                      }}
                      changeCurLogConfig={(config) => {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            curLogConfig: config,
                            logConfigError: {
                              ...prev.logConfigError,
                              showSampleLogRequiredError: config?.userSampleLog
                                ? false
                                : true,
                            },
                          };
                        });
                      }}
                      changeLogCreationMethod={(method) => {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            logConfigMethod: method,
                          };
                        });
                      }}
                      changeSampleDashboard={(yesNo) => {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            createDashboard: yesNo,
                          };
                        });
                      }}
                      changeLoadingConfig={(loading) => {
                        setLoadingRefresh(loading);
                      }}
                    />
                  </div>
                )}
                {curStep === 2 && (
                  <div>
                    <CreateTags
                      s3IngestionInfo={ingestionInfo}
                      changeTags={(tags) => {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            tags: tags,
                          };
                        });
                      }}
                    />
                  </div>
                )}
                <div className="button-action text-right">
                  <Button
                    btnType="text"
                    onClick={() => {
                      history.push({
                        pathname: `/log-pipeline/application-log/detail/${id}`,
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
                      loading={
                        loadingCreateLogConfig ||
                        loadingCheckPort ||
                        loadingCreateSource
                      }
                      disabled={loadingRefresh || loadingProtocol}
                      onClick={() => {
                        if (curStep === 0) {
                          if (!ingestionInfo.syslogProtocol) {
                            setProtocolRequireError(true);
                            return;
                          }
                          if (portChanged) {
                            checkSysLogCustomPort();
                          } else if (!ingestionInfo.logSourceId) {
                            createSysLogSource();
                          }
                        } else {
                          setCurStep(1);
                        }
                        if (curStep === 1) {
                          if (!ingestionInfo.logPath) {
                            setIngestionInfo((prev) => {
                              return {
                                ...prev,
                                logPathEmptyError: true,
                              };
                            });
                            return;
                          }
                          if (
                            ingestionInfo.logConfigMethod ===
                              CreationMethod.New &&
                            !ingestionInfo.curLogConfig?.id
                          ) {
                            createLogConfig();
                            return;
                          }
                          if (
                            !ingestionInfo?.curLogConfig?.id &&
                            ingestionInfo.logConfigMethod ===
                              CreationMethod.Exists
                          ) {
                            setIngestionInfo((prev) => {
                              return {
                                ...prev,
                                showChooseExistsError: true,
                              };
                            });
                            return;
                          }
                          setCurStep((curStep) => {
                            return curStep + 1 > 2 ? 2 : curStep + 1;
                          });
                        }
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
                        createSysLogIngestion();
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

export default CreateSysLogIngestion;
