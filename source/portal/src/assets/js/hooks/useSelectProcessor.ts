/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
