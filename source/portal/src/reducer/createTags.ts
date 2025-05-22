// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Tag } from "API";

const initState = {
  tags: [] as Omit<Tag, "__typename">[],
};

export type CreateTagSate = typeof initState;

export enum CreateTagActionTypes {
  ADD_TAG = "ADD_TAG",
  REMOVE_TAG = "REMOVE_TAG",
  ON_TAG_CHANGE = "ON_TAG_CHANGE",
  CLEAR_TAG = "CLEAR_TAG",
}

export type AddTag = {
  type: CreateTagActionTypes.ADD_TAG;
};

export type ClearTag = {
  type: CreateTagActionTypes.CLEAR_TAG;
};

export type RemoveTag = {
  type: CreateTagActionTypes.REMOVE_TAG;
  index: number;
};

export type OnTagChange = {
  type: CreateTagActionTypes.ON_TAG_CHANGE;
  index: number;
  key: string;
  value: string;
};

export type CreateTagActions = AddTag | RemoveTag | OnTagChange | ClearTag;

export const createTagReducer = (
  state = initState,
  action: CreateTagActions
): CreateTagSate => {
  switch (action.type) {
    case CreateTagActionTypes.ADD_TAG:
      return {
        ...state,
        tags: [
          ...state.tags,
          {
            key: "",
            value: "",
          },
        ],
      };
    case CreateTagActionTypes.REMOVE_TAG:
      return {
        ...state,
        tags: [
          ...state.tags.slice(0, action.index),
          ...state.tags.slice(action.index + 1),
        ],
      };
    case CreateTagActionTypes.ON_TAG_CHANGE:
      return {
        ...state,
        tags: [
          ...state.tags.slice(0, action.index),
          {
            key: action.key,
            value: action.value,
          },
          ...state.tags.slice(action.index + 1),
        ],
      };
    case CreateTagActionTypes.CLEAR_TAG:
      return initState;
    default:
      return state;
  }
};
