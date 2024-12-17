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
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import InfoSpan from "./infoSpan";
import { InfoBarTypes } from "reducer/appReducer";
import configureStore from "redux-mock-store";

const mockStore = configureStore([]);
let store: any;

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

describe("InfoSpan", () => {
  beforeEach(() => {
    store = mockStore({
      yourStoreDataStructure: {},
    });
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <Provider store={store}>
        <InfoSpan spanType={InfoBarTypes.ALARMS} />
      </Provider>
    );
  });

  it('displays the translated "info" text', () => {
    render(
      <Provider store={store}>
        <InfoSpan spanType={InfoBarTypes.ALARMS} />
      </Provider>
    );
    expect(screen.getByText("info")).toBeInTheDocument();
    fireEvent.click(screen.getByText("info"));
  });
});
