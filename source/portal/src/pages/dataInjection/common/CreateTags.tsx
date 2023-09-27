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
import React from "react";
import HeaderPanel from "components/HeaderPanel";
import TagList from "components/TagList";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import { CreateTagActionTypes, CreateTagActions } from "reducer/createTags";
import { Dispatch } from "redux";

export const CreateTags: React.FC = () => {
  const tags = useSelector((state: RootState) => state.createTag.tags);
  const dispatch = useDispatch<Dispatch<CreateTagActions>>();
  const { t } = useTranslation();
  return (
    <HeaderPanel title={t("tag.name")} desc={t("tag.desc")}>
      <TagList
        tagList={tags}
        addTag={() =>
          dispatch({
            type: CreateTagActionTypes.ADD_TAG,
          })
        }
        removeTag={(index) =>
          dispatch({
            type: CreateTagActionTypes.REMOVE_TAG,
            index,
          })
        }
        onChange={(index, key, value) =>
          dispatch({
            type: CreateTagActionTypes.ON_TAG_CHANGE,
            index,
            key,
            value,
          })
        }
      />
    </HeaderPanel>
  );
};
