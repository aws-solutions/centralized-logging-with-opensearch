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
import Radio from "./index";

describe("Radio Component", () => {
  test("renders without crashing", () => {
    render(<Radio />);
  });

  test("can be checked", () => {
    const { getByRole } = render(<Radio />);
    const radio = getByRole("radio");
    fireEvent.click(radio);
    expect(radio).toBeChecked();
  });

  test("respects initial checked state", () => {
    const { getByRole } = render(<Radio checked />);
    const radio = getByRole("radio");
    expect(radio).toBeChecked();
  });

  test("respects disabled state", () => {
    const { getByRole } = render(<Radio disabled />);
    const radio = getByRole("radio");
    expect(radio).not.toBeChecked();
  });

  test("forwards other props", () => {
    const { getByRole } = render(<Radio name="test-radio" />);
    const radio = getByRole("radio");
    expect(radio).toHaveAttribute("name", "test-radio");
  });
});
