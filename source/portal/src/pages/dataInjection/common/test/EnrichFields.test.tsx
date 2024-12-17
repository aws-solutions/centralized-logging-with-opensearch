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
import EnrichFields from "../EnrichFields";
import { fireEvent } from "@testing-library/react";
import { mockS3ServicePipelineData } from "test/servicelog.mock";
import { DestinationType, ServiceType } from "API";

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

describe("EnrichFields", () => {
  it("renders without errors", () => {
    const { getByRole } = renderWithProviders(
      <MemoryRouter>
        <EnrichFields
          pipelineTask={{
            ...mockS3ServicePipelineData,
            type: ServiceType.CloudFront,
            destinationType: DestinationType.KDS,
          }}
          changePluginSelect={jest.fn}
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

    // check enrich
    const enrich = getByRole("checkbox", {
      name: /servicelog:cloudfront.location/i,
    });
    fireEvent.click(enrich);

    // check os agent
    const osAgent = getByRole("checkbox", {
      name: /servicelog:cloudfront.osAgent/i,
    });
    fireEvent.click(osAgent);
  });
});
