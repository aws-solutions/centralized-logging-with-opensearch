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
import { Link, useParams } from "react-router-dom";
import ExtLink from "components/ExtLink";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import { AntTabs, AntTab, TabPanel } from "components/Tab";
import Overview from "./detail/Overview";
import NetWork from "./detail/Network";
import AccessProxy from "./detail/AccessProxy";
import Breadcrumb from "components/Breadcrumb";
import { appSyncRequestQuery } from "assets/js/request";
import { getDomainDetails } from "graphql/queries";
import { DomainDetails, StackStatus } from "API";
import LoadingText from "components/LoadingText";
import { useSelector } from "react-redux";
import { InfoBarTypes } from "reducer/appReducer";
import {
  buildAlarmLink,
  buildDashboardLink,
  buildESLink,
  humanFileSize,
} from "assets/js/utils";
import Status from "components/Status/Status";
import { AmplifyConfigType } from "types";
import Alarms from "./detail/Alarms";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import PagePanel from "components/PagePanel";
import { Button } from "components/Button/button";
import { useTranslation } from "react-i18next";
import { AUTO_REFRESH_INT } from "assets/js/const";
import { RootState } from "reducer/reducers";
import Tags from "pages/dataInjection/common/Tags";
import ButtonRefresh from "components/ButtonRefresh";

