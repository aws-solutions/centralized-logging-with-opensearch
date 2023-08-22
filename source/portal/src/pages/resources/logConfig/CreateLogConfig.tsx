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
import { PageType } from "../common/LogConfigComp";
import { useTranslation } from "react-i18next";
import LogConfitEditor from "./ConfigEditor";

const CreateLogConfig: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("resource:config.name"),
      link: "/resources/log-config",
    },
    { name: t("resource:config.create") },
  ];

  return (
    <div>
      <LogConfitEditor
        breadCrumbList={breadCrumbList}
        pageType={PageType.New}
      />
    </div>
  );
};

export default CreateLogConfig;
