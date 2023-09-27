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

const APACHE_SAMPLE_CONFIG = `LogFormat "%h %l %u %t \\"%r\\" %>s %b \\"%{Referer}i\\" \\"%{User-Agent}i\\"" combined`;

const ApacheLogFormat: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="gsui-help-container">
      <div className="gsui-help-content">
        {t("info:apacheLogFormat.tip1")}
        <code>/etc/httpd/conf/httpd.conf</code>
        {t("info:apacheLogFormat.tip2")}
        <code>LogFormat</code>.
      </div>
      <div className="gsui-help-title">{t("info:apacheLogFormat.sample")}</div>
      <div className="gsui-help-content">
        <div>
          <pre className="code">
            <code>{APACHE_SAMPLE_CONFIG}</code>
          </pre>
          <CopyButton text={APACHE_SAMPLE_CONFIG}>
            {t("button.copy")}
          </CopyButton>
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
            {t("info:apacheLogFormat.apacheLog")}
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApacheLogFormat;
