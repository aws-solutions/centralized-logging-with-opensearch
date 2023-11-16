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
import SignedInApp from "./SignedInApp";

jest.mock("Router", () => {
  const MockRouter = () => <div>App Router</div>;
  return MockRouter;
});

jest.mock("components/layout/header", () => {
  const MockHeader = () => <header>Header Component</header>;
  return MockHeader;
});

jest.mock("components/layout/footer", () => {
  const MockFooter = () => <footer>Footer Component</footer>;
  return MockFooter;
});

describe("SignedInApp component", () => {
  let oidcSignOutMock: jest.Mock;

  beforeEach(() => {
    oidcSignOutMock = jest.fn();
  });

  it("renders without crashing", () => {
    render(<SignedInApp oidcSignOut={oidcSignOutMock} />);
    expect(screen.getByText("App Router")).toBeInTheDocument();
  });

  it("renders header and footer", () => {
    render(<SignedInApp oidcSignOut={oidcSignOutMock} />);
    expect(screen.getByText("Header Component")).toBeInTheDocument();
    expect(screen.getByText("Footer Component")).toBeInTheDocument();
  });

  it("passes oidcSignOut function to header", () => {
    const { container } = render(<SignedInApp oidcSignOut={oidcSignOutMock} />);
    const header = container.querySelector("header");
    expect(header).not.toBeNull();
  });
});
