import { GetLogConfigQueryVariables } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import HeaderPanel from "components/HeaderPanel";
import LoadingText from "components/LoadingText";
import { getLogConfig } from "graphql/queries";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import ConfigDetailComps from "pages/resources/logConfig/ConfigDetailComps";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface LogConfigDetailsProps {
  logConfigId: string;
  logConfigVersion: number;
}

export default function LogConfigDetails(props: LogConfigDetailsProps) {
  const { t } = useTranslation();

  const [logConfig, setLogConfig] = useState<ExLogConf>();
  const [loadingConfig, setLoadingConfig] = useState(true);
  const fetchLogConfig = async () => {
    setLoadingConfig(true);
    const res = await appSyncRequestQuery(getLogConfig, {
      id: props.logConfigId,
      version: props.logConfigVersion,
    } as GetLogConfigQueryVariables);
    setLogConfig(res.data.getLogConfig);
    setLoadingConfig(false);
  };

  useEffect(() => {
    if (props.logConfigId) {
      fetchLogConfig().catch(console.error);
    }
  }, [props.logConfigId]);

  return (
    <HeaderPanel title={t("applog:detail.logConfig.name")}>
      {loadingConfig ? (
        <LoadingText />
      ) : (
        <ConfigDetailComps curLogConfig={logConfig} />
      )}
    </HeaderPanel>
  );
}
