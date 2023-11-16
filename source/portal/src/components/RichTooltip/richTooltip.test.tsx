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
import RichTooltip from "./richTooltip";

describe("RichTooltip", () => {
  test("renders without crashing", () => {
    const children = <button>Hover me</button>;
    const content = <div>Tooltip content</div>;
    render(
      <RichTooltip content={content} open={true}>
        {children}
      </RichTooltip>
    );
  });

  test("renders content when open is true", () => {
    const children = <button>Hover me</button>;
    const content = <div>Tooltip content</div>;
    render(
      <RichTooltip content={content} open={true}>
        {children}
      </RichTooltip>
    );
    expect(screen.getByText("Tooltip content")).toBeInTheDocument();
  });

  test("does not render content when open is false", () => {
    const children = <button>Hover me</button>;
    const content = <div>Tooltip content</div>;
    render(
      <RichTooltip content={content} open={true}>
        {children}
      </RichTooltip>
    );
    expect(screen.queryByText("Tooltip content")).toBeInTheDocument();
  });

  test("renders arrow when arrow is true", () => {
    const children = <button>Hover me</button>;
    const content = <div>Tooltip content</div>;
    const { getByTestId } = render(
      <RichTooltip content={content} open={true} arrow={true}>
        {children}
      </RichTooltip>
    );
    expect(getByTestId("arrow")).toBeInTheDocument();
  });

  test("does not render arrow when arrow is false", () => {
    const children = <button>Hover me</button>;
    const content = <div>Tooltip content</div>;
    const { container } = render(
      <RichTooltip content={content} open={true} arrow={false}>
        {children}
      </RichTooltip>
    );
    const arrow = container.querySelector(".arrow");
    expect(arrow).not.toBeInTheDocument();
  });
});
