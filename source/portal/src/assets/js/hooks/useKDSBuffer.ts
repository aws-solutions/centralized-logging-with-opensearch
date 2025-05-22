// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { resetKDSBuffer } from "reducer/configBufferKDS";
import { RootState } from "reducer/reducers";
import { AppDispatch } from "reducer/store";

export const useKDSBuffer = () => {
  const appDispatch = useDispatch<AppDispatch>();
  const kdsBuffer = useSelector((state: RootState) => state.kdsBuffer);
  useEffect(
    () => () => {
      appDispatch(resetKDSBuffer());
    },
    []
  );
  return kdsBuffer;
};
