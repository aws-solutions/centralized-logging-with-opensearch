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
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "test-utils";
import { AppStoreMockData } from "test/store.mock";
import "pages/resources/common/InstanceTable";
import DetailASG from "../DetailASG";
import { instanceGroupMockData } from "test/instance.mock";
import { LogSource } from "API";
import { MemoryRouter } from "react-router-dom";

jest.mock("pages/resources/common/InstanceTable", () => {
  return function InstanceTable() {
    return <div>InstanceTable</div>;
  };
});

jest.mock("pages/resources/common/InstanceTable", () => {
  return function InstanceTable() {
    return <div>InstanceTable</div>;
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

describe("DetailASG", () => {
  it("render ASG with windows instance group", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DetailASG instanceGroup={instanceGroupMockData as LogSource} />
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
    expect(screen.getByTestId("asg-detail-tab")).toBeInTheDocument();
  });

  it("render ASG with linux instance group", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DetailASG
            instanceGroup={
              {
                ...instanceGroupMockData,
                ec2: {
                  ...instanceGroupMockData.ec2,
                  groupPlatform: "Linux",
                },
              } as LogSource
            }
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
    });
    expect(screen.getByTestId("asg-detail-tab")).toBeInTheDocument();
  });

  it("render ASG with not group platform type", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DetailASG
            instanceGroup={
              {
                ...instanceGroupMockData,
                ec2: {
                  ...instanceGroupMockData.ec2,
                  groupPlatform: null as any,
                },
              } as LogSource
            }
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
    });
    expect(screen.getByTestId("asg-detail-tab")).toBeInTheDocument();
  });

  it("render ASG with no asg name", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DetailASG
            instanceGroup={
              {
                ...instanceGroupMockData,
                ec2: {
                  ...instanceGroupMockData.ec2,
                  asgName: "",
                },
              } as LogSource
            }
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
    });
    expect(screen.getByTestId("asg-detail-tab")).toBeInTheDocument();
  });

  it("render ASG with asg name", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DetailASG
            instanceGroup={
              {
                ...instanceGroupMockData,
                ec2: {
                  ...instanceGroupMockData.ec2,
                  asgName: "test asg name",
                },
              } as LogSource
            }
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
    });
    expect(screen.getByTestId("asg-detail-tab")).toBeInTheDocument();
  });

  it("should click guide tab", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DetailASG instanceGroup={instanceGroupMockData as LogSource} />
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
    await act(async () => {
      const tabA = await screen.findByTestId("a");
      await fireEvent.click(tabA);
    });
    expect(screen.getByTestId("asg-group-container")).toBeInTheDocument();
  });
});
