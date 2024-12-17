/*
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 */

import { ServiceLogType } from "assets/js/const";
import React from "react";
import S3Desc from "./S3Desc";
import RDSDesc from "./RDSDesc";
import CloudTrailDesc from "./CloudTrailDesc";
import CloudFrontDesc from "./CloudFrontDesc";
import LambdaDesc from "./LambdaDesc";
import ELBDesc from "./ELBDesc";
import WAFDesc from "./WAFDesc";
import VPCDesc from "./VPCDesc";
import ConfigDesc from "./ConfigDesc";

export interface ServicePipelineDescProp {
  logType: ServiceLogType;
  ingestLogType: string;
  changeIngestLogType: (ingestLogType: string) => void;
  region: string;
}

const ServicePipelineDesc: React.FC<ServicePipelineDescProp> = ({
  logType,
  ingestLogType,
  changeIngestLogType,
  region,
}: ServicePipelineDescProp) => (
  <>
    {logType === ServiceLogType.Amazon_S3 && <S3Desc />}
    {logType === ServiceLogType.Amazon_RDS && (
      <RDSDesc
        ingestLogType={ingestLogType}
        changeIngestLogType={changeIngestLogType}
      />
    )}
    {logType === ServiceLogType.Amazon_CloudTrail && (
      <CloudTrailDesc
        region={region}
        ingestLogType={ingestLogType}
        changeIngestLogType={changeIngestLogType}
      />
    )}
    {logType === ServiceLogType.Amazon_CloudFront && (
      <CloudFrontDesc
        region={region}
        ingestLogType={ingestLogType}
        changeIngestLogType={changeIngestLogType}
      />
    )}
    {logType === ServiceLogType.Amazon_Lambda && <LambdaDesc />}
    {logType === ServiceLogType.Amazon_ELB && <ELBDesc />}
    {logType === ServiceLogType.Amazon_WAF && (
      <WAFDesc
        ingestLogType={ingestLogType}
        changeIngestLogType={changeIngestLogType}
      />
    )}
    {logType === ServiceLogType.Amazon_VPCLogs && (
      <VPCDesc
        ingestLogType={ingestLogType}
        changeIngestLogType={changeIngestLogType}
      />
    )}
    {logType === ServiceLogType.Amazon_Config && <ConfigDesc />}
  </>
);

export default ServicePipelineDesc;
