// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { CreateSubAccountLinkMutationVariables } from "API";
import { bucketNameIsValid } from "assets/js/utils";
export type MemberAccountState = {
  data: CreateSubAccountLinkMutationVariables;
  nameError: string;
  idError: string;
  roleArnError: string;
  installDocError: string;
  configDocError: string;
  installDocWindowsError: string;
  configDocWindowsError: string;
  statusCheckDocError: string;
  s3BucketError: string;
  stackIdError: string;
  kmsArnError: string;
  instanceProfileError: string;
};

export const INIT_MEMBER_ACCOUNT_DATA: MemberAccountState = {
  data: {
    subAccountId: "",
    subAccountName: "",
    subAccountRoleArn: "",
    agentInstallDoc: "",
    agentConfDoc: "",
    windowsAgentInstallDoc: "",
    windowsAgentConfDoc: "",
    agentStatusCheckDoc: "",
    subAccountBucketName: "",
    subAccountStackId: "",
    subAccountKMSKeyArn: "",
    region: "",
    subAccountIamInstanceProfileArn: "",
    tags: [],
  },
  nameError: "",
  idError: "",
  roleArnError: "",
  installDocError: "",
  configDocError: "",
  installDocWindowsError: "",
  configDocWindowsError: "",
  statusCheckDocError: "",
  s3BucketError: "",
  stackIdError: "",
  kmsArnError: "",
  instanceProfileError: "",
};

export const validateAccountName = (state: MemberAccountState) => {
  return !state.data.subAccountName?.trim()
    ? "resource:crossAccount.link.inputAccountName"
    : "";
};

export const validateAccountId = (state: MemberAccountState) => {
  if (!state.data.subAccountId?.trim()) {
    return "resource:crossAccount.link.inputAccountId";
  }
  if (!/^\d{12}$/.test(state.data.subAccountId.trim())) {
    return "resource:crossAccount.link.accountIdFormatError";
  }
  return "";
};

export const validateRoleArn = (state: MemberAccountState) => {
  if (!state.data.subAccountRoleArn?.trim()) {
    return "resource:crossAccount.link.inputAccountRoles";
  }
  if (
    !new RegExp(
      `^arn:(aws-cn|aws):iam::${state.data.subAccountId || "\\d{12}"}:role\\/.+`
    ).test(state.data.subAccountRoleArn.trim())
  ) {
    return "resource:crossAccount.link.accountRolesFormatError";
  }
  return "";
};

export const validateInstallDoc = (state: MemberAccountState) => {
  if (!state.data.agentInstallDoc?.trim()) {
    return "resource:crossAccount.link.inputInstallDocs";
  }
  if (
    !new RegExp(`${".*FluentBitDocumentInstallationForLinux-\\w+"}`).test(
      state.data.agentInstallDoc.trim()
    )
  ) {
    return "resource:crossAccount.link.installDocsFormatError";
  }
  return "";
};

export const validateConfigDoc = (state: MemberAccountState) => {
  if (!state.data.agentConfDoc?.trim()) {
    return "resource:crossAccount.link.inputConfigDocs";
  }
  if (
    !new RegExp(`${".*FluentBitConfigDownloading-\\w+"}`).test(
      state.data.agentConfDoc.trim()
    )
  ) {
    return "resource:crossAccount.link.configDocsFormatError";
  }
  return "";
};

export const validateInstallDocWindows = (state: MemberAccountState) => {
  if (!state.data.windowsAgentInstallDoc?.trim()) {
    return "resource:crossAccount.link.inputInstallDocsWindows";
  }
  if (
    !new RegExp(`${".*FluentBitDocumentInstallationForWindows-\\w+"}`).test(
      state.data.windowsAgentInstallDoc.trim()
    )
  ) {
    return "resource:crossAccount.link.installDocsFormatErrorWindows";
  }
  return "";
};

export const validateConfigDocWindows = (state: MemberAccountState) => {
  if (!state.data.windowsAgentConfDoc?.trim()) {
    return "resource:crossAccount.link.inputConfigDocsWindows";
  }
  if (
    !new RegExp(`${".*FluentBitConfigDownloadingForWindows-\\w+"}`).test(
      state.data.windowsAgentConfDoc.trim()
    )
  ) {
    return "resource:crossAccount.link.configDocsFormatErrorWindows";
  }
  return "";
};

export const validateAgentStatusCheckDoc = (state: MemberAccountState) => {
  if (!state.data.agentStatusCheckDoc?.trim()) {
    return "resource:crossAccount.link.inputStatusCheckDoc";
  }
  if (
    !new RegExp(`${".*FluentBitStatusCheckDocument-\\w+"}`).test(
      state.data.agentStatusCheckDoc.trim()
    )
  ) {
    return "resource:crossAccount.link.statusCheckDocFormatError";
  }
  return "";
};

export const validateS3Bucket = (state: MemberAccountState) => {
  if (!state.data.subAccountBucketName?.trim()) {
    return "resource:crossAccount.link.inputS3Bucket";
  }
  if (!bucketNameIsValid(state.data.subAccountBucketName)) {
    return "resource:crossAccount.link.s3BucketFormatError";
  }
  return "";
};

