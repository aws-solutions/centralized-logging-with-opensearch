import React, { useState, useEffect } from "react";
import { appSyncRequestQuery } from "assets/js/request";
import { useTranslation } from "react-i18next";
import Select, { SelectItem } from "components/Select/select";
import FormItem from "components/FormItem";
import { listLogConfigs } from "graphql/queries";
import { LogConfig, LogSourceType } from "API";
import ConfigDetailComps from "pages/resources/logConfig/ConfigDetailComps";
import Alert from "components/Alert";
import { Validator } from "pages/comps/Validator";
import { useAutoValidation } from "assets/js/hooks/useAutoValidation";

export interface LogConfigSelector {
  value: string;
  setValue?: React.Dispatch<React.SetStateAction<string>>;
  validator: Validator;
  createNewLink: string;
  viewDetailsLink?: string;
  title: string;
  desc: string;
  onFilter?: (each: any) => boolean;
  forceLogConfig?: { id: string; version: number };
  hideDetail?: boolean;
  logType?: LogSourceType;
}
export function LogConfigSelector(props: LogConfigSelector) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [options, setOptions] = useState<SelectItem[]>([]);
  const [currentConfig, setCurrentConfig] = useState();

  const fetchLogConfigList = async () => {
    setIsLoading(true);
    const resp = await appSyncRequestQuery(listLogConfigs, {
      page: 1,
      count: 9999,
    });
    setIsLoading(false);

    let logConfigs = resp.data.listLogConfigs.logConfigs;
    if (props.onFilter) {
      logConfigs = logConfigs.filter(props.onFilter);
    }

    setOptions(
      logConfigs.map((each: LogConfig) => ({
        name: each.name,
        value: JSON.stringify(each),
      }))
    );

    if (props.forceLogConfig) {
      const { id, version } = props.forceLogConfig;
      logConfigs.forEach((each: LogConfig) => {
        if (each.id === id && each.version === version) {
          props.setValue && props.setValue(JSON.stringify(each));
        }
      });
    }
  };

  useEffect(() => {
    fetchLogConfigList().catch(console.error);
  }, []);

  useEffect(() => {
    if (props.value) {
      setCurrentConfig(JSON.parse(props.value));
    }
    console.info("props.value:", props.value);
  }, [props.value]);

  useAutoValidation(props.validator, [props.value]);

  return (
    <>
      <FormItem
        optionTitle={props.title}
        optionDesc={props.desc}
        errorText={props.validator.error}
      >
        <Select
          className="m-w-75p"
          disabled={!!props.forceLogConfig}
          loading={isLoading}
          optionList={options}
          value={props.value}
          placeholder={t("applog:logSourceDesc.s3.step2.chooseALogConfig")}
          hasRefresh={!props.forceLogConfig}
          clickRefresh={() => fetchLogConfigList().catch(console.error)}
          onChange={(event: any) =>
            props.setValue && props.setValue(event.target.value)
          }
          createNewLink={props.forceLogConfig ? undefined : props.createNewLink}
          viewDetailsLink={props.viewDetailsLink}
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
      {!props.hideDetail && props.value && (
        <div className="plr-10">
          <ConfigDetailComps curLogConfig={currentConfig} />
        </div>
      )}
    </>
  );
}
