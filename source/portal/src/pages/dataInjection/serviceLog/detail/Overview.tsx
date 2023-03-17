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
import ValueWithLabel from "components/ValueWithLabel";
import { ServiceLogDetailProps } from "../ServiceLogDetail";
import { useTranslation } from "react-i18next";
import { DestinationType } from "API";

interface OverviewProps {
  pipelineInfo: ServiceLogDetailProps | undefined;
}

const Overview: React.FC<OverviewProps> = (props: OverviewProps) => {
  console.info("props:", props);
  const { pipelineInfo } = props;
  const { t } = useTranslation();
  return (
    <div>
      <HeaderPanel title={t("servicelog:overview.name")}>
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("servicelog:overview.logLocation")}>
              <div>
                {pipelineInfo?.destinationType === DestinationType.KDS
                  ? "Kinesis Data Streams"
                  : pipelineInfo?.logLocation
                  ? pipelineInfo.logLocation
                  : "-"}
              </div>
            </ValueWithLabel>

            <ValueWithLabel label={t("servicelog:overview.created")}>
              <div>{pipelineInfo?.createTime}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("servicelog:overview.createSample")}>
              <div>{pipelineInfo?.createSampleData}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("servicelog:cluster.shardNum")}>
              <div>{pipelineInfo?.shardNumbers}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("servicelog:cluster.replicaNum")}>
              <div>{pipelineInfo?.replicaNumbers}</div>
            </ValueWithLabel>
          </div>
        </div>
      </HeaderPanel>
    </div>
  );
};

export default Overview;
