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
import { CLOUDTRAIL_LOG_LINK } from "assets/js/const";
import ExtLink from "components/ExtLink";
import CloudTrailArch from "assets/images/desc/cloudtrailArch.png";
import { useTranslation } from "react-i18next";

const CloudTrailDesc: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="ingest-desc-title">
        {t("servicelog:create.service.trail")}
      </div>
      <div className="ingest-desc-desc mb-20">
        {t("servicelog:trail.desc.ingest")}
        <ExtLink to={CLOUDTRAIL_LOG_LINK}>
          {t("servicelog:trail.desc.trailLog")}
        </ExtLink>{" "}
        {t("servicelog:trail.desc.intoDomain")}
      </div>
      <div className="ingest-desc-title">
        {t("servicelog:trail.desc.archName")}
      </div>
      <div className="ingest-desc-desc">
        {t("servicelog:trail.desc.archDesc")}
      </div>
      <div className="mt-10">
        <img
          className="img-border"
          alt="architecture"
          width="80%"
          src={CloudTrailArch}
        />
      </div>
    </div>
  );
};

export default CloudTrailDesc;
