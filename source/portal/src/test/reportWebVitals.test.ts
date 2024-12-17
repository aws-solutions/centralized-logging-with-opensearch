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
