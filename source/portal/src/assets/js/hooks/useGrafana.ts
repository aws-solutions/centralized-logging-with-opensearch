// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { grafana } from "reducer/grafana";
import { RootState } from "reducer/reducers";
import { Dispatch } from "redux";

export const useGrafana = () => {
  const dispatch = useDispatch<Dispatch<any>>();
  const grafanaState = useSelector((state: RootState) => state.grafana);
  useEffect(
    () => () => {
      dispatch(grafana.actions.initStatus());
    },
    []
  );
  return grafanaState;
};
