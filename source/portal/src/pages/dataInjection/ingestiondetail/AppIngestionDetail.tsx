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
import SideMenu from "components/SideMenu";
import Breadcrumb from "components/Breadcrumb";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import LoadingText from "components/LoadingText";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import { AntTab, AntTabs, TabPanel } from "components/Tab";
import { appSyncRequestQuery } from "assets/js/request";
import { getAppLogIngestion, getAppPipeline } from "graphql/queries";

import {
  AppLogIngestion,
  AppPipeline,
  EKSDeployKind,
  LogSourceType,
  Tag,
} from "API";
import {
  buildKDSLink,
  buildS3Link,
  formatLocalTime,
  splitStringToBucketAndPrefix,
} from "assets/js/utils";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";
import Tags from "./comps/Tags";
import LogConfig from "./comps/LogConfig";
import AccountName from "pages/comps/account/AccountName";

interface MatchParams {
  id: string;
}

export interface EksDetailProps {
  deploymentKind: EKSDeployKind | null | undefined;
  enableAutoScaling: boolean;
  indexPrefix: string;
  streamName: string;
  appPipelineId: string;
  created: string;
  configId: string;
  tags: (Tag | null)[] | null | undefined;
}

const AppIngestionDetail: React.FC = () => {
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const { id }: MatchParams = useParams();
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [appIngestionData, setAppIngestionData] = useState<AppLogIngestion>();
  const [appPipelineData, setAppPipelineData] = useState<AppPipeline>();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("menu.appLog"),
      link: "/log-pipeline/application-log",
    },
    {
      name: appIngestionData?.appPipelineId || "",
      link: "/log-pipeline/application-log/detail/" + appPipelineData?.id,
    },
    { name: id },
  ];

  const changeTab = (event: any, newTab: number) => {
    console.info("newTab:", newTab);
    setActiveTab(newTab);
  };

  const getAppPiplelineInfoById = async (pipelineId: string) => {
    try {
      const resPipelineData: any = await appSyncRequestQuery(getAppPipeline, {
        id: pipelineId,
      });
      setLoadingData(false);
      const tmpPipelinenData: AppPipeline =
        resPipelineData?.data?.getAppPipeline;
      setAppPipelineData(tmpPipelinenData);
    } catch (error) {
      console.error(error);
    }
  };

  const getAppLogIngestionById = async () => {
    setLoadingData(true);
    try {
      const resIngestionData: any = await appSyncRequestQuery(
        getAppLogIngestion,
        {
          id: id,
        }
      );
      const tmpIngestionData: AppLogIngestion =
        resIngestionData?.data?.getAppLogIngestion;
      if (tmpIngestionData && tmpIngestionData.appPipelineId) {
        getAppPiplelineInfoById(tmpIngestionData.appPipelineId);
      }
      setAppIngestionData(tmpIngestionData);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getAppLogIngestionById();
  }, []);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />

            {loadingData ? (
              <LoadingText text="" />
            ) : (
              <div>
                <HeaderPanel title={t("ekslog:ingest.detail.ingestionDetail")}>
                  <div className="flex value-label-span">
                    <div className="flex-1">
                      <ValueWithLabel label="OpenSearch Index Prefix">
                        <div>{appPipelineData?.aosParas?.indexPrefix}</div>
                      </ValueWithLabel>
                      {appIngestionData?.accountId && (
                        <ValueWithLabel
                          label={t("resource:crossAccount.account")}
                        >
                          <AccountName
                            accountId={appIngestionData?.accountId}
                            region={amplifyConfig.aws_project_region}
                          />
                        </ValueWithLabel>
                      )}
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel label={t("ekslog:ingest.detail.kds")}>
                        <div>
                          <ExtLink
                            to={buildKDSLink(
                              amplifyConfig.aws_project_region,
                              appPipelineData?.kdsParas?.streamName || ""
                            )}
                          >
                            {appPipelineData?.kdsParas?.streamName || "-"}
                          </ExtLink>
                          {appPipelineData?.kdsParas?.enableAutoScaling
                            ? t("applog:detail.autoScaling")
                            : ""}
                        </div>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel
                        label={`${t("applog:ingestion.source")}(${
                          appIngestionData?.sourceType || "-"
                        })`}
                      >
                        <div>
                          {appIngestionData?.sourceType === LogSourceType.S3 &&
                          appIngestionData?.logPath ? (
                            <a
                              target="_blank"
                              href={buildS3Link(
                                splitStringToBucketAndPrefix(
                                  appIngestionData.logPath
                                ).bucket || "",
                                amplifyConfig.aws_project_region,
                                splitStringToBucketAndPrefix(
                                  appIngestionData.logPath
                                ).prefix || ""
                              )}
                              rel="noreferrer"
                            >
                              {appIngestionData?.logPath}
                            </a>
                          ) : (
                            ""
                          )}
                          {appIngestionData?.sourceType === LogSourceType.EC2 &&
                          appIngestionData?.sourceId ? (
                            <Link
                              to={`/resources/instance-group/detail/${appIngestionData.sourceId}`}
                            >
                              {appIngestionData?.sourceId}
                            </Link>
                          ) : (
                            ""
                          )}
                        </div>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel label={t("ekslog:ingest.detail.created")}>
                        <div>
                          {formatLocalTime(appIngestionData?.createdDt || "")}
                        </div>
                      </ValueWithLabel>
                    </div>
                  </div>
                </HeaderPanel>

                <AntTabs
                  value={activeTab}
                  onChange={(event, newTab) => {
                    changeTab(event, newTab);
                  }}
                >
                  <AntTab label={t("ekslog:ingest.detail.logConfig")} />
                  <AntTab label={t("ekslog:ingest.detail.tag")} />
                </AntTabs>
                <TabPanel value={activeTab} index={0}>
                  <LogConfig
                    logPath={appIngestionData?.logPath || ""}
                    configId={appIngestionData?.confId || ""}
                  />
                </TabPanel>
                <TabPanel value={activeTab} index={1}>
                  <Tags ingestionInfo={appIngestionData} />
                </TabPanel>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppIngestionDetail;
