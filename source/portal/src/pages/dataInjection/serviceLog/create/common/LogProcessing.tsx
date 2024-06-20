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
import PagePanel from "components/PagePanel";
import { useTranslation } from "react-i18next";
import { CloudFrontTaskProps } from "../cloudfront/CreateCloudFront";
import { SupportPlugin } from "types";
import { ELBTaskProps } from "../elb/CreateELB";
import EnrichedFields from "pages/dataInjection/common/EnrichFields";

interface LogProcessingProps {
  pipelineTask: CloudFrontTaskProps | ELBTaskProps;
  changePluginSelect: (plugin: SupportPlugin, selected: boolean) => void;
}

const LogProcessing: React.FC<LogProcessingProps> = (
  props: LogProcessingProps
) => {
  const { t } = useTranslation();
  const { pipelineTask, changePluginSelect } = props;

  return (
    <div>
      <PagePanel title={t("servicelog:create.step.logProcessing")}>
        <EnrichedFields
          pipelineTask={pipelineTask}
          changePluginSelect={changePluginSelect}
        />
      </PagePanel>
    </div>
  );
};

export default LogProcessing;
