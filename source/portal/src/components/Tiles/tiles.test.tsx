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
import Tiles from "./tiles";

afterEach(cleanup);

describe("Tiles Component", () => {
  const items = [
    { label: "Tile1", description: "Description1", value: "1" },
    { label: "Tile2", description: "Description2", value: "2" },
  ];

  it("should render without crashing", () => {
    const mockFn = jest.fn();
    const { getByText } = render(
      <Tiles items={items} value="" onChange={mockFn} />
    );
    expect(getByText("Tile1")).toBeTruthy();
    expect(getByText("Tile2")).toBeTruthy();
  });

  it("should call onChange prop when a tile is selected", () => {
    const mockFn = jest.fn();
    const { getByText } = render(
      <Tiles items={items} value="" onChange={mockFn} />
    );
    const tile1 = getByText("Tile1").closest("label");
    fireEvent.click(tile1 as Element);
    expect(mockFn).toHaveBeenCalled();
  });

  it("should be disabled when disabled prop is true", () => {
    const mockFn = jest.fn();
    (items[0] as any).disabled = true;
    const { getByText } = render(
      <Tiles items={items} value="" onChange={mockFn} />
    );
    const tile1 = getByText("Tile1").closest("label");
    expect(tile1).toHaveClass("disabled");
  });
});
