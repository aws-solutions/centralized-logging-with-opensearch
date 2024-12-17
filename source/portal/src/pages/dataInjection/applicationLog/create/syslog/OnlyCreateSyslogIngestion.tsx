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
import { appSyncRequestMutation } from "assets/js/request";
import { createAppLogIngestion, createLogSource } from "graphql/mutations";
import { CreateAppLogIngestionMutationVariables, LogSourceType } from "API";
import { YesNo, CreationMethod } from "types";
import { ActionType } from "reducer/appReducer";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import Button from "components/Button";
import { checkCustomPort } from "graphql/queries";
import StepChooseSyslogSource from "./steps/StepChooseSyslogSource";
import { Alert } from "assets/js/alert";
import { IngestionFromSysLogPropsType } from "./CreateSyslog";
import { useTags } from "assets/js/hooks/useTags";
import { Actions } from "reducer/reducers";
import { Dispatch } from "redux";
import { defaultStr } from "assets/js/utils";
import CommonLayout from "pages/layout/CommonLayout";

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

  const navigate = useNavigate();
  const dispatch = useDispatch<Dispatch<Actions>>();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const tags = useTags();

  const [loadingProtocol, setLoadingProtocol] = useState(false);
  const [loadingCreateSource, setLoadingCreateSource] = useState(false);
  const [loadingCheckPort, setLoadingCheckPort] = useState(false);
  const [protocolRequireError, setProtocolRequireError] = useState(false);
  const [portConflictError, setPortConflictError] = useState(false);
  const [portOutOfRangeError, setPortOutOfRangeError] = useState(false);

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

  const handleNotRecommendedPort = (checkRes: any) => {
    if (checkRes?.data?.checkCustomPort?.isAllowedPort) {
      createSysLogSource();
    } else if (
      checkRes?.data?.checkCustomPort?.isAllowedPort === false &&
      checkRes?.data?.checkCustomPort?.msg === "Conflict"
    ) {
      setPortConflictError(true);
    } else if (
      checkRes?.data?.checkCustomPort?.isAllowedPort === false &&
      checkRes?.data?.checkCustomPort?.msg === "OutofRange"
    ) {
      setPortOutOfRangeError(true);
    } else {
      Alert(checkRes?.data?.checkCustomPort?.msg);
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
        handleNotRecommendedPort(checkRes);
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
      if (createRes.data?.createLogSource) {
        confirmCreateIngestion(createRes.data.createLogSource);
      }
    } catch (error) {
      setLoadingCreateSource(false);
      console.error(error);
    }
  };

  const confirmCreateIngestion = async (logSourceId: string) => {
    try {
      setLoadingCreate(true);

      const ingestionParams: CreateAppLogIngestionMutationVariables = {
        sourceId: logSourceId,
        appPipelineId: defaultStr(appPipelineId),
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
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-content m-w-1024">
        <StepChooseSyslogSource
          ingestionInfo={ingestionInfo}
          loadingProtocol={loadingProtocol}
          protocolRequireError={protocolRequireError}
          portConfictError={portConflictError}
          portOutofRangeError={portOutOfRangeError}
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
            setPortConflictError(false);
            setPortOutOfRangeError(false);
            setIngestionInfo((prev) => {
              return {
                ...prev,
                syslogPort: port,
              };
            });
          }}
        />
        <div className="button-action text-right">
          <Button
            data-testid="syslog-cancel-button"
            btnType="text"
            onClick={() => {
              navigate(`/log-pipeline/application-log/detail/${appPipelineId}`);
            }}
          >
            {t("button.cancel")}
          </Button>

          <Button
            data-testid="syslog-create-button"
            loading={
              loadingCreate ||
              loadingCreateSource ||
              loadingCheckPort ||
              loadingProtocol
            }
            btnType="primary"
            onClick={() => {
              if (!ingestionInfo.syslogProtocol) {
                setProtocolRequireError(true);
                return;
              }
              if (portChanged) {
                checkSysLogCustomPort();
              } else {
                createSysLogSource();
              }
            }}
          >
            {t("button.create")}
          </Button>
        </div>
      </div>
    </CommonLayout>
  );
};

export default OnlySyslogIngestion;
