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
import {
  REG_EX_LOG_HELP_LINK_1,
  REG_EX_LOG_HELP_LINK_2,
  REG_EX_LOG_HELP_LINK_3,
  RUBULAR_LINK,
} from "assets/js/const";
import { useTranslation } from "react-i18next";

const RegExLogFormat: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="gsui-help-container">
      <div className="gsui-help-content">
        {t("info:regExLogFormat.tip1")}
        <a href={RUBULAR_LINK} target="_blank" rel="noreferrer">
          {t("info:regExLogFormat.rubular")}
        </a>
        {t("info:regExLogFormat.tip2")}
      </div>

      <div className="gsui-help-more">
        <div className="learn-more">
          {t("info:learnMore")}
          <i>
            <OpenInNewIcon className="icon" fontSize="small" />
          </i>
        </div>
        <div className="gsui-help-link-item">
          <a href={REG_EX_LOG_HELP_LINK_1} target="_blank" rel="noreferrer">
            {t("info:regExLogFormat.link1")}
          </a>
        </div>
        <div className="gsui-help-link-item">
          <a href={REG_EX_LOG_HELP_LINK_2} target="_blank" rel="noreferrer">
            {t("info:regExLogFormat.link2")}
          </a>
        </div>
        <div className="gsui-help-link-item">
          <a href={REG_EX_LOG_HELP_LINK_3} target="_blank" rel="noreferrer">
            {t("info:regExLogFormat.link3")}
          </a>
        </div>
      </div>
    </div>
  );
};

export default RegExLogFormat;
