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
import ExtLink from "components/ExtLink";
import React from "react";
import { Trans, useTranslation } from "react-i18next";

export const AppPipelineImport = () => {
  const i18n = useTranslation();
  return (
    <div className="gsui-help-container">
      <div className="gsui-help-content">
        <Trans
          i18={i18n}
          i18nKey="info:appPipelineImport.tip"
          components={[
            <ExtLink key="1" to={'https://aws-gcr-solutions.s3.amazonaws.com/centralized-logging-with-opensearch/capcut_v2.2.0/docs/application-pipeline-schema.html'}>
              1
            </ExtLink>,
          ]}
        />
      </div>
    </div>
  );
};
