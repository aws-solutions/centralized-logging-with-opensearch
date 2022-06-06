/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React, { useState, useEffect } from "react";
import HeaderPanel from "components/HeaderPanel";
import TagList from "components/TagList";
import { ImportedDomainType } from "../ImportCluster";
import { useTranslation } from "react-i18next";

interface CreateTagsProps {
  importedCluster: ImportedDomainType;
  changeTags: (tags: any) => void;
}

const CreateTags: React.FC<CreateTagsProps> = (props: CreateTagsProps) => {
  const { importedCluster, changeTags } = props;
  const [tagList, setTagList] = useState(importedCluster.tags || []);
  const { t } = useTranslation();
  useEffect(() => {
    changeTags(tagList);
  }, [tagList]);

  return (
    <div>
      <HeaderPanel title={t("tag.name")} desc={t("tag.desc")}>
        <TagList
          tagList={tagList}
          addTag={() => {
            setTagList((prev) => {
              const tmpList = JSON.parse(JSON.stringify(prev));
              tmpList.push({
                key: "",
                value: "",
              });
              return tmpList;
            });
          }}
          removeTag={(index) => {
            setTagList((prev) => {
              const tmpList = JSON.parse(JSON.stringify(prev));
              tmpList.splice(index, 1);
              return tmpList;
            });
          }}
          onChange={(index, key, value) => {
            setTagList((prev) => {
              const tmpList = JSON.parse(JSON.stringify(prev));
              tmpList[index].key = key;
              tmpList[index].value = value;
              // changeTags(tmpList);
              return tmpList;
            });
          }}
        />
      </HeaderPanel>
    </div>
  );
};

export default CreateTags;
