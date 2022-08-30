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
import React, { useState, useEffect } from "react";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import { formatLocalTime } from "assets/js/utils";
import { appSyncRequestQuery } from "assets/js/request";
import { getLogConf } from "graphql/queries";
import LoadingText from "components/LoadingText";
import ConfigDetailComps from "pages/resources/logConfig/ConfigDetailComps";
import { useTranslation } from "react-i18next";

interface LogConfigProps {
  logPath?: string;
  configId?: string;
}

const LogConfig: React.FC<LogConfigProps> = (props: LogConfigProps) => {
  const { configId, logPath } = props;
  const { t } = useTranslation();
  const [loadingData, setLoadingData] = useState(false);
  const [curConfig, setCurConfig] = useState<ExLogConf>();

  const getLogConfigById = async () => {
    try {
      setLoadingData(true);
      const resConfigData: any = await appSyncRequestQuery(getLogConf, {
        id: configId,
      });
      console.info("resConfigData:", resConfigData);
      setLoadingData(false);
      const tmpConfData = resConfigData?.data?.getLogConf;
      setCurConfig(tmpConfData);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    if (configId) {
      getLogConfigById();
    }
  }, []);

  return (
    <div>
      <HeaderPanel title={t("ekslog:ingest.detail.configTab.config")}>
        {loadingData ? (
          <LoadingText />
        ) : (
          <div>
            <div className="flex value-label-span">
              <div className="flex-1">
                <ValueWithLabel
                  label={t("ekslog:ingest.detail.configTab.name")}
                >
                  <div>{curConfig?.confName}</div>
                </ValueWithLabel>
              </div>
              <div className="flex-1 border-left-c">
                <ValueWithLabel
                  label={t("ekslog:ingest.detail.configTab.type")}
                >
                  {curConfig?.logType || "-"}
                </ValueWithLabel>
              </div>
              <div className="flex-1 border-left-c">
                <ValueWithLabel
                  label={t("ekslog:ingest.detail.configTab.created")}
                >
                  {formatLocalTime(curConfig?.createdDt || "")}
                </ValueWithLabel>
              </div>
            </div>
            <div>
              <ConfigDetailComps logPath={logPath} curLogConfig={curConfig} />
            </div>
          </div>
        )}
      </HeaderPanel>
    </div>
  );
};

export default LogConfig;
