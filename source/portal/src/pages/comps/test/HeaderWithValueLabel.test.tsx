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
import { render } from "@testing-library/react";
import HeaderWithValueLabel, {
  LabelValueDataItem,
} from "../HeaderWithValueLabel";

describe("HeaderWithValueLabel", () => {
  const dataList: (LabelValueDataItem | null)[] = [
    { label: "Label 1", data: "Data 1" },
    { label: "Label 2", data: "Data 2" },
    { label: "Label 3", data: "Data 3" },
  ];

  it("renders the header title correctly", () => {
    const headerTitle = "Test Header";
    const { getByText } = render(
      <HeaderWithValueLabel
        headerTitle={headerTitle}
        dataList={dataList}
        additionalData={{ label: "a", data: "b" }}
      />
    );
    expect(getByText(headerTitle)).toBeInTheDocument();
  });

  it("renders the label and data correctly", () => {
    const { getByText } = render(<HeaderWithValueLabel dataList={dataList} />);
    dataList.forEach((item) => {
      if (item) {
        expect(getByText(item.label!)).toBeInTheDocument();
      }
    });
  });

  it("renders the data fixed data list", () => {
    const fixedDataList: LabelValueDataItem[][] = [
      [
        { label: "Label 1", data: "Data 1" },
        { label: "Label 2", data: "Data 2" },
      ],
      [
        { label: "Label 3", data: "Data 3" },
        { label: "Label 4", data: "Data 4" },
      ],
    ];
    const { getByText } = render(
      <HeaderWithValueLabel fixedDataList={fixedDataList} />
    );
    fixedDataList.forEach((data) => {
      data.forEach((item) => {
        expect(getByText(item.label!)).toBeInTheDocument();
      });
    });
  });
});
