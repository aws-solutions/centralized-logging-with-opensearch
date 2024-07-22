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
import WAFArch from "assets/images/desc/wafArch.webp";
import wafSamplingArch from "assets/images/desc/wafSamplingArch.webp";
import wafLightEngineArch from "assets/images/desc/wafLightEngineArch.webp";
import ExtLink from "components/ExtLink";
import { WAF_ACCESS_LOG_LINK } from "assets/js/const";
import { useTranslation } from "react-i18next";
import { AntTab, AntTabs, TabPanel } from "components/Tab";
import { AnalyticEngineTypes } from "types";

export interface WAFDescProps {
  engineType: AnalyticEngineTypes;
}

const WAFDesc = ({ engineType }: WAFDescProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("fullRequest");
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );
  return (
    <div>
      <div className="ingest-desc-title">
        {t("servicelog:create.service.waf")}
      </div>
      <div className="ingest-desc-desc">
        {t("servicelog:waf.desc.ingest")}
        <ExtLink to={WAF_ACCESS_LOG_LINK}>
          {t("servicelog:waf.desc.wafLog")}
        </ExtLink>{" "}
        {isLightEngine ? t("intoLightEngine") : t("intoDomain")}
      </div>
      <div className="ingest-desc-title">
        {t("servicelog:waf.desc.archName")}
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
            <AntTab
              label={t("servicelog:waf.fullRequest")}
              value="fullRequest"
            />
            <AntTab
              label={t("servicelog:waf.sampledRequest")}
              value="wafSampling"
            />
          </AntTabs>
          <TabPanel value={activeTab} index="fullRequest">
            <div className="mt-10">
              <img
                className="img-border"
                alt="architecture"
                width="80%"
                src={WAFArch}
              />
            </div>
          </TabPanel>
          <TabPanel value={activeTab} index="wafSampling">
            <div className="mt-10">
              <img
                className="img-border"
                alt="architecture"
                width="80%"
                src={wafSamplingArch}
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
            src={wafLightEngineArch}
          />
        </div>
      )}
    </div>
  );
};

export default WAFDesc;
