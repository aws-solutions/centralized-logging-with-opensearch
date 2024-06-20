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
import { IISlogParser, LogType, MultiLineLogParser, SyslogParser } from "API";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import ValueWithLabel from "components/ValueWithLabel";
import { useTranslation } from "react-i18next";
import { defaultStr, formatLocalTime, isEmpty, ternary } from "assets/js/utils";
import { FILTER_CONDITION_LIST } from "assets/js/const";
import { identity } from "lodash";
import FieldDisplay from "./FieldDisplay";
import JSONSpecView from "./JSONSpecView";

interface ConfDetailProps {
  curLogConfig: ExLogConf | undefined;
  hideBasicInfo?: boolean;
}

const buildSampleLogDisplay = (sampleLog: string, logType?: LogType | null) => {
  if (logType === LogType.JSON) {
    return (
      <div className="log-config-display-text">
        <pre>{JSON.stringify(JSON.parse(sampleLog), null, 2)}</pre>
      </div>
    );
  } else {
    return <FieldDisplay text={sampleLog} />;
  }
};

const ConfigDetailComps: React.FC<ConfDetailProps> = (
  props: ConfDetailProps
) => {
  const { t } = useTranslation();
  const { curLogConfig, hideBasicInfo } = props;
  return (
    <div>
      {!hideBasicInfo && (
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("ekslog:ingest.detail.configTab.name")}>
              <div>{curLogConfig?.name}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("ekslog:ingest.detail.configTab.type")}>
              {defaultStr(curLogConfig?.logType, "-")}
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("ekslog:ingest.detail.configTab.created")}>
              {formatLocalTime(defaultStr(curLogConfig?.createdAt))}
            </ValueWithLabel>
          </div>
        </div>
      )}
      <div className="flex value-label-span">
        <div className="flex-1">
          {curLogConfig?.logType === LogType.Nginx && (
            <ValueWithLabel label={t("resource:config.detail.nginxFormat")}>
              <div className="m-w-75p">
                <FieldDisplay
                  text={defaultStr(curLogConfig.userLogFormat, "-")}
                />
              </div>
            </ValueWithLabel>
          )}

          {curLogConfig?.logType === LogType.Apache && (
            <ValueWithLabel label={t("resource:config.detail.apacheFormat")}>
              <div className="m-w-75p">
                <FieldDisplay
                  text={defaultStr(curLogConfig.userLogFormat, "-")}
                />
              </div>
            </ValueWithLabel>
          )}

          {curLogConfig?.logType === LogType.IIS && (
            <ValueWithLabel label={t("resource:config.detail.iisParser")}>
              <div className="m-w-75p">
                {defaultStr(curLogConfig.iisLogParser, "-")}
              </div>
            </ValueWithLabel>
          )}

          {curLogConfig?.logType === LogType.MultiLineText &&
            curLogConfig.multilineLogParser ===
              MultiLineLogParser.JAVA_SPRING_BOOT && (
              <ValueWithLabel
                label={t("resource:config.detail.springbootFormat")}
              >
                <div className="m-w-75p">
                  <FieldDisplay
                    text={defaultStr(curLogConfig.userLogFormat, "-")}
                  />
                </div>
              </ValueWithLabel>
            )}

          {curLogConfig?.logType === LogType.Syslog &&
            curLogConfig.syslogParser !== SyslogParser.CUSTOM && (
              <ValueWithLabel label={t("resource:config.detail.syslogParser")}>
                <div className="m-w-75p">
                  {defaultStr(curLogConfig.syslogParser, "-")}
                </div>
              </ValueWithLabel>
            )}

          {curLogConfig?.logType === LogType.Syslog &&
            curLogConfig.syslogParser === SyslogParser.CUSTOM && (
              <ValueWithLabel label={t("resource:config.detail.syslogFormat")}>
                <div className="m-w-75p">
                  <FieldDisplay
                    text={defaultStr(curLogConfig.userLogFormat, "-")}
                  />
                </div>
              </ValueWithLabel>
            )}

          {curLogConfig?.logType === LogType.IIS &&
            curLogConfig.iisLogParser === IISlogParser.W3C && (
              <ValueWithLabel label={t("resource:config.detail.iisLogFormat")}>
                <div className="m-w-75p">
                  <FieldDisplay
                    text={defaultStr(curLogConfig.userLogFormat, "-")}
                  />
                </div>
              </ValueWithLabel>
            )}

          {(curLogConfig?.logType === LogType.Nginx ||
            curLogConfig?.logType === LogType.Apache ||
            curLogConfig?.logType === LogType.Syslog ||
            curLogConfig?.logType === LogType.IIS ||
            curLogConfig?.logType === LogType.SingleLineText ||
            curLogConfig?.logType === LogType.MultiLineText) && (
            <ValueWithLabel label={t("resource:config.detail.regExp")}>
              <div className="m-w-75p">
                <FieldDisplay text={defaultStr(curLogConfig.regex, "-")} />
              </div>
            </ValueWithLabel>
          )}

          <ValueWithLabel label={t("resource:config.detail.sampleLog")}>
            <div className="m-w-75p">
              {buildSampleLogDisplay(
                defaultStr(curLogConfig?.userSampleLog, "-"),
                curLogConfig?.logType
              )}
            </div>
          </ValueWithLabel>

          {curLogConfig?.logType === LogType.JSON &&
            !isEmpty(curLogConfig.jsonSchema) && (
              <div className="mt-10">
                <ValueWithLabel label={t("resource:config.detail.logSpecs")}>
                  <JSONSpecView
                    schema={JSON.parse(defaultStr(curLogConfig.jsonSchema))}
                    data={curLogConfig.userSampleLog}
                    configTimeKey={defaultStr(curLogConfig.timeKey)}
                  />
                </ValueWithLabel>
              </div>
            )}

          {((curLogConfig?.logType === LogType.JSON &&
            isEmpty(curLogConfig.jsonSchema)) ||
            curLogConfig?.logType === LogType.Nginx ||
            curLogConfig?.logType === LogType.Apache ||
            curLogConfig?.logType === LogType.Syslog ||
            curLogConfig?.logType === LogType.IIS ||
            curLogConfig?.logType === LogType.SingleLineText ||
            curLogConfig?.logType === LogType.MultiLineText) &&
          curLogConfig.regexFieldSpecs &&
          curLogConfig.regexFieldSpecs.length > 0 ? (
            <div className="mt-10">
              <ValueWithLabel label={t("resource:config.detail.logSpecs")}>
                <div className="m-w-75p">
                  <table className="log-detail-specs">
                    <thead>
                      <tr>
                        <th className="name">
                          {t("resource:config.detail.specName")}
                        </th>
                        <th className="type">
                          {t("resource:config.detail.specType")}
                        </th>
                        <th className="time format">
                          {t("resource:config.detail.timeFormat")}
                        </th>
                        <th className="time key">
                          {t("resource:config.parsing.timeKey")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {curLogConfig.regexFieldSpecs?.map((element, index) => {
                        if (element?.key === "log_timestamp") {
                          return undefined;
                        }
                        return (
                          <tr key={identity(index)}>
                            <td className="flex-1">{element?.key}</td>
                            <td className="flex-1">{element?.type}</td>
                            <td className="flex-1">
                              {ternary(
                                element?.type === "date",
                                element?.format,
                                "-"
                              )}
                            </td>
                            <td className="flex-1">
                              {element?.key === curLogConfig.timeKey
                                ? `${t("yes")} (${element?.format ?? "-"})`
                                : t("no")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ValueWithLabel>
            </div>
          ) : (
            ""
          )}

          {(curLogConfig?.logType === LogType.JSON ||
            curLogConfig?.logType === LogType.Syslog ||
            curLogConfig?.logType === LogType.SingleLineText ||
            curLogConfig?.logType === LogType.MultiLineText) &&
            curLogConfig.regexFieldSpecs &&
            curLogConfig.regexFieldSpecs.length > 0 &&
            curLogConfig.regexFieldSpecs.map((element, index) => {
              if (element?.type === "date") {
                return (
                  <div className="mt-10" key={identity(index)}>
                    <ValueWithLabel
                      label={`${t("resource:config.detail.timeFormat")}(${
                        element.key
                      })`}
                    >
                      {defaultStr(element.format, "-")}
                    </ValueWithLabel>
                  </div>
                );
              }
            })}

          {(curLogConfig?.logType === LogType.JSON ||
            curLogConfig?.logType === LogType.Syslog ||
            curLogConfig?.logType === LogType.SingleLineText ||
            (curLogConfig?.logType === LogType.MultiLineText &&
              curLogConfig.multilineLogParser ===
                MultiLineLogParser.CUSTOM)) && (
            <div>
              <div className="mt-10">
                <ValueWithLabel label={t("resource:config.parsing.timeKey")}>
                  {defaultStr(curLogConfig.timeKey, t("none"))}
                </ValueWithLabel>
              </div>

              {curLogConfig.timeKey && (
                <div className="mt-10">
                  <ValueWithLabel
                    label={t("resource:config.parsing.timeKeyFormat")}
                  >
                    {defaultStr(
                      curLogConfig?.regexFieldSpecs?.find(
                        (element) => element?.key === curLogConfig.timeKey
                      )?.format,
                      "-"
                    )}
                  </ValueWithLabel>
                </div>
              )}
            </div>
          )}

          {(curLogConfig?.logType === LogType.JSON ||
            curLogConfig?.logType === LogType.Syslog ||
            curLogConfig?.logType === LogType.SingleLineText ||
            curLogConfig?.logType === LogType.MultiLineText) && (
            <div className="mt-10">
              <ValueWithLabel label={t("resource:config.parsing.timezone")}>
                {defaultStr(curLogConfig.timeOffset, "-")}
              </ValueWithLabel>
            </div>
          )}

          {curLogConfig?.filterConfigMap?.filters && (
            <div className="mt-10">
              <ValueWithLabel label={t("resource:config.filter.name")}>
                <>
                  <div className="mt-10">
                    {t("resource:config.filter.enabled")}:{" "}
                    {curLogConfig.filterConfigMap.enabled ? t("yes") : t("no")}
                  </div>
                  {curLogConfig.filterConfigMap.enabled && (
                    <div className="mt-10 m-w-75p">
                      <table className="log-detail-specs">
                        <thead>
                          <tr>
                            <th className="name">
                              {t("resource:config.filter.key")}
                            </th>
                            <th className="type">
                              {t("resource:config.filter.condition")}
                            </th>
                            <th className="value">
                              {t("resource:config.filter.regex")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {curLogConfig.filterConfigMap.filters?.map(
                            (element, index) => {
                              return (
                                <tr key={identity(index)}>
                                  <td className="flex-1">{element?.key}</td>
                                  <td className="flex-1">
                                    {t(
                                      FILTER_CONDITION_LIST.find(
                                        (ele) =>
                                          element?.condition === ele.value
                                      )?.name ?? ""
                                    )}
                                  </td>
                                  <td className="flex-1">{element?.value}</td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              </ValueWithLabel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigDetailComps;
