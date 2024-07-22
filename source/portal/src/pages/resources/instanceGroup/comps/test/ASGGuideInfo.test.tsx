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
import { act, screen } from "@testing-library/react";
import ASGGuideInfo from "../ASGGuideInfo";
import { appSyncRequestQuery } from "assets/js/request";
import { renderWithProviders } from "test-utils";
import { AppStoreMockData } from "test/store.mock";
import "pages/dataInjection/applicationLog/detail/Permission";
import { MemoryRouter } from "react-router-dom";

jest.mock("pages/dataInjection/applicationLog/detail/Permission", () => {
  return function Permission() {
    return <div>Permission</div>;
  };
});

jest.mock("assets/js/request", () => {
  return {
    appSyncRequestQuery: jest.fn(),
    refineErrorMessage: jest.fn(),
  };
});

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

describe("ASGGuideInfo", () => {
  it("render guide with value and loading is false", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getAutoScalingGroupConf: "Guide details here",
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ASGGuideInfo guide="test guide" loading={false} />
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
    expect(screen.getByTestId("guide-test-permission")).toBeInTheDocument();
  });

  it("render guide without value and loading is true", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getAutoScalingGroupConf: "Guide details here",
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ASGGuideInfo guide="" loading={true} />
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
    expect(screen.getByTestId("gsui-loading")).toBeInTheDocument();
  });

  it("render guide without value and loading is false", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getAutoScalingGroupConf: "Guide details here",
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ASGGuideInfo guide="" loading={false} />
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
    expect(
      screen.getByTestId("guide-need-create-ingestion")
    ).toBeInTheDocument();
  });
});
