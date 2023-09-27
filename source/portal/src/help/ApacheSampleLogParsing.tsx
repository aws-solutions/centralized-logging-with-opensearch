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
import { APACHE_LOG_CONFIG_LINK } from "assets/js/const";
import CopyButton from "components/CopyButton";
import { useTranslation } from "react-i18next";

const SAMPLE_LOG = `127.0.0.1 - - [22/Dec/2021:06:48:57 +0000] "GET /xxx HTTP/1.1" 404 196 "-" "curl/7.79.1"`;
const ApacheSampleLogParsing: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="gsui-help-container">
      <div className="gsui-help-content">
        {t("info:apacheLogParsing.tip1")}
        <code>/var/log/nginx/access.log</code>
      </div>
      <div className="gsui-help-title">
        {t("info:apacheLogParsing.sampleLog")}
      </div>
      <div className="gsui-help-content">
        <div>
          <pre className="code">
            <code>{SAMPLE_LOG}</code>
          </pre>
          <CopyButton text={SAMPLE_LOG}>{t("button.copy")}</CopyButton>
        </div>
      </div>

      <div className="gsui-help-more">
        <div className="learn-more">
          {t("info:learnMore")}
          <i>
            <OpenInNewIcon className="icon" fontSize="small" />
          </i>
        </div>
        <div className="gsui-help-link-item">
          <a href={APACHE_LOG_CONFIG_LINK} target="_blank" rel="noreferrer">
            {t("info:apacheLogParsing.configLogApache")}
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApacheSampleLogParsing;
