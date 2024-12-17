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
import { cleanup, fireEvent, render } from "@testing-library/react";
import TimeRange from "./TimeRange";

afterEach(cleanup);

jest.mock("react-i18next", () => ({
  useTranslation: () => {
    return {
      t: (key: any) => key,
      i18n: {
        changeLanguage: jest.fn(),
      },
    };
  },
}));

describe("TimeRange Component", () => {
  it("should render without crashing", () => {
    const mockFn1 = jest.fn();
    const mockFn2 = jest.fn();
    const { getByText } = render(
      <TimeRange
        curTimeRangeType="1h"
        startTime="00:00:00"
        endTime="23:59:59"
        changeTimeRange={mockFn1}
        changeRangeType={mockFn2}
      />
    );
    expect(getByText("1h")).toBeTruthy();
  });

  it("should call changeRangeType function when a specify time item is clicked", () => {
    const mockFn1 = jest.fn();
    const mockFn2 = jest.fn();
    const { getByText } = render(
      <TimeRange
        curTimeRangeType="1h"
        startTime="00:00:00"
        endTime="23:59:59"
        changeTimeRange={mockFn1}
        changeRangeType={mockFn2}
      />
    );
    fireEvent.click(getByText("1d"));
    expect(mockFn2).toHaveBeenCalled();
  });

  it("should call changeRangeType function when a specify time is 3h", () => {
    const mockFn1 = jest.fn();
    const mockFn2 = jest.fn();
    render(
      <TimeRange
        curTimeRangeType="3h"
        startTime="00:00:00"
        endTime="23:59:59"
        changeTimeRange={mockFn1}
        changeRangeType={mockFn2}
      />
    );
  });

  it("should call changeRangeType function when a specify time is 12h", () => {
    const mockFn1 = jest.fn();
    const mockFn2 = jest.fn();
    render(
      <TimeRange
        curTimeRangeType="12h"
        startTime="00:00:00"
        endTime="23:59:59"
        changeTimeRange={mockFn1}
        changeRangeType={mockFn2}
      />
    );
  });

  it("should call changeRangeType function when a specify time is 1d", () => {
    const mockFn1 = jest.fn();
    const mockFn2 = jest.fn();
    render(
      <TimeRange
        curTimeRangeType="1d"
        startTime="00:00:00"
        endTime="23:59:59"
        changeTimeRange={mockFn1}
        changeRangeType={mockFn2}
      />
    );
  });

  it("should call changeRangeType function when a specify time is 3d", () => {
    const mockFn1 = jest.fn();
    const mockFn2 = jest.fn();
    render(
      <TimeRange
        curTimeRangeType="3d"
        startTime="00:00:00"
        endTime="23:59:59"
        changeTimeRange={mockFn1}
        changeRangeType={mockFn2}
      />
    );
  });

  it("should call changeRangeType function when a specify time is 1w", () => {
    const mockFn1 = jest.fn();
    const mockFn2 = jest.fn();
    render(
      <TimeRange
        curTimeRangeType="1w"
        startTime="00:00:00"
        endTime="23:59:59"
        changeTimeRange={mockFn1}
        changeRangeType={mockFn2}
      />
    );
  });

  it("should call changeRangeType function when a specify time is custom", () => {
    const mockFn1 = jest.fn();
    const mockFn2 = jest.fn();
    render(
      <TimeRange
        curTimeRangeType="Custom"
        startTime="00:00:00"
        endTime="23:59:59"
        changeTimeRange={mockFn1}
        changeRangeType={mockFn2}
      />
    );
  });

  it("should call changeRangeType function when a specify time is empty", () => {
    const mockFn1 = jest.fn();
    const mockFn2 = jest.fn();
    render(
      <TimeRange
        curTimeRangeType=""
        startTime="00:00:00"
        endTime="23:59:59"
        changeTimeRange={mockFn1}
        changeRangeType={mockFn2}
      />
    );
  });
});
