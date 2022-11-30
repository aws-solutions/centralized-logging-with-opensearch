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
import { RouteComponentProps } from "react-router-dom";
import Breadcrumb from "components/Breadcrumb";
import LoadingText from "components/LoadingText";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import ExtLink from "components/ExtLink";
import { AntTabs, AntTab, TabPanel } from "components/Tab";
import Ingestion from "./detail/Ingestion";
import Lifecycle from "./detail/Lifecycle";
import Tags from "./detail/Tags";
import { appSyncRequestQuery } from "assets/js/request";
import { getAppPipeline } from "graphql/queries";
import { AppPipeline, BufferType, PipelineStatus } from "API";
import {
  buildESLink,
  buildKDSLink,
  buildS3Link,
  formatLocalTime,
} from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { AppStateProps } from "reducer/appReducer";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import Permission from "./detail/Permission";
import { useTranslation } from "react-i18next";
import Status from "components/Status/Status";
import { getParamValueByKey } from "assets/js/applog";

interface MatchParams {
  id: string;
}

const ApplicationLogDetail: React.FC<RouteComponentProps<MatchParams>> = (
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
    },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  console.info("amplifyConfig:", amplifyConfig);
  const [loadingData, setLoadingData] = useState(true);
  const [curPipeline, setCurPipeline] = useState<AppPipeline | undefined>();
  const [activeTab, setActiveTab] = useState(0);

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

  useEffect(() => {
    getPipelineById();
  }, []);

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
                      {curPipeline?.bufferType === BufferType.KDS && (
                        <ValueWithLabel label={t("applog:detail.openShards")}>
                          <div>
                            {getParamValueByKey(
                              "OpenShardCount",
                              curPipeline?.bufferParams
                            ) || "-"}
                          </div>
                        </ValueWithLabel>
                      )}
                      <ValueWithLabel label={t("servicelog:cluster.shardNum")}>
                        <div>{curPipeline?.aosParams?.shardNumbers || "-"}</div>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel label={t("applog:detail.aos")}>
                        <ExtLink
                          to={buildESLink(
                            amplifyConfig.aws_project_region,
                            curPipeline?.aosParams?.domainName || ""
                          )}
                        >
                          {curPipeline?.aosParams?.domainName || "-"}
                        </ExtLink>
                      </ValueWithLabel>
                      {curPipeline?.bufferType === BufferType.KDS && (
                        <ValueWithLabel label={t("applog:detail.fanout")}>
                          <div>
                            {getParamValueByKey(
                              "ConsumerCount",
                              curPipeline?.bufferParams
                            ) || "-"}
                          </div>
                        </ValueWithLabel>
                      )}

                      <ValueWithLabel
                        label={t("servicelog:cluster.replicaNum")}
                      >
                        <div>{curPipeline?.aosParams?.replicaNumbers}</div>
                      </ValueWithLabel>
                    </div>

                    <div className="flex-1 border-left-c">
                      <ValueWithLabel
                        label={`${t("ekslog:ingest.detail.bufferLayer")}(${
                          curPipeline?.bufferType
                        })`}
                      >
                        {curPipeline?.bufferType !== BufferType.None &&
                        curPipeline?.status === PipelineStatus.CREATING ? (
                          <i>({t("pendingCreation")})</i>
                        ) : (
                          <>
                            {curPipeline?.bufferType === BufferType.KDS && (
                              <div>
                                <ExtLink
                                  to={buildKDSLink(
                                    amplifyConfig.aws_project_region,
                                    curPipeline.bufferResourceName || "-"
                                  )}
                                >
                                  {curPipeline.bufferResourceName || "-"}
                                </ExtLink>
                                {getParamValueByKey(
                                  "enableAutoScaling",
                                  curPipeline?.bufferParams
                                ) === "true"
                                  ? t("applog:detail.autoScaling")
                                  : ""}
                              </div>
                            )}
                            {curPipeline?.bufferType === BufferType.S3 && (
                              <>
                                <ExtLink
                                  to={buildS3Link(
                                    amplifyConfig.aws_project_region,
                                    getParamValueByKey(
                                      "logBucketName",
                                      curPipeline?.bufferParams
                                    ) || ""
                                  )}
                                >
                                  {getParamValueByKey(
                                    "logBucketName",
                                    curPipeline?.bufferParams
                                  ) || "-"}
                                </ExtLink>
                              </>
                            )}
                            {curPipeline?.bufferType === BufferType.None && (
                              <div>{t("none")}</div>
                            )}
                          </>
                        )}
                      </ValueWithLabel>
                      {curPipeline?.bufferType === BufferType.S3 && (
                        <ValueWithLabel
                          label={t(
                            "applog:create.ingestSetting.s3BucketPrefix"
                          )}
                        >
                          <div>
                            {getParamValueByKey(
                              "logBucketPrefix",
                              curPipeline?.bufferParams
                            ) || "-"}
                          </div>
                        </ValueWithLabel>
                      )}
                    </div>

                    <div className="flex-1 border-left-c">
                      <ValueWithLabel label={t("applog:detail.created")}>
                        <div>
                          {formatLocalTime(curPipeline?.createdDt || "-")}
                        </div>
                      </ValueWithLabel>
                      <ValueWithLabel label={t("applog:list.status")}>
                        <div>
                          <Status status={curPipeline?.status || "-"} />
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
                    <AntTab label={t("applog:detail.tab.ingestion")} />
                    <AntTab label={t("applog:detail.tab.permission")} />
                    <AntTab label={t("applog:detail.tab.lifecycle")} />
                    <AntTab label={t("applog:detail.tab.tags")} />
                  </AntTabs>
                  <TabPanel value={activeTab} index={0}>
                    <Ingestion
                      changeTab={(id) => {
                        setActiveTab(id);
                      }}
                      pipelineInfo={curPipeline}
                      upgradeToNewPipeline={() => {
                        getPipelineById();
                      }}
                    />
                  </TabPanel>
                  <TabPanel value={activeTab} index={1}>
                    <Permission pipelineInfo={curPipeline} />
                  </TabPanel>
                  <TabPanel value={activeTab} index={2}>
                    <Lifecycle pipelineInfo={curPipeline} />
                  </TabPanel>
                  <TabPanel value={activeTab} index={3}>
                    <Tags pipelineInfo={curPipeline} />
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
