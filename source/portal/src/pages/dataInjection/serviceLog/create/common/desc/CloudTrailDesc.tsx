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
import React, { useState } from "react";
import { CLOUDTRAIL_LOG_LINK } from "assets/js/const";
import ExtLink from "components/ExtLink";
import CloudTrailArch from "assets/images/desc/cloudtrailArch.png";
import CloudTrailArchCWL from "assets/images/desc/cloudtrailArch_CWL.png";

import { useTranslation } from "react-i18next";
import { AntTab, AntTabs, TabPanel } from "components/Tab";
import { CWLSourceType } from "types";

const CloudTrailDesc: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
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
        {t("intoDomain")}
      </div>
      <div className="ingest-desc-title">
        {t("servicelog:trail.desc.archName")}
      </div>
      <div className="ingest-desc-desc">{t("archDesc")}</div>
      <AntTabs
        value={activeTab}
        onChange={(event, newTab) => {
          setActiveTab(newTab);
        }}
      >
        <AntTab label={CWLSourceType.S3} />
        <AntTab label={CWLSourceType.CWL} />
      </AntTabs>
      <TabPanel value={activeTab} index={0}>
        <div className="mt-10">
          <img
            className="img-border"
            alt="architecture"
            width="80%"
            src={CloudTrailArch}
          />
        </div>
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <div className="mt-10">
          <img
            className="img-border"
            alt="architecture"
            width="80%"
            src={CloudTrailArchCWL}
          />
        </div>
      </TabPanel>
    </div>
  );
};

export default CloudTrailDesc;
