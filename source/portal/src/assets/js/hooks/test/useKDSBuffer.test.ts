// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { renderHook } from "@testing-library/react";
import { useDispatch } from "react-redux";
import { useKDSBuffer } from "../useKDSBuffer";

// Mock useDispatch and useSelector
jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

describe("useKDSBuffer hook", () => {
  let mockDispatch = jest.fn();

  beforeEach(() => {
    mockDispatch = jest.fn();
    (useDispatch as any).mockReturnValue(mockDispatch);
  });

  it("should call initStatus action on unmount", () => {
    const { unmount } = renderHook(() => useKDSBuffer());

    unmount();

    expect(mockDispatch).toHaveBeenCalledWith({
      payload: undefined,
      type: "kdsBuffer/resetKDSBuffer",
    });
  });
});
