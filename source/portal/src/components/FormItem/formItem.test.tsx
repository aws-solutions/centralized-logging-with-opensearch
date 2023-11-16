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
import { render, screen } from "@testing-library/react";
import FormItem from "./formItem";

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

describe("FormItem", () => {
  it("renders error message and icon when errorText prop is provided", () => {
    render(
      <FormItem errorText="This is an error.">
        <input type="text" />
      </FormItem>
    );

    const errorElement = screen.getByText("This is an error.");
    expect(errorElement).toBeInTheDocument();

    const errorIcon = screen.getByTestId("error-icon");
    expect(errorIcon).toBeInTheDocument();
  });

  it("renders warning message and icon when warningText prop is provided", () => {
    render(
      <FormItem warningText="This is a warning.">
        <input type="text" />
      </FormItem>
    );

    const warningElement = screen.getByText("This is a warning.");
    expect(warningElement).toBeInTheDocument();

    const warningIcon = screen.getByTestId("warning-icon");
    expect(warningIcon).toBeInTheDocument();
  });

  it("renders info message and icon when infoText prop is provided", () => {
    render(
      <FormItem infoText="This is an info.">
        <input type="text" />
      </FormItem>
    );

    const infoElement = screen.getByText("This is an info.");
    expect(infoElement).toBeInTheDocument();

    const infoIcon = screen.getByTestId("info-icon");
    expect(infoIcon).toBeInTheDocument();
  });

  it("renders success message and icon when successText prop is provided", () => {
    render(
      <FormItem successText="This is a success.">
        <input type="text" />
      </FormItem>
    );

    const successElement = screen.getByText("This is a success.");
    expect(successElement).toBeInTheDocument();

    const successIcon = screen.getByTestId("success-icon");
    expect(successIcon).toBeInTheDocument();
  });
});
