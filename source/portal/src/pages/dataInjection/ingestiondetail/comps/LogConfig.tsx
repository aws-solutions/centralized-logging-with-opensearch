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
import React, { useState, useEffect } from "react";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import HeaderPanel from "components/HeaderPanel";
import { appSyncRequestQuery } from "assets/js/request";
import { getLogConfig } from "graphql/queries";
import LoadingText from "components/LoadingText";
import ConfigDetailComps from "pages/resources/logConfig/ConfigDetailComps";
import { useTranslation } from "react-i18next";
import ConfigGeneral from "pages/resources/logConfig/ConfigGeneral";

interface LogConfigProps {
  configId?: string;
  version: number;
}

const PipelineLogConfig: React.FC<LogConfigProps> = (props: LogConfigProps) => {
  const { configId, version } = props;
  const { t } = useTranslation();
  const [loadingData, setLoadingData] = useState(false);
  const [curConfig, setCurConfig] = useState<ExLogConf>();

  const getLogConfigById = async () => {
    try {
      setLoadingData(true);
      const resConfigData: any = await appSyncRequestQuery(getLogConfig, {
        id: configId,
        version: version,
      });
      console.info("resConfigData:", resConfigData);
      setLoadingData(false);
      const tmpConfData = resConfigData?.data?.getLogConfig;
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

  if (loadingData) {
    return <LoadingText />;
  }

  return (
    <div>
      <ConfigGeneral curLogConfig={curConfig} showRevision version={version} />
      <HeaderPanel title={t("resource:config.detail.logParser")}>
        <ConfigDetailComps hideBasicInfo={true} curLogConfig={curConfig} />
      </HeaderPanel>
    </div>
  );
};

export default PipelineLogConfig;
