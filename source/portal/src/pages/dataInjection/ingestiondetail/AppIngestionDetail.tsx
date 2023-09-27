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
import SideMenu from "components/SideMenu";
import Breadcrumb from "components/Breadcrumb";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import LoadingText from "components/LoadingText";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import { AntTab, AntTabs, TabPanel } from "components/Tab";
import { appSyncRequestQuery } from "assets/js/request";
import {
  getAppLogIngestion,
  getAppPipeline,
  getLogSource,
} from "graphql/queries";

import { ResourceStatus } from "assets/js/const";
import {
  AppLogIngestion,
  AppPipeline,
  EC2GroupType,
  LogSource,
  LogSourceType,
  SyslogParser,
} from "API";
import {
  buildNLBLinkByDNS,
  buildS3Link,
  formatLocalTime,
} from "assets/js/utils";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import SyslogGuide from "./comps/SyslogGuide";
import Status from "components/Status/Status";
import { S3SourceDetail } from "./S3SourceDetail";
import { Alert } from "assets/js/alert";
import DetailEC2 from "pages/resources/instanceGroup/comps/DetailEC2";
import DetailASG from "pages/resources/instanceGroup/comps/DetailASG";
import InstancePermission from "../applicationLog/common/InstancePermission";
import { RootState } from "reducer/reducers";
import Tags from "../common/Tags";

