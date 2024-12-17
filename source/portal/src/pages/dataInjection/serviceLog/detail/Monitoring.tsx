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

import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import React, { useMemo, useState } from "react";
import RefreshIcon from "@material-ui/icons/Refresh";
import { ServiceLogDetailProps } from "../ServiceLogDetail";
import {
  AnalyticEngineType,
  DestinationType,
  LogEventQueueType,
  PipelineStatus,
  PipelineType,
  ServiceType,
} from "API";
import { useTranslation } from "react-i18next";
import HeaderPanel from "components/HeaderPanel";
import ExtLink from "components/ExtLink";
import ExpandableSection from "components/ExpandableSection";
import ValueWithLabel from "components/ValueWithLabel";
import TimeRange from "components/TimeRange/TimeRange";
import Button from "components/Button";
import ServiceLogBufferMetrics from "./monitor/ServiceLogBufferMetrics";
import ServiceLogProcessorMetric from "./monitor/ServiceLogProcessorMetrics";
import LambdaBufferMetrics from "./monitor/lambda/LambdaBufferMetrics";
import RDSBufferMetrics from "./monitor/rds/RDSBufferMetrics";
import CloudTrailCWLBufferMetrics from "./monitor/cloudtrail/CloudTrailCWLBufferMetrics";
import VPCFlowLogBufferMetrics from "./monitor/vpc_flow/VPCFlowLogBufferMetrics";
import CloudFrontRealTimeBufferMetrics from "./monitor/cloudfront/CloudFrontRealTimeBufferMetrics";
import WAFSampledLogProcessorMetrics from "./monitor/waf/WAFSampledLogProcessorMetrics";
import {
  buildSQSLink,
  buildKDSLink,
  buildKDFLink,
  buildLambdaLink,
  defaultStr,
  ternary,
  buildOSIPipelineNameByPipelineId,
  buildEventRuleLink,
} from "assets/js/utils";
import { RootState } from "reducer/reducers";
import Alert from "components/Alert";
import OSIProcessorMetric from "pages/dataInjection/common/OSIProcessorMetrics";

interface MonitoringProps {
  isLightEngine?: boolean;
  pipelineInfo: ServiceLogDetailProps | undefined;
}

export interface ServiceMetricProps {
  pipelineInfo?: ServiceLogDetailProps;
  startDate: number;
  endDate: number;
  refreshCount: number;
  isLightEngine?: boolean;
}

