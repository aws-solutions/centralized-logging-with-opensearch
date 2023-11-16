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

import { MetricName, PipelineType } from "API";
import { ApexOptions } from "apexcharts";
import { appSyncRequestQuery } from "assets/js/request";
import LoadingText from "components/LoadingText";
import { getMetricHistoryData } from "graphql/queries";
import moment from "moment";
import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { useTranslation } from "react-i18next";

interface LinChartProps {
  type: PipelineType;
  taskId: string;
  graphTitle: string;
  yAxisUnit: string;
  graphName: MetricName;
  startTime: number;
  endTime: number;
  refreshCount: number;
}

const FailedColorMetrics = [
  MetricName.FluentBitOutputDroppedRecords,
  MetricName.FluentBitOutputErrors,
  MetricName.FailedLogs,
  MetricName.ProcessorFnError,
  MetricName.ReplicationFnError,
  MetricName.FluentBitOutputRetriesFailed,
  MetricName.OSIDocumentsFailedWrite,
  MetricName.OSIDLQS3RecordsFailed,
];

const formatLabel = (timestamp: number, timeSpan: string): string => {
  /*
  //   year: "yyyy",
  //   month: "yyyy-MM",
  //   day: "MM/DD",
  //   hour: "HH:mm",
  //   minute: "HH:mm",
  */
  if (timeSpan === "year") {
    return moment(timestamp).format("yyyy");
  } else if (timeSpan === "month") {
    return moment(timestamp).format("yyyy-MM");
  } else if (timeSpan === "day") {
    return moment(timestamp).format("MM/DD");
  } else if (timeSpan === "hour" || timeSpan === "minute") {
    return moment(timestamp).format("HH:mm");
  } else {
    return new Date(timestamp).toLocaleTimeString();
  }
};

const formatTooltip = (timestamp: number) => {
  return moment(timestamp).format("yyyy-MM-DD HH:mm");
};

const NORMAL_COLOR = [
  "#0073bb",
  "#ec7211",
  "#2ca02c",
  "#d62728",
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
];

const ERROR_COLOR = [
  "#ff0000",
  "#dc3545",
  "#f44336",
  "#ff5722",
  "#d32f2f",
  "#e53935",
  "#c62828",
  "#b71c1c",
  "#c0392b",
  "#d50000",
  "#e53935",
  "#f44336",
  "#ff5722",
  "#ff7043",
  "#ff8a65",
];

const ENLARGE_DATA_COUNT = 5;
const ENLARGE_MARKER_SIZE = 3;

