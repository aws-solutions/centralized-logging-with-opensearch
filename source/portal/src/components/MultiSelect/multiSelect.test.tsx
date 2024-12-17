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
import MultiSelect from "./multiSelect";

describe("MultiSelect", () => {
  const optionList = [{ value: "option1", name: "Option 1" }];

  it("renders without errors", () => {
    render(
      <MultiSelect optionList={optionList} value={[]} onChange={() => {}} />
    );
    // Add assertions here to check if the component renders correctly
  });

  it("displays the placeholder when no value is selected", () => {
    const { getByText } = render(
      <MultiSelect
        optionList={optionList}
        value={[]}
        onChange={() => {}}
        placeholder="Select an option"
      />
    );
    expect(getByText("Select an option")).toBeInTheDocument();
  });

  it("displays the placeholder when default value selected", () => {
    const { getByText } = render(
      <MultiSelect
        defaultSelectItems={["option1"]}
        optionList={optionList}
        value={[]}
        onChange={() => {}}
        placeholder="Select an option"
      />
    );
    expect(getByText("Select an option")).toBeInTheDocument();
  });

  it("displays the placeholder when default value selected has refresh", () => {
    const { getByTestId } = render(
      <MultiSelect
        defaultSelectItems={["option1"]}
        optionList={optionList}
        value={[]}
        onChange={() => {}}
        placeholder="Select an option"
        hasRefresh
      />
    );
    expect(getByTestId("refresh-icon")).toBeInTheDocument();
    fireEvent.click(getByTestId("refresh-icon"));
  });

  it("displays the placeholder when default value selected remove", () => {
    render(
      <MultiSelect
        optionList={optionList}
        value={[]}
        onChange={() => {}}
        placeholder="Select an option"
        hasRefresh
        loading
      />
    );
  });
});
