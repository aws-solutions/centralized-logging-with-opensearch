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
import { LogEvent, PipelineType } from "API";
import { getLogEvents } from "graphql/queries";
import Breadcrumb from "components/Breadcrumb";
import HelpPanel from "components/HelpPanel";
import { useTranslation } from "react-i18next";
import Button from "components/Button";
import { appSyncRequestQuery } from "assets/js/request";
import SideMenu from "components/SideMenu";
import LoadingText from "components/LoadingText";
import TextInput from "components/TextInput";
import TimeRange from "components/TimeRange/TimeRange";
import { useParams } from "react-router-dom";
import { formatLogEventTimestamp } from "assets/js/utils";
import { identity } from "lodash";
import ButtonRefresh from "components/ButtonRefresh";

interface LogEventResponse {
  logEvents: LogEvent[];
  nextBackwardToken: string | null;
  nextForwardToken: string | null;
}

const PAGE_SIZE = 20;

const EventList: React.FC = () => {
  const { t } = useTranslation();
  const { id, type, logGroupName, logStreamName } = useParams();
  const params = new URLSearchParams(window.location.search);
  const defaultStartTime = params.get("startTime");
  const DEFAULT_START_TIME =
    Math.ceil(parseInt(defaultStartTime ?? "") / 1000) - 1000;
  const DEFAULT_END_TIME = Math.floor(new Date().getTime() / 1000) + 1000;
  let midBreadCrumb = [
    {
      name: t("applog:name"),
      link: `/log-pipeline/application-log`,
    },
    {
      name: id,
      link: `/log-pipeline/application-log/detail/${id}`,
    },
  ];
  if (type === PipelineType.SERVICE) {
    midBreadCrumb = [
      {
        name: t("servicelog:name"),
        link: `/log-pipeline/service-log`,
      },

      {
        name: id,
        link: `/log-pipeline/service-log/detail/${id}`,
      },
    ];
  }
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    ...midBreadCrumb,
    {
      name: t("common:logging.logEvent"),
    },
  ];
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [logEventList, setLogEventList] = useState<LogEvent[]>([]);

  const [notSupportHistory, setNotSupportHistory] = useState(false);
  const [backwardToken, setBackwardToken] = useState<string | null>(null);
  const [forwardToken, setForwardToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasHistory, setHasHistory] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [curTimeRangeType, setCurTimeRangeType] = useState("");
  const [logFilterPattern, setlogFilterPattern] = useState("");
  const [startDate, setStartDate] = useState(DEFAULT_START_TIME || null);
  const [endDate, setEndDate] = useState(DEFAULT_END_TIME || null);
  const [cachedNextToken, setCachedNextToken] = useState("");

  const getNextToken = (isLoadForward: boolean, isLoadHistory: boolean) => {
    if (isLoadForward) {
      return forwardToken || cachedNextToken;
    } else {
      if (isLoadHistory) {
        return backwardToken;
      }
    }
    return "";
  };

  const getLogEventsByLogGroup = async (
    isLoadForward = false,
    isLoadHistory = false,
    clearTimeRange = false
  ) => {
    try {
      if (!isLoadForward && !isLoadHistory) {
        setLoadingEvents(true);
      }
      if (isLoadForward) {
        setLoadingMore(true);
      }
      if (isLoadHistory) {
        setLoadingHistory(true);
      }
      const resData = await appSyncRequestQuery(getLogEvents, {
        logGroupName: decodeURIComponent(logGroupName || ""),
        logStreamName: decodeURIComponent(logStreamName || ""),
        startTime: clearTimeRange ? DEFAULT_START_TIME : startDate,
        endTime: clearTimeRange ? DEFAULT_END_TIME : endDate,
        limit: PAGE_SIZE,
        filterPattern: logFilterPattern,
        nextToken: getNextToken(isLoadForward, isLoadHistory),
      });
      const eventResponse: LogEventResponse = resData?.data?.getLogEvents;
      if (!isLoadForward && !isLoadHistory) {
        setLogEventList(eventResponse.logEvents);
        if (eventResponse.nextForwardToken) {
          setForwardToken(eventResponse.nextForwardToken);
        } else {
          setHasMore(false);
        }
        if (eventResponse.nextBackwardToken) {
          setBackwardToken(eventResponse.nextBackwardToken);
          setNotSupportHistory(false);
        } else {
          setNotSupportHistory(true);
        }
      }
      if (isLoadForward) {
        setLogEventList((prev) => {
          return [...prev, ...eventResponse.logEvents];
        });
      }
      if (isLoadHistory) {
        setLogEventList((prev) => {
          return [...eventResponse.logEvents, ...prev];
        });
      }
      if (isLoadForward) {
        if (eventResponse.nextForwardToken) {
          setCachedNextToken(eventResponse.nextForwardToken);
        }
        if (
          eventResponse.logEvents.length > 0 &&
          eventResponse.nextForwardToken
        ) {
          setHasMore(true);
          setForwardToken(eventResponse.nextForwardToken);
        } else {
          setHasMore(false);
          setForwardToken(eventResponse.nextForwardToken);
        }
      }
      if (isLoadHistory) {
        if (
          eventResponse.logEvents.length > 0 &&
          eventResponse.nextBackwardToken
        ) {
          setHasHistory(true);
          setBackwardToken(eventResponse.nextBackwardToken);
        } else {
          setHasHistory(false);
          setBackwardToken(eventResponse.nextBackwardToken);
        }
      }

      setLoadingEvents(false);
      setLoadingMore(false);
      setLoadingHistory(false);
    } catch (error) {
      setLoadingEvents(false);
      setLoadingMore(false);
      setLoadingHistory(false);
      console.error(error);
    }
  };

  const loadForwardEvents = () => {
    getLogEventsByLogGroup(true, false);
  };

  const loadHistoryEvents = () => {
    getLogEventsByLogGroup(false, true);
  };

  useEffect(() => {
    getLogEventsByLogGroup();
  }, [endDate]);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <Breadcrumb list={breadCrumbList} />

          <div className="log-table tab-padding box-shadow">
            <div className="general-info tab-padding box-shadow">
              <div className="header">
                <div className="header-title">
                  <div className="big-title">
                    {t("common:logging.logEvents")}
                    {decodeURIComponent(logStreamName || "")}
                  </div>
                  <div>
                    <Button
                      onClick={() => {
                        console.info("refresh");
                        getLogEventsByLogGroup();
                      }}
                    >
                      <ButtonRefresh loading={loadingEvents} fontSize="small" />
                    </Button>
                  </div>
                </div>
                <div className="flex space-between mt-10">
                  <div className="flex-1">
                    <TextInput
                      value={logFilterPattern}
                      isSearch={true}
                      placeholder={t("common:logging.filterEvents")}
                      onChange={(event) => {
                        setlogFilterPattern(event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          getLogEventsByLogGroup();
                        }
                      }}
                    />
                  </div>
                  <div>
                    <TimeRange
                      isSmall
                      curTimeRangeType={curTimeRangeType}
                      startTime={""}
                      endTime={""}
                      clearTimeRange={() => {
                        setCurTimeRangeType("");
                        getLogEventsByLogGroup(false, false, true);
                      }}
                      changeTimeRange={(range) => {
                        setStartDate(range[0]);
                        setEndDate(range[1]);
                      }}
                      changeRangeType={(type) => {
                        setCurTimeRangeType(type);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="general-info-content">
              <table width="100%" cellPadding={0} cellSpacing={0}>
                <thead>
                  <tr>
                    <th style={{ width: 280 }}>
                      {t("common:logging.timestamp")}
                    </th>
                    <th>{t("common:logging.message")}</th>
                  </tr>
                </thead>
                <tbody>
                  {!notSupportHistory && (
                    <tr>
                      <td colSpan={3}>
                        <div className="load-more-wrap">
                          {(loadingHistory ? (
                            <LoadingText text={t("loading")} />
                          ) : (
                            ""
                          )) ||
                            (hasHistory ? (
                              <div>
                                {t("common:logging.hasOlder")}
                                <span
                                  className="load-more"
                                  onClick={() => {
                                    loadHistoryEvents();
                                  }}
                                >
                                  {t("common:logging.loadMore")}
                                </span>
                              </div>
                            ) : (
                              <div>
                                {t("common:logging.noOlder")}
                                <span
                                  className="load-more"
                                  onClick={() => {
                                    loadHistoryEvents();
                                  }}
                                >
                                  {t("common:logging.retry")}
                                </span>
                              </div>
                            ))}
                        </div>
                      </td>
                    </tr>
                  )}

                  {(loadingEvents ? (
                    <tr>
                      <td colSpan={3}>
                        <div className="text-center">
                          <LoadingText />
                        </div>
                      </td>
                    </tr>
                  ) : (
                    ""
                  )) ||
                    (logEventList && logEventList.length > 0 ? (
                      logEventList.map((element, index) => {
                        return (
                          <tr key={identity(index)}>
                            <td>
                              {formatLogEventTimestamp(
                                parseInt(element.timestamp as string)
                              )}
                            </td>
                            <td>{element.message}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3}>
                          <div className="no-data text-center">
                            {t("common:logging.noData")}
                          </div>
                        </td>
                      </tr>
                    ))}
                  <tr>
                    <td colSpan={3}>
                      <div className="load-more-wrap">
                        {(loadingMore ? (
                          <LoadingText text="Loading..." />
                        ) : (
                          ""
                        )) ||
                          (hasMore ? (
                            <div>
                              {t("common:logging.hasNewer")}
                              <span
                                className="load-more"
                                onClick={() => {
                                  loadForwardEvents();
                                }}
                              >
                                {t("common:logging.loadMore")}
                              </span>
                            </div>
                          ) : (
                            <div>
                              {t("common:logging.noNewer")}
                              <span
                                className="load-more"
                                onClick={() => {
                                  loadForwardEvents();
                                }}
                              >
                                {t("common:logging.retry")}
                              </span>
                            </div>
                          ))}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default EventList;
