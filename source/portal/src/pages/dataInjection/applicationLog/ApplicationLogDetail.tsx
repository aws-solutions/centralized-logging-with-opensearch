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
import { useParams } from "react-router-dom";
import Breadcrumb from "components/Breadcrumb";
import LoadingText from "components/LoadingText";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import ExtLink from "components/ExtLink";
import { AntTabs, AntTab, TabPanel } from "components/Tab";
import Ingestion from "./detail/Ingestion";
import AnalyticsEngineDetails from "./detail/AnalyticsEngineDetails";
import { appSyncRequestQuery } from "assets/js/request";
import { getAppPipeline, listAppLogIngestions } from "graphql/queries";
import { AppPipeline, AppLogIngestion } from "API";
import { buildCfnLink, buildESLink, formatLocalTime } from "assets/js/utils";
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
      name: id || "",
    },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  console.info("amplifyConfig:", amplifyConfig);
  const [loadingData, setLoadingData] = useState(true);
  const [curPipeline, setCurPipeline] = useState<AppPipeline | undefined>();
  const [activeTab, setActiveTab] = useState(0);
  const [sourceSet, setSourceSet] = useState<Set<string>>(new Set<string>());

  const changeTab = (event: any, newTab: number) => {
    console.info("newTab:", newTab);
    setActiveTab(newTab);
  };

  const getPipelineById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getAppPipeline, {
        id: id,
      });
      console.info("resData:", resData);
      const dataPipelne: AppPipeline = resData.data.getAppPipeline;
      setCurPipeline(dataPipelne);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

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
        tmpSourceSet.add(element?.sourceType || "")
      );
      setSourceSet(tmpSourceSet);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getPipelineById();
  }, []);

  useEffect(() => {
    console.log("Start getting source list");
    if (curPipeline) {
      getPipelineSourceSet();
      console.log("Source set: ", sourceSet);
      console.log("End getting source list");
    }
  }, [curPipeline]);

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
                <HeaderPanel title={t("applog:detail.config")}>
                  <div className="flex value-label-span">
                    <div className="flex-1">
                      <ValueWithLabel label={t("applog:detail.osIndex")}>
                        <div>{curPipeline?.aosParams?.indexPrefix || "-"}</div>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel label={t("applog:detail.cfnStack")}>
                        <ExtLink
                          to={buildCfnLink(
                            amplifyConfig.aws_project_region,
                            curPipeline?.stackId || ""
                          )}
                        >
                          {curPipeline?.stackId?.split("/")[1] || "-"}
                        </ExtLink>
                      </ValueWithLabel>
                    </div>

                    <div className="flex-1 border-left-c">
                      <ValueWithLabel
                        label={t("applog:detail.analyticsEngine")}
                      >
                        <ExtLink
                          to={buildESLink(
                            amplifyConfig.aws_project_region,
                            curPipeline?.aosParams?.domainName || ""
                          )}
                        >
                          {curPipeline?.aosParams?.domainName || "-"}
                        </ExtLink>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel label={t("applog:list.status")}>
                        <div>
                          <Status status={curPipeline?.status || "-"} />
                        </div>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel label={t("applog:detail.created")}>
                        <div>
                          {formatLocalTime(curPipeline?.createdAt || "")}
                        </div>
                      </ValueWithLabel>
                    </div>
                  </div>
                </HeaderPanel>
              </div>
              {curPipeline && (
                <div>
                  <AntTabs
                    value={activeTab}
                    onChange={(event, newTab) => {
                      changeTab(event, newTab);
                    }}
                  >
                    <AntTab label={t("applog:detail.tab.sources")} />
                    <AntTab label={t("applog:detail.tab.logConfig")} />
                    <AntTab label={t("applog:detail.tab.bufferLayer")} />
                    <AntTab label={t("applog:detail.tab.analyticsEngine")} />
                    <AntTab label={t("applog:detail.tab.monitoring")} />
                    <AntTab label={t("applog:detail.tab.logging")} />
                    <AntTab label={t("applog:detail.tab.alarm")} />
                    <AntTab label={t("applog:detail.tab.tags")} />
                  </AntTabs>
                  <TabPanel value={activeTab} index={0}>
                    <Ingestion
                      changeTab={(id) => {
                        setActiveTab(id);
                      }}
                      pipelineInfo={curPipeline}
                    />
                  </TabPanel>
                  <TabPanel value={activeTab} index={1}>
                    <LogConfigDetails
                      logConfigId={curPipeline.logConfigId ?? ""}
                      logConfigVersion={
                        curPipeline.logConfigVersionNumber ?? -1
                      }
                    />
                  </TabPanel>
                  <TabPanel value={activeTab} index={2}>
                    <BufferLayerDetails pipelineInfo={curPipeline} />
                  </TabPanel>
                  <TabPanel value={activeTab} index={3}>
                    <AnalyticsEngineDetails pipelineInfo={curPipeline} />
                  </TabPanel>
                  <TabPanel value={activeTab} index={4}>
                    <Monitoring
                      pipelineInfo={curPipeline}
                      sourceSet={sourceSet}
                    />
                  </TabPanel>
                  <TabPanel value={activeTab} index={5}>
                    <Logging pipelineInfo={curPipeline} />
                  </TabPanel>
                  <TabPanel value={activeTab} index={6}>
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
                  <TabPanel value={activeTab} index={7}>
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
