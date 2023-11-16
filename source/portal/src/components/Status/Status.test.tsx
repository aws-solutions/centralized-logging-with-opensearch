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
import Status, { StatusType } from "./Status";

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

describe("Status", () => {
  test("renders the correct icon and text for Active status", () => {
    render(<Status status={StatusType.Active} />);
    const statusElement = screen.getByText(new RegExp(StatusType.Active, "i"));
    expect(statusElement).toBeInTheDocument();
  });

  test("renders the correct icon and text for Error status", () => {
    render(<Status status={StatusType.Error} />);
    const statusElement = screen.getByText(new RegExp(StatusType.Error, "i"));
    expect(statusElement).toBeInTheDocument();
  });
});
