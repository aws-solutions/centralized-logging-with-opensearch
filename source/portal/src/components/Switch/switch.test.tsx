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
import { render, screen, fireEvent } from "@testing-library/react";
import Switch from "./switch";

describe("Switch Component", () => {
  test("renders correctly with given props", () => {
    render(
      <Switch
        label="Test Switch"
        desc="Switch description"
        isOn={true}
        handleToggle={() => {}}
      />
    );

    expect(screen.getByText("Test Switch")).toBeInTheDocument();
    expect(screen.getByText("Switch description")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  test("calls handleToggle function when clicked", () => {
    const handleToggle = jest.fn();
    render(
      <Switch label="Test Switch" isOn={false} handleToggle={handleToggle} />
    );

    fireEvent.click(screen.getByRole("checkbox"));
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  test("renders correctly when reversed", () => {
    render(
      <Switch
        label="Test Switch"
        isOn={false}
        reverse={true}
        handleToggle={() => {}}
      />
    );
  });

  test("renders correctly when disabled", () => {
    render(
      <Switch
        label="Test Switch"
        isOn={false}
        disabled={true}
        handleToggle={() => {}}
      />
    );

    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});
