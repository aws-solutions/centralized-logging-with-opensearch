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
import Breadcrumb from "components/Breadcrumb";
import LoadingText from "components/LoadingText";
import ExtLink from "components/ExtLink";
import { AntTabs, AntTab, TabPanel } from "components/Tab";
import Ingestion from "./detail/Ingestion";
import AnalyticsEngineDetails from "./detail/AnalyticsEngineDetails";
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
import {
  buildCfnLink,
  buildESLink,
  buildGlueTableLink,
  defaultStr,
  formatLocalTime,
  isOSIPipeline,
  ternary,
} from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import Status from "components/Status/Status";
import LogConfigDetails from "./detail/LogConfigDetails";
import BufferLayerDetails from "./detail/BufferLayerDetails";
import Alarm from "./detail/Alarm";
import Monitoring from "../applicationLog/detail/Monitoring";
import Logging from "../applicationLog/detail/Logging";
import { RootState } from "reducer/reducers";
import Tags from "../common/Tags";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import { LightEngineAnalyticsEngineDetails } from "../common/LightEngineAnalyticsEngineDetails";
import { LightEngineLogProcessor } from "../common/LightEngineLogProcessor";
import { LightEngineLoggingList } from "../common/LightEngineLoggingList";
import LogProcessor from "./detail/LogProcessor";

