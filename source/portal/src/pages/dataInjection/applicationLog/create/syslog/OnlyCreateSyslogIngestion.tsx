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
import { useNavigate, useParams } from "react-router-dom";
import CreateStep from "components/CreateStep";
import Breadcrumb from "components/Breadcrumb";
import { appSyncRequestMutation } from "assets/js/request";
import { createAppLogIngestion, createLogSource } from "graphql/mutations";
import { CreateAppLogIngestionMutationVariables, LogSourceType } from "API";
import { YesNo, CreationMethod } from "types";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { ActionType } from "reducer/appReducer";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import Button from "components/Button";
import { checkCustomPort } from "graphql/queries";
import StepChooseSyslogSource from "./steps/StepChooseSyslogSource";
import PagePanel from "components/PagePanel";
import { Alert } from "assets/js/alert";
import { IngestionFromSysLogPropsType } from "./CreateSyslog";
import { Validator } from "pages/comps/Validator";
import { useTags } from "assets/js/hooks/useTags";
import { CreateTags } from "pages/dataInjection/common/CreateTags";
import { Actions } from "reducer/reducers";
import { Dispatch } from "redux";

const OnlySyslogIngestion: React.FC = () => {
  const { id: appPipelineId } = useParams();
  const { t } = useTranslation();

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("applog:name"),
      link: "/log-pipeline/application-log",
    },
    {
      name: appPipelineId,
      link: "/log-pipeline/application-log/detail/" + appPipelineId,
    },
    { name: t("applog:logSourceDesc.syslog.title") },
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const dispatch = useDispatch<Dispatch<Actions>>();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const tags = useTags();

  const [loadingProtocol, setLoadingProtocol] = useState(false);
  const [loadingCreateSource, setLoadingCreateSource] = useState(false);
  const [loadingCheckPort, setLoadingCheckPort] = useState(false);
  const [protocolRequireError, setProtocolRequireError] = useState(false);
  const [portConfictError, setPortConfictError] = useState(false);
  const [portOutofRangeError, setPortOutofRangeError] = useState(false);

  const [portChanged, setPortChanged] = useState(false);

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
      showChooseExistsError: false,
      logPathEmptyError: false,
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

  const logSourceValidator = new Validator(() => {
    if (!ingestionInfo.syslogProtocol) {
      setProtocolRequireError(true);
      throw new Error("Protocol is required");
    }
    if (!portConfictError) {
      throw new Error("Port is conflict");
    }
    if (!portOutofRangeError) {
      throw new Error("Port is out of range");
    }
  });

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
      setLoadingProtocol(false);
      setLoadingCheckPort(false);
    } catch (error) {
      console.error(error);
      setLoadingProtocol(false);
      setLoadingCheckPort(false);
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
      name: t("applog:logSourceDesc.syslog.step5.naviTitle"),
      element: (
        <PagePanel title={t("applog:logSourceDesc.syslog.step5.title")}>
          <CreateTags />
        </PagePanel>
      ),
      validators: [],
    },
  ];

  const confirmCreateIngestion = async () => {
    try {
      setLoadingCreate(true);

      const ingestionParams: CreateAppLogIngestionMutationVariables = {
        sourceId: ingestionInfo.logSourceId,
        appPipelineId: appPipelineId || "",
        tags,
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
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
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
                      navigate(
                        `/log-pipeline/application-log/detail/${appPipelineId}`
                      );
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
                      disabled={loadingProtocol}
                      btnType="primary"
                      onClick={() => {
                        if (currentStep === 0) {
                          if (!ingestionInfo.syslogProtocol) {
                            setProtocolRequireError(true);
                            return;
                          }
                          if (portChanged) {
                            checkSysLogCustomPort();
                          } else if (!ingestionInfo.logSourceId) {
                            createSysLogSource();
                          }
                        }
                        if (portConfictError || portOutofRangeError) {
                          return;
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
                        confirmCreateIngestion();
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

export default OnlySyslogIngestion;
