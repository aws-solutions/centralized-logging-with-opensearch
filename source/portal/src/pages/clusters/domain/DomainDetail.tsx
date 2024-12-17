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
import { appSyncRequestQuery } from "assets/js/request";
import { getDomainDetails } from "graphql/queries";
import { DomainDetails, StackStatus } from "API";
import { useSelector } from "react-redux";
import { InfoBarTypes } from "reducer/appReducer";
import {
  buildAlarmLink,
  buildDashboardLink,
  buildESLink,
  defaultStr,
  formatNumber,
  humanFileSize,
} from "assets/js/utils";
import Status from "components/Status/Status";
import { AmplifyConfigType } from "types";
import Alarms from "./detail/Alarms";
import PagePanel from "components/PagePanel";
import { Button } from "components/Button/button";
import { useTranslation } from "react-i18next";
import { AUTO_REFRESH_INT } from "assets/js/const";
import { RootState } from "reducer/reducers";
import ButtonRefresh from "components/ButtonRefresh";
import CommonLayout from "pages/layout/CommonLayout";

const ESDomainDetail: React.FC = () => {
  const { id } = useParams();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const { t } = useTranslation();
  const [loadingData, setLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const changeTab = (event: any, newTab: string) => {
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
      name: defaultStr(curDomain?.domainName),
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
        id: decodeURIComponent(defaultStr(id)),
        metrics: true,
      });
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
    <CommonLayout breadCrumbList={breadCrumbList} loadingData={loadingData}>
      <PagePanel
        title={defaultStr(curDomain?.domainName)}
        actions={
          <div>
            <Button
              data-testid="refresh-button"
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
                        defaultStr(curDomain?.domainName)
                      )}
                    >
                      {curDomain?.domainName}
                    </ExtLink>
                  </ValueWithLabel>
                  <ValueWithLabel label={t("cluster:detail.searchDoc")}>
                    <div>
                      {formatNumber(curDomain?.metrics?.searchableDocs ?? 0)}
                    </div>
                  </ValueWithLabel>
                </div>
                <div className="flex-1 border-left-c">
                  <ValueWithLabel label={t("cluster:detail.freeSpace")}>
                    <div>
                      {humanFileSize(
                        (curDomain?.metrics?.freeStorageSpace ?? 0) *
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
                      {curDomain?.alarmStatus === StackStatus.DISABLED && (
                        <Link
                          to={`/clusters/opensearch-domains/detail/${
                            curDomain?.domainName
                          }/${encodeURIComponent(
                            curDomain?.id || ""
                          )}/create-alarm`}
                        >
                          {t("button.create")}
                        </Link>
                      )}
                      {curDomain?.alarmStatus === StackStatus.ENABLED && (
                        <ExtLink
                          to={buildAlarmLink(amplifyConfig.aws_project_region)}
                        >
                          {t("cluster:detail.cloudWatchAlarm")}
                        </ExtLink>
                      )}
                      {curDomain?.alarmStatus !== StackStatus.DISABLED &&
                        curDomain?.alarmStatus !== StackStatus.ENABLED && (
                          <Status status={defaultStr(curDomain?.alarmStatus)} />
                        )}
                    </div>
                  </ValueWithLabel>
                </div>
                <div className="flex-1 border-left-c">
                  <ValueWithLabel label={t("cluster:detail.health")}>
                    <div>
                      <Status status={defaultStr(curDomain?.metrics?.health)} />
                    </div>
                    {/* <Status status="Yellow" /> */}
                  </ValueWithLabel>
                  <ValueWithLabel
                    label={t("cluster:detail.proxy.name")}
                    infoType={InfoBarTypes.ACCESS_PROXY}
                  >
                    <div>
                      {curDomain?.proxyStatus === StackStatus.DISABLED && (
                        <Link
                          to={`/clusters/opensearch-domains/detail/${
                            curDomain?.domainName
                          }/${encodeURIComponent(curDomain?.id)}/access-proxy`}
                        >
                          {t("button.create")}
                        </Link>
                      )}
                      {curDomain?.proxyStatus === StackStatus.ENABLED && (
                        <ExtLink
                          to={buildDashboardLink(
                            defaultStr(curDomain.engine),
                            defaultStr(curDomain.proxyALB),
                            defaultStr(curDomain?.proxyInput?.customEndpoint)
                          )}
                        >
                          {t("cluster:detail.link")}
                        </ExtLink>
                      )}
                      {curDomain?.proxyStatus !== StackStatus.DISABLED &&
                        curDomain?.proxyStatus !== StackStatus.ENABLED && (
                          <Status status={defaultStr(curDomain?.proxyStatus)} />
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
              <AntTab
                label={t("cluster:detail.tab.overview")}
                value="overview"
              />
              <AntTab
                data-testid="accessProxy-tab"
                label={t("cluster:detail.tab.proxy")}
                value="accessProxy"
              />
              <AntTab label={t("cluster:detail.tab.alarms")} value="alarms" />
              <AntTab label={t("cluster:detail.tab.network")} value="network" />
            </AntTabs>
            <TabPanel value={activeTab} index="overview">
              <Overview domainInfo={curDomain} />
            </TabPanel>
            <TabPanel value={activeTab} index="accessProxy">
              <AccessProxy
                domainInfo={curDomain}
                reloadDetailInfo={() => {
                  getDomainById();
                }}
              />
            </TabPanel>
            <TabPanel value={activeTab} index="alarms">
              <Alarms
                reloadDetailInfo={() => {
                  getDomainById();
                }}
                domainInfo={curDomain}
              />
            </TabPanel>
            <TabPanel value={activeTab} index="network">
              <NetWork domainInfo={curDomain} />
            </TabPanel>
          </div>
        </div>
      </PagePanel>
    </CommonLayout>
  );
};

export default ESDomainDetail;
