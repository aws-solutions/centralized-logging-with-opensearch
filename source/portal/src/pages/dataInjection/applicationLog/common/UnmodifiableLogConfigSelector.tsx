import React, { useState, useEffect } from "react";
import Select from "components/Select/select";
import FormItem from "components/FormItem";
import { appSyncRequestQuery } from "assets/js/request";
import { getLogConfig } from "graphql/queries";
import Alert from "components/Alert";
import { useTranslation } from "react-i18next";
import { LogSourceType } from "API";

export interface UnmodifiableLogConfigSelectorProps {
  configId: string;
  configVersion?: number;
  title: string;
  desc: string;
  error?: string;
  hideRefreshButton?: boolean;
  hideViewDetailButton?: boolean;
  hideDetail?: boolean;
  logType?: LogSourceType;
  hideAlert?: boolean;
}
const UnmodifiableLogConfigSelector: React.FC<
  UnmodifiableLogConfigSelectorProps
> = (props: UnmodifiableLogConfigSelectorProps) => {
  const { t } = useTranslation();
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [viewDetailsLink, setViewDetailsLink] = useState("");
  const [logConfigName, setLogConfigName] = useState("");

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
          hasRefresh={!props.hideRefreshButton}
          viewDetailsLink={
            props.hideViewDetailButton ? undefined : viewDetailsLink
          }
        />
      </FormItem>
      {!props.hideAlert && (
        <div className="mt-10 m-w-75p" data-testid="unmodifiable-config-comp">
          {props.logType === LogSourceType.S3 && (
            <Alert content={t("applog:logSourceDesc.s3.step2.alert")} />
          )}
          <Alert
            content={t(
              "applog:logSourceDesc.s3.step2.alertCanNotChangeLogConfig"
            )}
          />
        </div>
      )}
    </>
  );
};

export default UnmodifiableLogConfigSelector;