export const validateStackId = (state: MemberAccountState) => {
  if (!state.data.subAccountStackId?.trim()) {
    return "resource:crossAccount.link.inputStackId";
  }
  if (
    !new RegExp(
      `^arn:(aws-cn|aws):cloudformation:\\w+-\\w+-\\d+:${
        state.data.subAccountId || "\\d{12}"
      }:stack\\/\\S+`
    ).test(state.data.subAccountStackId.trim())
  ) {
    return "resource:crossAccount.link.stackIdFormatError";
  }
  const stackPartArr = state.data.subAccountStackId.split(":");
  if (stackPartArr.length > 4 && stackPartArr[3] !== state.data.region) {
    return "resource:crossAccount.link.stackIdSameRegion";
  }
  return "";
};

export const validateKMSArn = (state: MemberAccountState) => {
  if (!state.data.subAccountKMSKeyArn?.trim()) {
    return "resource:crossAccount.link.inputKmsKey";
  }
  if (
    !new RegExp(
      `^arn:(aws-cn|aws):kms:\\w+-\\w+-\\d:${
        state.data.subAccountId || "\\d{12}"
      }:key\\/\\S+`
    ).test(state.data.subAccountKMSKeyArn.trim())
  ) {
    return "resource:crossAccount.link.kmsKeyFormatError";
  }
  return "";
};

export const validateInstanceProfile = (state: MemberAccountState) => {
  if (!state.data.subAccountIamInstanceProfileArn?.trim()) {
    return "resource:crossAccount.link.inputIamInstanceProfileArn";
  }
  if (
    !new RegExp(
      `^arn:(aws-cn|aws):iam::${
        state.data.subAccountId || "\\d{12}"
      }:instance-profile\\/.+`
    ).test(state.data.subAccountIamInstanceProfileArn.trim())
  ) {
    return "resource:crossAccount.link.iamInstanceProfileArnFormatError";
  }
  return "";
};

export const validateMemberAccountInput = (accountInfo: MemberAccountState) => {
  return !(
    validateAccountName(accountInfo) ||
    validateAccountId(accountInfo) ||
    validateConfigDoc(accountInfo) ||
    validateInstallDoc(accountInfo) ||
    validateConfigDocWindows(accountInfo) ||
    validateInstallDocWindows(accountInfo) ||
    validateAgentStatusCheckDoc(accountInfo) ||
    validateRoleArn(accountInfo) ||
    validateS3Bucket(accountInfo) ||
    validateStackId(accountInfo) ||
    validateKMSArn(accountInfo) ||
    validateInstanceProfile(accountInfo)
  );
};

export const memberAccountSlice = createSlice({
  name: "memberAccount",
  initialState: INIT_MEMBER_ACCOUNT_DATA,
  reducers: {
    resetMemberAccount: (state) => {
      Object.assign(state, { ...INIT_MEMBER_ACCOUNT_DATA });
    },
    setAccountData: (state, { payload }: PayloadAction<any>) => {
      state.data = payload;
    },
    setAccountRegion: (state, { payload }: PayloadAction<string>) => {
      state.data.region = payload;
    },
    accountNameChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.subAccountName = payload;
      state.nameError = "";
    },
    accountIdChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.subAccountId = payload;
      state.idError = "";
    },
    roleArnChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.subAccountRoleArn = payload;
      state.roleArnError = "";
    },
    installDocChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.agentInstallDoc = payload;
      state.installDocError = "";
    },
    configDocChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.agentConfDoc = payload;
      state.configDocError = "";
    },
    installDocWindowsChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.windowsAgentInstallDoc = payload;
      state.installDocWindowsError = "";
    },
    configDocWindowsChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.windowsAgentConfDoc = payload;
      state.configDocWindowsError = "";
    },
    statusCheckDocChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.agentStatusCheckDoc = payload;
      state.statusCheckDocError = "";
    },
    s3BucketChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.subAccountBucketName = payload;
      state.s3BucketError = "";
    },
    stackIdChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.subAccountStackId = payload;
      state.stackIdError = "";
    },
    kmsArnChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.subAccountKMSKeyArn = payload;
      state.kmsArnError = "";
    },
    instanceProfileChanged: (state, { payload }: PayloadAction<string>) => {
      state.data.subAccountIamInstanceProfileArn = payload;
      state.instanceProfileError = "";
    },
    validateMemberAccount: (state) => {
      state.nameError = validateAccountName(state);
      state.idError = validateAccountId(state);
      state.roleArnError = validateRoleArn(state);
      state.installDocError = validateInstallDoc(state);
      state.configDocError = validateConfigDoc(state);
      state.installDocWindowsError = validateInstallDocWindows(state);
      state.configDocWindowsError = validateConfigDocWindows(state);
      state.statusCheckDocError = validateAgentStatusCheckDoc(state);
      state.s3BucketError = validateS3Bucket(state);
      state.stackIdError = validateStackId(state);
      state.kmsArnError = validateKMSArn(state);
      state.instanceProfileError = validateInstanceProfile(state);
    },
  },
});

export const {
  resetMemberAccount,
  setAccountRegion,
  setAccountData,
  accountNameChanged,
  accountIdChanged,
  roleArnChanged,
  installDocChanged,
  configDocChanged,
  installDocWindowsChanged,
  configDocWindowsChanged,
  statusCheckDocChanged,
  s3BucketChanged,
  stackIdChanged,
  kmsArnChanged,
  instanceProfileChanged,
  validateMemberAccount,
} = memberAccountSlice.actions;
