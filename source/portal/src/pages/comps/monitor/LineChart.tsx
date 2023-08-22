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

import { MetricName, PipelineType } from "API";
import { ApexOptions } from "apexcharts";
import { appSyncRequestQuery } from "assets/js/request";
import LoadingText from "components/LoadingText";
import { getMetricHistoryData } from "graphql/queries";
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
  MetricName.FluentBitOutputRetriesFailed,
];

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
        // formatter: (value) => {
        //   if (graphName === GraphName.Network) {
        //     return humanFileSize(value, true);
        //   }
        //   if (graphName === GraphName.DesiredInServiceInstances) {
        //     return value.toFixed(1);
        //   }
        //   return value.toFixed(0);
        // },
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
        format: "yyyy-MM-dd HH:mm",
      },
      y: {
        formatter(value: any) {
          return value ? value.toLocaleString("en-US") : value;
        },
      },
    },
    xaxis: {
      type: "datetime",
      tickAmount: 10,
      categories: [startTime * 1000, endTime * 1000],
      labels: {
        datetimeUTC: false,
        datetimeFormatter: {
          year: "yyyy",
          month: "yyyy-MM",
          day: "MM/dd",
          hour: "HH:mm",
          minute: "HH:mm",
        },
      },
    },
  };

  const [chartModalOptions, setchartModalOptions] =
    useState(chartDefaultOptions);
  const [chartModalSeries, setChartModalSeries] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

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
      if (resData?.data?.getMetricHistoryData?.xaxis?.categories?.length > 0) {
        setchartModalOptions({
          ...chartDefaultOptions,
          xaxis: {
            ...chartDefaultOptions.xaxis,
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
        setchartModalOptions({
          ...chartDefaultOptions,
          legend: {
            ...chartDefaultOptions.legend,
            show: false,
          },
          xaxis: {
            ...chartDefaultOptions.xaxis,
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
    console.info("taskId:", taskId);
    console.info("startTime|endTime:", startTime, endTime);
    if (taskId) {
      getMetricsData();
    }
  }, [taskId, startTime, endTime, refreshCount]);

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
