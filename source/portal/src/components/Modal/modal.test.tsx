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
import { render, fireEvent, screen } from "@testing-library/react";
import Modal from "./modal";

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("Modal", () => {
  const closeModalMock = jest.fn();
  it("should render modal with title, content, and actions", () => {
    render(
      <Modal
        title="Test Modal"
        isOpen={true}
        fullWidth={true}
        closeModal={closeModalMock}
        actions={<button>Test Action</button>}
      >
        <div>Test Content</div>
      </Modal>
    );

    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
    expect(screen.getByText("Test Action")).toBeInTheDocument();
  });

  it("should call closeModal when close button is clicked", () => {
    render(
      <Modal
        title="Test Modal"
        isOpen={true}
        fullWidth={true}
        closeModal={closeModalMock}
        actions={<button>Test Action</button>}
      >
        <div>Test Content</div>
      </Modal>
    );

    fireEvent.click(screen.getByLabelText("close"));
    expect(closeModalMock).toHaveBeenCalled();
  });

  it("should not call closeModal when reason is backdropClick", () => {
    render(
      <Modal
        title="Test Modal"
        isOpen={true}
        fullWidth={true}
        closeModal={closeModalMock}
        actions={<button>Test Action</button>}
      >
        <div>Test Content</div>
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(closeModalMock).not.toHaveBeenCalled();
  });
});
