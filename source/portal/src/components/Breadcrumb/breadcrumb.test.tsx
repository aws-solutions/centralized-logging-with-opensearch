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
import { BrowserRouter } from "react-router-dom";
import Breadcrumb from "./breadcrumb";

describe("<breadcrumb />", () => {
  it("renders without crashing", () => {
    render(<Breadcrumb list={[]} />, { wrapper: BrowserRouter });
  });

  it("displays breadcrumbs based on list prop", () => {
    const list = [{ name: "Home", link: "/" }, { name: "Page1" }];
    const { getByText } = render(<Breadcrumb list={list} />, {
      wrapper: BrowserRouter,
    });
    expect(getByText("Home")).toBeInTheDocument();
    expect(getByText("Page1")).toBeInTheDocument();
  });

  it("renders breadcrumb item as a link if it has a link", () => {
    const list = [{ name: "Home", link: "/" }];
    const { getByRole } = render(<Breadcrumb list={list} />, {
      wrapper: BrowserRouter,
    });
    const linkElement = getByRole("link");
    expect(linkElement.getAttribute("href")).toBe("/");
  });

  it("renders breadcrumb item as text if it does not have a link", () => {
    const list = [{ name: "Page1" }];
    const { getByText } = render(<Breadcrumb list={list} />, {
      wrapper: BrowserRouter,
    });
    const textElement = getByText("Page1");
    expect(textElement.tagName).toBe("P");
  });
});
