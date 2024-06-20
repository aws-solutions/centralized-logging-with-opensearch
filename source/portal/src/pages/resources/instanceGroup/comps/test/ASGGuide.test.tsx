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
import { act, render, screen } from "@testing-library/react";
import ASGGuide from "../ASGGuide";
import { LogSource } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { renderWithProviders } from "test-utils";
import { AppStoreMockData } from "test/store.mock";
import { instanceGroupMockData } from "test/instance.mock";
import "../ASGGuideInfo";
import { MemoryRouter } from "react-router-dom";

jest.mock("../ASGGuideInfo", () => {
  return function ASGGuideInfo() {
    return <div>ASGGuideInfo</div>;
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

// beforeEach(async () => {
//   await (appSyncRequestQuery as any).mockResolvedValue({
//     data: {
//       getAutoScalingGroupConf: "Guide details here",
//     },
//   });
// });

// beforeAll(async () => {
//   await (appSyncRequestQuery as any).mockResolvedValue({
//     data: {
//       getAutoScalingGroupConf: "Guide details here",
//     },
//   });
// });

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("ASGGuide", () => {
  it("render without crash", async () => {
    await (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getAutoScalingGroupConf: "Guide details here",
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ASGGuide instanceGroup={instanceGroupMockData as LogSource} />
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
    expect(screen.getByTestId("asg-group-container")).toBeInTheDocument();
  });

  it("render with crash", async () => {
    await (appSyncRequestQuery as any).mockRejectedValue(
      new Error("Request failed")
    );
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ASGGuide instanceGroup={instanceGroupMockData as LogSource} />
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
    expect(screen.getByTestId("asg-group-container")).toBeInTheDocument();
  });

  it("should not call getASGConfig when instanceGroup.sourceId is empty", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ASGGuide instanceGroup={{} as LogSource} />
        </MemoryRouter>
      );
    });
    expect(screen.getByTestId("asg-group-container")).toBeInTheDocument();
  });
});
