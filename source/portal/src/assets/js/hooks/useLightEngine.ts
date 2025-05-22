// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CreateLightEngineActionTypes } from "reducer/createLightEngine";
import { Actions, RootState } from "reducer/reducers";
import { Dispatch } from "redux";

export const useLightEngine = () => {
  const dispatch = useDispatch<Dispatch<Actions>>();
  const lightEngine = useSelector(
    (state: RootState) => state.createLightEngine
  );
  useEffect(
    () => () => {
      dispatch({
        type: CreateLightEngineActionTypes.CLEAR_LIGHT_ENGINE,
      });
    },
    []
  );
  return lightEngine;
};
