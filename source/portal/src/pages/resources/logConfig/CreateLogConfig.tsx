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
import { useTranslation } from "react-i18next";
import LogConfigComp, { PageType } from "../common/LogConfigComp";
import { useLogConfig } from "assets/js/hooks/useLogConfig";

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

  const logConfig = useLogConfig();

  return (
    <LogConfigComp
      headerTitle={t("resource:config.config")}
      breadCrumbList={breadCrumbList}
      pageType={PageType.New}
      logConfig={logConfig}
    />
  );
};

export default CreateLogConfig;
