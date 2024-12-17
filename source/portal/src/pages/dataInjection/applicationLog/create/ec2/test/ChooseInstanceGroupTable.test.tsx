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
import ChooseInstanceGroupTable from "../ChooseInstanceGroupTable";
import { screen, act, fireEvent } from "@testing-library/react";
import { appSyncRequestQuery } from "assets/js/request";
import { MockInstanceLogSources } from "test/instance.mock";

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

describe("ChooseInstanceGroupTable", () => {
  it("renders without errors", () => {
    renderWithProviders(
      <MemoryRouter>
        <ChooseInstanceGroupTable
          value={[]}
          setValue={jest.fn()}
          validator={
            {
              error: "",
              validate: jest.fn(),
              setError: jest.fn(),
              onValidate: jest.fn(),
            } as any
          }
        />
      </MemoryRouter>
    );

    expect(
      screen.getByText("applog:ingestion.chooseInstanceGroup.list.name")
    ).toBeInTheDocument();
  });

  it("renders with windows log", () => {
    renderWithProviders(
      <MemoryRouter>
        <ChooseInstanceGroupTable
          isIngestion={true}
          isWindowsLog={true}
          value={[]}
          setValue={jest.fn()}
          validator={
            {
              error: "",
              validate: jest.fn(),
              setError: jest.fn(),
              onValidate: jest.fn(),
            } as any
          }
        />
      </MemoryRouter>
    );

    expect(
      screen.getByText("applog:ingestion.chooseInstanceGroup.list.name")
    ).toBeInTheDocument();
  });

  it("renders with data", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listLogSources: { logSources: MockInstanceLogSources, total: 2 },
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <ChooseInstanceGroupTable
            value={[]}
            setValue={jest.fn()}
            validator={
              {
                error: "",
                validate: jest.fn(),
                setError: jest.fn(),
                onValidate: jest.fn(),
              } as any
            }
          />
        </MemoryRouter>
      );
    });

    // click refresh button
    const refreshButton = screen.getByTestId("refresh-button");
    await act(async () => {
      fireEvent.click(refreshButton);
    });
  });
});