const ESDomainDetail: React.FC = () => {
  const { id } = useParams();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const { t } = useTranslation();
  const [loadingData, setLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const changeTab = (event: any, newTab: number) => {
    console.info("newTab:", newTab);
    setActiveTab(newTab);
  };
  const [curDomain, setCurDomain] = useState<DomainDetails>();

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("cluster:domain.domains"),
      link: "/clusters/opensearch-domains",
    },
    {
      name: curDomain?.domainName || "",
    },
  ];

  const getDomainById = async (isRefresh?: boolean) => {
    if (!isRefresh) {
      setLoadingData(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const resData: any = await appSyncRequestQuery(getDomainDetails, {
        id: decodeURIComponent(id || ""),
        metrics: true,
      });
      console.info("resData:", resData);
      const dataDomain: DomainDetails = resData.data.getDomainDetails;
      setCurDomain(dataDomain);
      setLoadingData(false);
      setIsRefreshing(false);
    } catch (error) {
      setLoadingData(false);
      setIsRefreshing(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getDomainById();
    const refreshInterval = setInterval(() => {
      getDomainById(true);
    }, AUTO_REFRESH_INT);
    return () => clearInterval(refreshInterval);
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
            <PagePanel
              title={curDomain?.domainName || ""}
              actions={
                <div>
                  <Button
                    btnType="icon"
                    disabled={isRefreshing || loadingData}
                    onClick={() => {
                      getDomainById(true);
                    }}
                  >
                    <ButtonRefresh loading={isRefreshing} />
                  </Button>
                </div>
              }
            >
              <div className="service-log">
                <div>
                  <HeaderPanel title={t("cluster:detail.config")}>
                    <div className="flex value-label-span">
                      <div className="flex-1">
                        <ValueWithLabel label={t("cluster:detail.domain")}>
                          <ExtLink
                            to={buildESLink(
                              amplifyConfig.aws_project_region,
                              curDomain?.domainName || ""
                            )}
                          >
                            {curDomain?.domainName}
                          </ExtLink>
                        </ValueWithLabel>
                        <ValueWithLabel label={t("cluster:detail.searchDoc")}>
                          <div>{curDomain?.metrics?.searchableDocs}</div>
                        </ValueWithLabel>
                      </div>
                      <div className="flex-1 border-left-c">
                        <ValueWithLabel label={t("cluster:detail.freeSpace")}>
                          <div>
                            {humanFileSize(
                              (curDomain?.metrics?.freeStorageSpace || 0) *
                                1024 *
                                1024
                            )}
                          </div>
                        </ValueWithLabel>
                        <ValueWithLabel label={t("cluster:detail.region")}>
                          <div>{`${amplifyConfig.aws_project_region}`}</div>
                        </ValueWithLabel>
                      </div>
                      <div className="flex-1 border-left-c">
                        <ValueWithLabel label={t("cluster:detail.version")}>
                          <div>{`${curDomain?.engine}_${curDomain?.version}`}</div>
                        </ValueWithLabel>
                        <ValueWithLabel
                          label={t("cluster:detail.alarms.name")}
                          infoType={InfoBarTypes.ALARMS}
                        >
                          <div>
                            {curDomain?.alarmStatus ===
                              StackStatus.DISABLED && (
                              <Link
                                to={`/clusters/opensearch-domains/detail/${
                                  curDomain?.domainName
                                }/${encodeURIComponent(
                                  curDomain?.id || ""
                                )}/create-alarm`}
                              >
                                {t("cluster:detail.enable")}
                              </Link>
                            )}
                            {curDomain?.alarmStatus === StackStatus.ENABLED && (
                              <ExtLink
                                to={buildAlarmLink(
                                  amplifyConfig.aws_project_region
                                )}
                              >
                                {t("cluster:detail.cloudWatchAlarm")}
                              </ExtLink>
                            )}
                            {curDomain?.alarmStatus !== StackStatus.DISABLED &&
                              curDomain?.alarmStatus !==
                                StackStatus.ENABLED && (
                                <Status status={curDomain?.alarmStatus || ""} />
                              )}
                          </div>
                        </ValueWithLabel>
                      </div>
                      <div className="flex-1 border-left-c">
                        <ValueWithLabel label={t("cluster:detail.health")}>
                          <div>
                            <Status status={curDomain?.metrics?.health || ""} />
                          </div>
                          {/* <Status status="Yellow" /> */}
                        </ValueWithLabel>
                        <ValueWithLabel
                          label={t("cluster:detail.proxy.name")}
                          infoType={InfoBarTypes.ACCESS_PROXY}
                        >
                          <div>
                            {curDomain?.proxyStatus ===
                              StackStatus.DISABLED && (
                              <Link
                                to={`/clusters/opensearch-domains/detail/${
                                  curDomain?.domainName
                                }/${encodeURIComponent(
                                  curDomain?.id
                                )}/access-proxy`}
                              >
                                {t("cluster:detail.enable")}
                              </Link>
                            )}
                            {curDomain?.proxyStatus === StackStatus.ENABLED && (
                              <ExtLink
                                to={buildDashboardLink(
                                  curDomain.engine || "",
                                  curDomain.proxyALB || "",
                                  curDomain?.proxyInput?.customEndpoint || ""
                                )}
                              >
                                {t("cluster:detail.link")}
                              </ExtLink>
                            )}
                            {curDomain?.proxyStatus !== StackStatus.DISABLED &&
                              curDomain?.proxyStatus !==
                                StackStatus.ENABLED && (
                                <Status status={curDomain?.proxyStatus || ""} />
                              )}
                          </div>
                        </ValueWithLabel>
                      </div>
                    </div>
                  </HeaderPanel>
                </div>
                <div>
                  <AntTabs
                    value={activeTab}
                    onChange={(event, newTab) => {
                      changeTab(event, newTab);
                    }}
                  >
                    <AntTab label={t("cluster:detail.tab.overview")} />
                    <AntTab label={t("cluster:detail.tab.proxy")} />
                    <AntTab label={t("cluster:detail.tab.alarms")} />
                    <AntTab label={t("cluster:detail.tab.network")} />
                    <AntTab label={t("cluster:detail.tab.tags")} />
                  </AntTabs>
                  <TabPanel value={activeTab} index={0}>
                    <Overview domainInfo={curDomain} />
                  </TabPanel>
                  <TabPanel value={activeTab} index={1}>
                    <AccessProxy
                      domainInfo={curDomain}
                      reloadDetailInfo={() => {
                        getDomainById();
                      }}
                    />
                  </TabPanel>
                  <TabPanel value={activeTab} index={2}>
                    <Alarms
                      reloadDetailInfo={() => {
                        getDomainById();
                      }}
                      domainInfo={curDomain}
                    />
                  </TabPanel>
                  <TabPanel value={activeTab} index={3}>
                    <NetWork domainInfo={curDomain} />
                  </TabPanel>
                  <TabPanel value={activeTab} index={4}>
                    <Tags tags={curDomain?.tags} />
                  </TabPanel>
                </div>
              </div>
            </PagePanel>
          )}
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default ESDomainDetail;
