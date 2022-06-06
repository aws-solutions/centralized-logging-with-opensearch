/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React from "react";
import ExtLink from "components/ExtLink";
import cloudFrontSArch from "assets/images/desc/cloudFrontArch.png";
import { CLOUDFRONT_LOG_LINK } from "assets/js/const";
import { useTranslation } from "react-i18next";

const CloudFrontDesc: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="ingest-desc-title">
        {t("servicelog:create.service.cloudfront")}
      </div>
      <div className="ingest-desc-desc">
        {t("servicelog:cloudfront.desc.ingest")}
        <ExtLink to={CLOUDFRONT_LOG_LINK}>
          {t("servicelog:cloudfront.desc.cloudfrontLog")}
        </ExtLink>
        {t("servicelog:cloudfront.desc.intoDomain")}
      </div>
      <div className="ingest-desc-title">
        {t("servicelog:cloudfront.desc.archName")}
      </div>
      <div className="ingest-desc-desc">
        {t("servicelog:cloudfront.desc.archDesc")}
      </div>
      <div className="mt-10">
        <img
          className="img-border"
          alt="architecture"
          width="80%"
          src={cloudFrontSArch}
        />
      </div>
    </div>
  );
};

export default CloudFrontDesc;
