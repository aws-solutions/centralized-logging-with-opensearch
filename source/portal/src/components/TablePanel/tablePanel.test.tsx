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
import { act, fireEvent, render, screen } from "@testing-library/react";
import { TablePanel, SelectType } from "./tablePanel";

describe("TablePanel", () => {
  const mockItems = [
    { id: "1", name: "Item 1" },
    { id: "2", name: "Item 2" },
    { id: "3", name: "Item 3" },
  ];

  const mockColumnDefinitions = [
    { id: "id", header: "ID", cell: (item: any) => item.id },
    { id: "name", header: "Name", cell: (item: any) => item.name },
  ];

  const mockChangeSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders table with items", async () => {
    render(
      <TablePanel
        trackId="trackId"
        actions={<div>Actions</div>}
        selectType={SelectType.RADIO}
        columnDefinitions={mockColumnDefinitions}
        items={mockItems}
        pagination={<div>Pagination</div>}
        changeSelected={mockChangeSelected}
        errorText="Error message"
      />
    );

    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("table-item-1"));
    });
  });

  it("renders table with no items", () => {
    render(
      <TablePanel
        trackId="trackId"
        actions={<div>Actions</div>}
        selectType={SelectType.RADIO}
        columnDefinitions={mockColumnDefinitions}
        items={[]}
        pagination={<div>Pagination</div>}
        changeSelected={mockChangeSelected}
        errorText="Error message"
      />
    );
  });

  it("renders table with select none", () => {
    render(
      <TablePanel
        defaultSelectItem={["1"]}
        trackId="trackId"
        actions={<div>Actions</div>}
        selectType={SelectType.NONE}
        columnDefinitions={mockColumnDefinitions}
        items={mockItems}
        pagination={<div>Pagination</div>}
        changeSelected={mockChangeSelected}
        errorText="Error message"
      />
    );
  });

  it("calls changeSelected when items are selected", () => {
    const { getByTestId } = render(
      <TablePanel
        noPadding
        trackId="trackId"
        actions={<div>Actions</div>}
        selectType={SelectType.CHECKBOX}
        columnDefinitions={mockColumnDefinitions}
        items={mockItems}
        pagination={<div>Pagination</div>}
        changeSelected={mockChangeSelected}
      />
    );
    expect(getByTestId("table-select-all")).toBeInTheDocument();
    fireEvent.click(getByTestId("table-select-all"));
  });
});
