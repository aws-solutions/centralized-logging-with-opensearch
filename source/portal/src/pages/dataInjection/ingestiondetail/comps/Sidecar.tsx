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
import { appSyncRequestQuery } from "assets/js/request";
import Alert from "components/Alert";
import CodeCopy from "components/CodeCopy";
import HeaderPanel from "components/HeaderPanel";
import { getK8sDeploymentContentWithSidecar } from "graphql/queries";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface SidecarProps {
  clusterId: string;
  ingestionId: string;
}

const Sidecar: React.FC<SidecarProps> = (props: SidecarProps) => {
  const { clusterId, ingestionId } = props;
  const { t } = useTranslation();
  const [loadingData, setLoadingData] = useState(false);
  const [sidecarGuide, setSidecarGuide] = useState("");

  const getSidecarByIngestion = async () => {
    try {
      setLoadingData(true);
      const sidecarData: any = await appSyncRequestQuery(
        getK8sDeploymentContentWithSidecar,
        {
          id: ingestionId,
        }
      );
      setLoadingData(false);
      const tmpSidecarData =
        sidecarData?.data?.getK8sDeploymentContentWithSidecar;
      setSidecarGuide(tmpSidecarData);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    if (ingestionId && clusterId) {
      getSidecarByIngestion();
    }
  }, [clusterId, ingestionId]);

  return (
    <div>
      <HeaderPanel title={t("ekslog:ingest.detail.sidecarTab.guide")}>
        <div>
          <div>
            <Alert content={t("ekslog:ingest.detail.sidecarTab.alert")} />
            <CodeCopy loading={loadingData} code={sidecarGuide} />
          </div>
        </div>
      </HeaderPanel>
    </div>
  );
};

export default Sidecar;
