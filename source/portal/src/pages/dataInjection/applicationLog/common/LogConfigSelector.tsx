import React, { useState, useEffect } from "react";
import { appSyncRequestQuery } from "assets/js/request";
import { useTranslation } from "react-i18next";
import Select, { SelectItem } from "components/Select/select";
import FormItem from "components/FormItem";
import { listLogConfigs } from "graphql/queries";
import { LogConfig, LogSourceType, LogType } from "API";
import ConfigDetailComps from "pages/resources/logConfig/ConfigDetailComps";
import Alert from "components/Alert";
import { Validator } from "pages/comps/Validator";
import { useAutoValidation } from "assets/js/hooks/useAutoValidation";
import { AnalyticEngineTypes } from "types";

export interface LogConfigSelectorProps {
  value: string;
  setValue?: React.Dispatch<React.SetStateAction<string>>;
  validator: Validator;
  createNewLink: string;
  viewDetailsLink?: string;
  title: string;
  desc: string;
  forceLogConfig?: { id: string; version: number };
  hideDetail?: boolean;
  logType?: LogSourceType;
  engineType?: AnalyticEngineTypes;
  isWindowsInstanceGroup?: boolean;
}
const LogConfigSelector: React.FC<LogConfigSelectorProps> = (
  props: LogConfigSelectorProps
) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [options, setOptions] = useState<SelectItem[]>([]);
  const [currentConfig, setCurrentConfig] = useState();

  const EC2_WINDOWS_CONFIG = [
    LogType.JSON,
    LogType.Nginx,
    LogType.Apache,
    LogType.SingleLineText,
    LogType.MultiLineText,
    LogType.WindowsEvent,
    LogType.IIS,
  ];
  const EC2_WINDOWS_CONFIG_LIGHT_ENGINE = [
    LogType.JSON,
    LogType.Nginx,
    LogType.Apache,
    LogType.SingleLineText,
    LogType.MultiLineText,
    LogType.WindowsEvent,
    LogType.IIS,
  ];
  const EC2_LINUX_CONFIG = [
    LogType.JSON,
    LogType.Nginx,
    LogType.Apache,
    LogType.SingleLineText,
    LogType.MultiLineText,
  ];
  const SYSLOG_CONFIG = [LogType.Syslog, LogType.JSON, LogType.SingleLineText];
  const EKS_CONFIG = [
    LogType.JSON,
    LogType.Nginx,
    LogType.Apache,
    LogType.SingleLineText,
    LogType.MultiLineText,
  ];
  const S3_CONFIG = [
    LogType.JSON,
    LogType.Nginx,
    LogType.Apache,
    LogType.SingleLineText,
    LogType.MultiLineText,
  ];

  const getEC2SupportConfigList = () => {
    let tmpList: any;
    if (props.isWindowsInstanceGroup) {
      if (props.engineType === AnalyticEngineTypes.LIGHT_ENGINE) {
        tmpList = EC2_WINDOWS_CONFIG_LIGHT_ENGINE;
      } else {
        tmpList = EC2_WINDOWS_CONFIG;
      }
    } else {
      tmpList = EC2_LINUX_CONFIG;
    }
    return tmpList;
  };

  const getDifferentFilters = () => {
    let supportConfigTypeList: any = [];
    // EC2 Filter
    if (props.logType === LogSourceType.EC2) {
      supportConfigTypeList = getEC2SupportConfigList();
    }
    // Syslog Filter
    if (props.logType === LogSourceType.Syslog) {
      supportConfigTypeList = SYSLOG_CONFIG;
    }

    // EKS Filter
    if (props.logType === LogSourceType.EKSCluster) {
      supportConfigTypeList = EKS_CONFIG;
    }

    // S3 as Source Filter
    if (props.logType === LogSourceType.S3) {
      supportConfigTypeList = S3_CONFIG;
    }

    return (each: any): boolean => {
      return supportConfigTypeList.includes(each.logType);
    };
  };

  const fetchLogConfigList = async () => {
    setIsLoading(true);
    const resp = await appSyncRequestQuery(listLogConfigs, {
      page: 1,
      count: 9999,
    });
    setIsLoading(false);
    const tmpFilters: any = getDifferentFilters();
    let logConfigs = resp.data.listLogConfigs.logConfigs;
    if (tmpFilters) {
      logConfigs = logConfigs.filter(tmpFilters);
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
          props.setValue?.(JSON.stringify(each));
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
          onChange={(event: any) => props.setValue?.(event.target.value)}
          createNewLink={props.forceLogConfig ? undefined : props.createNewLink}
          viewDetailsLink={props.viewDetailsLink}
        />
      </FormItem>
      <div className="mt-10 m-w-75p">
        {props.logType === LogSourceType.S3 && (
          <>
            {props.engineType === AnalyticEngineTypes.LIGHT_ENGINE && (
              <Alert
                content={t("applog:logSourceDesc.s3.step2.alertLightEngine")}
              />
            )}
            <Alert content={t("applog:logSourceDesc.s3.step2.alert")} />
          </>
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
};

export default LogConfigSelector;
