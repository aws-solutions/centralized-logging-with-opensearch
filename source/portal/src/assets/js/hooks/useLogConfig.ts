// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { resetLogConfig } from "reducer/createLogConfig";
import { RootState } from "reducer/reducers";
import { AppDispatch } from "reducer/store";

export const useLogConfig = () => {
  const appDispatch = useDispatch<AppDispatch>();
  const logConfig = useSelector((state: RootState) => state.logConfig);
  useEffect(
    () => () => {
      appDispatch(resetLogConfig());
    },
    []
  );
  return logConfig;
};
