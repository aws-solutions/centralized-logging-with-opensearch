// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  INIT_MEMBER_ACCOUNT_DATA,
  MemberAccountState,
  memberAccountSlice,
  resetMemberAccount,
  validateAccountId,
  validateAccountName,
  validateMemberAccountInput,
} from "reducer/linkMemberAccount";

jest.mock("i18n", () => ({
  t: (key: string) => key,
}));

describe("linkMemberAccount Reducer", () => {
  let initialState: MemberAccountState;

  beforeEach(() => {
    initialState = INIT_MEMBER_ACCOUNT_DATA;
  });

  it("should reset member account data", () => {
    const action = resetMemberAccount();
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState).toEqual(INIT_MEMBER_ACCOUNT_DATA);
  });

  it("should set account data", () => {
    const action = memberAccountSlice.actions.setAccountData({
      accountId: "123456789012",
      region: "us-east-1",
    });
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data).toEqual({
      accountId: "123456789012",
      region: "us-east-1",
    });
  });

  it("should change account region", () => {
    const action = memberAccountSlice.actions.setAccountRegion("us-east-1");
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data.region).toEqual("us-east-1");
  });

  it("should change account name", () => {
    const action = memberAccountSlice.actions.accountNameChanged("test");
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data.subAccountName).toEqual("test");
  });

  it("should change account id", () => {
    const action = memberAccountSlice.actions.accountIdChanged("123456789012");
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data.subAccountId).toEqual("123456789012");
  });

  it("should change role arn", () => {
    const action = memberAccountSlice.actions.roleArnChanged(
      "arn:aws:iam::123456789012:role/test"
    );
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data.subAccountRoleArn).toEqual(
      "arn:aws:iam::123456789012:role/test"
    );
  });

  it("should change install document", () => {
    const action = memberAccountSlice.actions.installDocChanged("test");
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data.agentInstallDoc).toEqual("test");
  });

  it("should change config document", () => {
    const action = memberAccountSlice.actions.configDocChanged("test");
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data.agentConfDoc).toEqual("test");
  });

  it("should change install document for windows", () => {
    const action = memberAccountSlice.actions.installDocWindowsChanged("test");
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data.windowsAgentInstallDoc).toEqual("test");
  });

  it("should change config document for windows", () => {
    const action = memberAccountSlice.actions.configDocWindowsChanged("test");
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data.windowsAgentConfDoc).toEqual("test");
  });

  it("should change check status document", () => {
    const action = memberAccountSlice.actions.statusCheckDocChanged("test");
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data.agentStatusCheckDoc).toEqual("test");
  });

  it("should s3 bucket changed", () => {
    const action = memberAccountSlice.actions.s3BucketChanged("test");
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data.subAccountBucketName).toEqual("test");
  });

  it("should stackId changed", () => {
    const action = memberAccountSlice.actions.stackIdChanged("test");
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data.subAccountStackId).toEqual("test");
  });

  it("should kms arn changed", () => {
    const action = memberAccountSlice.actions.kmsArnChanged("test");
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data.subAccountKMSKeyArn).toEqual("test");
  });

  it("should instance profile changed", () => {
    const action = memberAccountSlice.actions.instanceProfileChanged("test");
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.data.subAccountIamInstanceProfileArn).toEqual("test");
  });

  it("should validate member account data", () => {
    const action = memberAccountSlice.actions.validateMemberAccount();
    const newState = memberAccountSlice.reducer(initialState, action);
    expect(newState.nameError).toEqual(
      "resource:crossAccount.link.inputAccountName"
    );
  });

  it("should validate member account input", () => {
    const validateRes = validateMemberAccountInput(initialState);
    expect(validateRes).toBeFalsy();

    const validateRes2 = validateMemberAccountInput({
      ...initialState,
      data: {
        ...initialState.data,
        subAccountName: "test",
      },
    });
    expect(validateRes2).toBeFalsy();

    const validateRes3 = validateMemberAccountInput({
      ...initialState,
      data: {
        ...initialState.data,
        subAccountName: "test",
        subAccountId: "123456789012",
      },
    });
    expect(validateRes3).toBeFalsy();

    const validateRes4 = validateMemberAccountInput({
      ...initialState,
      data: {
        ...initialState.data,
        subAccountName: "test",
        subAccountId: "123456789012",
        subAccountRoleArn: "arn:aws:iam::123456789012:role/test",
      },
    });
    expect(validateRes4).toBeFalsy();
  });

  it("should validateAccountName", () => {
    const validateRes = validateAccountName({
      ...initialState,
      data: {
        ...initialState.data,
        subAccountName: "",
      },
    });
    expect(validateRes).toEqual("resource:crossAccount.link.inputAccountName");

    const validateRes2 = validateAccountName({
      ...initialState,
      data: {
        ...initialState.data,
        subAccountName: "test",
      },
    });
    expect(validateRes2).toEqual("");
  });

  it("should validateAccountId", () => {
    const validateRes = validateAccountId({
      ...initialState,
      data: {
        ...initialState.data,
        subAccountId: "",
      },
    });
    expect(validateRes).toEqual("resource:crossAccount.link.inputAccountId");

    const validateRes2 = validateAccountId({
      ...initialState,
      data: {
        ...initialState.data,
        subAccountId: "12345678901",
      },
    });
    expect(validateRes2).toEqual(
      "resource:crossAccount.link.accountIdFormatError"
    );

    const validateRes3 = validateAccountId({
      ...initialState,
      data: {
        ...initialState.data,
        subAccountId: "123456789012",
      },
    });
    expect(validateRes3).toEqual("");
  });
});
