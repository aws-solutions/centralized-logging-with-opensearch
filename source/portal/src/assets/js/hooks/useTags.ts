// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CreateTagActionTypes } from "reducer/createTags";
import { Actions, RootState } from "reducer/reducers";
import { Dispatch } from "redux";

export const useTags = () => {
  const dispatch = useDispatch<Dispatch<Actions>>();
  const tags = useSelector((state: RootState) => state.createTag.tags);
  useEffect(
    () => () => {
      dispatch({
        type: CreateTagActionTypes.CLEAR_TAG,
      });
    },
    []
  );
  return tags;
};
