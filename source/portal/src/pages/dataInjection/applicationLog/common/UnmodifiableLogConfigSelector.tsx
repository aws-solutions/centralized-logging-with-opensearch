import React, { useState, useEffect } from "react";
import Select from "components/Select/select";
import FormItem from "components/FormItem";
import { appSyncRequestQuery } from "assets/js/request";
import { getLogConfig } from "graphql/queries";
import Alert from "components/Alert";
import ConfigDetailComps from "pages/resources/logConfig/ConfigDetailComps";
import { useTranslation } from "react-i18next";
import { LogSourceType } from "API";

export interface UnmodifiableLogConfigSelector {
  configId: string;
  configVersion?: number | 0;
  title: string;
  desc: string;
  error?: string | "";
  hideRefreshButton?: boolean;
  hideViewDetailButton?: boolean;
  hideDetail?: boolean;
  logType?: LogSourceType;
}
export function UnmodifiableLogConfigSelector(
  props: UnmodifiableLogConfigSelector
) {
  const { t } = useTranslation();
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [viewDetailsLink, setViewDetailsLink] = useState("");
  const [logConfigName, setLogConfigName] = useState("");
  const [currentConfig, setCurrentConfig] = useState();

  useEffect(() => {
    setViewDetailsLink("/resources/log-config/detail/" + props.configId);
  }, []);

  const getLogConfigName = async () => {
    try {
      setLoadingConfig(true);
      const queryRes = await appSyncRequestQuery(getLogConfig, {
        id: props.configId,
        version: props.configVersion,
      });
      setCurrentConfig(queryRes.data.getLogConfig);
      setLogConfigName(queryRes.data.getLogConfig.name);
      setLoadingConfig(false);
    } catch (error: any) {
      console.error(error);
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    getLogConfigName();
  }, []);

  return (
    <>
      <FormItem
        optionTitle={props.title}
        optionDesc={props.desc}
        errorText={props.error}
      >
        <Select
          className="m-w-75p"
          disabled={true}
          loading={loadingConfig}
          optionList={[]}
          value={""}
          placeholder={logConfigName}
          hasRefresh={props.hideRefreshButton ? false : true}
          viewDetailsLink={
            props.hideViewDetailButton ? undefined : viewDetailsLink
          }
        />
      </FormItem>
      <div className="mt-10 m-w-75p">
        {props.logType === LogSourceType.S3 && (
          <Alert content={t("applog:logSourceDesc.s3.step2.alert")} />
        )}
        <Alert
          content={t(
            "applog:logSourceDesc.s3.step2.alertCanNotChangeLogConfig"
          )}
        />
      </div>
      {!props.hideDetail && currentConfig && (
        <div className="plr-10">
          <ConfigDetailComps curLogConfig={currentConfig} />
        </div>
      )}
    </>
  );
}
