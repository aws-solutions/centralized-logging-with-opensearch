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
import Bottom from "./footer";
import { useSelector } from "react-redux";

jest.mock("react-redux", () => ({
  useSelector: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: any) => key,
    i18n: { changeLanguage: jest.fn(), language: "en" },
  }),
}));

describe("Footer", () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation(() => ({
      app: { amplifyConfig: { solution_version: "1.0.0" } },
    }));
  });

  it("should display the current language", () => {
    const { getByText } = render(<Bottom />);
    expect(getByText("English")).toBeInTheDocument();
  });

  it("should show language options when the language icon is clicked", () => {
    const { getByText, queryByText } = render(<Bottom />);
    fireEvent.click(getByText("English"));
    expect(queryByText("中文(简体)")).toBeInTheDocument();
  });

  it("should change language when a language option is clicked", () => {
    const { getByText } = render(<Bottom />);
    fireEvent.click(getByText("English"));
    fireEvent.click(getByText("中文(简体)"));
    expect(getByText("中文(简体)")).toBeInTheDocument();
  });

  it("should display the feedback link", () => {
    const { getByText } = render(<Bottom />);
    expect(getByText("bottom.feedback").closest("a")).toHaveAttribute("href");
  });
});
