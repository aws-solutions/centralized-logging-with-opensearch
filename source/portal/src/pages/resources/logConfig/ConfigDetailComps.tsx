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
import React from "react";
import { LogType, MultiLineLogParser, SyslogParser } from "API";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import ValueWithLabel from "components/ValueWithLabel";
import TextArea from "components/TextArea";
import { useTranslation } from "react-i18next";
import { formatLocalTime } from "assets/js/utils";
import { FILTER_CONDITION_LIST } from "assets/js/const";

interface ConfDetailProps {
  curLogConfig: ExLogConf | undefined;
  logPath?: string;
  hideLogPath?: boolean;
  hideBasicInfo?: boolean;
}

const ConfigDetailComps: React.FC<ConfDetailProps> = (
  props: ConfDetailProps
) => {
  const { t } = useTranslation();
  const { curLogConfig, hideLogPath, logPath, hideBasicInfo } = props;
  return (
    <div>
      {!hideBasicInfo && (
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("ekslog:ingest.detail.configTab.name")}>
              <div>{curLogConfig?.confName}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("ekslog:ingest.detail.configTab.type")}>
              {curLogConfig?.logType || "-"}
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("ekslog:ingest.detail.configTab.created")}>
              {formatLocalTime(curLogConfig?.createdDt || "")}
            </ValueWithLabel>
          </div>
        </div>
      )}
      <div className="flex value-label-span">
        <div className="flex-1">
          {!hideLogPath && (
            <ValueWithLabel label={t("resource:config.detail.path")}>
              <div>{logPath ? logPath : curLogConfig?.logPath || "-"}</div>
            </ValueWithLabel>
          )}

          <ValueWithLabel label={t("resource:config.detail.sampleLog")}>
            <div className="m-w-75p">
              <TextArea
                rows={2}
                disabled
                value={curLogConfig?.userSampleLog || "-"}
                onChange={(event) => {
                  console.info(event);
                }}
              />
            </div>
          </ValueWithLabel>

          {curLogConfig?.logType === LogType.Nginx && (
            <ValueWithLabel label={t("resource:config.detail.nginxFormat")}>
              <div className="m-w-75p">
                <TextArea
                  rows={5}
                  disabled
                  value={curLogConfig.userLogFormat || "-"}
                  onChange={(event) => {
                    console.info(event);
                  }}
                />
              </div>
            </ValueWithLabel>
          )}

          {curLogConfig?.logType === LogType.Apache && (
            <ValueWithLabel label={t("resource:config.detail.apacheFormat")}>
              <div className="m-w-75p">
                <TextArea
                  rows={5}
                  disabled
                  value={curLogConfig.userLogFormat || "-"}
                  onChange={(event) => {
                    console.info(event);
                  }}
                />
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
                  <TextArea
                    rows={5}
                    disabled
                    value={curLogConfig.userLogFormat || "-"}
                    onChange={(event) => {
                      console.info(event);
                    }}
                  />
                </div>
              </ValueWithLabel>
            )}

          {curLogConfig?.logType === LogType.Syslog &&
            curLogConfig.syslogParser !== SyslogParser.CUSTOM && (
              <ValueWithLabel label={t("resource:config.detail.syslogFormat")}>
                <div className="m-w-75p">
                  {curLogConfig.syslogParser || "-"}
                </div>
              </ValueWithLabel>
            )}

          {curLogConfig?.logType === LogType.Syslog &&
            curLogConfig.syslogParser === SyslogParser.CUSTOM && (
              <ValueWithLabel label={t("resource:config.detail.syslogFormat")}>
                <div className="m-w-75p">
                  <TextArea
                    rows={2}
                    disabled
                    value={curLogConfig.userLogFormat || "-"}
                    onChange={(event) => {
                      console.info(event);
                    }}
                  />
                </div>
              </ValueWithLabel>
            )}

          {(curLogConfig?.logType === LogType.Nginx ||
            curLogConfig?.logType === LogType.Apache ||
            curLogConfig?.logType === LogType.Syslog ||
            curLogConfig?.logType === LogType.SingleLineText ||
            curLogConfig?.logType === LogType.MultiLineText) && (
            <ValueWithLabel label={t("resource:config.detail.regExp")}>
              <div className="m-w-75p">
                <TextArea
                  rows={5}
                  disabled
                  value={curLogConfig.regularExpression || "-"}
                  onChange={(event) => {
                    console.info(event);
                  }}
                />
              </div>
            </ValueWithLabel>
          )}

          {(curLogConfig?.logType === LogType.JSON ||
            curLogConfig?.logType === LogType.Nginx ||
            curLogConfig?.logType === LogType.Apache ||
            curLogConfig?.logType === LogType.Syslog ||
            curLogConfig?.logType === LogType.SingleLineText ||
            curLogConfig?.logType === LogType.MultiLineText) &&
          curLogConfig.regularSpecs &&
          curLogConfig.regularSpecs.length > 0 ? (
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
                          {" "}
                          {t("resource:config.detail.specType")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {curLogConfig.regularSpecs?.map((element, index) => {
                        return (
                          <tr key={index}>
                            <td className="flex-1">{element?.key}</td>
                            <td className="flex-1">{element?.type}</td>
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
            curLogConfig.regularSpecs &&
            curLogConfig.regularSpecs.length > 0 &&
            curLogConfig.regularSpecs.map((element, index) => {
              if (element?.type === "date") {
                return (
                  <div className="mt-10" key={index}>
                    <ValueWithLabel
                      label={`${t("resource:config.detail.timeFormat")}(${
                        element.key
                      })`}
                    >
                      {element.format || "-"}
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
                  {curLogConfig.timeKey || t("none")}
                </ValueWithLabel>
              </div>

              {curLogConfig.timeKey && (
                <div className="mt-10">
                  <ValueWithLabel
                    label={t("resource:config.parsing.timeKeyFormat")}
                  >
                    {curLogConfig?.regularSpecs?.find(
                      (element) => element?.key === curLogConfig.timeKey
                    )?.format || "-"}
                  </ValueWithLabel>
                </div>
              )}
            </div>
          )}

          {(curLogConfig?.logType === LogType.JSON ||
            curLogConfig?.logType === LogType.Syslog ||
            curLogConfig?.logType === LogType.SingleLineText ||
            curLogConfig?.logType === LogType.MultiLineText) && (
            <>
              <div className="mt-10">
                <ValueWithLabel label={t("resource:config.parsing.timezone")}>
                  {curLogConfig.timeOffset || "-"}
                </ValueWithLabel>
              </div>
            </>
          )}

          {curLogConfig?.processorFilterRegex?.filters && (
            <div className="mt-10">
              <ValueWithLabel label={t("resource:config.filter.name")}>
                <>
                  <div className="mt-10">
                    {t("resource:config.filter.enabled")}:{" "}
                    {curLogConfig.processorFilterRegex.enable
                      ? t("yes")
                      : t("no")}
                  </div>
                  {curLogConfig.processorFilterRegex.enable && (
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
                          {curLogConfig.processorFilterRegex.filters?.map(
                            (element, index) => {
                              return (
                                <tr key={index}>
                                  <td className="flex-1">{element?.key}</td>
                                  <td className="flex-1">
                                    {t(
                                      FILTER_CONDITION_LIST.find(
                                        (ele) =>
                                          element?.condition === ele.value
                                      )?.name || ""
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
