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
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import { NGINX_LOG_CONFIG_LINK } from "assets/js/const";
import CopyButton from "components/CopyButton";
import { useTranslation } from "react-i18next";

const NGINX_SAMPLE_CONFIG = `log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
'$status $body_bytes_sent "$http_referer" '
'"$http_user_agent" "$http_x_forwarded_for"';`;

const NginxLogFormat: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="gsui-help-container">
      <div className="gsui-help-content">
        {t("info:nginxLogFormat.tip1")}
        <code>/etc/nginx/nginx.conf</code>
        {t("info:nginxLogFormat.tip2")}
        <code>log_format</code>.
      </div>
      <div className="gsui-help-title">{t("info:nginxLogFormat.sample")}</div>
      <div className="gsui-help-content">
        <div>
          <pre className="code">
            <code>{NGINX_SAMPLE_CONFIG}</code>
          </pre>
          <CopyButton text={NGINX_SAMPLE_CONFIG}>{t("button.copy")}</CopyButton>
        </div>
      </div>
      <hr />
      <div className="gsui-help-content">{t("info:nginxLogFormat.alert1")}</div>

      <div className="gsui-help-more">
        <div className="learn-more">
          {t("info:learnMore")}
          <i>
            <OpenInNewIcon className="icon" fontSize="small" />
          </i>
        </div>
        <div className="gsui-help-link-item">
          <a href={NGINX_LOG_CONFIG_LINK} target="_blank" rel="noreferrer">
            {t("info:nginxLogFormat.configNginx")}
          </a>
        </div>
      </div>
    </div>
  );
};

export default NginxLogFormat;
