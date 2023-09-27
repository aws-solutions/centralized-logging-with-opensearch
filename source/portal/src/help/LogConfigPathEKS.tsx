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
import { useTranslation } from "react-i18next";
import SIDE_CAR_IMG from "assets/images/sidecar.jpg";

const LogConfigPathEKS: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="gsui-help-container">
      <div className="gsui-help-content">
        <div>{t("info:logConfigPath.eks.title")}</div>
        <div className="mt-10">
          <b>DaemonSet:</b>
          {t("info:logConfigPath.eks.dtip1")}
          <pre className="code">
            <code>
              /var/log/containers/app-nginx-demo-*_prod-ns_nginx-*
              <br />
              /var/log/containers/app-nginx-demo-*_staging-ns_nginx-*
            </code>
          </pre>
          {t("info:logConfigPath.eks.dtip2Title")}
          <pre className="code">
            <code>
              {`/var/log/containers/<application_name>-*_<namespace>_<container_name>-*`}
            </code>
          </pre>
          {t("info:logConfigPath.eks.dtip2")}
        </div>
        <div className="mt-5">
          <b>Sidecar:</b>
          {t("info:logConfigPath.eks.stip1")}
          <pre className="code">
            <code>/var/log/nginx/access.log</code>
          </pre>
          {t("info:logConfigPath.eks.stip2")}
        </div>
        <div className="mt-5">
          <img width="100%" src={SIDE_CAR_IMG} />
        </div>
      </div>
    </div>
  );
};

export default LogConfigPathEKS;
