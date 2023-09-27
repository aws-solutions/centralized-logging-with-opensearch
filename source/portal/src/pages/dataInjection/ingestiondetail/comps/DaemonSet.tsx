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
import React from "react";
import HeaderPanel from "components/HeaderPanel";
import { useTranslation } from "react-i18next";
import Alert from "components/Alert";
import { Link } from "react-router-dom";

interface DaemonSetProps {
  clusterId: string;
  ingestionId: string;
}

const Daemonset: React.FC<DaemonSetProps> = (props: DaemonSetProps) => {
  const { clusterId } = props;
  const { t } = useTranslation();

  return (
    <div>
      <HeaderPanel title={t("ekslog:ingest.detail.daemonsetTab.guide")}>
        <div>
          <Alert
            content={
              <div>
                {t("ekslog:ingest.detail.daemonsetTab.alert")}
                <Link to={`/containers/eks-log/detail/${clusterId}/guide`}>
                  {t("ekslog:ingest.detail.daemonsetTab.guide")}
                </Link>
              </div>
            }
          ></Alert>
        </div>
      </HeaderPanel>
    </div>
  );
};

export default Daemonset;
