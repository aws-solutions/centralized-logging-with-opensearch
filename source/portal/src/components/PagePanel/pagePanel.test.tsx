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
import PagePanel from "./pagePanel";

describe("PagePanel", () => {
  test("renders title correctly", () => {
    render(<PagePanel title="Test Title" />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  test("renders description correctly when provided", () => {
    render(<PagePanel title="Test Title" desc="Test Description" />);
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  test("does not render description when not provided", () => {
    render(<PagePanel title="Test Title" />);
    const description = screen.queryByText("Test Description");
    expect(description).not.toBeInTheDocument();
  });

  test("renders actions correctly when provided", () => {
    const actions = <button>Test Action</button>;
    render(<PagePanel title="Test Title" actions={actions} />);
    expect(screen.getByText("Test Action")).toBeInTheDocument();
  });

  test("renders children correctly", () => {
    const children = <div>Test Children</div>;
    render(<PagePanel title="Test Title">{children}</PagePanel>);
    expect(screen.getByText("Test Children")).toBeInTheDocument();
  });
});