const LineChart: React.FC<LinChartProps> = (props: LinChartProps) => {
  const {
    type,
    taskId,
    graphTitle,
    yAxisUnit,
    startTime,
    endTime,
    graphName,
    refreshCount,
  } = props;
  const { t } = useTranslation();

  const chartDefaultOptions: ApexOptions = {
    chart: {
      id: graphName,
      redrawOnParentResize: true,
      width: "100%",
      height: 200,
      type: "line",
      zoom: {
        enabled: false,
      },
      animations: {
        enabled: false,
      },
    },
    colors: FailedColorMetrics.includes(graphName) ? ERROR_COLOR : NORMAL_COLOR,
    grid: {
      padding: {
        top: 20,
        right: 10,
        bottom: 0,
        left: 20,
      },
    },
    legend: {
      show: true,
      showForSingleSeries: true,
      position: "bottom",
      horizontalAlign: "left",
      offsetX: 30,
      offsetY: 6,
    },
    yaxis: {
      tickAmount: 2,
      forceNiceScale: false,
      labels: {
        show: true,
        align: "right",
      },
      axisBorder: {
        show: false,
        color: "#78909C",
        offsetX: 0,
        offsetY: 0,
      },
      axisTicks: {
        show: false,
        color: "#78909C",
        width: 6,
        offsetX: 0,
        offsetY: 0,
      },
      crosshairs: {
        show: true,
        position: "back",
        stroke: {
          color: "#b6b6b6",
          width: 1,
          dashArray: 0,
        },
      },
      tooltip: {
        enabled: true,
        offsetX: -5,
      },
    },

    noData: {
      offsetX: 0,
      offsetY: 15,
      text: `No data available.`,
      align: "center",
      verticalAlign: "middle",
      style: {
        color: "#888",
        fontSize: "14px",
        fontFamily: undefined,
      },
    },
    stroke: {
      curve: "straight",
      width: 2,
    },
    title: {
      text: t(`monitoring.metrics.${graphTitle}`),
      align: "center",
    },
    tooltip: {
      x: {
        // format: "yyyy-MM-dd HH:mm",
        formatter: function (value: number) {
          return formatTooltip(value);
        },
      },
      y: {
        formatter(value: any) {
          return value ? value.toLocaleString("en-US") : value;
        },
      },
    },
    xaxis: {
      type: "datetime",
      // tickAmount: 5,
      categories: [startTime * 1000, endTime * 1000],
      labels: {
        show: false,
        datetimeUTC: false,
      },
    },
  };

  const [chartModalOptions, setChartModalOptions] =
    useState(chartDefaultOptions);
  const [chartModalSeries, setChartModalSeries] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [timeSpan, setTimeSpan] = useState<string>("");

  const getMetricsData = async () => {
    setLoadingData(true);
    if (!startTime || !endTime) {
      return;
    }
    try {
      const resData: any = await appSyncRequestQuery(getMetricHistoryData, {
        pipelineId: taskId,
        pipelineType: type,
        metricNames: [graphName],
        startTime: startTime,
        endTime: endTime,
        // period: 60,
      });
      const categoryData =
        resData?.data?.getMetricHistoryData?.xaxis?.categories ?? [];
      if (categoryData.length > 0) {
        const tmpMarkerSize =
          categoryData.length > ENLARGE_DATA_COUNT
            ? undefined
            : ENLARGE_MARKER_SIZE;
        setChartModalOptions({
          ...chartDefaultOptions,
          markers: {
            size: tmpMarkerSize,
          },
          xaxis: {
            ...chartDefaultOptions.xaxis,
            labels: {
              ...chartDefaultOptions.xaxis?.labels,
              show: true,
            },
            categories: [
              startTime * 1000,
              ...resData.data.getMetricHistoryData.xaxis.categories.map(
                (x: number) => x * 1000
              ),
              endTime * 1000,
            ],
          },
        });

        setChartModalSeries(
          resData.data.getMetricHistoryData.series.map((element: any) => {
            return {
              name: element.name,
              data: [null, ...element.data, null].map((val) => {
                return val;
              }),
            };
          })
        );
      } else {
        setChartModalOptions({
          ...chartDefaultOptions,
          legend: {
            ...chartDefaultOptions.legend,
            show: false,
          },
          xaxis: {
            ...chartDefaultOptions.xaxis,
            labels: {
              show: false,
            },
            categories: [startTime, endTime],
          },
        });
        setChartModalSeries([]);
      }
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    if (taskId) {
      getMetricsData();
    }
  }, [taskId, startTime, endTime, refreshCount]);

  useEffect(() => {
    if (timeSpan) {
      setChartModalOptions({
        ...chartDefaultOptions,
        xaxis: {
          ...chartDefaultOptions.xaxis,
          labels: {
            ...chartDefaultOptions.xaxis?.labels,
            formatter: function (value, timestamp) {
              return formatLabel(timestamp ?? 0, timeSpan);
            },
          },
        },
      });
    }
  }, [timeSpan]);

  useEffect(() => {
    const timeDifference = endTime - startTime;
    const oneMinute = 60;
    const oneHour = oneMinute * 60;
    const oneDay = oneHour * 24;
    const oneMonth = oneDay * 30;
    const oneYear = oneDay * 365;
    if (timeDifference >= oneYear) {
      setTimeSpan("year");
    } else if (timeDifference >= oneMonth) {
      setTimeSpan("month");
    } else if (timeDifference >= oneDay) {
      setTimeSpan("day");
    } else if (timeDifference >= oneHour) {
      setTimeSpan("hour");
    } else if (timeDifference >= oneMinute) {
      setTimeSpan("minute");
    }
  }, [startTime, endTime]);

  return (
    <div className="pr">
      {loadingData && (
        <div className="chart-mask">
          <LoadingText />
        </div>
      )}
      <>
        <div className="chart-unit">{yAxisUnit}</div>
        <Chart
          options={chartModalOptions}
          height={250}
          series={chartModalSeries}
        />
      </>
    </div>
  );
};

export default LineChart;
