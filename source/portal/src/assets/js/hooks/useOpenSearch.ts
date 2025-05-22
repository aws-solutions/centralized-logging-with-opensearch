// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { resetOpenSearch } from "reducer/createOpenSearch";
import { RootState } from "reducer/reducers";
import { AppDispatch } from "reducer/store";

export const useOpenSearch = () => {
  const appDispatch = useDispatch<AppDispatch>();
  const openSearch = useSelector((state: RootState) => state.openSearch);
  useEffect(
    () => () => {
      appDispatch(resetOpenSearch());
    },
    []
  );
  return openSearch;
};
