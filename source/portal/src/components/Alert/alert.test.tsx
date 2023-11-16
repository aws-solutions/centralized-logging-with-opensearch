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
import Alert from "./alert";

describe("<Alert />", () => {
  it("renders without crashing", () => {
    render(<Alert content="Test" />);
  });

  it("renders title if provided", () => {
    const { getByText } = render(
      <Alert title="Test Title" content="Test Content" />
    );
    expect(getByText("Test Title")).toBeInTheDocument();
  });

  it("renders actions if provided", () => {
    const actions = <button>Click me</button>;
    const { getByText } = render(<Alert content="Test" actions={actions} />);
    expect(getByText("Click me")).toBeInTheDocument();
  });

  it("renders confirm checkbox if hasConfirmCheck is true", () => {
    const { getByLabelText } = render(
      <Alert content="Test" hasConfirmCheck={true} confirmText="Confirm?" />
    );
    expect(getByLabelText("Confirm?")).toBeInTheDocument();
  });

  it("triggers changeConfirmed on checkbox change", () => {
    const mockChangeConfirmed = jest.fn();
    const { getByLabelText } = render(
      <Alert
        content="Test"
        hasConfirmCheck={true}
        confirmText="Confirm?"
        changeConfirmed={mockChangeConfirmed}
      />
    );

    fireEvent.click(getByLabelText("Confirm?"));
    expect(mockChangeConfirmed).toHaveBeenCalledWith(true);
  });
});
