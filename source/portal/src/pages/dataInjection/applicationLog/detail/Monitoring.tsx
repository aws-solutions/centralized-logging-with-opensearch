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

import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import React, { useState } from "react";
import RefreshIcon from "@material-ui/icons/Refresh";
import { AppPipeline, LogSourceType, PipelineStatus } from "API";
import { useTranslation } from "react-i18next";
import HeaderPanel from "components/HeaderPanel";
import ExtLink from "components/ExtLink";
import ExpandableSection from "components/ExpandableSection";
import ValueWithLabel from "components/ValueWithLabel";
import TimeRange from "components/TimeRange/TimeRange";
import AppLogBufferMetrics from "./monitor/AppLogSQSBufferMetrics";
import AppLogProcessorMetric from "./monitor/AppLogProcessorMetrics";
import AppLogKDSBufferMetrics from "./monitor/AppLogKDSBufferMetrics";
import AppLogFlbAgentMetrics from "./monitor/AppLogFlbAgentSourceMetrics";
import AppLogSyslogSourceMetrics from "./monitor/AppLogSyslogSourceMetrics";

import { buildSQSLink, buildKDSLink, buildLambdaLink } from "assets/js/utils";
import Button from "components/Button";
import { RootState } from "reducer/reducers";
import { PIPLINE_MONITORING_COST_LINK } from "assets/js/const";

interface MonitoringProps {
  pipelineInfo: AppPipeline | undefined;
  sourceSet: Set<string>;
}
const Monitoring: React.FC<MonitoringProps> = (props: MonitoringProps) => {
  const { pipelineInfo } = props;
  const { sourceSet } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const [curTimeRangeType, setCurTimeRangeType] = useState("12h");
  const [startDate, setStartDate] = useState(0);
  const [endDate, setEndDate] = useState(0);

  const [refreshCount, setRefreshCount] = useState(0);

  return (
    <div>
      <HeaderPanel
        title={t("common:monitoring.title")}
        desc={
          <div>
            {t("info:monitoring.intro")}
            {"  "}
            <ExtLink to={PIPLINE_MONITORING_COST_LINK}>
              {t("info:monitoring.monitoringCost")}
            </ExtLink>
          </div>
        }
      >
        <>
          {pipelineInfo?.status === PipelineStatus.ACTIVE && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "flex-end",
                  paddingBottom: "15px",
                }}
              >
                <div>
                  <Button
                    onClick={() => {
                      setRefreshCount((prev) => prev + 1);
                    }}
                  >
                    <RefreshIcon width="10" />
                  </Button>
                </div>
                <div style={{ width: 480 }}>
                  <TimeRange
                    curTimeRangeType={curTimeRangeType}
                    startTime={""}
                    endTime={""}
                    changeTimeRange={(range) => {
                      console.info("range:", range);
                      setStartDate(range[0]);
                      setEndDate(range[1]);
                    }}
                    changeRangeType={(type) => {
                      setCurTimeRangeType(type);
                    }}
                  />
                </div>
              </div>
              {(sourceSet.has(LogSourceType.EC2) ||
                sourceSet.has(LogSourceType.EKSCluster)) && (
                <ExpandableSection
                  headerText={t("common:monitoring.logSource")}
                >
                  <div>
                    <div className="flex">
                      <div>{t("info:monitoring.flbAgents")}</div>
                    </div>
                    <div>
                      <AppLogFlbAgentMetrics
                        pipelineInfo={pipelineInfo}
                        startDate={startDate}
                        endDate={endDate}
                        refreshCount={refreshCount}
                      />
                    </div>
                  </div>
                </ExpandableSection>
              )}
              {sourceSet.has(LogSourceType.Syslog) && (
                <ExpandableSection
                  headerText={t("common:monitoring.logSource")}
                >
                  <div>
                    <div className="flex">
                      <div>{t("info:monitoring.syslog")}</div>
                    </div>
                    <div>
                      <AppLogSyslogSourceMetrics
                        pipelineInfo={pipelineInfo}
                        startDate={startDate}
                        endDate={endDate}
                        refreshCount={refreshCount}
                      />
                    </div>
                  </div>
                </ExpandableSection>
              )}
              {pipelineInfo?.bufferType === "S3" && (
                <ExpandableSection headerText={t("monitoring.buffer")}>
                  <div>
                    <div className="flex">
                      <ValueWithLabel label="SQS">
                        <ExtLink
                          to={buildSQSLink(
                            amplifyConfig.aws_project_region,
                            pipelineInfo?.logEventQueueName as string
                          )}
                        >
                          {pipelineInfo?.logEventQueueName}
                        </ExtLink>
                      </ValueWithLabel>
                    </div>
                    <div>
                      <AppLogBufferMetrics
                        pipelineInfo={pipelineInfo}
                        startDate={startDate}
                        endDate={endDate}
                        refreshCount={refreshCount}
                      />
                    </div>
                  </div>
                </ExpandableSection>
              )}
              {pipelineInfo?.bufferType === "KDS" && (
                <ExpandableSection headerText={t("monitoring.buffer")}>
                  <div>
                    <div className="flex">
                      <ValueWithLabel label="KDS">
                        <ExtLink
                          to={buildKDSLink(
                            amplifyConfig.aws_project_region,
                            pipelineInfo?.bufferResourceName as string
                          )}
                        >
                          {pipelineInfo?.bufferResourceName}
                        </ExtLink>
                      </ValueWithLabel>
                    </div>
                    <div>
                      <AppLogKDSBufferMetrics
                        pipelineInfo={pipelineInfo}
                        startDate={startDate}
                        endDate={endDate}
                        refreshCount={refreshCount}
                      />
                    </div>
                  </div>
                </ExpandableSection>
              )}
              {pipelineInfo?.bufferType !== "None" && (
                <ExpandableSection
                  headerText={t("common:monitoring.logProcessor")}
                >
                  <div>
                    <div className="flex">
                      <ValueWithLabel
                        label={t("common:monitoring.lambdaProcessor")}
                      >
                        <ExtLink
                          to={buildLambdaLink(
                            amplifyConfig.aws_project_region,
                            pipelineInfo?.processorLogGroupName?.split(
                              "/"
                            )[3] as string
                          )}
                        >
                          {pipelineInfo?.processorLogGroupName as string}
                        </ExtLink>
                      </ValueWithLabel>
                    </div>
                    <div>
                      <AppLogProcessorMetric
                        pipelineInfo={pipelineInfo}
                        startDate={startDate}
                        endDate={endDate}
                        refreshCount={refreshCount}
                      />
                    </div>
                  </div>
                </ExpandableSection>
              )}
            </div>
          )}
        </>
      </HeaderPanel>
    </div>
  );
};

export default Monitoring;
