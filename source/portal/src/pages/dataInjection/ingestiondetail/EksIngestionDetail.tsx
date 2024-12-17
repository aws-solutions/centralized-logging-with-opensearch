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
import { defaultStr, formatLocalTime } from "assets/js/utils";
import DaemonSet from "./comps/DaemonSet";
import { getParamValueByKey } from "assets/js/applog";
import CommonLayout from "pages/layout/CommonLayout";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import AccountName from "pages/comps/account/AccountName";

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
  const { id, eksId } = useParams();
  const [loadingData, setLoadingData] = useState(false);
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
        <HeaderWithValueLabel
          numberOfColumns={4}
          headerTitle={t("applog:detail.ingestion.generalConfig")}
          dataList={[
            {
              label: t("applog:detail.ingestion.sourceType"),
              data: t("applog:logSourceDesc.eks.title"),
            },
            {
              label: t("applog:detail.ingestion.source"),
              data: (
                <Link
                  to={`/containers/eks-log/detail/${eksClusterInfo?.sourceId}`}
                >
                  {eksClusterInfo?.eks?.eksClusterName}
                </Link>
              ),
            },
            {
              label: t("sourceAccount"),
              data: (
                <AccountName
                  accountId={eksClusterInfo?.accountId ?? ""}
                  region={eksClusterInfo?.region ?? ""}
                />
              ),
            },
            {
              label: t("ekslog:ingest.detail.created"),
              data: formatLocalTime(defaultStr(eksClusterInfo?.createdAt)),
            },
          ]}
        />

        {eksIngestionData?.deploymentKind === EKSDeployKind.Sidecar && (
          <Sidecar clusterId={defaultStr(eksId)} ingestionId={defaultStr(id)} />
        )}
        {eksIngestionData?.deploymentKind === EKSDeployKind.DaemonSet && (
          <DaemonSet
            clusterId={defaultStr(eksId)}
            ingestionId={defaultStr(id)}
          />
        )}
      </div>
    </CommonLayout>
  );
};

export default EksIngestionDetail;
