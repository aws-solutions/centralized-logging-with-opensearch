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
import {
  CREATE_OS_PROXY_LINK,
  HELP_ACM_LINK,
  HELP_ALB_LINK,
} from "assets/js/const";
import { useTranslation } from "react-i18next";

const AccessProxy: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="gsui-help-container">
      <div className="gsui-help-content">
        {t("info:accessProxy.tip1")}
        <a href={HELP_ALB_LINK} target="_blank" rel="noreferrer">
          {t("info:accessProxy.alb")}
        </a>
        {t("info:accessProxy.tip2")}
      </div>
      <div className="gsui-help-title">
        {t("info:accessProxy.prerequisites")}
      </div>
      <div className="gsui-help-content">
        <div>{t("info:accessProxy.pre1")}</div>
        <div>
          {t("info:accessProxy.pre2")}
          <a href={HELP_ACM_LINK} target="_blank" rel="noreferrer">
            {t("info:accessProxy.acm")}
          </a>
        </div>
        <div>{t("info:accessProxy.pre3")}</div>
      </div>
      <div className="gsui-help-more">
        <div className="learn-more">
          {t("info:learnMore")}
          <i>
            <OpenInNewIcon className="icon" fontSize="small" />
          </i>
        </div>
        <div className="gsui-help-link-item">
          <a href={CREATE_OS_PROXY_LINK} target="_blank" rel="noreferrer">
            {t("info:accessProxy.createProxy")}
          </a>
        </div>
      </div>
    </div>
  );
};

export default AccessProxy;
