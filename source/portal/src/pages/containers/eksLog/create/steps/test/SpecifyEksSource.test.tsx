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
import SpecifyEksSource from "../SpecifyEksSource";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { AppStoreMockData } from "test/store.mock";
import { LogSourceType } from "API";

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

describe("SpecifyEksSource", () => {
  const mockChangeEksClusterSource = jest.fn();
  const mockChangeEksLogAgentPattern = jest.fn();
  const mockChangeCurAccount = jest.fn();
  it("renders without errors", () => {
    renderWithProviders(
      <MemoryRouter>
        <SpecifyEksSource
          eksClusterLogSource={{
            type: LogSourceType.EC2,
            region: undefined,
            accountId: undefined,
            ec2: undefined,
            syslog: undefined,
            eks: undefined,
            s3: undefined,
            tags: undefined,
          }}
          eksEmptyError={false}
          changeEksClusterSource={mockChangeEksClusterSource}
          changeEksLogAgentPattern={mockChangeEksLogAgentPattern}
          changeCurAccount={mockChangeCurAccount}
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
});
