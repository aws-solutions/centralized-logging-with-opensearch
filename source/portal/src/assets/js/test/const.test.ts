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

import { buildSolutionDocsLink, generateTimeZoneList } from "../const";

describe("buildSolutionDocsLink", () => {
  // Test a typical case
  it("should correctly append the provided link to the base domain", () => {
    const link = "getting-started";
    const expected =
      "https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/getting-started";
    const result = buildSolutionDocsLink(link);
    expect(result).toBe(expected);
  });

  // Test with special characters
  it("should correctly handle special characters in the link", () => {
    const link = "search?query=logs";
    const expected =
      "https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/search?query=logs";
    const result = buildSolutionDocsLink(link);
    expect(result).toBe(expected);
  });

  // Test with an empty string
  it("should handle an empty string", () => {
    const link = "";
    const expected =
      "https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/";
    const result = buildSolutionDocsLink(link);
    expect(result).toBe(expected);
  });
});

describe("generateTimeZoneList", () => {
  const timezoneList = generateTimeZoneList();

  // Test the length of the array
  it("should generate 25 time zone options", () => {
    expect(timezoneList).toHaveLength(25);
  });

  // Test the structure of the array elements
  it("should have the correct structure for each element", () => {
    timezoneList.forEach((option) => {
      expect(option).toHaveProperty("name");
      expect(option).toHaveProperty("value");
      expect(typeof option.name).toBe("string");
      expect(typeof option.value).toBe("string");
    });
  });

  // Test specific cases
  it("should generate the correct label and value for UTC-12:00", () => {
    expect(timezoneList[0]).toEqual({ name: "UTC-12:00", value: "-1200" });
  });

  it("should generate the correct label and value for UTC+00:00", () => {
    // UTC+00:00 should be the 13th element in the array
    expect(timezoneList[12]).toEqual({ name: "UTC+00:00", value: "+0000" });
  });

  it("should generate the correct label and value for UTC+12:00", () => {
    expect(timezoneList[24]).toEqual({ name: "UTC+12:00", value: "+1200" });
  });
});
