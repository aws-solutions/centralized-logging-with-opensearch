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
import { useParams } from "react-router-dom";
import { AntTabs, AntTab, TabPanel } from "components/Tab";
import Ingestion, { isS3SourcePipeline } from "./detail/Ingestion";
import { ApiResponse, appSyncRequestQuery } from "assets/js/request";
import {
  getAppPipeline,
  getLightEngineAppPipelineDetail,
  listAppLogIngestions,
} from "graphql/queries";
import {
  AppPipeline,
  AppLogIngestion,
  AnalyticEngineType,
  LightEnginePipelineDetailResponse,
  AnalyticsEngine,
  Schedule,
  PipelineType,
  PipelineStatus,
} from "API";
import { defaultStr, isOSIPipeline } from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import BufferLayerDetails from "./detail/BufferLayerDetails";
import Alarm from "./detail/Alarm";
import Monitoring from "../applicationLog/detail/Monitoring";
import Logging from "../applicationLog/detail/Logging";
import { RootState } from "reducer/reducers";
import Tags from "../common/Tags";
import { LightEngineAnalyticsEngineDetails } from "../common/LightEngineAnalyticsEngineDetails";
import { LightEngineLogProcessor } from "../common/LightEngineLogProcessor";
import { LightEngineLoggingList } from "../common/LightEngineLoggingList";
import LogProcessor from "./detail/LogProcessor";
import CommonLayout from "pages/layout/CommonLayout";
import GeneralConfig from "../common/details/GeneralConfig";
import Alert from "components/Alert";
import HeaderPanel from "components/HeaderPanel";
import AnalyticsEngineDetails from "../common/details/AnalyticsEngineDetails";
import PipelineLogConfig from "../ingestiondetail/comps/LogConfig";

let intervalId: any = 0;

const clearFetchPipelineInterval = () => {
  clearInterval(intervalId);
  intervalId = 0;
};

