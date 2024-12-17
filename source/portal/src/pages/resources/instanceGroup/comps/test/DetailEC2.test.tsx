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
import "pages/resources/common/InstanceTable";
import DetailEC2 from "../DetailEC2";
import {
  instanceGroupMockData,
  MockGetAgentStatus,
  MockListInstances,
} from "test/instance.mock";
import { LogSource } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { act } from "@testing-library/react";

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

jest.useFakeTimers();

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

beforeEach(async () => {
  jest.advanceTimersByTime(2000);
  await (appSyncRequestQuery as any).mockResolvedValue({
    data: {
      listInstances: MockListInstances,
      getInstanceAgentStatus: MockGetAgentStatus,
    },
  });
  jest.advanceTimersByTime(2000);
  await (appSyncRequestQuery as any).mockResolvedValue({
    data: {
      listInstances: MockListInstances,
      getInstanceAgentStatus: MockGetAgentStatus,
    },
  });

  jest.advanceTimersByTime(2000);
  await (appSyncRequestQuery as any).mockResolvedValue({
    data: {
      listInstances: MockListInstances,
      getInstanceAgentStatus: MockGetAgentStatus,
    },
  });
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("DetailEC2", () => {
  it("render detail ec2 without crash", async () => {
    const { getByTestId } = renderWithProviders(
      <DetailEC2
        instanceGroup={instanceGroupMockData as LogSource}
        loadingData={false}
        refreshInstanceGroup={jest.fn()}
      />,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(getByTestId("test-detail-ec2")).toBeInTheDocument();
  });

  it("should render with data", async () => {
    await act(async () => {
      renderWithProviders(
        <DetailEC2
          instanceGroup={instanceGroupMockData as LogSource}
          loadingData={false}
          refreshInstanceGroup={jest.fn()}
        />
      );
    });
  });
});
