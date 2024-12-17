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
import { ExLogConf } from "../common/LogConfigComp";
import HeaderPanel from "components/HeaderPanel";
import { useTranslation } from "react-i18next";
import { formatLocalTime, defaultStr } from "assets/js/utils";
import ValueWithLabel from "components/ValueWithLabel";
import { LogType } from "API";
import Button from "components/Button";

interface ConfigGeneralProps {
  curLogConfig?: ExLogConf;
  version?: number;
  removeLogConfig?: () => void;
  showRevision?: boolean;
}
const ConfigGeneral: React.FC<ConfigGeneralProps> = (
  props: ConfigGeneralProps
) => {
  const { t } = useTranslation();
  const { curLogConfig, version, removeLogConfig, showRevision } = props;
  const displayParser = () => {
    if (curLogConfig?.logType === LogType.MultiLineText) {
      return curLogConfig?.multilineLogParser;
    } else if (curLogConfig?.logType === LogType.IIS) {
      return curLogConfig?.iisLogParser;
    } else if (curLogConfig?.logType === LogType.Syslog) {
      return curLogConfig?.syslogParser;
    } else {
      return "-";
    }
  };
  return (
    <HeaderPanel
      title={t("resource:config.detail.general")}
      action={
        version ? undefined : (
          <Button
            data-testid="delete-button"
            onClick={() => {
              removeLogConfig?.();
            }}
          >
            {t("button.delete")}
          </Button>
        )
      }
    >
      <div className="flex value-label-span">
        <div className="flex-1">
          <ValueWithLabel label={t("resource:config.detail.name")}>
            <div>{curLogConfig?.name}</div>
          </ValueWithLabel>
        </div>
        {showRevision && (
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("resource:config.detail.revision")}>
              <div>{version}</div>
            </ValueWithLabel>
          </div>
        )}
        <div className="flex-1 border-left-c">
          <ValueWithLabel label={t("resource:config.detail.type")}>
            <div>{curLogConfig?.logType}</div>
          </ValueWithLabel>
        </div>
        <div className="flex-1 border-left-c">
          <ValueWithLabel label={t("resource:config.common.parser")}>
            <div>{displayParser()}</div>
          </ValueWithLabel>
        </div>
        <div className="flex-1 border-left-c">
          <ValueWithLabel label={t("resource:config.detail.created")}>
            <div>{formatLocalTime(defaultStr(curLogConfig?.createdAt))}</div>
          </ValueWithLabel>
        </div>
      </div>
    </HeaderPanel>
  );
};

export default ConfigGeneral;
