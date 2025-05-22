// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Actions, RootState } from "reducer/reducers";
import { SelectProcessorActionTypes } from "reducer/selectProcessor";
import { Dispatch } from "redux";

export const useSelectProcessor = () => {
  const dispatch = useDispatch<Dispatch<Actions>>();
  const selectProcessor = useSelector(
    (state: RootState) => state.selectProcessor
  );
  useEffect(
    () => () => {
      dispatch({
        type: SelectProcessorActionTypes.RESET_SELECT,
      });
    },
    []
  );
  return selectProcessor;
};
