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
import HeaderPanel from "./headerPanel";

describe("HeaderPanel", () => {
  it("renders the title provided in props", () => {
    render(<HeaderPanel title="Sample Title" />);
    expect(screen.getByText("Sample Title")).toBeInTheDocument();
  });

  it("renders the count when provided", () => {
    render(<HeaderPanel title="Sample Title" count={5} />);
    expect(screen.getByText("(5)")).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(<HeaderPanel title="Sample Title" desc="This is a description." />);
    expect(screen.getByText("This is a description.")).toBeInTheDocument();
  });

  it("renders the action element when provided", () => {
    render(
      <HeaderPanel title="Sample Title" action={<button>Click me</button>} />
    );
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("renders the children inside content", () => {
    render(
      <HeaderPanel title="Sample Title">
        <div>Child Element</div>
      </HeaderPanel>
    );
    expect(screen.getByText("Child Element")).toBeInTheDocument();
  });

  it("sets content class as no-padding when contentNoPadding prop is true", () => {
    render(
      <HeaderPanel title="Sample Title" contentNoPadding={true}>
        <div>Child Element</div>
      </HeaderPanel>
    );
    const content = screen.getByText("Child Element").parentElement;
    expect(content).toHaveClass("no-padding");
  });
});
