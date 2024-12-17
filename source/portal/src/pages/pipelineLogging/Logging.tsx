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
import HeaderPanel from "components/HeaderPanel";
import { AppPipeline, BufferType, PipelineStatus, PipelineType } from "API";
import LoggingTable from "./logging/LoggingTable";
import LoggingHeader from "./logging/LoggingHeader";
import { ServiceLogDetailProps } from "pages/dataInjection/serviceLog/ServiceLogDetail";
import Alert from "components/Alert";

export interface LoggingProps {
  type: PipelineType;
  pipelineInfo?: AppPipeline | null;
  servicePipeline?: ServiceLogDetailProps | null;
}
const Logging: React.FC<LoggingProps> = (props: LoggingProps) => {
  const { t } = useTranslation();
  const { pipelineInfo, servicePipeline, type } = props;
  return (
    <div>
      <HeaderPanel
        title={t("common:logging.resources")}
        desc={t("common:logging.desc")}
      >
        <div>
          {pipelineInfo?.status === PipelineStatus.ACTIVE ||
          pipelineInfo?.status === PipelineStatus.PAUSED ||
          servicePipeline?.status === PipelineStatus.ACTIVE ||
          servicePipeline?.status === PipelineStatus.PAUSED ? (
            <>
              {pipelineInfo?.bufferType !== BufferType.None && (
                <>
                  <LoggingHeader
                    pipelineInfo={pipelineInfo}
                    servicePipeline={servicePipeline}
                    type={type}
                    processorLambdaName={
                      type === PipelineType.APP
                        ? pipelineInfo?.processorLogGroupName
                        : servicePipeline?.processorLambda
                    }
                  />
                </>
              )}

              {pipelineInfo?.bufferType === BufferType.None && (
                <Alert content={t("applog:detail.noLogging")} />
              )}
            </>
          ) : (
            <Alert content={t("alarm.notActive")} />
          )}
        </div>
      </HeaderPanel>
      <LoggingTable
        pipelineInfo={pipelineInfo}
        servicePipeline={servicePipeline}
        type={type}
        lambdaFunName={
          type === PipelineType.APP
            ? pipelineInfo?.processorLogGroupName
            : servicePipeline?.processorLambda
        }
      />
    </div>
  );
};

export default Logging;
