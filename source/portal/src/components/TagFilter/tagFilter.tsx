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
import React, { useState } from "react";
import Button from "components/Button";
import { TagFilterInput } from "API";
import TextInput from "components/TextInput";
import { useTranslation } from "react-i18next";
import ClearIcon from "@material-ui/icons/Clear";

interface TagFilterProps {
  tags: TagFilterInput[];
  addTag: (tag: TagFilterInput) => void;
  removeTag: (keyIndex: number, valueIndex: number) => void;
}

type Tag = {
  key: string;
  value: string;
};

const TagFilter: React.FC<TagFilterProps> = (props: TagFilterProps) => {
  const emptyTag = { key: "", value: "" };
  const { tags, addTag, removeTag } = props;
  const { t } = useTranslation();

  const addCurTag = () => {
    if (curTag.key.length < 1 || curTag.value.length < 1) return;
    addTag({ Key: `tag:${curTag.key}`, Values: [curTag.value] });
    setCurTag(emptyTag);
  };

  const [curTag, setCurTag] = useState<Tag>(emptyTag);
  return (
    <div className="gsui-tag-filter">
      <div className="flex">
        <div className="flex-1 t-title">{t("tag.tagFilter")}</div>
      </div>
      <div className="flex">
        <div className="flex-1 key">
          <TextInput
            placeholder={t("tag.enterKey") || ""}
            value={curTag?.key || ""}
            onChange={(event) => {
              setCurTag((prev: Tag) => {
                return {
                  ...prev,
                  key: event.target.value,
                };
              });
            }}
          />
        </div>
        <div className="flex-1 value">
          <TextInput
            placeholder={t("tag.enterValue") || ""}
            value={curTag?.value || ""}
            onChange={(event) => {
              setCurTag((prev: Tag) => {
                return {
                  ...prev,
                  value: event.target.value,
                };
              });
            }}
          />
        </div>
        <div className="add">
          <Button onClick={addCurTag}>{t("button.add")}</Button>
        </div>
      </div>
      <div className="flex">
        <div className="flex-1 t-desc">{t("tag.tagFilterDesc")}</div>
      </div>
      {tags.length > 0 && (
        <div className="flex t-targets">
          {tags.map((element, elementIndex) => {
            const key = (element.Key || "tag:").slice("tag:".length);
            const valueCount = (element.Values || []).length;
            return (
              <div className="flex" key={element.Key}>
                {valueCount > 1 && (
                  <div className="flex t-operator parenthesis">(</div>
                )}
                {(element.Values || []).map((value, valueIndex) => {
                  return (
                    <div className="flex" key={value}>
                      <div className="flex t-tag">
                        <div className="t-tag t-lable">
                          <span className="key">{key}: </span>
                          <span>{value}</span>
                        </div>
                        <div
                          className="delete"
                          onClick={() => {
                            removeTag(elementIndex, valueIndex);
                          }}
                        >
                          <Button
                            style={{
                              padding: 5,
                              border: 0,
                              background: "#f1faff",
                            }}
                          >
                            <ClearIcon fontSize="small" />
                          </Button>
                        </div>
                      </div>
                      {valueIndex < valueCount - 1 && (
                        <div className="flex t-operator">
                          {t("tag.tagFilterOr")}
                        </div>
                      )}
                    </div>
                  );
                })}
                {valueCount > 1 && (
                  <div className="flex t-operator parenthesis">)</div>
                )}
                {elementIndex < tags.length - 1 && (
                  <div className="flex t-operator">{t("tag.tagFilterAnd")}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TagFilter;
