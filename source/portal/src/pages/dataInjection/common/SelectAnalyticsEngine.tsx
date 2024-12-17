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

import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import Tiles from "components/Tiles";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AppLogSourceType, ServiceLogType } from "assets/js/const";
import { DestinationType, PipelineType } from "API";
import AppPipelineDesc from "../applicationLog/common/AppPipelineDesc";
import { AnalyticEngineTypes, WAFIngestOption } from "types";
import Common_AOS from "assets/images/desc/Common_AOS.svg";
import Common_LightEngine from "assets/images/desc/Common_LightEngine.svg";
import CloudFront_KDS from "assets/images/desc/CloudFront_KDS.svg";
import CloudTrail_VPC_AOS from "assets/images/desc/CloudTrail_VPC_AOS.svg";
import Lambda_KDF_AOS from "assets/images/desc/Lambda_KDF_AOS.svg";
import RDS_AOS from "assets/images/desc/RDS_AOS.svg";
import RDS_LightEngine from "assets/images/desc/RDS_LightEngine.svg";
// Latest image was missing, so I added it here
const LIGHT_ENGINE_SUPPORTED_LOG_TYPES = [
  ServiceLogType.Amazon_WAF,
  ServiceLogType.Amazon_CloudFront,
  ServiceLogType.Amazon_ELB,
  ServiceLogType.Amazon_CloudTrail,
  ServiceLogType.Amazon_VPCLogs,
  ServiceLogType.Amazon_RDS,
] as string[];

const LIGHT_ENGINE_SUPPORTED_APP_LOG_TYPES = [
  AppLogSourceType.EC2,
  AppLogSourceType.EKS,
  AppLogSourceType.SYSLOG,
  AppLogSourceType.S3,
] as string[];

export interface SelectAnalyticsEngineProps {
  pipelineType: PipelineType;
  engineType: AnalyticEngineTypes;
  svcLogType?: ServiceLogType;
  appLogType?: AppLogSourceType;
  setEngineType: (engineType: AnalyticEngineTypes) => void;
  disableLightEngine?: boolean;
  ingestLogType?: string;
}