const AppIngestionDetail: React.FC = () => {
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const { id } = useParams();
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [appIngestionData, setAppIngestionData] = useState<AppLogIngestion>({
    __typename: "AppLogIngestion",
    id: "",
  });
  const [appPipelineData, setAppPipelineData] = useState<AppPipeline>();
  const [sourceInfo, setSourceInfo] = useState<LogSource>({
    __typename: "LogSource",
    sourceId: "",
  });
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("menu.appLog"),
      link: "/log-pipeline/application-log",
    },
    {
      name: appIngestionData?.appPipelineId || "",
      link:
        "/log-pipeline/application-log/detail/" + appPipelineData?.pipelineId,
    },
    { name: id || "" },
  ];

  const changeTab = (event: any, newTab: number) => {
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
      console.info("resIngestionData:", resIngestionData);
      const tmpIngestionData: AppLogIngestion =
        resIngestionData?.data?.getAppLogIngestion;
      if (tmpIngestionData && tmpIngestionData.appPipelineId) {
        const sourceData = await appSyncRequestQuery(getLogSource, {
          type: tmpIngestionData.sourceType,
          sourceId: tmpIngestionData.sourceId,
        });
        console.log("sourceData:", sourceData);
        setSourceInfo(sourceData.data.getLogSource);
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

  const renderSysLogDetail = () => {
    return (
      <HeaderPanel title={t("applog:detail.ingestion.ingestionOverview")}>
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("applog:detail.ingestion.source")}>
              <div>
                <ExtLink
                  to={buildNLBLinkByDNS(
                    amplifyConfig.aws_project_region,
                    sourceInfo?.syslog?.nlbDNSName || ""
                  )}
                >
                  {sourceInfo?.syslog?.nlbDNSName || "-"}
                </ExtLink>
              </div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel
              label={`${t("applog:detail.ingestion.sourceType")}`}
            >
              <div>{appIngestionData?.sourceType || "-"}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel
              label={`${t("applog:ingestion.syslog.port")} | ${t(
                "applog:ingestion.syslog.protocol"
              )}`}
            >
              <div>
                {`${sourceInfo?.syslog?.port || ""} | ${
                  sourceInfo?.syslog?.protocol || ""
                }`}
              </div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("applog:detail.ingestion.status")}>
              <Status status={appIngestionData.status || ""} />
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("ekslog:ingest.detail.created")}>
              <div>{formatLocalTime(appIngestionData?.createdAt || "")}</div>
            </ValueWithLabel>
          </div>
        </div>
      </HeaderPanel>
    );
  };

  const renderS3Detail = () => {
    return (
      <HeaderPanel title={t("applog:detail.ingestion.ingestionOverview")}>
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("applog:detail.ingestion.source")}>
              <div>
                <ExtLink
                  to={buildS3Link(
                    amplifyConfig.aws_project_region,
                    sourceInfo?.s3?.bucketName || ""
                  )}
                >
                  {sourceInfo?.s3?.bucketName}
                </ExtLink>
              </div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("applog:detail.ingestion.sourceType")}>
              <div>
                {t("other")}
                {`(${appIngestionData?.sourceType || "-"})`}
              </div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("applog:detail.ingestion.ingestionMode")}>
              <div>{t(sourceInfo?.s3?.mode || "")}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("applog:detail.ingestion.status")}>
              <Status status={appIngestionData.status || ""} />
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("ekslog:ingest.detail.created")}>
              <div>{formatLocalTime(appIngestionData?.createdAt || "")}</div>
            </ValueWithLabel>
          </div>
        </div>
      </HeaderPanel>
    );
  };

  const renderEC2Detail = () => {
    return (
      <HeaderPanel title={t("applog:detail.ingestion.ingestionOverview")}>
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("applog:detail.ingestion.source")}>
              <>
                <Link
                  to={`/resources/instance-group/detail/${sourceInfo.sourceId}`}
                >
                  {sourceInfo?.ec2?.groupName}
                </Link>
              </>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("applog:detail.ingestion.sourceType")}>
              <div>{t("instanceGroup")}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("sourceAccount")}>
              <div>{sourceInfo.accountId || "-"}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("applog:detail.ingestion.status")}>
              <Status status={appIngestionData.status || ""} />
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("ekslog:ingest.detail.created")}>
              <div>{formatLocalTime(appIngestionData?.createdAt || "")}</div>
            </ValueWithLabel>
          </div>
        </div>
      </HeaderPanel>
    );
  };

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
                {appIngestionData?.sourceType === LogSourceType.Syslog &&
                  renderSysLogDetail()}
                {appIngestionData?.sourceType === LogSourceType.S3 &&
                  renderS3Detail()}
                {appIngestionData?.sourceType === LogSourceType.EC2 &&
                  renderEC2Detail()}
                {sourceInfo.ec2?.groupType !== EC2GroupType.ASG && (
                  <AntTabs
                    value={activeTab}
                    onChange={(event, newTab) => {
                      changeTab(event, newTab);
                    }}
                  >
                    {appIngestionData?.sourceType !== LogSourceType.Syslog && (
                      <AntTab label={t("applog:detail.tab.sourceDetail")} />
                    )}

                    {appIngestionData?.sourceType === LogSourceType.Syslog && (
                      <AntTab label={t("applog:ingestion.syslogConfig5424")} />
                    )}
                    {appIngestionData?.sourceType === LogSourceType.Syslog && (
                      <AntTab label={t("applog:ingestion.syslogConfig3164")} />
                    )}
                  </AntTabs>
                )}
                {appIngestionData?.sourceType === LogSourceType.Syslog && (
                  <TabPanel value={activeTab} index={0}>
                    <SyslogGuide
                      ingestion={appIngestionData}
                      sourceData={sourceInfo}
                      syslogType={SyslogParser.RFC5424}
                    />
                  </TabPanel>
                )}
                {appIngestionData?.sourceType === LogSourceType.Syslog && (
                  <TabPanel value={activeTab} index={1}>
                    <SyslogGuide
                      ingestion={appIngestionData}
                      sourceData={sourceInfo}
                      syslogType={SyslogParser.RFC3164}
                    />
                  </TabPanel>
                )}

                {appIngestionData?.sourceType === LogSourceType.S3 && (
                  <TabPanel value={activeTab} index={0}>
                    <S3SourceDetail
                      sourceInfo={sourceInfo}
                      appIngestionData={appIngestionData}
                    />
                  </TabPanel>
                )}
                {appIngestionData?.sourceType === LogSourceType.Syslog && (
                  <TabPanel
                    value={activeTab}
                    index={
                      appIngestionData?.sourceType === LogSourceType.Syslog
                        ? 2
                        : 1
                    }
                  >
                    <Tags tags={appIngestionData?.tags} />
                  </TabPanel>
                )}
                {appIngestionData.sourceType === LogSourceType.EC2 && (
                  <div>
                    <TabPanel value={activeTab} index={0}>
                      {sourceInfo.ec2?.groupType !== EC2GroupType.ASG && (
                        <div className="panel-content">
                          <div className="flex value-label-span">
                            <div className="flex-1">
                              <ValueWithLabel label={t("instanceName")}>
                                <div>{sourceInfo.ec2?.groupName}</div>
                              </ValueWithLabel>
                            </div>
                            <div className="flex-1 border-left-c">
                              <ValueWithLabel label={t("instanceSelection")}>
                                <>{t("manual")}</>
                              </ValueWithLabel>
                            </div>
                            <div className="flex-1 border-left-c">
                              <ValueWithLabel
                                label={t(
                                  "applog:ingestion.chooseInstanceGroup.list.platform"
                                )}
                              >
                                <>{sourceInfo.ec2?.groupPlatform}</>
                              </ValueWithLabel>
                            </div>
                            <div className="flex-1 border-left-c">
                              <ValueWithLabel
                                label={t("ekslog:ingest.detail.created")}
                              >
                                <div>
                                  {formatLocalTime(
                                    appIngestionData?.createdAt || ""
                                  )}
                                </div>
                              </ValueWithLabel>
                            </div>
                          </div>
                        </div>
                      )}
                      {sourceInfo.ec2?.groupType === EC2GroupType.ASG ? (
                        <DetailASG instanceGroup={sourceInfo} />
                      ) : (
                        <ShowDetailEC2 instanceGroupId={sourceInfo.sourceId} />
                      )}
                    </TabPanel>
                    {sourceInfo.ec2?.groupType !== EC2GroupType.ASG && (
                      <InstancePermission />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppIngestionDetail;

interface ShowDetailEC2Props {
  instanceGroupId: string;
}

function ShowDetailEC2(props: ShowDetailEC2Props) {
  const [loadingData, setLoadingData] = useState(true);
  const [curInstanceGroup, setCurInstanceGroup] = useState<LogSource>({
    __typename: "LogSource",
    sourceId: "",
  });
  const { t } = useTranslation();

  const getInstanceGroupById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getLogSource, {
        sourceId: props.instanceGroupId,
        type: LogSourceType.EC2,
      });
      console.info("resData:", resData);
      const dataInstanceGroup: LogSource = resData.data.getLogSource;
      if (
        (dataInstanceGroup.status as unknown as ResourceStatus) ===
        ResourceStatus.INACTIVE
      ) {
        Alert(t("resource:group.detail.notExist"));
        return;
      }
      setCurInstanceGroup(dataInstanceGroup);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getInstanceGroupById();
  }, []);

  return (
    <DetailEC2
      loadingData={loadingData}
      instanceGroup={curInstanceGroup}
      disableAddInstance
      disableRemoveInstance
      refreshInstanceGroup={() => {
        getInstanceGroupById();
      }}
    />
  );
}
