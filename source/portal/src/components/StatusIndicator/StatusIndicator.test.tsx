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
import StatusIndicator from "./StatusIndicator";

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

describe("StatusIndicator", () => {
  test("renders the correct icon and text for success type", () => {
    render(<StatusIndicator type="success">Success</StatusIndicator>);
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByTestId("success-icon")).toBeInTheDocument();
  });

  test("renders the correct icon and text for error type", () => {
    render(<StatusIndicator type="error">Error</StatusIndicator>);
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByTestId("error-icon")).toBeInTheDocument();
  });

  test("renders loading text when type is loading", () => {
    render(<StatusIndicator type="loading">Loading</StatusIndicator>);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test("renders the correct icon and text for normal type", () => {
    render(<StatusIndicator type="normal">Normal</StatusIndicator>);
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByTestId("normal-icon")).toBeInTheDocument();
  });

  test("renders the correct icon and text for pending type", () => {
    render(<StatusIndicator type="pending">Pending</StatusIndicator>);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByTestId("pending-icon")).toBeInTheDocument();
  });
});
