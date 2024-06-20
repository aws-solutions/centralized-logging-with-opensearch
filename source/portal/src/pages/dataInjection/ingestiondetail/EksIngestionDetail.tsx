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
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import { AntTab, AntTabs, TabPanel } from "components/Tab";
import { appSyncRequestQuery } from "assets/js/request";
import {
  getAppLogIngestion,
  getAppPipeline,
  getLogSource,
} from "graphql/queries";
import Sidecar from "./comps/Sidecar";
import {
  AppLogIngestion,
  AppPipeline,
  BufferType,
  EKSDeployKind,
  LogSource,
  LogSourceType,
  Tag,
} from "API";
import {
  buildKDSLink,
  buildS3Link,
  defaultStr,
  formatLocalTime,
  ternary,
} from "assets/js/utils";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import DaemonSet from "./comps/DaemonSet";
import { getParamValueByKey } from "assets/js/applog";
import AccountName from "pages/comps/account/AccountName";
import { RootState } from "reducer/reducers";
import Tags from "../common/Tags";
import CommonLayout from "pages/layout/CommonLayout";

export interface EksDetailProps {
  deploymentKind: EKSDeployKind | null | undefined;
  bufferType: BufferType | null | undefined;
  enableAutoScaling: boolean;
  indexPrefix: string;
  bufferName: string;
  appPipelineId: string;
  created: string;
  logPath: string;
  tags: (Tag | null)[] | null | undefined;
}

const EksIngestionDetail: React.FC = () => {
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const { id, eksId } = useParams();
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState("guide");
  const [eksIngestionData, setEksIngestionData] = useState<EksDetailProps>();
  const [eksClusterInfo, setEksClusterInfo] = useState<LogSource>();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("menu.eksLog"),
      link: "/containers/eks-log",
    },
    {
      name: defaultStr(eksClusterInfo?.eks?.eksClusterName),
      link: "/containers/eks-log/detail/" + eksId,
    },
    { name: id },
  ];

  const getEksLogIngestionById = async () => {
    try {
      setLoadingData(true);

      // Get Ingestion Info By ingestionId
      const resEksData: any = await appSyncRequestQuery(getLogSource, {
        type: LogSourceType.EKSCluster,
        sourceId: encodeURIComponent(defaultStr(eksId)),
      });
      const tmpEksData: LogSource = resEksData?.data?.getLogSource;
      setEksClusterInfo(tmpEksData);

      // Get Ingestion Info By ingestionId
      const resIngestionData: any = await appSyncRequestQuery(
        getAppLogIngestion,
        {
          id: encodeURIComponent(defaultStr(id)),
        }
      );
      const tmpIngestionData: AppLogIngestion =
        resIngestionData?.data?.getAppLogIngestion;

      // Get Pipeline Info by pipelineId
      const resPipelineData: any = await appSyncRequestQuery(getAppPipeline, {
        id: encodeURIComponent(defaultStr(tmpIngestionData?.appPipelineId)),
      });
      const tmpPipelineData: AppPipeline =
        resPipelineData?.data?.getAppPipeline;

      setEksIngestionData({
        deploymentKind: tmpEksData.eks?.deploymentKind,
        indexPrefix: defaultStr(tmpPipelineData.aosParams?.indexPrefix),
        bufferType: tmpPipelineData.bufferType,
        bufferName: defaultStr(tmpPipelineData.bufferResourceName),
        enableAutoScaling:
          getParamValueByKey(
            "enableAutoScaling",
            tmpPipelineData.bufferParams
          ) === "true",
        appPipelineId: tmpPipelineData.pipelineId,
        created: defaultStr(tmpIngestionData.createdAt),
        logPath: defaultStr(tmpIngestionData.logPath),
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
    <CommonLayout breadCrumbList={breadCrumbList} loadingData={loadingData}>
      <div>
        <HeaderPanel title={t("ekslog:ingest.detail.ingestionDetail")}>
          <div className="flex value-label-span">
            <div className="flex-1">
              <ValueWithLabel label={t("ekslog:ingest.detail.osIndexPrefix")}>
                <div>{eksIngestionData?.indexPrefix}</div>
              </ValueWithLabel>
              <ValueWithLabel label={t("resource:crossAccount.account")}>
                <AccountName
                  accountId={defaultStr(eksClusterInfo?.accountId)}
                  region={amplifyConfig.aws_project_region}
                />
              </ValueWithLabel>
            </div>
            <div className="flex-1 border-left-c">
              <ValueWithLabel
                label={`${t("ekslog:ingest.detail.bufferLayer")}(${
                  eksIngestionData?.bufferType
                })`}
              >
                <>
                  {eksIngestionData?.bufferType === BufferType.KDS && (
                    <div>
                      <ExtLink
                        to={buildKDSLink(
                          amplifyConfig.aws_project_region,
                          defaultStr(eksIngestionData?.bufferName)
                        )}
                      >
                        {defaultStr(eksIngestionData?.bufferName, "-")}
                      </ExtLink>
                      {ternary(
                        eksIngestionData?.enableAutoScaling,
                        t("applog:detail.autoScaling"),
                        ""
                      )}
                    </div>
                  )}
                  {eksIngestionData?.bufferType === BufferType.S3 && (
                    <div>
                      <ExtLink
                        to={buildS3Link(
                          amplifyConfig.aws_project_region,
                          defaultStr(eksIngestionData?.bufferName)
                        )}
                      >
                        {defaultStr(eksIngestionData?.bufferName, "-")}
                      </ExtLink>
                    </div>
                  )}
                  {eksIngestionData?.bufferType === BufferType.None && (
                    <div>{t("none")}</div>
                  )}
                </>
              </ValueWithLabel>
            </div>
            <div className="flex-1 border-left-c">
              <ValueWithLabel label={t("ekslog:ingest.detail.pipeline")}>
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
                  {formatLocalTime(defaultStr(eksIngestionData?.created))}
                </div>
              </ValueWithLabel>
            </div>
          </div>
        </HeaderPanel>

        <AntTabs
          value={activeTab}
          onChange={(event, newTab) => {
            setActiveTab(newTab);
          }}
        >
          {eksIngestionData?.deploymentKind === EKSDeployKind.Sidecar && (
            <AntTab label={t("ekslog:ingest.detail.sidecar")} value="guide" />
          )}
          {eksIngestionData?.deploymentKind === EKSDeployKind.DaemonSet && (
            <AntTab label={t("ekslog:ingest.detail.daemonset")} value="guide" />
          )}
          <AntTab label={t("ekslog:ingest.detail.tag")} value="tags" />
        </AntTabs>
        <TabPanel value={activeTab} index="guide">
          {eksIngestionData?.deploymentKind === EKSDeployKind.Sidecar && (
            <Sidecar
              clusterId={defaultStr(eksId)}
              ingestionId={defaultStr(id)}
            />
          )}
          {eksIngestionData?.deploymentKind === EKSDeployKind.DaemonSet && (
            <DaemonSet
              clusterId={defaultStr(eksId)}
              ingestionId={defaultStr(id)}
            />
          )}
        </TabPanel>
        <TabPanel value={activeTab} index="tags">
          <Tags tags={eksIngestionData?.tags} />
        </TabPanel>
      </div>
    </CommonLayout>
  );
};

export default EksIngestionDetail;