const Monitoring: React.FC<MonitoringProps> = (props: MonitoringProps) => {
  const { pipelineInfo, isLightEngine } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const [curTimeRangeType, setCurTimeRangeType] = useState("12h");
  const [startDate, setStartDate] = useState(0);
  const [endDate, setEndDate] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);

  const is_S3_WAF_ELB_Config = useMemo(() => {
    return (
      pipelineInfo?.type === "S3" ||
      pipelineInfo?.type === "ELB" ||
      pipelineInfo?.type === "WAF" ||
      pipelineInfo?.type === "Config"
    );
  }, [pipelineInfo?.type]);

  const renderSQS = () => {
    if (pipelineInfo?.logEventQueueType === LogEventQueueType.EventBridge) {
      return (
        <ValueWithLabel label="EventBridge">
          <ExtLink
            to={buildEventRuleLink(
              amplifyConfig.aws_project_region,
              defaultStr(pipelineInfo?.sourceSQS)
            )}
          >
            {pipelineInfo?.sourceSQS}
          </ExtLink>
        </ValueWithLabel>
      );
    }
    return (
      <ValueWithLabel label="SQS">
        <ExtLink
          to={buildSQSLink(
            amplifyConfig.aws_project_region,
            defaultStr(pipelineInfo?.sourceSQS)
          )}
        >
          {pipelineInfo?.sourceSQS}
        </ExtLink>
      </ValueWithLabel>
    );
  };

  const renderKDS = () => {
    return (
      <ValueWithLabel label={t("common:monitoring.deliveryKDS")}>
        <ExtLink
          to={buildKDSLink(
            amplifyConfig.aws_project_region,
            defaultStr(pipelineInfo?.sourceKDS)
          )}
        >
          {pipelineInfo?.sourceKDS}
        </ExtLink>
      </ValueWithLabel>
    );
  };

  const renderKDF = () => {
    return (
      <ValueWithLabel label={t("common:monitoring.deliveryKDF")}>
        <ExtLink
          to={buildKDFLink(
            amplifyConfig.aws_project_region,
            defaultStr(pipelineInfo?.sourceKDF)
          )}
        >
          {pipelineInfo?.sourceKDF}
        </ExtLink>
      </ValueWithLabel>
    );
  };

  const renderLambdaProcessor = () => {
    return (
      <div>
        <div className="flex">
          <ValueWithLabel
            label={
              pipelineInfo?.engineType === AnalyticEngineType.LightEngine
                ? t("common:monitoring.lightEngineSvcLambdaDesc", {
                    service: pipelineInfo?.type,
                  })
                : t("common:monitoring.lambdaProcessor")
            }
          >
            <ExtLink
              to={buildLambdaLink(
                amplifyConfig.aws_project_region,
                defaultStr(pipelineInfo?.processorLambda?.split("/")[3])
              )}
            >
              {defaultStr(pipelineInfo?.processorLambda)}
            </ExtLink>
          </ValueWithLabel>
        </div>
        {pipelineInfo?.type === "WAFSampled" && (
          <WAFSampledLogProcessorMetrics
            pipelineInfo={pipelineInfo}
            startDate={startDate}
            endDate={endDate}
            refreshCount={refreshCount}
          />
        )}
        {pipelineInfo?.type !== "WAFSampled" && (
          <ServiceLogProcessorMetric
            pipelineInfo={pipelineInfo}
            startDate={startDate}
            endDate={endDate}
            refreshCount={refreshCount}
          />
        )}
      </div>
    );
  };

  const isNotRenderSQS = () => {
    return (
      (pipelineInfo?.type === "CloudTrail" &&
        pipelineInfo?.destinationType === DestinationType.CloudWatch) ||
      (pipelineInfo?.type === "CloudFront" &&
        pipelineInfo?.destinationType === DestinationType.KDS) ||
      (pipelineInfo?.type === "VPC" &&
        pipelineInfo?.destinationType === DestinationType.CloudWatch)
    );
  };

  const isNotRenderBuffer = () => {
    return (
      pipelineInfo?.type === ServiceType.WAFSampled &&
      !pipelineInfo.logEventQueueType
    );
  };

  return (
    <div>
      <HeaderPanel
        title={t("common:monitoring.title")}
        desc={<div>{t("info:monitoring.intro")}</div>}
      >
        <>
          {pipelineInfo?.status === PipelineStatus.ACTIVE ||
          pipelineInfo?.status === PipelineStatus.PAUSED ? (
            <>
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
                    data-testid="refresh-button"
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
                      setStartDate(range[0]);
                      setEndDate(range[1]);
                    }}
                    changeRangeType={(type) => {
                      setCurTimeRangeType(type);
                    }}
                  />
                </div>
              </div>
              {!isNotRenderBuffer() && (
                <ExpandableSection headerText={t("common:monitoring.buffer")}>
                  <div>
                    <div className="flex">
                      {!isNotRenderSQS() && renderSQS()}
                      {(pipelineInfo?.type === "CloudTrail" &&
                        pipelineInfo?.destinationType ===
                          DestinationType.CloudWatch) ||
                      (pipelineInfo?.type === "CloudFront" &&
                        pipelineInfo?.destinationType ===
                          DestinationType.KDS) ||
                      (pipelineInfo?.type === "VPC" &&
                        pipelineInfo?.destinationType ===
                          DestinationType.CloudWatch) ? (
                        renderKDS()
                      ) : (
                        <></>
                      )}
                      {pipelineInfo?.type === "Lambda" && !isLightEngine ? (
                        renderKDF()
                      ) : (
                        <></>
                      )}
                    </div>
                    {pipelineInfo?.type === "RDS" && (
                      <RDSBufferMetrics
                        pipelineInfo={pipelineInfo}
                        startDate={startDate}
                        endDate={endDate}
                        refreshCount={refreshCount}
                      />
                    )}
                    {pipelineInfo?.type === "Lambda" && (
                      <LambdaBufferMetrics
                        pipelineInfo={pipelineInfo}
                        startDate={startDate}
                        endDate={endDate}
                        refreshCount={refreshCount}
                      />
                    )}
                    {pipelineInfo?.type === "CloudTrail" && (
                      <>
                        {pipelineInfo?.destinationType ===
                          DestinationType.CloudWatch && (
                          <CloudTrailCWLBufferMetrics
                            pipelineInfo={pipelineInfo}
                            startDate={startDate}
                            endDate={endDate}
                            refreshCount={refreshCount}
                          />
                        )}
                        {pipelineInfo?.destinationType ===
                          DestinationType.S3 && (
                          <ServiceLogBufferMetrics
                            pipelineInfo={pipelineInfo}
                            startDate={startDate}
                            endDate={endDate}
                            refreshCount={refreshCount}
                          />
                        )}
                      </>
                    )}
                    {pipelineInfo?.type === "VPC" && (
                      <>
                        {pipelineInfo?.destinationType ===
                          DestinationType.CloudWatch && (
                          <VPCFlowLogBufferMetrics
                            pipelineInfo={pipelineInfo}
                            startDate={startDate}
                            endDate={endDate}
                            refreshCount={refreshCount}
                          />
                        )}
                        {pipelineInfo?.destinationType ===
                          DestinationType.S3 && (
                          <ServiceLogBufferMetrics
                            pipelineInfo={pipelineInfo}
                            startDate={startDate}
                            endDate={endDate}
                            refreshCount={refreshCount}
                          />
                        )}
                      </>
                    )}
                    {pipelineInfo?.type === "CloudFront" && (
                      <>
                        {pipelineInfo?.destinationType ===
                          DestinationType.KDS && (
                          <CloudFrontRealTimeBufferMetrics
                            pipelineInfo={pipelineInfo}
                            startDate={startDate}
                            endDate={endDate}
                            refreshCount={refreshCount}
                          />
                        )}
                        {pipelineInfo?.destinationType ===
                          DestinationType.S3 && (
                          <ServiceLogBufferMetrics
                            pipelineInfo={pipelineInfo}
                            startDate={startDate}
                            endDate={endDate}
                            refreshCount={refreshCount}
                          />
                        )}
                      </>
                    )}
                    {pipelineInfo.type === ServiceType.WAFSampled &&
                      pipelineInfo.logEventQueueType && (
                        <ServiceLogBufferMetrics
                          pipelineInfo={pipelineInfo}
                          startDate={startDate}
                          endDate={endDate}
                          refreshCount={refreshCount}
                        />
                      )}
                    {is_S3_WAF_ELB_Config && (
                      <ServiceLogBufferMetrics
                        pipelineInfo={pipelineInfo}
                        startDate={startDate}
                        endDate={endDate}
                        refreshCount={refreshCount}
                      />
                    )}
                  </div>
                </ExpandableSection>
              )}

              {pipelineInfo.osiParams.minCapacity ? (
                <ExpandableSection headerText={t("monitoring.osiProcessor")}>
                  <OSIProcessorMetric
                    amplifyConfig={amplifyConfig}
                    osiPipelineName={buildOSIPipelineNameByPipelineId(
                      defaultStr(pipelineInfo?.id)
                    )}
                    type={PipelineType.SERVICE}
                    pipelineId={defaultStr(pipelineInfo?.id)}
                    startDate={startDate}
                    endDate={endDate}
                    refreshCount={refreshCount}
                  />
                </ExpandableSection>
              ) : (
                <ExpandableSection
                  headerText={ternary(
                    pipelineInfo.engineType === AnalyticEngineType.LightEngine,
                    t("common:monitoring.lambda"),
                    t("common:monitoring.lambdaProcessor")
                  )}
                >
                  <div>{renderLambdaProcessor()}</div>
                </ExpandableSection>
              )}
            </>
          ) : (
            <Alert content={t("alarm.notActive")} />
          )}
        </>
      </HeaderPanel>
    </div>
  );
};

export default Monitoring;
