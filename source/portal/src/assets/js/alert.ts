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
import Swal, { SweetAlertIcon } from "sweetalert2";
import { refineErrorMessage } from "./request";
import { ErrorCode } from "API";
import { t } from "i18next";

export const Alert = (
  message: string | null,
  title?: string | null,
  type?: SweetAlertIcon
): any => {
  Swal.fire(title || "Oops...", message || "", type || "warning");
};

export const handleErrorMessage = (errorMessage: string) => {
  const { errorCode, message } = refineErrorMessage(errorMessage);

  if (
    errorCode === ErrorCode.SVC_PIPELINE_NOT_CLEANED ||
    errorCode === ErrorCode.APP_PIPELINE_NOT_CLEANED
  ) {
    Alert(
      t("cluster:domain.removeErrorIngestionExists"),
      "Ingestion pipeline exists…",
      "error"
    );
    return false;
  }

  switch (errorCode) {
    case ErrorCode.UNSUPPORTED_ACTION_HAS_INGESTION:
      Alert(t("applog:deletePipeline.alarm"), null, "error");
      break;

    case ErrorCode.UNSUPPORTED_ACTION_SOURCE_HAS_INGESTION:
      Alert(t("applog:logSourceDesc.eks.deleteAlarm1"), null, "error");
      break;

    case ErrorCode.ASSOCIATED_STACK_UNDER_PROCESSING:
      Alert(
        t("cluster:domain.removeErrorSubstackUnderProcessing"),
        null,
        "error"
      );
      break;

    case ErrorCode.UPDATE_CWL_ROLE_FAILED:
      Alert(t("resource:crossAccount.link.updateCwlRoleFailed"), null, "error");
      break;

    case ErrorCode.ASSUME_ROLE_CHECK_FAILED:
      Alert(t("applog:logSourceDesc.eks.roleCheckFailed"), null, "error");
      break;

    case ErrorCode.ACCOUNT_NOT_FOUND:
      Alert(t("resource:crossAccount.link.accountNotFound"), null, "error");
      break;

    case ErrorCode.ACCOUNT_ALREADY_EXISTS:
      Alert(
        t("resource:crossAccount.link.accountAlreadyExists"),
        null,
        "error"
      );
      break;

    case ErrorCode.ITEM_NOT_FOUND:
      Alert(`${t("common:error.notFound")}${message}`, null, "error");
      break;

    case ErrorCode.UNKNOWN_ERROR:
      Alert(`${t("common:error.unknownError")}${message}`, null, "error");
      break;

    default:
      break;
  }
};
