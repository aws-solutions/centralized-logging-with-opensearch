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
import ExtLink from "./extLink";

describe("ExtLink", () => {
  it("renders an external link correctly with http", () => {
    render(<ExtLink to="http://example.com">Link Text</ExtLink>);
    const linkElement = screen.getByText("Link Text").closest("a");
    expect(linkElement).toHaveAttribute("href", "http://example.com");
  });

  it("renders an internal link from the list correctly", () => {
    render(
      <ExtLink to="/clusters/import-opensearch-cluster">Link Text</ExtLink>
    );
    const linkElement = screen.getByText("Link Text").closest("a");
    expect(linkElement).toHaveAttribute(
      "href",
      "/clusters/import-opensearch-cluster"
    );
  });

  it("renders an external link correctly without http", () => {
    render(<ExtLink to="example.com">Link Text</ExtLink>);
    const linkElement = screen.getByText("Link Text").closest("a");
    expect(linkElement).toHaveAttribute("href", "//example.com");
  });
});
