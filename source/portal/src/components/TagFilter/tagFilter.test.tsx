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
import TagFilter from "./tagFilter";

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

describe("TagFilter", () => {
  const addTag = jest.fn();
  const removeTag = jest.fn();
  const tags = [{ Key: "tag:example", Values: ["value1", "value2"] }];

  test("Call addTag when having input and Add button is clicked", () => {
    const { getByPlaceholderText, getByText } = render(
      <TagFilter tags={[]} addTag={addTag} removeTag={removeTag} />
    );

    fireEvent.change(getByPlaceholderText("tag.enterKey"), {
      target: { value: "exampleKey" },
    });
    fireEvent.change(getByPlaceholderText("tag.enterValue"), {
      target: { value: "exampleValue" },
    });
    fireEvent.click(getByText("button.add"));
    expect(addTag).toHaveBeenCalledWith({
      Key: "tag:exampleKey",
      Values: ["exampleValue"],
    });
  });

  test("Call removeTag when tag clear button is clicked", () => {
    const { getAllByRole } = render(
      <TagFilter tags={tags} addTag={addTag} removeTag={removeTag} />
    );

    const removeButtons = getAllByRole("button");
    fireEvent.click(removeButtons[removeButtons.length - 1]);
    expect(removeTag).toHaveBeenCalledWith(0, 1);
  });
});
