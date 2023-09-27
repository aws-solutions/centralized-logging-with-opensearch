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
import { RangePicker } from "react-minimal-datetime-range";
import "react-minimal-datetime-range/lib/react-minimal-datetime-range.min.css";
import { useTranslation } from "react-i18next";
import classNames from "classnames";

const SPECIFY_TIME_ITEMS = ["1h", "3h", "12h", "1d", "3d", "1w", "Custom"];

export const TIME_FORMAT = "YYYY-MM-DD HH:mm:ss";

const buildPreTime = (nowTime: number, period: string) => {
  switch (period) {
    case "1h":
      return Math.floor((nowTime - 1000 * 60 * 60) / 1000);
    case "3h":
      return Math.floor((nowTime - 1000 * 60 * 60 * 3) / 1000);
    case "12h":
      return Math.floor((nowTime - 1000 * 60 * 60 * 12) / 1000);
    case "1d":
      return Math.floor((nowTime - 1000 * 60 * 60 * 24) / 1000);
    case "3d":
      return Math.floor((nowTime - 1000 * 60 * 60 * 24 * 3) / 1000);
    case "1w":
      return Math.floor((nowTime - 1000 * 60 * 60 * 24 * 7) / 1000);
    default:
      return Math.floor(nowTime / 1000);
  }
};

interface TimeRangeProps {
  curTimeRangeType: string;
  startTime: string;
  endTime: string;
  changeTimeRange: (timeRange: any) => void;
  changeRangeType: (rangeType: string) => void;
  clearTimeRange?: () => void;
  isSmall?: boolean;
}

const TimeRange: React.FC<TimeRangeProps> = (props: TimeRangeProps) => {
  const {
    curTimeRangeType,
    changeTimeRange,
    changeRangeType,
    clearTimeRange,
    isSmall,
  } = props;
  const { t } = useTranslation();

  const [customDateRage, setCustomDateRage] = useState<any>([]);
  const [customTimeRage, setCustomTimeRage] = useState<any>(["00:00", "23:59"]);

  useEffect(() => {
    if (curTimeRangeType && curTimeRangeType !== "Custom") {
      const now = new Date().getTime();
      const preTime = buildPreTime(now, curTimeRangeType);
      changeTimeRange([preTime, Math.floor(now / 1000)]);
    }
  }, [curTimeRangeType]);

  return (
    <>
      <div className="specify-time">
        {clearTimeRange && (
          <span
            className={classNames({ item: true, small: isSmall })}
            onClick={() => {
              clearTimeRange();
            }}
          >
            {t("clear")}
          </span>
        )}
        {SPECIFY_TIME_ITEMS.map((element) => {
          return (
            <span
              key={element}
              className={classNames({
                item: true,
                small: isSmall,
                "item-active": curTimeRangeType === element,
              })}
              onClick={() => {
                changeRangeType(element);
              }}
            >
              {element}
            </span>
          );
        })}
        {curTimeRangeType === "Custom" && (
          <span
            className={classNames({ item: true, custom: true, small: isSmall })}
          >
            <div className="time-range-picker">
              <RangePicker
                // locale={
                //   ZH_LANGUAGE_LIST.includes(i18n.language)
                //     ? "zh-cn"
                //     : "en-us"
                // } // ['en-us', 'zh-cn','ko-kr']; default is en-us
                show={false} // default is false
                disabled={false} // default is false
                allowPageClickToClose={true} // default is true
                onConfirm={(res: any) => {
                  console.log(res);
                  changeRangeType("Custom");
                  const customStartDate = res[0]?.split(" ")?.[0];
                  const customEndDate = res[1]?.split(" ")?.[0];
                  setCustomDateRage([customStartDate, customEndDate]);
                  const customStartTime = res[0]?.split(" ")?.[1];
                  const customEndTime = res[1]?.split(" ")?.[1];
                  setCustomTimeRage([customStartTime, customEndTime]);
                  const customStartTimeStamp = Math.floor(
                    new Date(res[0]).getTime() / 1000
                  );
                  const customEndTimeStamp = Math.floor(
                    new Date(res[1]).getTime() / 1000
                  );
                  changeTimeRange([customStartTimeStamp, customEndTimeStamp]);
                }}
                onClose={() => {
                  console.log("onClose");
                }}
                onClear={() => {
                  console.log("onClear");
                }}
                style={{ width: "300px", margin: "0 auto" }}
                placeholder={[t("startTime"), t("endTime")]}
                showOnlyTime={false} // default is false, only select time
                ////////////////////
                // IMPORTANT DESC //
                ////////////////////
                defaultDates={customDateRage}
                // ['YYYY-MM-DD', 'YYYY-MM-DD']
                // This is the value you choosed every time.
                defaultTimes={customTimeRage}
                // ['hh:mm', 'hh:mm']
                // This is the value you choosed every time.
                initialDates={customDateRage}
                // ['YYYY-MM-DD', 'YYYY-MM-DD']
                // This is the initial dates.
                // If provied, input will be reset to this value when the clear icon hits,
                // otherwise input will be display placeholder
                initialTimes={customTimeRage}
                // ['hh:mm', 'hh:mm']
                // This is the initial times.
                // If provied, input will be reset to this value when the clear icon hits,
                // otherwise input will be display placeholder
              />
            </div>
          </span>
        )}
      </div>
    </>
  );
};

export default TimeRange;
