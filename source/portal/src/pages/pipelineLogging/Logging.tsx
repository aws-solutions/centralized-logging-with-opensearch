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
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import HeaderPanel from "components/HeaderPanel";
import ExpandableSection from "components/ExpandableSection";
import ExtLink from "components/ExtLink";
import FormItem from "components/FormItem";
import { buildS3Link } from "assets/js/utils";
import { AppPipeline, BufferType, PipelineStatus, PipelineType } from "API";
import LoggingTable from "./logging/LoggingTable";
import LoggingHeader from "./logging/LoggingHeader";
import { ServiceLogDetailProps } from "pages/dataInjection/serviceLog/ServiceLogDetail";
import { RootState } from "reducer/reducers";
import Alert from "components/Alert";

export interface LoggingProps {
  type: PipelineType;
  pipelineInfo?: AppPipeline | null;
  servicePipeline?: ServiceLogDetailProps | null;
}
const Logging: React.FC<LoggingProps> = (props: LoggingProps) => {
  const { t } = useTranslation();
  const { pipelineInfo, servicePipeline, type } = props;
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  return (
    <div>
      <HeaderPanel
        title={t("common:logging.logs")}
        desc={t("common:logging.desc")}
      >
        <div>
          {(pipelineInfo?.status === PipelineStatus.ACTIVE ||
            servicePipeline?.status === PipelineStatus.ACTIVE) && (
            <>
              {pipelineInfo?.bufferType !== BufferType.None && (
                <ExpandableSection
                  headerText={t("common:logging.processorLamdaLog")}
                >
                  <div>
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
                    <div className="mt-20">
                      <div>{t("common:logging.detailedErrorLogs")}</div>
                      <FormItem optionDesc={t("common:logging.errorLogDesc")}>
                        <>
                          {type === PipelineType.APP && (
                            <ExtLink
                              to={buildS3Link(
                                amplifyConfig.aws_project_region,
                                pipelineInfo?.monitor
                                  ?.backupBucketName as string,
                                pipelineInfo?.monitor?.errorLogPrefix as string
                              )}
                            >
                              {`s3://${pipelineInfo?.monitor?.backupBucketName}/${pipelineInfo?.monitor?.errorLogPrefix}`}
                            </ExtLink>
                          )}
                          {type === PipelineType.SERVICE && (
                            <ExtLink
                              to={buildS3Link(
                                amplifyConfig.aws_project_region,
                                servicePipeline?.failedS3Bucket || ""
                              )}
                            >
                              {`s3://${servicePipeline?.failedS3Bucket}`}
                            </ExtLink>
                          )}
                        </>
                      </FormItem>
                    </div>
                  </div>
                </ExpandableSection>
              )}

              {pipelineInfo?.bufferType === BufferType.None && (
                <Alert content={t("applog:detail.noLogging")} />
              )}

              <ExpandableSection
                defaultExpanded={false}
                headerText={t("common:logging.helperLamdaLog")}
              >
                <div>
                  <LoggingHeader
                    pipelineInfo={pipelineInfo}
                    servicePipeline={servicePipeline}
                    type={type}
                    processorLambdaName={
                      type === PipelineType.APP
                        ? pipelineInfo?.helperLogGroupName
                        : servicePipeline?.helperLambda
                    }
                  />
                  <LoggingTable
                    pipelineInfo={pipelineInfo}
                    servicePipeline={servicePipeline}
                    type={type}
                    lambdaFunName={
                      type === PipelineType.APP
                        ? pipelineInfo?.helperLogGroupName
                        : servicePipeline?.helperLambda
                    }
                  />
                </div>
              </ExpandableSection>
            </>
          )}
        </div>
      </HeaderPanel>
    </div>
  );
};

export default Logging;
