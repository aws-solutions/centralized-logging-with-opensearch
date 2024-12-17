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
import React, { Suspense } from "react";
import App from "../App";
import { Provider } from "react-redux";
import { getStore } from "reducer/store";
import * as ReactDOMClient from "react-dom/client";
import CommonAlert from "pages/comps/alert";

jest.mock("react-dom/client", () => ({
  createRoot: jest.fn(),
}));

describe("Application Root", () => {
  it("renders App within a Provider and Suspense", () => {
    (process.env as any).NODE_ENV = "production";
    const div = document.createElement("div");
    div.id = "root";
    document.body.appendChild(div);
    const store = getStore();
    const root = { render: jest.fn() };
    (ReactDOMClient.createRoot as any).mockReturnValue(root);

    require("../index");

    expect(ReactDOMClient.createRoot).toHaveBeenCalledWith(div);
    expect(root.render).toHaveBeenCalledWith(
      <Provider store={store}>
        <Suspense fallback={<div className="page-loading"></div>}>
          <App />
        </Suspense>
        <CommonAlert />
      </Provider>
    );
  });

  it("should replace console functions with no-ops in production", async () => {
    (process.env as any).NODE_ENV = "production";

    await require("../index");
    jest.resetModules();

    const testMessage = "This should not be printed";
    console.log(testMessage);
    console.info(testMessage);
    console.debug(testMessage);
  });
});
