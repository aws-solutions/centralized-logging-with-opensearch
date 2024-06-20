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
