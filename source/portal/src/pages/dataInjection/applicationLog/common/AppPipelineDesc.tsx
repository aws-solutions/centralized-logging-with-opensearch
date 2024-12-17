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
import IMAGE_SL_Amazon_EC2 from "assets/images/type/amazon_ec2.svg";
import IMAGE_SL_Amazon_EKS from "assets/images/type/amazon_eks.svg";
import IMAGE_SL_SYSLOG from "assets/images/type/syslog.svg";
import IMAGE_SL_Amazon_S3 from "assets/images/type/amazon_s3.svg";
import EC2_EKS_AOS from "assets/images/desc/EC2_EKS_AOS.svg";
import EC2_EKS_LightEngine from "assets/images/desc/EC2_EKS_LightEngine.svg";
import S3_AOS_OneTime from "assets/images/desc/S3_AOS_OneTime.svg";
import S3_AOS_OnGoing from "assets/images/desc/S3_AOS_OnGoing.svg";
import S3_LightEngine_OnGoing from "assets/images/desc/S3_LightEngine_OnGoing.svg";
import Syslog_AOS from "assets/images/desc/Syslog_AOS.svg";
import Syslog_LightEngine from "assets/images/desc/Syslog_LightEngine.svg";

import { AppLogSourceType } from "assets/js/const";
import React, { useMemo } from "react";

import { useTranslation } from "react-i18next";
import { AnalyticEngineTypes } from "types";
import { IngestionMode } from "API";

export const AppLogSourceMap = {
  [AppLogSourceType.EC2]: {
    value: AppLogSourceType.EC2,
    name: "applog:logSourceDesc.ec2.title",
    descLink: {
      href: "https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/prerequisites-2.html#amazon-ec2-instance-group",
      i18nKey: "applog:logSourceDesc.ec2.instanceGroup",
    },
    img: IMAGE_SL_Amazon_EC2,
    archImg: EC2_EKS_AOS,
    lightEngineImg: EC2_EKS_LightEngine,
    disabled: false,
  },
  [AppLogSourceType.EKS]: {
    value: AppLogSourceType.EKS,
    name: "applog:logSourceDesc.eks.title",
    descLink: { href: "", i18nKey: "" },
    img: IMAGE_SL_Amazon_EKS,
    archImg: EC2_EKS_AOS,
    lightEngineImg: EC2_EKS_LightEngine,
    disabled: false,
  },
  [AppLogSourceType.SYSLOG]: {
    value: AppLogSourceType.SYSLOG,
    name: "applog:logSourceDesc.syslog.title",
    descLink: { href: "", i18nKey: "" },
    img: IMAGE_SL_SYSLOG,
    archImg: Syslog_AOS,
    lightEngineImg: Syslog_LightEngine,
    disabled: false,
  },
  [AppLogSourceType.S3]: {
    value: AppLogSourceType.S3,
    name: "applog:logSourceDesc.s3.title",
    descLink: { href: "", i18nKey: "" },
    img: IMAGE_SL_Amazon_S3,
    archImg: "",
    lightEngineImg: "",
    disabled: false,
  },
};

interface AppPipelineDescProps {
  type: AppLogSourceType;
  engineType: AnalyticEngineTypes;
  ingestLogType?: string;
}

const AppPipelineDesc: React.FC<AppPipelineDescProps> = (
  props: AppPipelineDescProps
) => {
  const { t } = useTranslation();
  const { type, engineType, ingestLogType } = props;
  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );

  console.info(
    "type, engineType, ingestLogType:",
    type,
    engineType,
    ingestLogType
  );

  return (
    <div>
      <div className="ingest-desc-title">{t("archName")}</div>
      <div className="ingest-desc-desc">{t("archDesc")}</div>
      {type !== AppLogSourceType.S3 && (
        <div className="mt-10">
          <img
            className="img-border"
            alt="architecture"
            width="100%"
            src={
              AppLogSourceMap[type][
                isLightEngine ? "lightEngineImg" : "archImg"
              ]
            }
          />
        </div>
      )}
      {type === AppLogSourceType.S3 && (
        <React.Fragment>
          {!isLightEngine ? (
            <>
              {ingestLogType === IngestionMode.ON_GOING && (
                <div className="mt-10">
                  <img
                    className="img-border"
                    alt="architecture"
                    width="100%"
                    src={S3_AOS_OnGoing}
                  />
                </div>
              )}

              {ingestLogType === IngestionMode.ONE_TIME && (
                <div className="mt-10">
                  <img
                    className="img-border"
                    alt="architecture"
                    width="100%"
                    src={S3_AOS_OneTime}
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
                src={S3_LightEngine_OnGoing}
              />
            </div>
          )}
        </React.Fragment>
      )}
    </div>
  );
};

export default AppPipelineDesc;
