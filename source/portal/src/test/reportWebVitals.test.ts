// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import reportWebVitals from "../reportWebVitals";

jest.mock("web-vitals", () => ({
  getCLS: jest.fn(),
  getFID: jest.fn(),
  getFCP: jest.fn(),
  getLCP: jest.fn(),
  getTTFB: jest.fn(),
}));

describe("reportWebVitals", () => {
  it("calls web vital functions when onPerfEntry is provided", async () => {
    const mockOnPerfEntry = jest.fn();

    await reportWebVitals(mockOnPerfEntry);

    const { getCLS, getFID, getFCP, getLCP, getTTFB } =
      jest.requireMock("web-vitals");
    expect(getCLS);
    expect(getFID);
    expect(getFCP);
    expect(getLCP);
    expect(getTTFB);
  });

  it("does not call web vital functions when onPerfEntry is not provided", async () => {
    await reportWebVitals();

    const { getCLS, getFID, getFCP, getLCP, getTTFB } =
      jest.requireMock("web-vitals");
    expect(getCLS).not.toHaveBeenCalled();
    expect(getFID).not.toHaveBeenCalled();
    expect(getFCP).not.toHaveBeenCalled();
    expect(getLCP).not.toHaveBeenCalled();
    expect(getTTFB).not.toHaveBeenCalled();
  });
});
