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
import React from "react";
import HeaderPanel from "components/HeaderPanel";
import { DomainDetails } from "API";
import { useTranslation } from "react-i18next";

interface TagProps {
  domainInfo: DomainDetails | undefined | null;
}

const Tags: React.FC<TagProps> = ({ domainInfo }: TagProps) => {
  const { t } = useTranslation();
  return (
    <div>
      <HeaderPanel
        title={t("tag.name")}
        count={domainInfo?.tags?.length}
        contentNoPadding
      >
        {domainInfo?.tags?.length || 0 > 0 ? (
          <div>
            <div className="flex show-tag-list">
              <div className="tag-key">
                <b>{t("tag.key")}</b>
              </div>
              <div className="tag-value flex-1">
                <b>{t("tag.value")}</b>
              </div>
            </div>
            {domainInfo?.tags?.map((tag, index) => {
              return (
                <div key={index} className="flex show-tag-list">
                  <div className="tag-key">{tag?.key}</div>
                  <div className="tag-value flex-1">{tag?.value}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-data">{t("tag.noTag")}</div>
        )}
      </HeaderPanel>
    </div>
  );
};

export default Tags;
