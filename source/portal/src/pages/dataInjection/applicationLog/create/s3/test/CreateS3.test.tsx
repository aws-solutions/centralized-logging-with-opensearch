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
import AppLogCreateS3 from "../CreateS3";
import { mockOpenSearchStateData } from "test/domain.mock";
import { MockS3List, MockSelectProcessorState } from "test/servicelog.mock";
import { screen, act, fireEvent, within } from "@testing-library/react";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { mockConfigListResource } from "test/config.mock";

// Mock SelectLogProcessor
jest.mock("pages/comps/processor/SelectLogProcessor", () => {
  return {
    __esModule: true,
    default: () => <div>SelectLogProcessor</div>,
  };
});

jest.mock(
  "pages/dataInjection/serviceLog/create/common/ConfigLightEngine",
  () => {
    return {
      __esModule: true,
      default: () => <div>ConfigLightEngine</div>,
      covertSvcTaskToLightEngine: jest.fn(),
    };
  }
);

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

jest.mock("aws-appsync-auth-link", () => {
  return {
    AUTH_TYPE: {
      OPENID_CONNECT: "OPENID_CONNECT",
      AMAZON_COGNITO_USER_POOLS: "AMAZON_COGNITO_USER_POOLS",
    },
    createAuthLink: jest.fn(),
  };
});

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
  refineErrorMessage: jest
    .fn()
    .mockReturnValue({ errorCode: "mockCode", message: "mockMessage" }),
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("AppLogCreateS3", () => {
  it("renders without errors for opensearch", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: MockS3List,
        checkOSIAvailability: true,
        getAccountUnreservedConurrency: 1000,
        listLogConfigs: { logConfigs: mockConfigListResource, total: 1 },
        listLogConfigVersions: mockConfigListResource,
      },
    });

    (appSyncRequestMutation as any).mockResolvedValue({
      data: {
        checkCustomPort: {
          isAllowedPort: true,
          msg: "",
          recommendedPort: 509,
          __typename: "checkCustomPortResponse",
        },
        createLogSource: "xxxxxx",
        createAppLogIngestion: "OK",
        createLightEngineAppPipeline: "OK",
      },
    });

    await act(async () => {
      renderWithProviders(
        <MemoryRouter>
          <AppLogCreateS3 />
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
      fireEvent.click(screen.getByTestId("app-s3-next-button"));
    });

    // select auto
    const autocomplete = screen.getByPlaceholderText(
      "servicelog:s3.selectBucket"
    );
    autocomplete.focus();
    // the value here can be any string you want, so you may also consider to
    // wrapper it as a function and pass in inputValue as parameter
    fireEvent.change(autocomplete, { target: { value: "c" } });
    fireEvent.keyDown(autocomplete, { key: "ArrowDown" });
    fireEvent.keyDown(autocomplete, { key: "Enter" });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("app-s3-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("app-s3-next-button"));
    });

    // click select log config
    const selectLogConfig = screen.getByPlaceholderText(
      "applog:logSourceDesc.s3.step2.chooseALogConfig"
    );

    const divElement = selectLogConfig.previousElementSibling;

    await act(async () => {
      divElement && fireEvent.mouseDown(divElement);
    });
    const listLogConfig = within(document.body).getByRole("listbox");
    const logConfig = await within(listLogConfig).findByText(
      /test-json-config/i
    );

    await act(async () => {
      fireEvent.click(logConfig);
    });

    const revisionSelect = screen.getByTestId("log-conf-revision-select");
    const revision = await within(revisionSelect).findByText(
      /ekslog:ingest.detail.configTab.revision 1/i
    );
    await act(async () => {
      fireEvent.click(revision);
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("app-s3-next-button"));
    });

    // input index name
    const indexName = screen.getByPlaceholderText("log-example");
    fireEvent.change(indexName, { target: { value: "app-s3-logs" } });

    // input shard number
    const shardNum = screen.getByPlaceholderText(
      "servicelog:cluster.inputShardNum"
    );
    fireEvent.change(shardNum, { target: { value: 1 } });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("app-s3-next-button"));
    });

    // click next button
    await act(async () => {
      fireEvent.click(screen.getByTestId("app-s3-next-button"));
    });

    // click create button
    await act(async () => {
      fireEvent.click(screen.getByTestId("app-s3-create-button"));
    });

    // click previous button
    await act(async () => {
      fireEvent.click(screen.getByTestId("app-s3-previous-button"));
    });

    // click cancel button
    await act(async () => {
      fireEvent.click(screen.getByTestId("app-s3-cancel-button"));
    });
  });
});
