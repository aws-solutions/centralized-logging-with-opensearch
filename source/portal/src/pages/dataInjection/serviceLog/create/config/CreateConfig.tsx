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
import { DestinationType, ServiceType, MonitorInput } from "API";
import { Alert } from "assets/js/alert";
import {
  CreateLogMethod,
  DOMAIN_ALLOW_STATUS,
  genSvcStepTitle,
  ServiceLogType,
} from "assets/js/const";
import { appSyncRequestMutation } from "assets/js/request";
import Button from "components/Button";
import CreateStep from "components/CreateStep";
import { createServicePipeline } from "graphql/mutations";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AmplifyConfigType } from "types";
import SpecifySettings from "./steps/SpecifySettings";
import {
  bucketNameIsValid,
  buildLambdaConcurrency,
  buildOSIParamsValue,
  splitStringToBucketAndPrefix,
} from "assets/js/utils";
import { MONITOR_ALARM_INIT_DATA } from "assets/js/init";
import AlarmAndTags from "../../../../pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import { Dispatch } from "redux";
import { ActionType } from "reducer/appReducer";
import {
  CreateAlarmActionTypes,
  validateAlarmInput,
} from "reducer/createAlarm";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  LogProcessorType,
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";
import {
  INIT_OPENSEARCH_DATA,
  OpenSearchState,
  convertOpenSearchTaskParameters,
  indexPrefixChanged,
  validateOpenSearch,
  validateOpenSearchParams,
} from "reducer/createOpenSearch";
import { AppDispatch } from "reducer/store";
import { useOpenSearch } from "assets/js/hooks/useOpenSearch";
import ConfigOpenSearch from "../common/ConfigOpenSearch";
import CommonLayout from "pages/layout/CommonLayout";

const EXCLUDE_PARAMS = ["manualBucketS3Path", "taskType"];

export interface ConfigTaskProps {
  type: ServiceType;
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  destinationType: string;
  params: {
    taskType: string;
    logBucketName: string;
    logBucketPrefix: string;
    manualBucketS3Path: string;
  } & OpenSearchState;
  monitor: MonitorInput;
}

