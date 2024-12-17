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
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { AntTab, AntTabs, TabPanel } from "components/Tab";
import { appSyncRequestQuery } from "assets/js/request";
import {
  getAppLogIngestion,
  getAppPipeline,
  getLogSource,
} from "graphql/queries";

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
  defaultStr,
  formatLocalTime,
} from "assets/js/utils";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import SyslogGuide from "./comps/SyslogGuide";
import { S3SourceDetail } from "./S3SourceDetail";
import InstancePermission from "../applicationLog/common/InstancePermission";
import { RootState } from "reducer/reducers";
import CommonLayout from "pages/layout/CommonLayout";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import AccountName from "pages/comps/account/AccountName";

const AppIngestionDetail: React.FC = () => {
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const { id } = useParams();
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState("sourceInfo");
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
      name: defaultStr(appIngestionData?.appPipelineId),
      link:
        "/log-pipeline/application-log/detail/" + appPipelineData?.pipelineId,
    },
    { name: defaultStr(id) },
  ];

  const getAppPipelineInfoById = async (pipelineId: string) => {
    try {
      const resPipelineData: any = await appSyncRequestQuery(getAppPipeline, {
        id: pipelineId,
      });
      setLoadingData(false);
      const tmpPipelineData: AppPipeline =
        resPipelineData?.data?.getAppPipeline;
      setAppPipelineData(tmpPipelineData);
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
      if (tmpIngestionData?.appPipelineId) {
        const sourceData = await appSyncRequestQuery(getLogSource, {
          type: tmpIngestionData.sourceType,
          sourceId: tmpIngestionData.sourceId,
        });
        console.log("sourceData:", sourceData);
        setSourceInfo(sourceData.data.getLogSource);
        getAppPipelineInfoById(tmpIngestionData.appPipelineId);
      }
      setAppIngestionData(tmpIngestionData);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getAppLogIngestionById();
  }, []);

  useEffect(() => {
    if (appPipelineData?.logConfig?.syslogParser === SyslogParser.RFC3164) {
      setActiveTab("syslog3164");
    }
  }, [appPipelineData?.logConfig?.syslogParser]);

  const renderSysLogDetail = () => {
    return (
      <>
        <HeaderWithValueLabel
          numberOfColumns={4}
          headerTitle={t("applog:detail.ingestion.generalConfig")}
          dataList={[
            {
              label: t("applog:detail.ingestion.sourceType"),
              data: t("applog:logSourceDesc.syslog.title"),
            },
            {
              label: t("applog:detail.ingestion.source"),
              data: (
                <ExtLink
                  to={buildNLBLinkByDNS(
                    amplifyConfig.aws_project_region,
                    defaultStr(sourceInfo?.syslog?.nlbDNSName)
                  )}
                >
                  {defaultStr(sourceInfo?.syslog?.nlbDNSName, "-")}
                </ExtLink>
              ),
            },
            {
              label: t("sourceAccount"),
              data: (
                <AccountName
                  accountId={sourceInfo.accountId ?? ""}
                  region={sourceInfo.region ?? ""}
                />
              ),
            },
            {
              label: t("ekslog:ingest.detail.created"),
              data: formatLocalTime(defaultStr(appIngestionData?.createdAt)),
            },
          ]}
        />
        <HeaderWithValueLabel
          numberOfColumns={2}
          headerTitle={t("applog:detail.syslogSettings")}
          dataList={[
            {
              label: t("applog:ingestion.syslog.protocol"),
              data: <div>{`${defaultStr(sourceInfo?.syslog?.protocol)}`}</div>,
            },
            {
              label: `${t("applog:ingestion.syslog.port")}`,
              data: defaultStr(sourceInfo?.syslog?.port?.toString()),
            },
          ]}
        />
      </>
    );
  };

  const renderS3Detail = () => {
    return (
      <HeaderWithValueLabel
        numberOfColumns={4}
        headerTitle={t("applog:detail.ingestion.generalConfig")}
        dataList={[
          {
            label: t("applog:detail.ingestion.sourceType"),
            data: t("applog:logSourceDesc.s3.title"),
          },
          {
            label: t("applog:detail.ingestion.source"),
            data: (
              <ExtLink
                to={buildS3Link(
                  amplifyConfig.aws_project_region,
                  defaultStr(sourceInfo?.s3?.bucketName)
                )}
              >
                {sourceInfo?.s3?.bucketName}
              </ExtLink>
            ),
          },
          {
            label: t("sourceAccount"),
            data: (
              <AccountName
                accountId={sourceInfo.accountId ?? ""}
                region={sourceInfo.region ?? ""}
              />
            ),
          },
          {
            label: t("ekslog:ingest.detail.created"),
            data: formatLocalTime(defaultStr(appIngestionData?.createdAt)),
          },
        ]}
      />
    );
  };

  const renderEC2Detail = () => {
    return (
      <HeaderWithValueLabel
        numberOfColumns={4}
        headerTitle={t("applog:detail.ingestion.generalConfig")}
        dataList={[
          {
            label: t("applog:detail.ingestion.sourceType"),
            data: t("applog:logSourceDesc.ec2.title"),
          },
          {
            label: t("applog:detail.ingestion.source"),
            data: (
              <>
                <Link
                  to={`/resources/instance-group/detail/${sourceInfo.sourceId}`}
                >
                  {sourceInfo?.ec2?.groupName}
                </Link>{" "}
                ({sourceInfo.ec2?.groupPlatform})
              </>
            ),
          },
          {
            label: t("sourceAccount"),
            data: (
              <AccountName
                accountId={sourceInfo.accountId ?? ""}
                region={sourceInfo.region ?? ""}
              />
            ),
          },
          {
            label: t("ekslog:ingest.detail.created"),
            data: formatLocalTime(defaultStr(appIngestionData?.createdAt)),
          },
        ]}
      />
    );
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList} loadingData={loadingData}>
      <div data-testid="test-app-log-ingestion-detail">
        {appIngestionData?.sourceType === LogSourceType.Syslog &&
          renderSysLogDetail()}
        {appIngestionData?.sourceType === LogSourceType.S3 && renderS3Detail()}
        {appIngestionData?.sourceType === LogSourceType.EC2 &&
          renderEC2Detail()}
        {sourceInfo.ec2?.groupType !== EC2GroupType.ASG &&
          sourceInfo.ec2?.groupType !== EC2GroupType.EC2 &&
          appIngestionData?.sourceType !== LogSourceType.Syslog && (
            <AntTabs
              value={activeTab}
              onChange={(event, newTab) => {
                setActiveTab(newTab);
              }}
            >
              {
                <AntTab
                  label={t("applog:detail.tab.sourceDetail")}
                  value="sourceInfo"
                />
              }
            </AntTabs>
          )}
        {appIngestionData?.sourceType === LogSourceType.Syslog &&
          appPipelineData?.logConfig?.syslogParser === SyslogParser.RFC5424 && (
            <SyslogGuide
              ingestion={appIngestionData}
              sourceData={sourceInfo}
              syslogType={SyslogParser.RFC5424}
            />
          )}
        {appIngestionData?.sourceType === LogSourceType.Syslog &&
          appPipelineData?.logConfig?.syslogParser === SyslogParser.RFC3164 && (
            <SyslogGuide
              ingestion={appIngestionData}
              sourceData={sourceInfo}
              syslogType={SyslogParser.RFC3164}
            />
          )}

        {appIngestionData?.sourceType === LogSourceType.Syslog &&
          appPipelineData?.logConfig?.syslogParser !== SyslogParser.RFC3164 &&
          appPipelineData?.logConfig?.syslogParser !== SyslogParser.RFC5424 && (
            <>
              <AntTabs
                value={activeTab}
                onChange={(event, newTab) => {
                  setActiveTab(newTab);
                }}
              >
                <AntTab
                  label={t("applog:ingestion.syslogConfig5424")}
                  value="sourceInfo"
                />
                <AntTab
                  data-testid="accessProxy-tab"
                  label={t("applog:ingestion.syslogConfig3164")}
                  value="rfc3164"
                />
              </AntTabs>
              <TabPanel value={activeTab} index="sourceInfo">
                <SyslogGuide
                  ingestion={appIngestionData}
                  sourceData={sourceInfo}
                  syslogType={SyslogParser.RFC5424}
                />
              </TabPanel>
              <TabPanel value={activeTab} index="rfc3164">
                <SyslogGuide
                  ingestion={appIngestionData}
                  sourceData={sourceInfo}
                  syslogType={SyslogParser.RFC3164}
                />
              </TabPanel>
            </>
          )}

        {appIngestionData?.sourceType === LogSourceType.S3 && (
          <TabPanel value={activeTab} index="sourceInfo">
            <S3SourceDetail
              sourceInfo={sourceInfo}
              appIngestionData={appIngestionData}
            />
          </TabPanel>
        )}
        {appIngestionData.sourceType === LogSourceType.EC2 &&
          sourceInfo.ec2?.groupType !== EC2GroupType.ASG && (
            <InstancePermission />
          )}
      </div>
    </CommonLayout>
  );
};

export default AppIngestionDetail;
