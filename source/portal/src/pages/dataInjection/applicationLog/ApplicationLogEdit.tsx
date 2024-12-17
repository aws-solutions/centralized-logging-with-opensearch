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

import Button from "components/Button/button";
import HeaderPanel from "components/HeaderPanel";
import CommonLayout from "pages/layout/CommonLayout";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import { AppLogIngestion, AppPipeline, LogConfig, LogSourceType } from "API";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { defaultStr } from "assets/js/utils";
import {
  getAppPipeline,
  getLogConfig,
  listAppLogIngestions,
} from "graphql/queries";
import { SelectLogConfigRevision } from "./common/SelectLogConfigRevision";
import { refreshAppLogIngestion, updateAppPipeline } from "graphql/mutations";
import SelectLogProcessor from "pages/comps/processor/SelectLogProcessor";
import { useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { Actions } from "reducer/reducers";
import {
  LogProcessorType,
  SelectProcessorActionTypes,
  validateOCUInput,
} from "reducer/selectProcessor";
import { useSelectProcessor } from "assets/js/hooks/useSelectProcessor";
import UnmodifiableLogConfigSelector from "./common/UnmodifiableLogConfigSelector";
import Alert from "components/Alert";

const ApplicationLogEdit: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("applog:name"),
      link: "/log-pipeline/application-log",
    },
    {
      name: id,
      link: `/log-pipeline/application-log/detail/${id}`,
    },
    {
      name: t("applog:edit.name"),
    },
  ];
  const [loadingData, setLoadingData] = useState(false);
  const [logConfig, setLogConfig] = useState<ExLogConf>();
  const osiParams = useSelectProcessor();
  const [selectedRevision, setSelectedRevision] = useState(
    `${logConfig?.version ?? 0}`
  );
  const [updatingPipeline, setUpdatingPipeline] = useState(false);
  const [isOSI, setIsOSI] = useState(false);
  const dispatch = useDispatch<Dispatch<Actions>>();
  const [configVersion, setConfigVersion] = useState(0);
  const [sourceSet, setSourceSet] = useState<Set<string>>(new Set<string>());

  const updatePipeline = async () => {
    dispatch({
      type: SelectProcessorActionTypes.VALIDATE_OCU_INPUT,
    });
    if (!validateOCUInput(osiParams)) {
      return;
    }
    try {
      setUpdatingPipeline(true);
      await appSyncRequestMutation(updateAppPipeline, {
        id: id,
        logConfigId: logConfig?.id,
        logConfigVersionNumber: parseInt(selectedRevision, 10),
        logProcessorConcurrency: osiParams.logProcessorConcurrency,
      });
      await appSyncRequestMutation(refreshAppLogIngestion, {
        appPipelineId: id,
      });
      navigate("/log-pipeline/application-log");
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setUpdatingPipeline(false);
    }
  };

  const fetchLogConfig = async (
    configId: string,
    logConfigRevision: number
  ) => {
    const res = await appSyncRequestQuery(getLogConfig, {
      id: configId,
      version: logConfigRevision,
    });
    setLogConfig(res.data.getLogConfig);
    setLoadingData(false);
  };

  const getPipelineSourceSet = async () => {
    const tmpSourceSet = new Set<string>();
    try {
      const ingestionResData: any = await appSyncRequestQuery(
        listAppLogIngestions,
        {
          page: 1,
          count: 999,
          appPipelineId: id,
        }
      );
      console.info("app pipe resData:", ingestionResData);
      const dataIngestion: AppLogIngestion[] =
        ingestionResData.data.listAppLogIngestions.appLogIngestions;
      dataIngestion.forEach((element) =>
        tmpSourceSet.add(defaultStr(element?.sourceType))
      );
      setSourceSet(tmpSourceSet);
    } catch (error) {
      console.error(error);
    }
  };

  const getPipelineById = async () => {
    try {
      setLoadingData(true);

      const resData: any = await appSyncRequestQuery(getAppPipeline, {
        id: encodeURIComponent(defaultStr(id)),
      });
      console.info("resData:", resData);
      const dataPipeline: AppPipeline = resData.data.getAppPipeline;
      setConfigVersion(dataPipeline?.logConfigVersionNumber ?? 0);
      await getPipelineSourceSet();
      await fetchLogConfig(
        dataPipeline?.logConfigId ?? "",
        dataPipeline?.logConfigVersionNumber ?? 0
      );
      const isOSIPipeline = !!(
        dataPipeline?.osiParams?.minCapacity &&
        dataPipeline?.osiParams?.maxCapacity
      );
      if (isOSIPipeline) {
        dispatch({
          type: SelectProcessorActionTypes.CHANGE_PROCESSOR_TYPE,
          processorType: LogProcessorType.OSI,
        });
        dispatch({
          type: SelectProcessorActionTypes.CHANGE_MIN_OCU,
          minOCU: dataPipeline.osiParams?.minCapacity?.toString() ?? "",
        });
        dispatch({
          type: SelectProcessorActionTypes.CHANGE_MAX_OCU,
          maxOCU: dataPipeline.osiParams?.maxCapacity?.toString() ?? "",
        });
      } else {
        dispatch({
          type: SelectProcessorActionTypes.CHANGE_PROCESSOR_TYPE,
          processorType: LogProcessorType.LAMBDA,
        });
        dispatch({
          type: SelectProcessorActionTypes.CHANGE_LAMBDA_CONCURRENCY,
          concurrency: dataPipeline.logProcessorConcurrency ?? "",
        });
      }
      setIsOSI(isOSIPipeline);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    if (id) {
      getPipelineById();
    }
  }, [id]);

  const logConfigEditDisabled = useMemo(
    () =>
      [LogSourceType.S3, LogSourceType.Syslog].some((type) =>
        sourceSet.has(type)
      ),
    [sourceSet]
  );

  if (logConfigEditDisabled) {
    return (
      <CommonLayout loadingData={loadingData} breadCrumbList={breadCrumbList}>
        <Alert
          title={t("applog:edit.notSupported")}
          content={t("applog:edit.editNotSupported")}
        />
      </CommonLayout>
    );
  }

  return (
    <CommonLayout loadingData={loadingData} breadCrumbList={breadCrumbList}>
      <div className="create-wrapper">
        <div className="create-content m-w-1024">
          <HeaderPanel title={t("applog:edit.logConfig")}>
            {logConfig && (
              <>
                <UnmodifiableLogConfigSelector
                  hideRefreshButton
                  hideViewDetailButton
                  title={t("applog:logSourceDesc.eks.step2.logConfigName")}
                  desc=""
                  configId={defaultStr(logConfig.id)}
                  configVersion={configVersion}
                  hideAlert
                />

                <SelectLogConfigRevision
                  logConfig={logConfig as LogConfig}
                  onRevisionChange={({ version }) =>
                    setSelectedRevision(`${version}`)
                  }
                />
              </>
            )}
          </HeaderPanel>
          <SelectLogProcessor
            hideTitle
            supportOSI={true}
            disableLambda={isOSI}
            disableOSI={!isOSI}
            disableInput={true}
          />
          <div className="button-action text-right">
            <Button
              btnType="text"
              onClick={() => {
                navigate("/log-pipeline/application-log");
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              btnType="primary"
              loading={updatingPipeline}
              onClick={() => {
                updatePipeline();
              }}
            >
              {t("button.save")}
            </Button>
          </div>
        </div>
      </div>
    </CommonLayout>
  );
};

export default ApplicationLogEdit;