const ApplicationLogDetail: React.FC = () => {
  const { id } = useParams();
  const tmpSourceSet = new Set<string>();
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("applog:name"),
      link: "/log-pipeline/application-log",
    },
    {
      name: defaultStr(id),
    },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const [loadingData, setLoadingData] = useState(true);
  const [curPipeline, setCurPipeline] = useState<AppPipeline | undefined>();
  const [activeTab, setActiveTab] = useState("logSource");
  const [sourceSet, setSourceSet] = useState<Set<string>>(new Set<string>());
  const [analyticsEngine, setAnalyticsEngine] = useState<
    AnalyticsEngine | undefined
  >();
  const [schedules, setSchedules] = useState<Schedule[] | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getPipelineById = async (hideLoading = false) => {
    try {
      if (!hideLoading) {
        setLoadingData(true);
      }
      const resData: any = await appSyncRequestQuery(getAppPipeline, {
        id: encodeURIComponent(defaultStr(id)),
      });
      console.info("resData:", resData);
      const dataPipeline: AppPipeline = resData.data.getAppPipeline;
      if (
        dataPipeline.status === PipelineStatus.ACTIVE ||
        dataPipeline.status === PipelineStatus.ERROR
      ) {
        setIsRefreshing(false);
        clearFetchPipelineInterval();
      }
      setCurPipeline(dataPipeline);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  const isLightEngine = useMemo(
    () => curPipeline?.engineType === AnalyticEngineType.LightEngine,
    [curPipeline]
  );

  const getPipelineSourceSet = async () => {
    try {
      const ingestionResData: any = await appSyncRequestQuery(
        listAppLogIngestions,
        {
          page: 1,
          count: 999,
          appPipelineId: curPipeline?.pipelineId,
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

  // Auto refresh pipeline detail
  useEffect(() => {
    if (!curPipeline) {
      // initial fetch pipeline
      getPipelineById();
    }
    if (
      !intervalId &&
      curPipeline &&
      ![PipelineStatus.ACTIVE, PipelineStatus.ERROR].includes(
        curPipeline.status!
      )
    ) {
      // polling the pipeline if the pipeline is creating or updating
      intervalId = setInterval(() => {
        setIsRefreshing(true);
        getPipelineById(true);
      }, 10000);
    }
    return () => {
      setIsRefreshing(false);
      clearFetchPipelineInterval();
    };
  }, [curPipeline, curPipeline?.status]);

  useEffect(() => {
    console.log("Start getting source list");
    if (curPipeline) {
      getPipelineSourceSet();
      console.log("Source set: ", sourceSet);
      console.log("End getting source list");
    }
  }, [curPipeline]);

  useEffect(() => {
    (async () => {
      if (curPipeline?.engineType !== AnalyticEngineType.LightEngine) {
        return;
      }
      const lightEngineAppPipelineDetail: ApiResponse<
        "getLightEngineAppPipelineDetail",
        LightEnginePipelineDetailResponse
      > = await appSyncRequestQuery(getLightEngineAppPipelineDetail, {
        pipelineId: curPipeline?.pipelineId,
      });
      setAnalyticsEngine(
        lightEngineAppPipelineDetail.data.getLightEngineAppPipelineDetail
          .analyticsEngine ?? undefined
      );
      setSchedules(
        (lightEngineAppPipelineDetail.data.getLightEngineAppPipelineDetail
          .schedules as Schedule[]) ?? []
      );
    })();
  }, [curPipeline?.engineType]);

  const isNotActive =
    curPipeline?.status === PipelineStatus.CREATING ||
    curPipeline?.status === PipelineStatus.ERROR;

  const buildAnalyticsEngineDetails = () => {
    if (isNotActive) {
      return (
        <HeaderPanel title={t("pipeline.detail.analyticsEngine")}>
          <Alert content={t("alarm.notActive")} />
        </HeaderPanel>
      );
    }

    if (isLightEngine) {
      return (
        <LightEngineAnalyticsEngineDetails
          pipelineType={PipelineType.APP}
          appPipeline={curPipeline}
          analyticsEngine={analyticsEngine}
        />
      );
    } else {
      return (
        <AnalyticsEngineDetails
          pipelineType={PipelineType.APP}
          appPipelineInfo={curPipeline}
        />
      );
    }
  };

  const buildLogProcessor = () => {
    if (isNotActive) {
      return (
        <HeaderPanel title={t("servicelog:tab.logProcessor")}>
          <Alert content={t("alarm.notActive")} />
        </HeaderPanel>
      );
    }
    if (isLightEngine) {
      return <LightEngineLogProcessor schedules={schedules} />;
    } else {
      return (
        <LogProcessor
          amplifyConfig={amplifyConfig}
          pipelineInfo={curPipeline}
        />
      );
    }
  };

  const buildLogging = () => {
    if (!curPipeline || isNotActive) {
      return (
        <HeaderPanel title={t("servicelog:tab.logging")}>
          <Alert content={t("alarm.notActive")} />
        </HeaderPanel>
      );
    }
    if (isLightEngine) {
      return (
        <LightEngineLoggingList
          schedules={schedules ?? []}
          pipelineId={curPipeline.pipelineId}
          pipelineType={PipelineType.APP}
        />
      );
    } else {
      return <Logging pipelineInfo={curPipeline} />;
    }
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList} loadingData={loadingData}>
      <GeneralConfig
        pipelineType={PipelineType.APP}
        appPipeline={curPipeline}
        analyticsEngine={analyticsEngine}
        isLightEngine={isLightEngine}
      />
      <>
        {curPipeline && (
          <div>
            <AntTabs
              variant="scrollable"
              scrollButtons="auto"
              value={activeTab}
              onChange={(event, newTab) => {
                setActiveTab(newTab);
              }}
            >
              <AntTab
                label={t("applog:detail.tab.logSources")}
                value="logSource"
              />
              <AntTab
                label={t("applog:detail.tab.logConfig")}
                value="logConfig"
              />
              <AntTab
                label={t("applog:detail.tab.analyticsEngine")}
                value="engine"
              />
              {!isS3SourcePipeline(curPipeline) && (
                <AntTab
                  label={t("applog:detail.tab.bufferLayer")}
                  value="bufferLayer"
                />
              )}
              <AntTab
                label={t("servicelog:tab.logProcessor")}
                value="processor"
              />
              <AntTab
                label={t("applog:detail.tab.monitoring")}
                value="monitoring"
              />
              <AntTab label={t("applog:detail.tab.logging")} value="logging" />
              {!isOSIPipeline(curPipeline) && (
                <AntTab label={t("applog:detail.tab.alarm")} value="alarm" />
              )}
              <AntTab label={t("applog:detail.tab.tags")} value="tags" />
            </AntTabs>
            <TabPanel value={activeTab} index="logSource">
              <Ingestion
                isLightEngine={isLightEngine}
                isRefreshing={isRefreshing}
                pipelineInfo={curPipeline}
              />
            </TabPanel>
            <TabPanel value={activeTab} index="logConfig">
              <PipelineLogConfig
                configId={defaultStr(curPipeline.logConfigId)}
                version={curPipeline.logConfigVersionNumber ?? -1}
              />
            </TabPanel>
            <TabPanel value={activeTab} index="engine">
              {buildAnalyticsEngineDetails()}
            </TabPanel>
            <TabPanel value={activeTab} index="bufferLayer">
              <BufferLayerDetails pipelineInfo={curPipeline} />
            </TabPanel>
            <TabPanel value={activeTab} index="processor">
              {buildLogProcessor()}
            </TabPanel>
            <TabPanel value={activeTab} index="monitoring">
              <Monitoring pipelineInfo={curPipeline} sourceSet={sourceSet} />
            </TabPanel>

            <TabPanel value={activeTab} index="logging">
              {buildLogging()}
            </TabPanel>
            <TabPanel value={activeTab} index="alarm">
              <Alarm
                pipelineInfo={curPipeline}
                changePipelineMonitor={(monitor) => {
                  setCurPipeline((prev: any) => {
                    return {
                      ...prev,
                      monitor: monitor,
                    };
                  });
                }}
              />
            </TabPanel>
            <TabPanel value={activeTab} index="tags">
              <Tags tags={curPipeline?.tags} />
            </TabPanel>
          </div>
        )}
      </>
    </CommonLayout>
  );
};

export default ApplicationLogDetail;
