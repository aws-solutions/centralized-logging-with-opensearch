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
import SourceType, { S3SourceType } from "../SourceType";
import { act } from "@testing-library/react";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import {
  cloudtrailMockData,
  MockCloudWatchLogConfig,
} from "test/servicelog.mock";
import { appSyncRequestQuery } from "assets/js/request";
import { DestinationType } from "API";

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

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("SourceType", () => {
  const mockChangeBucket = jest.fn();
  const mockChangeManualS3 = jest.fn();
  const mockChangeLogPath = jest.fn();
  const mockSetISChanging = jest.fn();
  const mockChangeTmpFlowList = jest.fn();
  const mockChangeSuccessTextType = jest.fn();
  const mockChangeLogSource = jest.fn();

  const mockProps = {
    changeBucket: mockChangeBucket,
    changeManualS3: mockChangeManualS3,
    changeLogPath: mockChangeLogPath,
    setISChanging: mockSetISChanging,
    changeTmpFlowList: mockChangeTmpFlowList,
    changeSuccessTextType: mockChangeSuccessTextType,
    changeLogSource: mockChangeLogSource,
    manualS3EmptyError: false,
    manualCwlArnEmptyError: false,
    shardNumError: false,
    maxShardNumError: false,
    changeMinCapacity: jest.fn(),
    changeEnableAS: jest.fn(),
    changeMaxCapacity: jest.fn(),
    loadingBucket: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without errors", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SourceType
            {...mockProps}
            cloudTrailTask={{
              ...cloudtrailMockData,
              destinationType: DestinationType.S3,
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders with cloudwatch option", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getResourceLogConfigs: MockCloudWatchLogConfig,
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SourceType
            {...mockProps}
            cloudTrailTask={{
              ...cloudtrailMockData,
              destinationType: DestinationType.CloudWatch,
              params: {
                ...cloudtrailMockData.params,
                curTrailObj: {
                  name: "cloudtrail-1",
                  value: "cloudtrail-1",
                },
                tmpFlowList: [
                  {
                    name: "kds-1",
                    value: "kds-1",
                  },
                ],
              },
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders with s3 same region", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getResourceLogConfigs: MockCloudWatchLogConfig,
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SourceType
            {...mockProps}
            cloudTrailTask={{
              ...cloudtrailMockData,
              destinationType: DestinationType.S3,
              params: {
                ...cloudtrailMockData.params,
                s3SourceType: S3SourceType.SAMEREGION,
                curTrailObj: {
                  name: "cloudtrail-1",
                  value: "cloudtrail-1",
                },
                tmpFlowList: [
                  {
                    name: "kds-1",
                    value: "kds-1",
                  },
                ],
              },
            }}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders with s3 diff region", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getResourceLogConfigs: MockCloudWatchLogConfig,
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SourceType
            {...mockProps}
            cloudTrailTask={{
              ...cloudtrailMockData,
              destinationType: DestinationType.S3,
              params: {
                ...cloudtrailMockData.params,
                s3SourceType: S3SourceType.DIFFREGION,
                curTrailObj: {
                  name: "cloudtrail-1",
                  value: "cloudtrail-1",
                },
                tmpFlowList: [
                  {
                    name: "kds-1",
                    value: "kds-1",
                  },
                ],
              },
            }}
          />
        </MemoryRouter>
      );
    });
  });
});
