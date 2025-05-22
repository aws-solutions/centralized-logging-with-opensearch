// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { refineErrorMessage } from "../request";
import { ErrorCode } from "API";
import { handleErrorMessage } from "../alert";

jest.mock("../request", () => ({
  refineErrorMessage: jest.fn(),
}));
jest.mock("i18next", () => ({
  t: jest.fn((key) => key),
}));

describe("handleErrorMessage", () => {
  // Test for a specific error code
  it("should handle SVC_PIPELINE_NOT_CLEANED error", () => {
    // Set up the mock implementation for refineErrorMessage
    (refineErrorMessage as any).mockReturnValue({
      errorCode: ErrorCode.SVC_PIPELINE_NOT_CLEANED,
      message: "Some error message",
    });
    // Call your function
    handleErrorMessage("Some error message");
  });

  it("should handle UNSUPPORTED_ACTION_HAS_INGESTION error", () => {
    (refineErrorMessage as any).mockReturnValue({
      errorCode: ErrorCode.UNSUPPORTED_ACTION_HAS_INGESTION,
      message: "",
    });
    // Call your function
    handleErrorMessage("applog:deletePipeline.alarm");
  });

  it("should handle UNSUPPORTED_ACTION_SOURCE_HAS_INGESTION error", () => {
    (refineErrorMessage as any).mockReturnValue({
      errorCode: ErrorCode.UNSUPPORTED_ACTION_SOURCE_HAS_INGESTION,
      message: "",
    });
    // Call your function
    handleErrorMessage("applog:logSourceDesc.eks.deleteAlarm1");
  });

  it("should handle ASSOCIATED_STACK_UNDER_PROCESSING error", () => {
    (refineErrorMessage as any).mockReturnValue({
      errorCode: ErrorCode.ASSOCIATED_STACK_UNDER_PROCESSING,
      message: "",
    });
    // Call your function
    handleErrorMessage("cluster:domain.removeErrorSubstackUnderProcessing");
  });

  it("should handle UPDATE_CWL_ROLE_FAILED error", () => {
    (refineErrorMessage as any).mockReturnValue({
      errorCode: ErrorCode.UPDATE_CWL_ROLE_FAILED,
      message: "",
    });
    // Call your function
    handleErrorMessage("resource:crossAccount.link.updateCwlRoleFailed");
  });

  it("should handle ASSUME_ROLE_CHECK_FAILED error", () => {
    (refineErrorMessage as any).mockReturnValue({
      errorCode: ErrorCode.ASSUME_ROLE_CHECK_FAILED,
      message: "",
    });
    // Call your function
    handleErrorMessage("applog:logSourceDesc.eks.roleCheckFailed");
  });

  it("should handle ACCOUNT_NOT_FOUND error", () => {
    (refineErrorMessage as any).mockReturnValue({
      errorCode: ErrorCode.ACCOUNT_NOT_FOUND,
      message: "",
    });
    // Call your function
    handleErrorMessage("resource:crossAccount.link.accountNotFound");
  });

  it("should handle ACCOUNT_ALREADY_EXISTS error", () => {
    (refineErrorMessage as any).mockReturnValue({
      errorCode: ErrorCode.ACCOUNT_ALREADY_EXISTS,
      message: "",
    });
    // Call your function
    handleErrorMessage("resource:crossAccount.link.accountAlreadyExists");
  });

  it("should handle ITEM_NOT_FOUND error", () => {
    (refineErrorMessage as any).mockReturnValue({
      errorCode: ErrorCode.ITEM_NOT_FOUND,
      message: "",
    });
    // Call your function
    handleErrorMessage("common:error.notFound");
  });

  it("should handle UNKNOWN_ERROR error", () => {
    (refineErrorMessage as any).mockReturnValue({
      errorCode: ErrorCode.UNKNOWN_ERROR,
      message: "",
    });
    // Call your function
    handleErrorMessage("common:error.unknownError");
  });

  // Test the default case
  it("should handle an unknown error", () => {
    (refineErrorMessage as any).mockReturnValue({
      errorCode: "UNKNOWN_CODE",
      message: "",
    });
    handleErrorMessage("");
  });
});