export const SelectAnalyticsEngine: React.FC<SelectAnalyticsEngineProps> = ({
  engineType,
  setEngineType,
  pipelineType,
  svcLogType,
  appLogType,
  disableLightEngine,
  ingestLogType,
}: SelectAnalyticsEngineProps) => {
  const { t } = useTranslation();
  const isLightEngineSupported = useMemo(
    () =>
      LIGHT_ENGINE_SUPPORTED_LOG_TYPES.includes(svcLogType ?? "") ||
      LIGHT_ENGINE_SUPPORTED_APP_LOG_TYPES.includes(appLogType ?? ""),
    [svcLogType, appLogType]
  );
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );
  return (
    <HeaderPanel
      title={t("lightengine:engine.selectEngineSectionTitle")}
      desc={t("lightengine:engine.selectEngineDesc")}
    >
      <>
        <FormItem>
          <Tiles
            value={engineType}
            onChange={(event) => {
              setEngineType(event.target.value as AnalyticEngineTypes);
            }}
            items={[
              {
                label: t("lightengine:engine.optionOpenSearch"),
                description: t("lightengine:engine.descOpenSearch"),
                value: AnalyticEngineTypes.OPENSEARCH,
              },
              {
                disabled: !isLightEngineSupported || disableLightEngine,
                label: t("lightengine:engine.optionLightEngine"),
                description: t("lightengine:engine.descLightEngine"),
                value: AnalyticEngineTypes.LIGHT_ENGINE,
              },
            ]}
          />
        </FormItem>
        {pipelineType === PipelineType.SERVICE ? (
          <div>
            <div className="ingest-desc-title">{t("archName")}</div>
            <div className="ingest-desc-desc">{t("archDesc")}</div>
            {svcLogType === ServiceLogType.Amazon_S3 && (
              <div className="mt-10">
                <img
                  className="img-border"
                  alt="architecture"
                  width="100%"
                  src={Common_AOS}
                />
              </div>
            )}
            {svcLogType === ServiceLogType.Amazon_CloudFront && (
              <>
                {!isLightEngine ? (
                  <>
                    {ingestLogType === DestinationType.S3 && (
                      <div className="mt-10">
                        <img
                          className="img-border"
                          alt="architecture"
                          width="100%"
                          src={Common_AOS}
                        />
                      </div>
                    )}
                    {ingestLogType === DestinationType.KDS && (
                      <div className="mt-10">
                        <img
                          className="img-border"
                          alt="architecture"
                          width="100%"
                          src={CloudFront_KDS}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-10">
                    <img
                      className="img-border"
                      alt="architecture"
                      width="100%"
                      src={Common_LightEngine}
                    />
                  </div>
                )}
              </>
            )}
            {svcLogType === ServiceLogType.Amazon_CloudTrail && (
              <>
                {!isLightEngine ? (
                  <>
                    {ingestLogType === DestinationType.S3 && (
                      <div className="mt-10">
                        <img
                          className="img-border"
                          alt="architecture"
                          width="100%"
                          src={Common_AOS}
                        />
                      </div>
                    )}
                    {ingestLogType === DestinationType.CloudWatch && (
                      <div className="mt-10">
                        <img
                          className="img-border"
                          alt="architecture"
                          width="100%"
                          src={CloudTrail_VPC_AOS}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-10">
                    <img
                      className="img-border"
                      alt="architecture"
                      width="100%"
                      src={Common_LightEngine}
                    />
                  </div>
                )}
              </>
            )}
            {svcLogType === ServiceLogType.Amazon_Config && (
              <div className="mt-10">
                <img
                  className="img-border"
                  alt="architecture"
                  width="100%"
                  src={Common_AOS}
                />
              </div>
            )}
            {svcLogType === ServiceLogType.Amazon_ELB && (
              <div className="mt-10">
                <img
                  className="img-border"
                  alt="architecture"
                  width="100%"
                  src={isLightEngine ? Common_LightEngine : Common_AOS}
                />
              </div>
            )}
            {svcLogType === ServiceLogType.Amazon_Lambda && (
              <div className="mt-10">
                <img
                  className="img-border"
                  alt="architecture"
                  width="100%"
                  src={Lambda_KDF_AOS}
                />
              </div>
            )}
            {svcLogType === ServiceLogType.Amazon_RDS && (
              <div className="mt-10">
                <img
                  className="img-border"
                  alt="architecture"
                  width="100%"
                  src={isLightEngine ? RDS_LightEngine : RDS_AOS}
                />
              </div>
            )}
            {svcLogType === ServiceLogType.Amazon_VPCLogs && (
              <>
                {!isLightEngine ? (
                  <>
                    {ingestLogType === DestinationType.S3 && (
                      <div className="mt-10">
                        <img
                          className="img-border"
                          alt="architecture"
                          width="100%"
                          src={Common_AOS}
                        />
                      </div>
                    )}
                    {ingestLogType === DestinationType.CloudWatch && (
                      <div className="mt-10">
                        <img
                          className="img-border"
                          alt="architecture"
                          width="100%"
                          src={CloudTrail_VPC_AOS}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-10">
                    <img
                      className="img-border"
                      alt="architecture"
                      width="100%"
                      src={Common_LightEngine}
                    />
                  </div>
                )}
              </>
            )}
            {svcLogType === ServiceLogType.Amazon_WAF && (
              <>
                {!isLightEngine ? (
                  <>
                    {ingestLogType === WAFIngestOption.FullRequest && (
                      <div className="mt-10">
                        <img
                          className="img-border"
                          alt="architecture"
                          width="100%"
                          src={Common_AOS}
                        />
                      </div>
                    )}
                    {ingestLogType === WAFIngestOption.SampledRequest && (
                      <div className="mt-10">
                        <img
                          className="img-border"
                          alt="architecture"
                          width="100%"
                          src={RDS_AOS}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-10">
                    <img
                      className="img-border"
                      alt="architecture"
                      width="100%"
                      src={Common_LightEngine}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <AppPipelineDesc
            ingestLogType={ingestLogType}
            type={appLogType ?? AppLogSourceType.EC2}
            engineType={engineType}
          />
        )}
      </>
    </HeaderPanel>
  );
};
