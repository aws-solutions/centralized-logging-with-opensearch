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
import CreateLambda from "../CreateLambda";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { screen, act, fireEvent } from "@testing-library/react";
import { mockOpenSearchStateData } from "test/domain.mock";
import {
  MockLambdaList,
  MockResourceLoggingBucketData,
  MockSelectProcessorState,
} from "test/servicelog.mock";

// Mock SelectLogProcessor
jest.mock("pages/comps/processor/SelectLogProcessor", () => {
  return {
    __esModule: true,
    default: () => <div>SelectLogProcessor</div>,
  };
});

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: jest.fn(),
}));

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

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
}));

describe("CreateConfig", () => {
  it("renders with data for openSearch", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: MockLambdaList,
        getResourceLoggingBucket: {
          ...MockResourceLoggingBucketData,
          enabled: true,
        },
        checkOSIAvailability: true,
        getAccountUnreservedConurrency: 1000,
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: { createPipelineParams: "OK" },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <CreateLambda />
        </MemoryRouter>,
        {
          preloadedState: {
            app: {
              ...AppStoreMockData,
            },
            openSearch: {
              ...mockOpenSearchStateData,
            },
            selectProcessor: {
              ...MockSelectProcessorState,
            },
          },
        }
      );
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("lambda-next-button"));
    });

    const autocomplete = screen.getByPlaceholderText(
      "servicelog:lambda.selectLambda"
    );
    // const input = within(autocomplete).getByRole("textbox");
    autocomplete.focus();
    // the value here can be any string you want, so you may also consider to
    // wrapper it as a function and pass in inputValue as parameter
    fireEvent.change(autocomplete, { target: { value: "a" } });
    fireEvent.keyDown(autocomplete, { key: "ArrowDown" });
    fireEvent.keyDown(autocomplete, { key: "Enter" });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("lambda-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("lambda-next-button"));
    });

    // input shard number
    const shardNum = screen.getByPlaceholderText(
      "servicelog:cluster.inputShardNum"
    );
    fireEvent.change(shardNum, { target: { value: 1 } });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("lambda-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("lambda-next-button"));
    });

    // click create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("lambda-create-button"));
    });

    // click previous button
    await act(async () => {
      fireEvent.click(screen.getByTestId("lambda-previous-button"));
    });

    // click cancel button
    await act(async () => {
      fireEvent.click(screen.getByTestId("lambda-cancel-button"));
    });
  });
});
