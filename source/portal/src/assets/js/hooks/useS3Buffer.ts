// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { resetS3Buffer } from "reducer/configBufferS3";
import { RootState } from "reducer/reducers";
import { AppDispatch } from "reducer/store";

export const useS3Buffer = () => {
  const appDispatch = useDispatch<AppDispatch>();
  const s3Buffer = useSelector((state: RootState) => state.s3Buffer);
  useEffect(
    () => () => {
      appDispatch(resetS3Buffer());
    },
    []
  );
  return s3Buffer;
};
