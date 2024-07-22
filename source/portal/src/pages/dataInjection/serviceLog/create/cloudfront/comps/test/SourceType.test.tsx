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
import { renderWithProviders } from "test-utils";
import { AppStoreMockData } from "test/store.mock";
import { MemoryRouter } from "react-router-dom";
import SourceType from "../SourceType";
import { cloudFrontMockData } from "test/servicelog.mock";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: jest.fn(),
}));

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

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("SourceType", () => {
  it("renders without errors", () => {
    const mockChangeLogType = jest.fn();
    const mockSetIsLoading = jest.fn();
    const mockChangeTmpFlowList = jest.fn();
    const mockChangeS3SourceType = jest.fn();
    const mockChangeSuccessTextType = jest.fn();
    const { getByText } = renderWithProviders(
      <MemoryRouter>
        <SourceType
          cloudFrontTask={cloudFrontMockData}
          region={"us-example-1"}
          changeLogType={mockChangeLogType}
          setIsLoading={mockSetIsLoading}
          changeTmpFlowList={mockChangeTmpFlowList}
          changeS3SourceType={mockChangeS3SourceType}
          changeSuccessTextType={mockChangeSuccessTextType}
        />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(
      getByText(/servicelog:cloudfront.selectLogType/i)
    ).toBeInTheDocument();
  });
});
