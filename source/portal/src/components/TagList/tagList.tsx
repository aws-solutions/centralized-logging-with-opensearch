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
import Button from "components/Button";
import { TagInput } from "API";
import TextInput from "components/TextInput";
import { useTranslation } from "react-i18next";
import { identity } from "lodash";

interface TagListProps {
  tagList: TagInput[] | null;
  addTag: () => void;
  onChange: (index: number, key: string, value: string) => void;
  removeTag: (index: number) => void;
  tagLimit?: number;
}

const TagList: React.FC<TagListProps> = (props: TagListProps) => {
  const { tagList, tagLimit = 50, addTag, removeTag, onChange } = props;
  const { t } = useTranslation();
  return (
    <div className="gsui-tag-list">
      {(tagList || []).length === 0 && (
        <div className="no-tag-tips pd-10">{t("tag.noTagDesc")}</div>
      )}
      {(tagList || []).length > 0 && (
        <div>
          <div className="flex">
            <div className="flex-1 key t-title">{t("tag.key")}</div>
            <div className="flex-1 value t-title">
              {t("tag.value")} - <i>{t("tag.optional")}</i>
            </div>
            <div className="remove t-title">&nbsp;</div>
          </div>
          {tagList?.map((element, index) => {
            return (
              <div className="flex" key={identity(index)}>
                <div className="flex-1 key">
                  <TextInput
                    placeholder={t("tag.enterKey")}
                    value={element.key || ""}
                    onChange={(event) => {
                      onChange(index, event.target.value, element.value || "");
                    }}
                  />
                </div>
                <div className="flex-1 value">
                  <TextInput
                    placeholder={t("tag.enterValue")}
                    value={element.value || ""}
                    onChange={(event) => {
                      onChange(index, element.key || "", event.target.value);
                    }}
                  />
                </div>
                <div className="remove">
                  <Button
                    onClick={() => {
                      removeTag(index);
                    }}
                  >
                    {t("button.remove")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {(tagList || []).length < tagLimit && (
        <div className="pd-10">
          <Button onClick={addTag}>{t("button.addTag")}</Button>
          <div className="add-tag-tips">
            {t("tag.tagLimit1")} {tagLimit - (tagList || []).length}{" "}
            {t("tag.tagLimit2")}.
          </div>
        </div>
      )}
    </div>
  );
};

export default TagList;
