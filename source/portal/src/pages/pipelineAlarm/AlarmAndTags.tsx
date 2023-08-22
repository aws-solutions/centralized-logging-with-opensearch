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
import { CloudFrontTaskProps } from "../dataInjection/serviceLog/create/cloudfront/CreateCloudFront";
import { CloudTrailTaskProps } from "../dataInjection/serviceLog/create/cloudtrail/CreateCloudTrail";
import { ConfigTaskProps } from "../dataInjection/serviceLog/create/config/CreateConfig";
import { ELBTaskProps } from "../dataInjection/serviceLog/create/elb/CreateELB";
import { LambdaTaskProps } from "../dataInjection/serviceLog/create/lambda/CreateLambda";
import { RDSTaskProps } from "../dataInjection/serviceLog/create/rds/CreateRDS";
import { S3TaskProps } from "../dataInjection/serviceLog/create/s3/CreateS3";
import { VpcLogTaskProps } from "../dataInjection/serviceLog/create/vpc/CreateVPC";
import { WAFTaskProps } from "../dataInjection/serviceLog/create/waf/CreateWAF";
import { PipelineType } from "API";
import PagePanel from "components/PagePanel";
import { useTranslation } from "react-i18next";
import { ApplicationLogType } from "types";
import { CreateTags } from "pages/dataInjection/common/CreateTags";
import CreateAlarms from "./alarm/CreateAlarms";

export type ParticalServiceType =
  | S3TaskProps
  | CloudFrontTaskProps
  | CloudTrailTaskProps
  | LambdaTaskProps
  | RDSTaskProps
  | ELBTaskProps
  | WAFTaskProps
  | VpcLogTaskProps
  | ConfigTaskProps;

interface AlarmAndTagsProps {
  pipelineTask?: ParticalServiceType;
  applicationPipeline?: ApplicationLogType;
}

const AlarmAndTags: React.FC<AlarmAndTagsProps> = (
  props: AlarmAndTagsProps
) => {
  const { pipelineTask, applicationPipeline } = props;
  const { t } = useTranslation();
  return (
    <PagePanel title={t("servicelog:create.step.createTags")}>
      <>
        {pipelineTask && (
          <>
            <CreateAlarms type={PipelineType.SERVICE} />
            <CreateTags />
          </>
        )}
        {applicationPipeline && (
          <>
            <CreateAlarms type={PipelineType.APP} />
            <CreateTags />
          </>
        )}
      </>
    </PagePanel>
  );
};

export default AlarmAndTags;
