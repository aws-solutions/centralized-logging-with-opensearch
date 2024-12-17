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
import DomainAlarm from "../DomainAlarm";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { AppStoreMockData } from "test/store.mock";
import {
  screen,
  act,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";

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

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({
    id: "mockedId",
    name: "mockedName",
  }),
  useNavigate: () => jest.fn(),
}));

jest.mock("assets/js/request", () => ({
  appSyncRequestMutation: jest.fn(),
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

afterEach(cleanup);

describe("DomainAlarm", () => {
  it("renders without errors", () => {
    renderWithProviders(
      <MemoryRouter>
        <DomainAlarm />
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

  it("should render the alarm detail after get data", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DomainAlarm />
        </MemoryRouter>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
    });
    expect(
      screen.getByText(/cluster:alarm.domainAlarmDesc/i)
    ).toBeInTheDocument();
  });

  it("should test click cancel button the alarm detail after get data", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DomainAlarm />
        </MemoryRouter>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("alarm-cancel-button"));
    });
  });

  it("should fire cancel button", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DomainAlarm />
        </MemoryRouter>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("alarm-cancel-button"));
    });
  });

  it("should did not input email", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DomainAlarm />
        </MemoryRouter>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("alarm-create-button"));
    });
  });

  it("should check input email invalid", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DomainAlarm />
        </MemoryRouter>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
    });

    // mock input email
    const emailInput = screen.getByPlaceholderText("abc@example.com");
    fireEvent.change(emailInput, { target: { value: "abc#example.com" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("alarm-create-button"));
    });
  });

  it("should check min storage invalid", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DomainAlarm />
        </MemoryRouter>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
    });

    // mock input email
    const emailInput = screen.getByPlaceholderText("abc@example.com");
    fireEvent.change(emailInput, { target: { value: "abc1@example.com" } });

    await waitFor(() => {
      expect(
        screen.getByTestId("alarm-param-input-FREE_STORAGE_SPACE")
      ).toBeInTheDocument();
    });

    // mock update params input
    const freeStorageInput = screen.getByTestId(
      "alarm-param-input-FREE_STORAGE_SPACE"
    );
    act(() => {
      fireEvent.change(freeStorageInput, { target: { value: "-1" } });
    });
  });

  it("should fire create button check some fields", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DomainAlarm />
        </MemoryRouter>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
    });

    // mock input email
    const emailInput = screen.getByPlaceholderText("abc@example.com");
    fireEvent.change(emailInput, { target: { value: "abc@example.com" } });

    // mock update params input
    const freeStorageInput = screen.getByTestId(
      "alarm-param-input-FREE_STORAGE_SPACE"
    );
    fireEvent.change(freeStorageInput, { target: { value: 100 } });

    const writeBlockedInput = screen.getByTestId(
      "alarm-param-input-WRITE_BLOCKED"
    );
    fireEvent.change(writeBlockedInput, { target: { value: 10 } });

    const nodeUnreachableInput = screen.getByTestId(
      "alarm-param-input-NODE_UNREACHABLE"
    );
    fireEvent.change(nodeUnreachableInput, { target: { value: 10 } });

    // mock select checkbox
    fireEvent.click(screen.getByTestId("alarm-checkbox-FREE_STORAGE_SPACE"));
    fireEvent.click(screen.getByTestId("alarm-checkbox-WRITE_BLOCKED"));
    fireEvent.click(screen.getByTestId("alarm-checkbox-NODE_UNREACHABLE"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("alarm-create-button"));
    });
  });

  it("should fire create button check all fields", async () => {
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <DomainAlarm />
        </MemoryRouter>
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
    });

    // mock input email
    const emailInput = screen.getByPlaceholderText("abc@example.com");
    fireEvent.change(emailInput, { target: { value: "abc@example.com" } });

    // mock select all
    fireEvent.click(screen.getByTestId("alarm-select-all"));

    fireEvent.click(screen.getByTestId("alarm-select-all"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("alarm-create-button"));
    });
  });
});
