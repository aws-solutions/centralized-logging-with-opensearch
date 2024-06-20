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
import SpecifySettings from "../SpecifySettings";
import { cloudFrontMockData } from "test/servicelog.mock";
import { appSyncRequestQuery } from "assets/js/request";

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

jest.mock("assets/js/request", () => {
  return {
    appSyncRequestQuery: jest.fn(),
    refineErrorMessage: jest.fn(),
  };
});

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("SpecifySettings", () => {
  it("renders without errors", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: [],
      },
    });

    const mockChangeTaskType = jest.fn();
    const mockChangeS3Bucket = jest.fn();
    const mockChangeCloudFrontObj = jest.fn();
    const mockChangeLogPath = jest.fn();
    const mockManualChangeBucket = jest.fn();
    const mockSetNextStepDisableStatus = jest.fn();
    const mockSetISChanging = jest.fn();
    const mockChangeCrossAccount = jest.fn();
    const mockChangeLogType = jest.fn();
    const mockChangeFieldType = jest.fn();
    const mockChangeSamplingRate = jest.fn();
    const mockChangeCustomFields = jest.fn();
    const mockChangeMinCapacity = jest.fn();
    const mockChangeEnableAS = jest.fn();
    const mockChangeMaxCapacity = jest.fn();
    const mockChangeUserConfirm = jest.fn();
    const mockChangeTmpFlowList = jest.fn();
    const mockChangeS3SourceType = jest.fn();
    const mockChangeSuccessTextType = jest.fn();
    const { getByText } = renderWithProviders(
      <MemoryRouter>
        <SpecifySettings
          cloudFrontTask={cloudFrontMockData}
          changeTaskType={mockChangeTaskType}
          changeS3Bucket={mockChangeS3Bucket}
          changeCloudFrontObj={mockChangeCloudFrontObj}
          changeLogPath={mockChangeLogPath}
          manualChangeBucket={mockManualChangeBucket}
          autoS3EmptyError={false}
          manualS3EmptyError={false}
          manualS3PathInvalid={false}
          showConfirmError={false}
          logTypeEmptyError={false}
          samplingRateError={false}
          shardNumError={false}
          maxShardNumError={false}
          setNextStepDisableStatus={mockSetNextStepDisableStatus}
          setISChanging={mockSetISChanging}
          changeCrossAccount={mockChangeCrossAccount}
          changeLogType={mockChangeLogType}
          changeFieldType={mockChangeFieldType}
          changeSamplingRate={mockChangeSamplingRate}
          changeCustomFields={mockChangeCustomFields}
          changeMinCapacity={mockChangeMinCapacity}
          changeEnableAS={mockChangeEnableAS}
          changeMaxCapacity={mockChangeMaxCapacity}
          changeUserConfirm={mockChangeUserConfirm}
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
      getByText(/servicelog:create.step.specifySetting/i)
    ).toBeInTheDocument();
  });
});
