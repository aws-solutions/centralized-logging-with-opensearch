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
import LineChart from "../LineChart";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { AppStoreMockData } from "test/store.mock";
import { MetricName, PipelineType } from "API";
import { appSyncRequestQuery } from "assets/js/request";

jest.mock("react-i18next", () => ({
  useTranslation: () => {
    return {
      t: (key: any) => key,
      i18n: {
        changeLanguage: jest.fn(),
      },
    };
  },
  initReactI18next: {
    type: "3rdParty",
    init: jest.fn(),
  },
}));

jest.mock("react-apexcharts", () => ({
  __esModule: true,
  default: () => <div />,
}));

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
}));

const mockLineChartData = {
  type: PipelineType.APP,
  taskId: "xxxx-xxxx-xxxx-xxx-xxxx",
  graphTitle: MetricName.FluentBitOutputErrors,
  yAxisUnit: "Count",
  graphName: MetricName.FluentBitOutputErrors,
  startTime: 1713338339,
  endTime: 1713341939,
  refreshCount: 0,
};

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("LineChart", () => {
  it("renders without errors", () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getMetricHistoryData: {
          series: [
            {
              name: "FluentBitOutputProcRecords_5815d",
              data: [12, 0, 0, 1212, 0, 1212, 0, 12122, 0, 0],
              __typename: "DataSerie",
            },
          ],
          xaxis: {
            categories: [
              1713298440, 1713298500, 1713298560, 1713298620, 1713298680,
              1713298740, 1713298800, 1713298860, 1713298920, 1713298980,
            ],
            __typename: "GraphXaxis",
          },
          __typename: "MetricHistoryData",
        },
      },
    });
    renderWithProviders(
      <MemoryRouter>
        <LineChart {...mockLineChartData} />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
  });

  it("render with 3h time span", () => {
    const newProps = {
      ...mockLineChartData,
      graphTitle: MetricName.FluentBitInputRecords,
      startTime: 1713331377,
      endTime: 1713342177,
    };
    renderWithProviders(
      <MemoryRouter>
        <LineChart {...newProps} />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
  });

  it("render with 1w time span", () => {
    const newProps = {
      ...mockLineChartData,
      startTime: 1713331377,
      endTime: 1713936177,
    };
    renderWithProviders(
      <MemoryRouter>
        <LineChart {...newProps} />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
  });

  it("render with 2m time span", () => {
    const newProps = {
      ...mockLineChartData,
      startTime: 1709308800,
      endTime: 1714319940,
    };
    renderWithProviders(
      <MemoryRouter>
        <LineChart {...newProps} />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
  });

  it("render with 2y time span", () => {
    const newProps = {
      ...mockLineChartData,
      startTime: 1675180800,
      endTime: 1714492740,
    };
    renderWithProviders(
      <MemoryRouter>
        <LineChart {...newProps} />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
  });
});