const DEFAULT_CONFIG_TASK_VALUE: ConfigTaskProps = {
  type: ServiceType.Config,
  source: "Default",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: DestinationType.S3,
  params: {
    taskType: CreateLogMethod.Automatic,
    manualBucketS3Path: "",
    logBucketName: "",
    logBucketPrefix: "",
    ...INIT_OPENSEARCH_DATA,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
};

const CreateConfig: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("servicelog:name"),
      link: "/log-pipeline/service-log",
    },
    {
      name: t("servicelog:create.name"),
      link: "/log-pipeline/service-log/create",
    },
    { name: t("servicelog:create.service.config") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const dispatch = useDispatch<Dispatch<Actions>>();
  const appDispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [configPipelineTask, setConfigPipelineTask] = useState<ConfigTaskProps>(
    DEFAULT_CONFIG_TASK_VALUE
  );
  const [curStep, setCurStep] = useState(0);
  const [nextStepDisable, setNextStepDisable] = useState(false);

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [configEmptyError, setConfigEmptyError] = useState(false);
  const [manualConfigEmptyError, setManualConfigEmptyError] = useState(false);
  const [manualS3PathInvalid, setManualS3PathInvalid] = useState(false);

  const tags = useTags();
  const monitor = useSelector((state: RootState) => state.createAlarm);
  const osiParams = useSelectProcessor();
  const openSearch = useOpenSearch();

  const confirmCreatePipeline = async () => {
    // Override OpenSearch Parameters
    configPipelineTask.params = {
      ...configPipelineTask.params,
      ...openSearch,
    };
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.Config;
    createPipelineParams.source = configPipelineTask.source;
    // Update domain name and engine type from openSearch
    createPipelineParams.target = openSearch.domainName;
    createPipelineParams.engine = openSearch.engineType;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      configPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = configPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);
    createPipelineParams.logProcessorConcurrency =
      buildLambdaConcurrency(osiParams);

    const tmpParamList: any = convertOpenSearchTaskParameters(
      configPipelineTask,
      EXCLUDE_PARAMS,
      openSearch
    );

    // Add Default Failed Log Bucket
    tmpParamList.push({
      parameterKey: "backupBucketName",
      parameterValue: amplifyConfig.default_logging_bucket,
    });

    // Add defaultCmkArnParam
    tmpParamList.push({
      parameterKey: "defaultCmkArnParam",
      parameterValue: amplifyConfig.default_cmk_arn,
    });

    createPipelineParams.parameters = tmpParamList;
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createServicePipeline,
        createPipelineParams
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      navigate("/log-pipeline/service-log");
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  const isConfigSettingValid = () => {
    if (nextStepDisable) {
      return false;
    }
    if (!configPipelineTask.source) {
      setConfigEmptyError(true);
      return false;
    }
    if (!configPipelineTask.params.logBucketName) {
      if (configPipelineTask.params.taskType === CreateLogMethod.Manual) {
        setManualConfigEmptyError(true);
        return false;
      }
      Alert(t("servicelog:config.needEnableLogging"));
      console.error("need enablle aws config");
      return false;
    }
    if (
      configPipelineTask.params.taskType === CreateLogMethod.Manual &&
      (!configPipelineTask.params.manualBucketS3Path
        .toLowerCase()
        .startsWith("s3") ||
        !bucketNameIsValid(configPipelineTask.params.logBucketName))
    ) {
      setManualS3PathInvalid(true);
      return false;
    }
    return true;
  };

  const isOpenSearchValid = useMemo(
    () => validateOpenSearchParams(openSearch),
    [openSearch]
  );

  const isNextDisabled = () => {
    return (
      openSearch?.domainLoading ||
      nextStepDisable ||
      (curStep === 1 &&
        !DOMAIN_ALLOW_STATUS.includes(
          openSearch?.domainCheckedStatus?.status
        )) ||
      osiParams?.serviceAvailableCheckedLoading
    );
  };

  useEffect(() => {
    // update index prefix as default
    appDispatch(indexPrefixChanged("default"));
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
    dispatch({
      type: CreateAlarmActionTypes.CLEAR_ALARM,
    });
  }, []);

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-wrapper" data-testid="test-create-config">
        <div className="create-step">
          <CreateStep
            list={genSvcStepTitle(
              osiParams.logProcessorType === LogProcessorType.OSI
            ).map((item) => {
              return {
                name: t(item),
              };
            })}
            activeIndex={curStep}
          />
        </div>
        <div className="create-content m-w-1024">
          {curStep === 0 && (
            <SpecifySettings
              configTask={configPipelineTask}
              configEmptyError={configEmptyError}
              manualConfigEmptyError={manualConfigEmptyError}
              manualS3PathInvalid={manualS3PathInvalid}
              changeCrossAccount={(id) => {
                setConfigPipelineTask((prev) => {
                  return {
                    ...prev,
                    logSourceAccountId: id,
                  };
                });
              }}
              changeTaskType={(taskType) => {
                console.info("taskType:", taskType);
                setConfigEmptyError(false);
                setManualConfigEmptyError(false);
                setConfigPipelineTask({
                  ...DEFAULT_CONFIG_TASK_VALUE,
                  params: {
                    ...DEFAULT_CONFIG_TASK_VALUE.params,
                    taskType: taskType,
                  },
                });
              }}
              changeConfigName={(name) => {
                setConfigEmptyError(false);
                appDispatch(indexPrefixChanged(name.toLowerCase()));
                setConfigPipelineTask((prev) => {
                  return {
                    ...prev,
                    source: name,
                  };
                });
              }}
              changeManualBucketS3Path={(manualPath) => {
                setManualConfigEmptyError(false);
                setManualS3PathInvalid(false);
                const { bucket, prefix } =
                  splitStringToBucketAndPrefix(manualPath);
                setConfigPipelineTask((prev) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      manualBucketS3Path: manualPath,
                      logBucketName: bucket,
                      logBucketPrefix: prefix,
                    },
                  };
                });
              }}
              changeLogBucket={(bucketName) => {
                setConfigPipelineTask((prev) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      logBucketName: bucketName,
                    },
                  };
                });
              }}
              changeLogPrefix={(prefix) => {
                setConfigPipelineTask((prev) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      logBucketPrefix: prefix,
                    },
                  };
                });
              }}
              setNextStepDisableStatus={(status) => {
                setNextStepDisable(status);
              }}
            />
          )}
          {curStep === 1 && (
            <ConfigOpenSearch taskType={ServiceLogType.Amazon_Config} />
          )}
          {curStep === 2 && (
            <div>
              <SelectLogProcessor supportOSI={false} />
            </div>
          )}
          {curStep === 3 && (
            <div>
              <AlarmAndTags
                pipelineTask={configPipelineTask}
                osiParams={osiParams}
              />
            </div>
          )}
          <div className="button-action text-right">
            <Button
              data-testid="config-cancel-button"
              btnType="text"
              onClick={() => {
                navigate("/log-pipeline/service-log/create");
              }}
            >
              {t("button.cancel")}
            </Button>
            {curStep > 0 && (
              <Button
                data-testid="config-previous-button"
                onClick={() => {
                  setCurStep((curStep) => {
                    return curStep - 1 < 0 ? 0 : curStep - 1;
                  });
                }}
              >
                {t("button.previous")}
              </Button>
            )}

            {curStep < 3 && (
              <Button
                data-testid="config-next-button"
                disabled={isNextDisabled()}
                btnType="primary"
                onClick={() => {
                  if (curStep === 0 && !isConfigSettingValid()) {
                    return;
                  }
                  if (curStep === 1) {
                    if (!isOpenSearchValid) {
                      appDispatch(validateOpenSearch());
                      return;
                    }
                  }
                  if (curStep === 2) {
                    dispatch({
                      type: SelectProcessorActionTypes.VALIDATE_OCU_INPUT,
                    });
                    if (!validateOCUInput(osiParams)) {
                      return;
                    }
                  }
                  setCurStep((curStep) => {
                    return curStep + 1 > 3 ? 3 : curStep + 1;
                  });
                }}
              >
                {t("button.next")}
              </Button>
            )}
            {curStep === 3 && (
              <Button
                data-testid="config-create-button"
                loading={loadingCreate}
                btnType="primary"
                onClick={() => {
                  if (!validateAlarmInput(monitor)) {
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
    </CommonLayout>
  );
};

export default CreateConfig;
