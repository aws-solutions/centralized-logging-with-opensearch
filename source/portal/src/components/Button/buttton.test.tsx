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
import Button from "./button";

describe("Button Component", () => {
  test("renders button with children", () => {
    render(<Button>Click Me</Button>);
    const buttonElement = screen.getByText(/click me/i);
    expect(buttonElement).toBeInTheDocument();
  });

  test("renders primary button", () => {
    render(<Button btnType="primary">Primary</Button>);
    const buttonElement = screen.getByText(/primary/i);
    expect(buttonElement).toHaveClass("btn-primary");
  });

  test("renders large button", () => {
    render(<Button size="lg">Large</Button>);
    const buttonElement = screen.getByText(/large/i);
    expect(buttonElement).toHaveClass("btn-lg");
  });

  test("renders button in loading state", () => {
    render(<Button loading={true}>Loading</Button>);
    const loadingElement = screen.getByText(/loading/i);
    expect(loadingElement).toBeInTheDocument();
  });

  test("renders disabled button", () => {
    render(<Button disabled={true}>Disabled</Button>);
    const buttonElement = screen.getByText(/disabled/i);
    expect(buttonElement).toBeDisabled();
  });

  test("renders link button with href", () => {
    render(
      <Button btnType="link" href="https://example.com">
        Link
      </Button>
    );
    const linkElement = screen.getByText(/link/i);
    expect(linkElement).toHaveAttribute("href", "https://example.com");
  });
});
