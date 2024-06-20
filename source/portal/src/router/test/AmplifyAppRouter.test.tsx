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
import { render, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { Auth } from "aws-amplify";
import AmplifyAppRouter from "../AmplifyAppRouter";
import configureStore from "redux-mock-store";

jest.mock("aws-amplify");
jest.mock("../SignedInApp", () => {
  const MockedSignedInApp = () => <div>SignedInApp Component</div>;
  MockedSignedInApp.displayName = "SignedInApp";
  return MockedSignedInApp;
});

jest.mock("../AmplifyLoginPage", () => {
  const MockedAmplifyLoginPage = () => <div>AmplifyLoginPage Component</div>;
  MockedAmplifyLoginPage.displayName = "AmplifyLoginPage";
  return MockedAmplifyLoginPage;
});

const mockStore = configureStore([]);
let store: any;

describe("AmplifyAppRouter component", () => {
  beforeEach(() => {
    store = mockStore({
      yourStoreDataStructure: {},
    });
    jest.clearAllMocks();
  });

  test("renders AmplifyLoginPage when user is not signed in", async () => {
    (Auth.currentAuthenticatedUser as any).mockRejectedValueOnce(
      new Error("User not signed in")
    );

    render(
      <Provider store={store}>
        <AmplifyAppRouter />
      </Provider>
    );
  });

  test("renders SignedInApp when user is signed in", async () => {
    (Auth.currentAuthenticatedUser as any).mockResolvedValueOnce({});

    const { getByText } = render(
      <Provider store={store}>
        <AmplifyAppRouter />
      </Provider>
    );
    await waitFor(() =>
      expect(getByText("SignedInApp Component")).toBeInTheDocument()
    );
  });
});
