// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { renderHook } from "@testing-library/react";
// import { useDispatch } from "react-redux";
import { useAutoValidation } from "../useAutoValidation";

// Mock Validator class
class MockValidator {
  validate = jest.fn();
}

describe("useAutoValidation", () => {
  let validator: any;

  beforeEach(() => {
    // Reset the mock and create a new instance before each test
    validator = new MockValidator();
    jest.clearAllMocks();
  });

  it("should not validate on initial render", () => {
    expect(validator.validate).not.toHaveBeenCalled();
  });

  it("should validate when dependencies change", () => {
    const { rerender } = renderHook(
      ({ dep }) => useAutoValidation(validator, dep),
      {
        initialProps: { dep: [1] },
      }
    );
    // Change dependencies
    rerender({ dep: [2] });
    expect(validator.validate).toHaveBeenCalledTimes(1);
  });

  it("should not validate when dependencies remain the same", () => {
    const { rerender } = renderHook(
      ({ dep }) => useAutoValidation(validator, dep),
      {
        initialProps: { dep: [1] },
      }
    );
    rerender({ dep: [1] });
    expect(validator.validate).not.toHaveBeenCalled();
  });
});
