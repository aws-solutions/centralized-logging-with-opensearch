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
import React, { useMemo, useState } from "react";
import { CLOUDTRAIL_LOG_LINK } from "assets/js/const";
import ExtLink from "components/ExtLink";
import CloudTrailArch from "assets/images/desc/cloudtrailArch.webp";
import CloudTrailLightEngineArch from "assets/images/desc/cloudtrailLightEngineArch.webp";
import CloudTrailArchCWL from "assets/images/desc/cloudtrailArch_CWL.webp";

import { useTranslation } from "react-i18next";
import { AntTab, AntTabs, TabPanel } from "components/Tab";
import { AnalyticEngineTypes, CWLSourceType } from "types";

interface CloudTrailDescProps {
  engineType: AnalyticEngineTypes;
}

const CloudTrailDesc: React.FC<CloudTrailDescProps> = (
  props: CloudTrailDescProps
) => {
  const { t } = useTranslation();
  const { engineType } = props;
  const [activeTab, setActiveTab] = useState(CWLSourceType.S3);
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );

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
      {!isLightEngine ? (
        <>
          <AntTabs
            value={activeTab}
            onChange={(event, newTab) => {
              setActiveTab(newTab);
            }}
          >
            <AntTab label={CWLSourceType.S3} value={CWLSourceType.S3} />
            <AntTab label={CWLSourceType.CWL} value={CWLSourceType.CWL} />
          </AntTabs>
          <TabPanel value={activeTab} index={CWLSourceType.S3}>
            <div className="mt-10">
              <img
                className="img-border"
                alt="architecture"
                width="80%"
                src={CloudTrailArch}
              />
            </div>
          </TabPanel>
          <TabPanel value={activeTab} index={CWLSourceType.CWL}>
            <div className="mt-10">
              <img
                className="img-border"
                alt="architecture"
                width="80%"
                src={CloudTrailArchCWL}
              />
            </div>
          </TabPanel>
        </>
      ) : (
        <div className="mt-10">
          <img
            className="img-border"
            alt="architecture"
            width="80%"
            src={CloudTrailLightEngineArch}
          />
        </div>
      )}
    </div>
  );
};

export default CloudTrailDesc;
