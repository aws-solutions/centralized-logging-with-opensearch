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
import awsConfigArch from "assets/images/desc/awsConfigArch.png";
import ExtLink from "components/ExtLink";
import { AWS_CONFIG_LOG_LINK } from "assets/js/const";
import { useTranslation } from "react-i18next";
const ConfigDesc: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="ingest-desc-title">
        {t("servicelog:create.service.config")}
      </div>
      <div className="ingest-desc-desc">
        {t("servicelog:config.desc.ingest")}
        <ExtLink to={AWS_CONFIG_LOG_LINK}>
          {t("servicelog:config.desc.configLog")}
        </ExtLink>{" "}
        {t("intoDomain")}
      </div>
      <div className="ingest-desc-title">
        {t("servicelog:config.desc.archName")}
      </div>
      <div className="ingest-desc-desc">{t("archDesc")}</div>
      <div className="mt-10">
        <img
          className="img-border"
          alt="architecture"
          width="80%"
          src={awsConfigArch}
        />
      </div>
    </div>
  );
};

export default ConfigDesc;
