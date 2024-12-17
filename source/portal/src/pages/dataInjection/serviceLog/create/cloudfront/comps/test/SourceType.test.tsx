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
import { MemoryRouter } from "react-router-dom";
import SourceType from "../SourceType";
import {
  cloudFrontMockData,
  MockCloudWatchLogConfig,
} from "test/servicelog.mock";
import { act } from "@testing-library/react";
import { DestinationType } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { S3SourceType } from "../../../cloudtrail/steps/comp/SourceType";

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
  it("renders without errors", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getResourceLogConfigs: MockCloudWatchLogConfig,
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SourceType
            cloudFrontTask={{
              ...cloudFrontMockData,
              destinationType: DestinationType.S3,
              params: {
                ...cloudFrontMockData.params,
                userIsConfirmed: true,
                cloudFrontObj: {
                  name: "cloudfront-1",
                  value: "cloudfront-1",
                },
                tmpFlowList: [
                  {
                    name: "kds-1",
                    value: "kds-1",
                  },
                ],
              },
            }}
            loadingBucket={false}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders with loading", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getResourceLogConfigs: MockCloudWatchLogConfig,
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SourceType
            cloudFrontTask={{
              ...cloudFrontMockData,
              destinationType: DestinationType.CloudWatch,
              params: {
                ...cloudFrontMockData.params,
                userIsConfirmed: true,
                cloudFrontObj: {
                  name: "cloudfront-1",
                  value: "cloudfront-1",
                },
                tmpFlowList: [
                  {
                    name: "kds-1",
                    value: "kds-1",
                  },
                ],
              },
            }}
            loadingBucket={true}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders without errors same region", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getResourceLogConfigs: MockCloudWatchLogConfig,
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SourceType
            cloudFrontTask={{
              ...cloudFrontMockData,
              destinationType: DestinationType.S3,
              params: {
                ...cloudFrontMockData.params,
                userIsConfirmed: true,
                s3SourceType: S3SourceType.SAMEREGION,
                cloudFrontObj: {
                  name: "cloudfront-1",
                  value: "cloudfront-1",
                },
                tmpFlowList: [
                  {
                    name: "kds-1",
                    value: "kds-1",
                  },
                ],
              },
            }}
            loadingBucket={false}
          />
        </MemoryRouter>
      );
    });
  });

  it("renders without errors diff region", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getResourceLogConfigs: MockCloudWatchLogConfig,
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <SourceType
            cloudFrontTask={{
              ...cloudFrontMockData,
              destinationType: DestinationType.S3,
              params: {
                ...cloudFrontMockData.params,
                userIsConfirmed: true,
                s3SourceType: S3SourceType.DIFFREGION,
                cloudFrontObj: {
                  name: "cloudfront-1",
                  value: "cloudfront-1",
                },
                tmpFlowList: [
                  {
                    name: "kds-1",
                    value: "kds-1",
                  },
                ],
              },
            }}
            loadingBucket={false}
          />
        </MemoryRouter>
      );
    });
  });
});
