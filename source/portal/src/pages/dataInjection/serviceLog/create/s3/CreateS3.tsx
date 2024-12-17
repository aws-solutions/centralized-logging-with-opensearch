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
import { useNavigate } from "react-router-dom";
import CreateStep from "components/CreateStep";
import SpecifySettings from "./steps/SpecifySettings";
import Button from "components/Button";

import { appSyncRequestMutation } from "assets/js/request";
import { createServicePipeline } from "graphql/mutations";
import { DestinationType, ServiceType, MonitorInput } from "API";
import { AmplifyConfigType } from "types";
import { OptionType } from "components/AutoComplete/autoComplete";
import {
  CreateLogMethod,
  DOMAIN_ALLOW_STATUS,
  genSvcStepTitle,
  ServiceLogType,
} from "assets/js/const";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Alert } from "assets/js/alert";
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
import {
  CreateAlarmActionTypes,
  validateAlarmInput,
} from "reducer/createAlarm";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import {
  LogProcessorType,
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import ConfigOpenSearch from "../common/ConfigOpenSearch";
import { AppDispatch } from "reducer/store";
import {
  INIT_OPENSEARCH_DATA,
  OpenSearchState,
  convertOpenSearchTaskParameters,
  indexPrefixChanged,
  validateOpenSearch,
  validateOpenSearchParams,
} from "reducer/createOpenSearch";
import { useOpenSearch } from "assets/js/hooks/useOpenSearch";
import CommonLayout from "pages/layout/CommonLayout";
import { ActionType } from "reducer/appReducer";

const EXCLUDE_PARAMS = [
  "logBucketObj",
  "taskType",
  "manualBucketS3Path",
  "manualBucketName",
];
export interface S3TaskProps {
  type: ServiceType;
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  destinationType: string;
  params: {
    taskType: string;
    manualBucketS3Path: string;
    manualBucketName: string;
    logBucketName: string;
    logBucketPrefix: string;
    logBucketObj: OptionType | null;
  } & OpenSearchState;
  monitor: MonitorInput;
}

const DEFAULT_TASK_VALUE: S3TaskProps = {
  type: ServiceType.S3,
  source: "",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: DestinationType.S3,
  params: {
    logBucketName: "",
    logBucketObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketS3Path: "",
    manualBucketName: "",
    logBucketPrefix: "",
    ...INIT_OPENSEARCH_DATA,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
};

const CreateS3: React.FC = () => {
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
    { name: t("servicelog:create.service.s3") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const dispatch = useDispatch<Dispatch<Actions>>();
  const appDispatch = useDispatch<AppDispatch>();

  const [curStep, setCurStep] = useState(0);
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [s3PipelineTask, setS3PipelineTask] =
    useState<S3TaskProps>(DEFAULT_TASK_VALUE);

  const [autoS3EmptyError, setAutoS3EmptyError] = useState(false);
  const [manualS3EmptyError, setManualS3EmptyError] = useState(false);
  const [manualS3PathInvalid, setManualS3PathInvalid] = useState(false);

  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [bucketISChanging, setBucketISChanging] = useState(false);
  const [needEnableAccessLog, setNeedEnableAccessLog] = useState(false);

  const tags = useTags();
  const monitor = useSelector((state: RootState) => state.createAlarm);
  const osiParams = useSelectProcessor();
  const openSearch = useOpenSearch();

  const confirmCreatePipeline = async () => {
    // Override OpenSearch Parameters
    s3PipelineTask.params = {
      ...s3PipelineTask.params,
      ...openSearch,
    };
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.S3;
    createPipelineParams.source = s3PipelineTask.source;
    // Update domain name and engine type from openSearch
    createPipelineParams.target = openSearch.domainName;
    createPipelineParams.engine = openSearch.engineType;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId = s3PipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = s3PipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);
    createPipelineParams.logProcessorConcurrency =
      buildLambdaConcurrency(osiParams);

    const tmpParamList: any = convertOpenSearchTaskParameters(
      s3PipelineTask,
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

  const validateS3Input = () => {
    if (nextStepDisable) {
      return false;
    }
    if (needEnableAccessLog) {
      Alert(t("servicelog:s3.needEnableLogging"));
      return false;
    }
    if (s3PipelineTask.params.taskType === CreateLogMethod.Automatic) {
      if (!s3PipelineTask.params.logBucketObj) {
        setAutoS3EmptyError(true);
        return false;
      }
    }
    if (s3PipelineTask.params.taskType === CreateLogMethod.Manual) {
      if (!s3PipelineTask.params.logBucketName) {
        setManualS3EmptyError(true);
        return false;
      }
      if (
        !s3PipelineTask.params.manualBucketS3Path
          .toLowerCase()
          .startsWith("s3") ||
        !bucketNameIsValid(s3PipelineTask.params.logBucketName)
      ) {
        setManualS3PathInvalid(true);
        return false;
      }
    }
    return true;
  };

  const isNextDisabled = () => {
    return (
      bucketISChanging ||
      (curStep === 1 &&
        !DOMAIN_ALLOW_STATUS.includes(
          openSearch.domainCheckedStatus?.status
        )) ||
      osiParams.serviceAvailableCheckedLoading
    );
  };

  const isOpenSearchValid = useMemo(
    () => validateOpenSearchParams(openSearch),
    [openSearch]
  );

  const validateOpenSearchInput = () => {
    if (!isOpenSearchValid) {
      appDispatch(validateOpenSearch());
      return false;
    }
    return true;
  };

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
    dispatch({
      type: CreateAlarmActionTypes.CLEAR_ALARM,
    });
  }, []);

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-wrapper" data-testid="test-create-s3">
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
              s3Task={s3PipelineTask}
              setISChanging={(status) => {
                setBucketISChanging(status);
              }}
              manualS3EmptyError={manualS3EmptyError}
              manualS3PathInvalid={manualS3PathInvalid}
              autoS3EmptyError={autoS3EmptyError}
              changeNeedEnableLogging={(need: boolean) => {
                setNeedEnableAccessLog(need);
              }}
              changeCrossAccount={(id) => {
                setS3PipelineTask((prev: S3TaskProps) => {
                  return {
                    ...prev,
                    logSourceAccountId: id,
                  };
                });
              }}
              manualChangeBucket={(srcBucketName) => {
                // dispatch update index prefix
                appDispatch(indexPrefixChanged(srcBucketName.toLowerCase()));
                setS3PipelineTask((prev: S3TaskProps) => {
                  return {
                    ...prev,
                    source: srcBucketName,
                    params: {
                      ...prev.params,
                      manualBucketName: srcBucketName,
                    },
                  };
                });
              }}
              changeTaskType={(taskType) => {
                console.info("taskType:", taskType);
                setAutoS3EmptyError(false);
                setManualS3EmptyError(false);
                setS3PipelineTask({
                  ...DEFAULT_TASK_VALUE,
                  params: {
                    ...DEFAULT_TASK_VALUE.params,
                    taskType: taskType,
                  },
                });
              }}
              changeLogBucketObj={(s3BucketObj) => {
                console.info("s3BucketObj:", s3BucketObj);
                setAutoS3EmptyError(false);
                // dispatch update index prefix
                appDispatch(
                  indexPrefixChanged(s3BucketObj?.value?.toLowerCase() ?? "")
                );
                setS3PipelineTask((prev: S3TaskProps) => {
                  return {
                    ...prev,
                    source: s3BucketObj?.value ?? "",
                    params: {
                      ...prev.params,
                      logBucketObj: s3BucketObj,
                    },
                  };
                });
              }}
              changeS3Bucket={(bucketName) => {
                setS3PipelineTask((prev: S3TaskProps) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      logBucketName: bucketName,
                    },
                  };
                });
              }}
              changeLogPath={(logPath) => {
                if (s3PipelineTask.params.taskType === CreateLogMethod.Manual) {
                  setManualS3EmptyError(false);
                  setManualS3PathInvalid(false);
                  const { bucket, prefix } =
                    splitStringToBucketAndPrefix(logPath);
                  setS3PipelineTask((prev: S3TaskProps) => {
                    return {
                      ...prev,
                      params: {
                        ...prev.params,
                        manualBucketS3Path: logPath,
                        logBucketName: bucket,
                        logBucketPrefix: prefix,
                      },
                    };
                  });
                } else {
                  setS3PipelineTask((prev: S3TaskProps) => {
                    return {
                      ...prev,
                      params: {
                        ...prev.params,
                        logBucketPrefix: logPath,
                      },
                    };
                  });
                }
              }}
              setNextStepDisableStatus={(status) => {
                setNextStepDisable(status);
              }}
            />
          )}
          {curStep === 1 && (
            <ConfigOpenSearch taskType={ServiceLogType.Amazon_S3} />
          )}
          {curStep === 2 && (
            <div>
              <SelectLogProcessor supportOSI={false} />
            </div>
          )}
          {curStep === 3 && (
            <div>
              <AlarmAndTags
                pipelineTask={s3PipelineTask}
                osiParams={osiParams}
              />
            </div>
          )}
          <div className="button-action text-right">
            <Button
              data-testid="s3-cancel-button"
              btnType="text"
              onClick={() => {
                navigate("/log-pipeline/service-log/create");
              }}
            >
              {t("button.cancel")}
            </Button>
            {curStep > 0 && (
              <Button
                data-testid="s3-previous-button"
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
                data-testid="s3-next-button"
                disabled={isNextDisabled()}
                btnType="primary"
                onClick={() => {
                  if (curStep === 0) {
                    if (!validateS3Input()) {
                      return;
                    }
                  }
                  if (curStep === 1) {
                    if (!validateOpenSearchInput()) {
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
                data-testid="s3-create-button"
                loading={loadingCreate}
                btnType="primary"
                onClick={async () => {
                  if (!validateAlarmInput(monitor)) {
                    dispatch({
                      type: CreateAlarmActionTypes.VALIDATE_ALARM_INPUT,
                    });
                    return;
                  }
                  await confirmCreatePipeline();
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

export default CreateS3;
