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
import { HELP_VPC_PEERING_LINK } from "assets/js/const";
import { useTranslation } from "react-i18next";

const CreationMethodNetwork: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="gsui-help-container">
      <div className="gsui-help-content">{t("info:creationMethod.tip1")}</div>
      <div className="gsui-help-title">{t("info:creationMethod.auto")}</div>
      <div className="gsui-help-content">
        {t("info:creationMethod.tip21")}
        <a href={HELP_VPC_PEERING_LINK} target="_blank" rel="noreferrer">
          {t("info:creationMethod.tip22")}
        </a>
        {t("info:creationMethod.tip23")}
      </div>
      <div className="gsui-help-title">{t("info:creationMethod.manual")}</div>
      <div className="gsui-help-content">{t("info:creationMethod.tip3")}</div>

      <div className="gsui-help-more">
        <div className="learn-more">
          {t("info:learnMore")}
          <i>
            <OpenInNewIcon className="icon" fontSize="small" />
          </i>
        </div>
        <div className="gsui-help-link-item">
          <a href="/clusters/import-opensearch-cluster" target="_blank">
            {t("info:creationMethod.importDomain")}
          </a>
        </div>
      </div>
    </div>
  );
};

export default CreationMethodNetwork;
