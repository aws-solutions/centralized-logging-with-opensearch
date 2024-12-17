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
import EventList from "../EventList";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { AppStoreMockData } from "test/store.mock";
import { appSyncRequestQuery } from "assets/js/request";
import { fireEvent } from "@testing-library/react";

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

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({
    type: "SERVICE",
  }),
  useNavigate: () => jest.fn(),
}));

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
  appSyncRequestMutation: jest.fn(),
}));

describe("EventList", () => {
  it("renders without errors", async () => {
    const { getByTestId } = renderWithProviders(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(getByTestId("refresh-button")).toBeInTheDocument();
    fireEvent.click(getByTestId("refresh-button"));
  });

  it("renders wit event data", async () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        getLogEvents: {
          logEvents: [
            {
              timestamp: "1711419798025",
              message: "logs content\n",
              ingestionTime: "1711419801732",
              __typename: "LogEvent",
            },
          ],
          nextForwardToken: "nextToken",
          nextBackwardToken: null,
          __typename: "GetLogEventsResponse",
        },
      },
    });

    const { getByTestId } = renderWithProviders(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );

    expect(getByTestId("load-more-forward")).toBeInTheDocument();
    fireEvent.click(getByTestId("load-more-forward"));

    expect(getByTestId("load-more-history")).toBeInTheDocument();
    fireEvent.click(getByTestId("load-more-history"));
  });
});
