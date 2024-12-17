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
import LogConfigComp, { PageType } from "../LogConfigComp";
import { INIT_CONFIG_DATA } from "reducer/createLogConfig";
import {
  screen,
  act,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { appSyncRequestMutation } from "assets/js/request";
import { mockConfigData } from "test/config.mock";
import { LogType } from "API";

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

describe("InstanceGroupList", () => {
  it("renders without errors", () => {
    const { getByText } = renderWithProviders(
      <MemoryRouter>
        <LogConfigComp
          headerTitle="create log config"
          pageType={PageType.New}
          logConfig={INIT_CONFIG_DATA}
        />
      </MemoryRouter>
    );
    expect(getByText(/create log config/i)).toBeInTheDocument();
  });

  it("renders without errors show regex", () => {
    const { getByText } = renderWithProviders(
      <MemoryRouter>
        <LogConfigComp
          headerTitle="create log config"
          pageType={PageType.New}
          logConfig={{ ...INIT_CONFIG_DATA, showRegex: true }}
        />
      </MemoryRouter>
    );
    expect(getByText(/create log config/i)).toBeInTheDocument();
  });

  it("should test for create mutation config", async () => {
    (appSyncRequestMutation as any).mockResolvedValue({
      data: { deleteLogConfig: "OK" },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <LogConfigComp
            headerTitle="create log config"
            pageType={PageType.New}
            logConfig={{
              ...INIT_CONFIG_DATA,
              data: { ...mockConfigData } as any,
            }}
          />
        </MemoryRouter>
      );
    });
    // Click confirm button
    const mutationButton = screen.getByTestId("mutation-button");
    expect(mutationButton).toBeInTheDocument();
    fireEvent.click(mutationButton);

    // Click cancel button
    const cancelButton = screen.getByTestId("cancel-button");
    expect(cancelButton).toBeInTheDocument();
    fireEvent.click(cancelButton);
  });

  it("should test for update mutation config", async () => {
    (appSyncRequestMutation as any).mockResolvedValue({
      data: { deleteLogConfig: "OK" },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <LogConfigComp
            headerTitle="create log config"
            pageType={PageType.Edit}
            logConfig={{
              ...INIT_CONFIG_DATA,
              data: { ...mockConfigData } as any,
            }}
          />
        </MemoryRouter>
      );
    });
    // Click confirm button
    const mutationButton = screen.getByTestId("mutation-button");
    expect(mutationButton).toBeInTheDocument();
    fireEvent.click(mutationButton);

    // Click cancel button
    const cancelButton = screen.getByTestId("cancel-button");
    expect(cancelButton).toBeInTheDocument();
    fireEvent.click(cancelButton);
  });

  it("should test for update mutation config invalid", async () => {
    (appSyncRequestMutation as any).mockResolvedValue({
      data: { deleteLogConfig: "OK" },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <LogConfigComp
            headerTitle="create log config"
            pageType={PageType.Edit}
            logConfig={{
              ...INIT_CONFIG_DATA,
              data: { ...mockConfigData, name: "" } as any,
            }}
          />
        </MemoryRouter>
      );
    });
    // Click confirm button
    const mutationButton = screen.getByTestId("mutation-button");
    expect(mutationButton).toBeInTheDocument();
    fireEvent.click(mutationButton);

    // Click cancel button
    const cancelButton = screen.getByTestId("cancel-button");
    expect(cancelButton).toBeInTheDocument();
    fireEvent.click(cancelButton);
  });

  it("should test for update mutation config has cookie", async () => {
    (appSyncRequestMutation as any).mockResolvedValue({
      data: { deleteLogConfig: "OK" },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <LogConfigComp
            headerTitle="create log config"
            pageType={PageType.New}
            logConfig={{
              ...INIT_CONFIG_DATA,
              showLogFormat: true,
              showRegex: true,
              data: {
                ...mockConfigData,
                logType: "",
              } as any,
            }}
          />
        </MemoryRouter>
      );
    });

    // Input name
    const nameInput = screen.getByPlaceholderText("log-example-config");
    fireEvent.change(nameInput, { target: { value: "test" } });

    // Select log type
    const logTypeSelect = screen.getByRole("button", {
      name: "resource:config.common.chooseLogType",
    });
    fireEvent.mouseDown(logTypeSelect);

    await waitFor(() => {
      expect(
        screen.queryByText("resource:config.type.iis")
      ).toBeInTheDocument();
    });

    const listboxTypes = within(document.body).getByRole("listbox");
    const iisType = await within(listboxTypes).findByText(
      "resource:config.type.iis"
    );
    fireEvent.click(iisType);

    await waitFor(() => {
      expect(
        document.body.querySelector("ul[role=listbox]")
      ).not.toBeInTheDocument();
    });

    // Click confirm button
    const mutationButton = screen.getByTestId("mutation-button");
    expect(mutationButton).toBeInTheDocument();
    fireEvent.click(mutationButton);
  });

  it("should test for update mutation regex format type", async () => {
    (appSyncRequestMutation as any).mockResolvedValue({
      data: { deleteLogConfig: "OK" },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <LogConfigComp
            headerTitle="create log config"
            pageType={PageType.New}
            logConfig={{
              ...INIT_CONFIG_DATA,
              data: {
                ...mockConfigData,
                logType: LogType.SingleLineText,
                regex: "test",
                userLogFormat: "test",
              } as any,
            }}
          />
        </MemoryRouter>
      );
    });
    // Click confirm button
    const mutationButton = screen.getByTestId("mutation-button");
    expect(mutationButton).toBeInTheDocument();
    fireEvent.click(mutationButton);

    // Click cancel button
    const cancelButton = screen.getByTestId("cancel-button");
    expect(cancelButton).toBeInTheDocument();
    fireEvent.click(cancelButton);
  });

  it("should test for update mutation windows event type", async () => {
    (appSyncRequestMutation as any).mockResolvedValue({
      data: { deleteLogConfig: "OK" },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <LogConfigComp
            headerTitle="create log config"
            pageType={PageType.New}
            logConfig={{
              ...INIT_CONFIG_DATA,
              data: {
                ...mockConfigData,
                logType: LogType.WindowsEvent,
                regex: "test",
                userLogFormat: "test",
              } as any,
            }}
          />
        </MemoryRouter>
      );
    });
    // Click confirm button
    const mutationButton = screen.getByTestId("mutation-button");
    expect(mutationButton).toBeInTheDocument();
    fireEvent.click(mutationButton);

    // Click cancel button
    const cancelButton = screen.getByTestId("cancel-button");
    expect(cancelButton).toBeInTheDocument();
    fireEvent.click(cancelButton);
  });

  it("should select iis log parser", async () => {
    (appSyncRequestMutation as any).mockResolvedValue({
      data: { deleteLogConfig: "OK" },
    });
    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <LogConfigComp
            headerTitle="create log config"
            pageType={PageType.New}
            logConfig={{
              ...INIT_CONFIG_DATA,
              showLogFormat: true,
              showRegex: true,
              data: {
                ...INIT_CONFIG_DATA.data,
                logType: LogType.IIS,
              },
            }}
          />
        </MemoryRouter>
      );
    });

    // Select log parser
    const logParserSelect = screen.getByRole("button", {
      name: "resource:config.common.chooseParser",
    });
    fireEvent.mouseDown(logParserSelect);

    await waitFor(() => {
      expect(screen.queryByText("W3C")).toBeInTheDocument();
    });

    const listboxTypes = within(document.body).getByRole("listbox");
    const iisType = await within(listboxTypes).findByText("W3C");
    fireEvent.click(iisType);

    await waitFor(() => {
      expect(
        document.body.querySelector("ul[role=listbox]")
      ).not.toBeInTheDocument();
    });

    // input user log format
    const formatInput = screen.getByPlaceholderText("#Fields: ...");
    fireEvent.change(formatInput, { target: { value: "#Fields: Cookie" } });

    // input regex format
    const regexInput = screen.getByPlaceholderText("\\S\\s+.*");
    fireEvent.change(regexInput, { target: { value: "test" } });

    // Click confirm button
    const mutationButton = screen.getByTestId("mutation-button");
    expect(mutationButton).toBeInTheDocument();
    fireEvent.click(mutationButton);

    // Click cancel button
    const cancelButton = screen.getByTestId("cancel-button");
    expect(cancelButton).toBeInTheDocument();
    fireEvent.click(cancelButton);
  });
});
