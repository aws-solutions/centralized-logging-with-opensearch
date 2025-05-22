// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { resetMemberAccount } from "reducer/linkMemberAccount";
import { RootState } from "reducer/reducers";
import { AppDispatch } from "reducer/store";

export const useMemberAccount = () => {
  const appDispatch = useDispatch<AppDispatch>();
  const memberAccount = useSelector((state: RootState) => state.memberAccount);
  useEffect(
    () => () => {
      appDispatch(resetMemberAccount());
    },
    []
  );
  return memberAccount;
};
