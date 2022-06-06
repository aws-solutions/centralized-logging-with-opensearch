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
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import React from "react";
import { useTranslation } from "react-i18next";
import { ServiceLogDetailProps } from "../ServiceLogDetail";

interface OverviewProps {
  pipelineInfo: ServiceLogDetailProps | undefined;
}

const Lifecycle: React.FC<OverviewProps> = (props: OverviewProps) => {
  const { pipelineInfo } = props;
  const { t } = useTranslation();
  return (
    <div>
      <HeaderPanel title={t("servicelog:lifecycle.name")}>
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("servicelog:lifecycle.warmLog")}>
              <div>{pipelineInfo?.warnRetention}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("servicelog:lifecycle.coldLog")}>
              <div>{pipelineInfo?.coldRetention}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("servicelog:lifecycle.retention")}>
              <div>{pipelineInfo?.logRetention}</div>
            </ValueWithLabel>
          </div>
        </div>
      </HeaderPanel>
    </div>
  );
};

export default Lifecycle;
