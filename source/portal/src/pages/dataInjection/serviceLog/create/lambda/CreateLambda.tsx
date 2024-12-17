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
import { useNavigate } from "react-router-dom";
import CreateStep from "components/CreateStep";
import SpecifySettings from "./steps/SpecifySettings";
import Button from "components/Button";

import { DestinationType, ServiceType, MonitorInput } from "API";
import { AmplifyConfigType } from "types";
import { appSyncRequestMutation } from "assets/js/request";
import { createServicePipeline } from "graphql/mutations";
import { OptionType } from "components/AutoComplete/autoComplete";
import {
  DOMAIN_ALLOW_STATUS,
  genSvcStepTitle,
  LAMBDA_TASK_GROUP_PREFIX,
  ServiceLogType,
} from "assets/js/const";

import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
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
import {
  buildLambdaConcurrency,
  buildOSIParamsValue,
  defaultStr,
} from "assets/js/utils";
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
import { useOpenSearch } from "assets/js/hooks/useOpenSearch";
import { AppDispatch } from "reducer/store";
import ConfigOpenSearch from "../common/ConfigOpenSearch";
import CommonLayout from "pages/layout/CommonLayout";

const EXCLUDE_PARAMS = ["curLambdaObj", "kdsShardNumber", "kdsRetentionHours"];
export interface LambdaTaskProps {
  type: ServiceType;
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  destinationType: string;
  params: {
    curLambdaObj: OptionType | null;
    logGroupNames: string;
    kdsShardNumber: string;
    kdsRetentionHours: string;
    logBucketName: string;
    logBucketPrefix: string;
  } & OpenSearchState;
  monitor: MonitorInput;
}

const DEFAULT_LAMBDA_TASK_VALUE: LambdaTaskProps = {
  type: ServiceType.Lambda,
  source: "",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: DestinationType.CloudWatch,
  params: {
    curLambdaObj: null,
    logGroupNames: "",
    kdsShardNumber: "",
    kdsRetentionHours: "",
    logBucketName: "",
    logBucketPrefix: "",
    ...INIT_OPENSEARCH_DATA,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
};

const CreateLambda: React.FC = () => {
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
    { name: t("servicelog:create.service.lambda") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const dispatch = useDispatch<Dispatch<Actions>>();

  const [lambdaPipelineTask, setLambdaPipelineTask] = useState<LambdaTaskProps>(
    DEFAULT_LAMBDA_TASK_VALUE
  );

  const [curStep, setCurStep] = useState(0);
  const navigate = useNavigate();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [lambdaEmptyError, setLambdaEmptyError] = useState(false);
  const [lambdaIsChanging, setLambdaIsChanging] = useState(false);

  const tags = useTags();
  const monitor = useSelector((state: RootState) => state.createAlarm);
  const osiParams = useSelectProcessor();
  const openSearch = useOpenSearch();
  const appDispatch = useDispatch<AppDispatch>();

  const confirmCreatePipeline = async () => {
    lambdaPipelineTask.params = {
      ...lambdaPipelineTask.params,
      ...openSearch,
    };
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.Lambda;
    createPipelineParams.source = lambdaPipelineTask.source;
    // Update domain name and engine type from openSearch
    createPipelineParams.target = openSearch.domainName;
    createPipelineParams.engine = openSearch.engineType;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      lambdaPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = lambdaPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;
    createPipelineParams.osiParams = buildOSIParamsValue(osiParams);
    createPipelineParams.logProcessorConcurrency =
      buildLambdaConcurrency(osiParams);

    const tmpParamList: any = convertOpenSearchTaskParameters(
      lambdaPipelineTask,
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

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
    dispatch({
      type: CreateAlarmActionTypes.CLEAR_ALARM,
    });
  }, []);

  const isNextDisabled = () => {
    return (
      lambdaIsChanging ||
      openSearch.domainLoading ||
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

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-wrapper" data-testid="test-create-lambda">
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
              lambdaEmptyError={lambdaEmptyError}
              setISChanging={(status) => {
                setLambdaIsChanging(status);
              }}
              changeCrossAccount={(id) => {
                setLambdaPipelineTask((prev: LambdaTaskProps) => {
                  return {
                    ...prev,
                    logSourceAccountId: id,
                  };
                });
              }}
              changeLambdaBucket={(bucket, prefix) => {
                setLambdaPipelineTask((prev: LambdaTaskProps) => {
                  return {
                    ...prev,
                    params: {
                      ...prev.params,
                      logBucketName: bucket,
                      logBucketPrefix: prefix,
                    },
                  };
                });
              }}
              changeLambdaObj={(lambda) => {
                setLambdaEmptyError(false);
                appDispatch(
                  indexPrefixChanged(lambda?.value?.toLowerCase() ?? "")
                );
                setLambdaPipelineTask((prev: LambdaTaskProps) => {
                  return {
                    ...prev,
                    source: defaultStr(lambda?.value),
                    params: {
                      ...prev.params,
                      logGroupNames:
                        LAMBDA_TASK_GROUP_PREFIX + defaultStr(lambda?.value),
                      curLambdaObj: lambda,
                    },
                  };
                });
              }}
              lambdaTask={lambdaPipelineTask}
            />
          )}
          {curStep === 1 && (
            <ConfigOpenSearch taskType={ServiceLogType.Amazon_Lambda} />
          )}
          {curStep === 2 && (
            <div>
              <SelectLogProcessor supportOSI={false} />
            </div>
          )}
          {curStep === 3 && (
            <div>
              <AlarmAndTags
                pipelineTask={lambdaPipelineTask}
                osiParams={osiParams}
              />
            </div>
          )}
          <div className="button-action text-right">
            <Button
              data-testid="lambda-cancel-button"
              disabled={loadingCreate}
              btnType="text"
              onClick={() => {
                navigate("/log-pipeline/service-log/create");
              }}
            >
              {t("button.cancel")}
            </Button>
            {curStep > 0 && (
              <Button
                data-testid="lambda-previous-button"
                disabled={loadingCreate}
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
                data-testid="lambda-next-button"
                disabled={isNextDisabled()}
                btnType="primary"
                onClick={() => {
                  if (curStep === 0) {
                    if (!lambdaPipelineTask.params.curLambdaObj) {
                      setLambdaEmptyError(true);
                      return;
                    }
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
                data-testid="lambda-create-button"
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

export default CreateLambda;
