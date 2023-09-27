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
  CREATE_OS_ALARM_LINK,
  HELP_CLOUDWATCH_ALARM_LINK,
} from "assets/js/const";
import { useTranslation } from "react-i18next";

const Alarms: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="gsui-help-container">
      <div className="gsui-help-content">
        {t("info:alarm.tip1")}
        <a href={HELP_CLOUDWATCH_ALARM_LINK} target="_blank" rel="noreferrer">
          {t("info:alarm.tip2")}
        </a>
        {t("info:alarm.tip3")}
      </div>
      <div className="gsui-help-more">
        <div className="learn-more">
          {t("info:learnMore")}
          <i>
            <OpenInNewIcon className="icon" fontSize="small" />
          </i>
        </div>
        <div className="gsui-help-link-item">
          <a href={CREATE_OS_ALARM_LINK} target="_blank" rel="noreferrer">
            {t("info:alarm.createAlarm")}
          </a>
        </div>
      </div>
    </div>
  );
};

export default Alarms;
