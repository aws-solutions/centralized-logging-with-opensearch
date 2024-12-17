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
import Home from "../Home";
import { screen, fireEvent } from "@testing-library/react";

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

describe("Home", () => {
  it("renders without errors", () => {
    const { getByText } = renderWithProviders(
      <MemoryRouter initialEntries={["/"]}>
        <Home />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(getByText(/home:analytics/i)).toBeInTheDocument();
  });

  it("renders with click domain", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/"]}>
        <Home />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );

    const domain = screen.getByTestId("type-item-Domain");
    expect(domain).toBeInTheDocument();
    fireEvent.click(domain);

    const importDomain = screen.getByTestId("import-domain-button");
    expect(importDomain).toBeInTheDocument();
    fireEvent.click(importDomain);
  });

  it("renders with click service pipeline", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/"]}>
        <Home />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );

    const domain = screen.getByTestId("type-item-ServicePipeline");
    expect(domain).toBeInTheDocument();
    fireEvent.click(domain);

    const importDomain = screen.getByTestId("service-pipeline-button");
    expect(importDomain).toBeInTheDocument();
    fireEvent.click(importDomain);
  });

  it("renders with click app pipeline", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/"]}>
        <Home />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );

    const domain = screen.getByTestId("type-item-AppPipeline");
    expect(domain).toBeInTheDocument();
    fireEvent.click(domain);

    const importDomain = screen.getByTestId("app-pipeline-button");
    expect(importDomain).toBeInTheDocument();
    fireEvent.click(importDomain);
  });
});
