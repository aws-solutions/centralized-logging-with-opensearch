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
import VPCArch from "assets/images/desc/vpcFlowArch.png";
import VPCArchCWL from "assets/images/desc/vpcFlowArch_CWL.png";
import ExtLink from "components/ExtLink";
import { VPC_FLOW_LOG_LINK } from "assets/js/const";
import { useTranslation } from "react-i18next";
import { AntTab, AntTabs, TabPanel } from "components/Tab";
import { CWLSourceType } from "types";

const VPCDesc: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="ingest-desc-title">
        {t("servicelog:create.service.vpc")}
      </div>
      <div className="ingest-desc-desc">
        {t("servicelog:vpc.desc.ingest")}
        <ExtLink to={VPC_FLOW_LOG_LINK}>
          {t("servicelog:vpc.desc.vpcLog")}
        </ExtLink>{" "}
        {t("intoDomain")}
      </div>
      <div>
        <ul>
          <li>{t("servicelog:vpc.desc.good1")}</li>
          <li>{t("servicelog:vpc.desc.good2")}</li>
          <li>{t("servicelog:vpc.desc.good3")}</li>
        </ul>
      </div>
      <div className="ingest-desc-title">
        {t("servicelog:vpc.desc.archName")}
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
            src={VPCArch}
          />
        </div>
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <div className="mt-10">
          <img
            className="img-border"
            alt="architecture"
            width="80%"
            src={VPCArchCWL}
          />
        </div>
      </TabPanel>
    </div>
  );
};

export default VPCDesc;