let intervalId: any = 0;
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
  const [activeTab, setActiveTab] = useState(0);
  const [sourceSet, setSourceSet] = useState<Set<string>>(new Set<string>());
  const [analyticsEngine, setAnalyticsEngine] = useState<
    AnalyticsEngine | undefined
  >();
  const [schedules, setSchedules] = useState<Schedule[] | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const changeTab = (event: any, newTab: number) => {
    console.info("newTab:", newTab);
    setActiveTab(newTab);
  };

  const getPipelineById = async (hideLoading = false) => {
    try {
      if (!hideLoading) {
        setLoadingData(true);
      }
      const resData: any = await appSyncRequestQuery(getAppPipeline, {
        id: id,
      });
      console.info("resData:", resData);
      const dataPipelne: AppPipeline = resData.data.getAppPipeline;
      if (
        dataPipelne.status === PipelineStatus.ACTIVE ||
        dataPipelne.status === PipelineStatus.ERROR
      ) {
        setIsRefreshing(false);
        clearInterval(intervalId);
      }
      setCurPipeline(dataPipelne);
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
    getPipelineById();
    intervalId = setInterval(() => {
      setIsRefreshing(true);
      getPipelineById(true);
    }, 10000);
    return () => {
      setIsRefreshing(false);
      clearInterval(intervalId);
    };
  }, []);

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

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <Breadcrumb list={breadCrumbList} />
          {loadingData ? (
            <LoadingText text="" />
          ) : (
            <div className="service-log">
              <div>
                <HeaderWithValueLabel
                  numberOfColumns={5}
                  headerTitle={t("applog:detail.config")}
                  dataList={[
                    {
                      label: ternary(
                        isLightEngine,
                        t("applog:detail.logTable"),
                        t("applog:detail.osIndex")
                      ),
                      data: isLightEngine ? (
                        <ExtLink
                          to={buildGlueTableLink(
                            amplifyConfig.aws_project_region,
                            analyticsEngine?.table?.databaseName,
                            analyticsEngine?.table?.tableName
                          )}
                        >
                          {analyticsEngine?.table?.tableName}
                        </ExtLink>
                      ) : (
                        defaultStr(curPipeline?.aosParams?.indexPrefix, "-")
                      ),
                    },
                    {
                      label: t("applog:detail.cfnStack"),
                      data: (
                        <ExtLink
                          to={buildCfnLink(
                            amplifyConfig.aws_project_region,
                            defaultStr(curPipeline?.stackId, "")
                          )}
                        >
                          {curPipeline?.stackId?.split("/")[1] || "-"}
                        </ExtLink>
                      ),
                    },
                    {
                      label: ternary(
                        isLightEngine,
                        t("applog:detail.grafanaDashboard"),
                        t("applog:detail.analyticsEngine")
                      ),
                      data: isLightEngine ? (
                        <>
                          <div>
                            {analyticsEngine?.metric?.dashboardLink && (
                              <ExtLink
                                to={analyticsEngine?.metric.dashboardLink ?? ""}
                              >
                                {defaultStr(
                                  analyticsEngine?.metric.dashboardName,
                                  "-"
                                )}
                              </ExtLink>
                            )}
                          </div>
                          <div>
                            <ExtLink
                              to={analyticsEngine?.table?.dashboardLink ?? ""}
                            >
                              {defaultStr(
                                analyticsEngine?.table?.dashboardName,
                                "-"
                              )}
                            </ExtLink>
                          </div>
                        </>
                      ) : (
                        <ExtLink
                          to={buildESLink(
                            amplifyConfig.aws_project_region,
                            curPipeline?.aosParams?.domainName || ""
                          )}
                        >
                          {defaultStr(curPipeline?.aosParams?.domainName, "-")}
                        </ExtLink>
                      ),
                    },
                    {
                      label: t("applog:list.status"),
                      data: <Status status={curPipeline?.status || "-"} />,
                    },
                    {
                      label: t("applog:detail.created"),
                      data: formatLocalTime(curPipeline?.createdAt || ""),
                    },
                  ]}
                />
              </div>
              {curPipeline && (
                <div>
                  <AntTabs
                    variant="scrollable"
                    scrollButtons="auto"
                    value={activeTab}
                    onChange={(event, newTab) => {
                      changeTab(event, newTab);
                    }}
                  >
                    <AntTab label={t("applog:detail.tab.sources")} />
                    <AntTab label={t("applog:detail.tab.logConfig")} />
                    <AntTab label={t("applog:detail.tab.bufferLayer")} />
                    <AntTab label={t("applog:detail.tab.analyticsEngine")} />
                    <AntTab label={t("servicelog:tab.logProcessor")} />
                    <AntTab label={t("applog:detail.tab.monitoring")} />
                    <AntTab label={t("applog:detail.tab.logging")} />
                    {!isOSIPipeline(curPipeline) && (
                      <AntTab label={t("applog:detail.tab.alarm")} />
                    )}
                    <AntTab label={t("applog:detail.tab.tags")} />
                  </AntTabs>
                  <TabPanel value={activeTab} index={0}>
                    <Ingestion
                      isRefreshing={isRefreshing}
                      changeTab={(id) => {
                        setActiveTab(id);
                      }}
                      pipelineInfo={curPipeline}
                    />
                  </TabPanel>
                  <TabPanel value={activeTab} index={1}>
                    <LogConfigDetails
                      logConfigId={defaultStr(curPipeline.logConfigId)}
                      logConfigVersion={
                        curPipeline.logConfigVersionNumber ?? -1
                      }
                    />
                  </TabPanel>
                  <TabPanel value={activeTab} index={2}>
                    <BufferLayerDetails pipelineInfo={curPipeline} />
                  </TabPanel>
                  <TabPanel value={activeTab} index={3}>
                    {isLightEngine ? (
                      <LightEngineAnalyticsEngineDetails
                        pipelineInfo={curPipeline}
                        analyticsEngine={analyticsEngine}
                      />
                    ) : (
                      <AnalyticsEngineDetails pipelineInfo={curPipeline} />
                    )}
                  </TabPanel>
                  <TabPanel value={activeTab} index={4}>
                    {isLightEngine ? (
                      <LightEngineLogProcessor schedules={schedules} />
                    ) : (
                      <LogProcessor
                        amplifyConfig={amplifyConfig}
                        pipelineInfo={curPipeline}
                      />
                    )}
                  </TabPanel>
                  <TabPanel value={activeTab} index={5}>
                    <Monitoring
                      pipelineInfo={curPipeline}
                      sourceSet={sourceSet}
                    />
                  </TabPanel>

                  <TabPanel value={activeTab} index={6}>
                    {isLightEngine ? (
                      <LightEngineLoggingList
                        schedules={schedules ?? []}
                        pipelineId={curPipeline.pipelineId}
                        pipelineType={PipelineType.APP}
                      />
                    ) : (
                      <Logging pipelineInfo={curPipeline} />
                    )}
                  </TabPanel>
                  {!isOSIPipeline(curPipeline) && (
                    <TabPanel value={activeTab} index={7}>
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
                  )}
                  <TabPanel
                    value={activeTab}
                    index={ternary(isOSIPipeline(curPipeline), 7, 8)}
                  >
                    <Tags tags={curPipeline?.tags} />
                  </TabPanel>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default ApplicationLogDetail;
