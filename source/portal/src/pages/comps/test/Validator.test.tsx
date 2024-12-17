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

import { Validator } from "../Validator";
import * as React from "react";

jest.mock("react", () => ({
  useState: jest.fn(),
}));

describe("Validator", () => {
  let setErrorMock: any;
  let useStateMock;
  let onValidateMock;

  beforeEach(() => {
    setErrorMock = jest.fn();
    useStateMock = (initialState: any) => [initialState, setErrorMock];
    (React.useState as any).mockImplementation(useStateMock);
  });

  it("should validate without errors", () => {
    onValidateMock = jest.fn();

    const validator = new Validator(onValidateMock);
    const result = validator.validate();

    expect(result).toBe(true);
    expect(setErrorMock).toHaveBeenCalledWith("");
    expect(onValidateMock).toHaveBeenCalled();
  });

  it("should handle validation error by setting error message", () => {
    const error = new Error("Validation failed");
    onValidateMock = jest.fn(() => {
      throw error;
    });

    const validator = new Validator(onValidateMock);
    const result = validator.validate();

    expect(result).toBe(false);
    expect(setErrorMock).toHaveBeenCalledWith(error.message);
    expect(onValidateMock).toHaveBeenCalled();
  });
});
