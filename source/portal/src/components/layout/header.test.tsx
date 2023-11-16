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
import { render, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import configureMockStore from "redux-mock-store";
import LHeader from "./header";

Object.defineProperty(window, "location", {
  writable: true,
  value: { reload: jest.fn() },
});

jest.mock("react-i18next", () => ({
  useTranslation: () => {
    return {
      t: (key: any) => key,
      i18n: {
        changeLanguage: jest.fn(),
      },
    };
  },
}));

const mockStore = configureMockStore();
const store = mockStore({
  app: {
    userEmail: "test@example.com",
    amplifyConfig: {
      aws_appsync_authenticationType: "OPENID_CONNECT",
    },
  },
});
describe("Header", () => {
  const oidcSignOut = jest.fn();

  it("should render without crashing", () => {
    const { container } = render(
      <Provider store={store}>
        <LHeader oidcSignOut={oidcSignOut} />
      </Provider>
    );

    expect(container).toBeTruthy();
  });

  it("should call oidcSignOut when SIGN_OUT span is clicked", () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <LHeader oidcSignOut={oidcSignOut} />
      </Provider>
    );
    fireEvent.click(getByTestId("signout"));
    expect(oidcSignOut).toHaveBeenCalled();
  });
});
