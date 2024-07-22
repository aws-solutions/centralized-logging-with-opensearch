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
import { render } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import AmplifyLoginPage from "../AmplifyLoginPage";

jest.mock("@aws-amplify/ui-react", () => ({
  Authenticator: ({ children }: any) => <div>{children}</div>,
}));

describe("AmplifyLoginPage component", () => {
  beforeEach(() => {
    i18n.init({
      lng: "en",
      fallbackLng: "en",
      resources: {
        en: {
          translation: {
            "signin.signInToSolution": "Centralized Logging with OpenSearch",
          },
        },
      },
    });
  });

  test("renders correctly with the custom header", () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <AmplifyLoginPage />
      </I18nextProvider>
    );
    const elementsWithTestClass = container.querySelectorAll(".clo-login");
    expect(elementsWithTestClass.length).toBeGreaterThan(0);
  });
});
