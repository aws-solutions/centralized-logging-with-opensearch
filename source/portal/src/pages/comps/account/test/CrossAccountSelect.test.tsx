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
import CrossAccountSelect from "../CrossAccountSelect";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { appSyncRequestQuery } from "assets/js/request";
import { screen, act, fireEvent, within } from "@testing-library/react";
import { MockMemberAccountData } from "test/store.mock";

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

describe("CrossAccountSelect", () => {
  it("renders without errors", () => {
    renderWithProviders(
      <MemoryRouter>
        <CrossAccountSelect
          accountId={"111111111111"}
          changeAccount={jest.fn()}
        />
      </MemoryRouter>
    );
  });

  it("renders with data", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getSubAccountLink: { subAccountId: "111111111111" },
        listSubAccountLinks: {
          subAccountLinks: [{ ...MockMemberAccountData }],
        },
      },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CrossAccountSelect
            accountId={"111111111111"}
            changeAccount={jest.fn()}
          />
        </MemoryRouter>
      );
    });

    // select account
    const selectAccount = screen.getByRole("button", {
      name: /test-en\(111111111111\)/i,
    });
    await act(async () => {
      fireEvent.mouseDown(selectAccount);
    });
    const listAccount = within(document.body).getByRole("listbox");
    const account = await within(listAccount).findByText(
      /test-en\(111111111111\)/i
    );
    fireEvent.click(account);
  });
});
