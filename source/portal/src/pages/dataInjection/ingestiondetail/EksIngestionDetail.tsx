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
import {
  getAppLogIngestion,
  getAppPipeline,
  getEKSClusterDetails,
} from "graphql/queries";
import Sidecar from "./comps/Sidecar";
import {
  AppLogIngestion,
  AppPipeline,
  EKSClusterLogSource,
  EKSDeployKind,
  Tag,
} from "API";
import { buildKDSLink, formatLocalTime } from "assets/js/utils";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";
import Tags from "./comps/Tags";
import LogConfig from "./comps/LogConfig";
import DaemonSet from "./comps/DaemonSet";

interface MatchParams {
  eksId: string;
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
  logPath: string;
  tags: (Tag | null)[] | null | undefined;
}

const EksIngestionDetail: React.FC = () => {
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const { id, eksId }: MatchParams = useParams();
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [eksIngestionData, setEksIngestionData] = useState<EksDetailProps>();
  const [eksClusterName, setEksClusterName] = useState("");
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("menu.eksLog"),
      link: "/containers/eks-log",
    },
    {
      name: eksClusterName,
      link: "/containers/eks-log/detail/" + eksId,
    },
    { name: id },
  ];

  const changeTab = (event: any, newTab: number) => {
    console.info("newTab:", newTab);
    setActiveTab(newTab);
  };

  const getEksLogIngestionById = async () => {
    try {
      setLoadingData(true);

      // Get Ingestion Info By ingestionId
      const resEksData: any = await appSyncRequestQuery(getEKSClusterDetails, {
        eksClusterId: eksId,
      });
      const tmpEksData: EKSClusterLogSource =
        resEksData?.data?.getEKSClusterDetails;
      setEksClusterName(tmpEksData.eksClusterName || "");

      // Get Ingestion Info By ingestionId
      const resIngestionData: any = await appSyncRequestQuery(
        getAppLogIngestion,
        {
          id: id,
        }
      );
      const tmpIngestionData: AppLogIngestion =
        resIngestionData?.data?.getAppLogIngestion;

      // Get Pipeline Info by pipelineId
      const resPipelineData: any = await appSyncRequestQuery(getAppPipeline, {
        id: tmpIngestionData?.appPipelineId,
      });
      const tmpPipelineData: AppPipeline =
        resPipelineData?.data?.getAppPipeline;

      setEksIngestionData({
        deploymentKind: tmpEksData.deploymentKind,
        indexPrefix: tmpPipelineData.aosParas?.indexPrefix || "",
        streamName: tmpPipelineData.kdsParas?.streamName || "",
        enableAutoScaling: tmpPipelineData.kdsParas?.enableAutoScaling || false,
        appPipelineId: tmpPipelineData.id,
        configId: tmpIngestionData.confId || "",
        created: tmpIngestionData.createdDt || "",
        logPath: tmpIngestionData.logPath || "",
        tags: tmpIngestionData.tags,
      });

      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getEksLogIngestionById();
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
                      <ValueWithLabel
                        label={t("ekslog:ingest.detail.osIndexPrefix")}
                      >
                        <div>{eksIngestionData?.indexPrefix}</div>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel label={t("ekslog:ingest.detail.kds")}>
                        <div>
                          <ExtLink
                            to={buildKDSLink(
                              amplifyConfig.aws_project_region,
                              eksIngestionData?.streamName || ""
                            )}
                          >
                            {eksIngestionData?.streamName || "-"}
                          </ExtLink>
                          {eksIngestionData?.enableAutoScaling
                            ? t("applog:detail.autoScaling")
                            : ""}
                        </div>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel
                        label={t("ekslog:ingest.detail.pipeline")}
                      >
                        <div>
                          <Link
                            to={`/log-pipeline/application-log/detail/${eksIngestionData?.appPipelineId}`}
                          >
                            {eksIngestionData?.appPipelineId}
                          </Link>
                        </div>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel label={t("ekslog:ingest.detail.created")}>
                        <div>
                          {formatLocalTime(eksIngestionData?.created || "")}
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
                  {eksIngestionData?.deploymentKind ===
                    EKSDeployKind.Sidecar && (
                    <AntTab label={t("ekslog:ingest.detail.sidecar")} />
                  )}
                  {eksIngestionData?.deploymentKind ===
                    EKSDeployKind.DaemonSet && (
                    <AntTab label={t("ekslog:ingest.detail.daemonset")} />
                  )}
                  <AntTab label={t("ekslog:ingest.detail.logConfig")} />
                  <AntTab label={t("ekslog:ingest.detail.tag")} />
                </AntTabs>
                <TabPanel value={activeTab} index={0}>
                  {eksIngestionData?.deploymentKind ===
                    EKSDeployKind.Sidecar && (
                    <Sidecar clusterId={eksId} ingestionId={id} />
                  )}
                  {eksIngestionData?.deploymentKind ===
                    EKSDeployKind.DaemonSet && (
                    <DaemonSet clusterId={eksId} ingestionId={id} />
                  )}
                </TabPanel>
                <TabPanel value={activeTab} index={1}>
                  <LogConfig
                    logPath={eksIngestionData?.logPath}
                    configId={eksIngestionData?.configId}
                  />
                </TabPanel>
                <TabPanel value={activeTab} index={2}>
                  <Tags ingestionInfo={eksIngestionData} />
                </TabPanel>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EksIngestionDetail;
