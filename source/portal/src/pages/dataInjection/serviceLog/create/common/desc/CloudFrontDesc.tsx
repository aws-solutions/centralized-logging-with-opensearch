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
import ExtLink from "components/ExtLink";
import cloudFrontSArch from "assets/images/desc/cloudFrontArch.png";
import cloudFrontSArchRealtime from "assets/images/desc/cloudFrontArch_Realtime.png";
import cloudfrontLightEngineArch from "assets/images/desc/cloudfrontLightEngineArch.png";

import { CLOUDFRONT_LOG_LINK } from "assets/js/const";
import { useTranslation } from "react-i18next";
import { AntTab, AntTabs, TabPanel } from "components/Tab";
import { AnalyticEngineTypes } from "../SpecifyAnalyticsEngine";

export interface CloudFrontDescProps {
  engineType: AnalyticEngineTypes;
}

const CloudFrontDesc = ({ engineType }: CloudFrontDescProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );
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
        {isLightEngine ? t("intoLightEngine") : t("intoDomain")}
      </div>
      <div className="ingest-desc-title">
        {t("servicelog:cloudfront.desc.archName")}
      </div>
      <div className="ingest-desc-desc">
        {isLightEngine ? t("lightEngineArchDesc") : t("archDesc")}
      </div>
      {!isLightEngine ? (
        <>
          <AntTabs
            value={activeTab}
            onChange={(event, newTab) => {
              setActiveTab(newTab);
            }}
          >
            <AntTab label={t("servicelog:cloudfront.standardLogs")} />
            <AntTab label={t("servicelog:cloudfront.realtimeLogs")} />
          </AntTabs>
          <TabPanel value={activeTab} index={0}>
            <div className="mt-10">
              <img
                className="img-border"
                alt="architecture"
                width="80%"
                src={cloudFrontSArch}
              />
            </div>
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <div className="mt-10">
              <img
                className="img-border"
                alt="architecture"
                width="80%"
                src={cloudFrontSArchRealtime}
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
            src={cloudfrontLightEngineArch}
          />
        </div>
      )}
    </div>
  );
};

export default CloudFrontDesc;
