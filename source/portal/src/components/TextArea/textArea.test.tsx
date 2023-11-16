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
import { cleanup, fireEvent, render } from "@testing-library/react";
import TextArea from "./textArea";

afterEach(cleanup);

describe("TextArea", () => {
  it("should render without crashing", () => {
    const mockFn = jest.fn();
    const { getByPlaceholderText } = render(
      <TextArea
        rows={3}
        value=""
        onChange={mockFn}
        placeholder="Test placeholder"
      />
    );
    expect(getByPlaceholderText("Test placeholder")).toBeTruthy();
  });

  it("should call onChange prop on user input", () => {
    const mockFn = jest.fn();
    const { getByPlaceholderText } = render(
      <TextArea
        rows={3}
        value=""
        onChange={mockFn}
        placeholder="Test placeholder"
      />
    );
    const textarea = getByPlaceholderText("Test placeholder");
    fireEvent.change(textarea, { target: { value: "Testing" } });
    expect(mockFn).toHaveBeenCalled();
  });

  it("should be disabled when disabled prop is true", () => {
    const mockFn = jest.fn();
    const { getByPlaceholderText } = render(
      <TextArea
        rows={3}
        value=""
        onChange={mockFn}
        placeholder="Test placeholder"
        disabled={true}
      />
    );
    expect(getByPlaceholderText("Test placeholder")).toBeDisabled();
  });
});
