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
import {
  HELP_CLOUDWATCH_LOG_LINK,
  HELP_NAT_GW_LINK,
  HELP_PRIVATE_S3_LINK,
} from "assets/js/const";
import React from "react";
import { useTranslation } from "react-i18next";

const LogProcessingNetwork: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="gsui-help-container">
      <div className="gsui-help-content">
        {t("info:logProcessingNetwork.tip1")}
      </div>
      <div className="gsui-help-title">
        {t("info:logProcessingNetwork.s3Access")}
      </div>
      <div className="gsui-help-content">
        {t("info:logProcessingNetwork.tip21")}
        <a href={HELP_PRIVATE_S3_LINK} target="_blank" rel="noreferrer">
          {t("info:logProcessingNetwork.tip22")}
        </a>
        {t("info:logProcessingNetwork.tip23")}
        <a href={HELP_NAT_GW_LINK} target="_blank" rel="noreferrer">
          {t("info:logProcessingNetwork.tip24")}
        </a>
        .
      </div>
      <div className="gsui-help-title">
        {t("info:logProcessingNetwork.cwLogs")}
      </div>
      <div className="gsui-help-content">
        {t("info:logProcessingNetwork.tip31")}
        <a href={HELP_CLOUDWATCH_LOG_LINK} target="_blank" rel="noreferrer">
          {t("info:logProcessingNetwork.tip32")}
        </a>
        {t("info:logProcessingNetwork.tip33")}
      </div>
      <div className="gsui-help-title">
        {t("info:logProcessingNetwork.kdsAccess")}
      </div>
      <div className="gsui-help-content">
        {t("info:logProcessingNetwork.tip4")}
      </div>
    </div>
  );
};

export default LogProcessingNetwork;
