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
import React, { ReactElement } from "react";
import { SvcDetailProps } from "../ServiceLogDetail";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import { useTranslation } from "react-i18next";
import {
  buildCloudFrontLink,
  buildConfigLink,
  buildELBLink,
  buildLambdaLink,
  buildRDSLink,
  buildS3Link,
  buildTrailLink,
  buildVPCLink,
  buildWAFLink,
  defaultStr,
  splitStringToBucketAndPrefix,
  ternary,
} from "assets/js/utils";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import { DestinationType, ServiceType } from "API";
import { ServiceTypeNameMap } from "assets/js/const";
import AccountName from "pages/comps/account/AccountName";

const LogSource: React.FC<SvcDetailProps> = (props: SvcDetailProps) => {
  const { pipelineInfo } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const buildLambdaInfo = (): ReactElement => {
    return (
      <ExtLink
        to={buildLambdaLink(
          amplifyConfig.aws_project_region,
          defaultStr(pipelineInfo?.source)
        )}
      >
        {pipelineInfo?.source}
      </ExtLink>
    );
  };

  const buildS3Info = (): ReactElement => {
    return (
      <ExtLink
        to={buildS3Link(
          amplifyConfig.aws_project_region,
          defaultStr(pipelineInfo?.source)
        )}
      >
        {pipelineInfo?.source}
      </ExtLink>
    );
  };

  const buildCloudFrontInfo = (): ReactElement => {
    return (
      <ExtLink
        to={buildCloudFrontLink(
          amplifyConfig.aws_project_region,
          defaultStr(pipelineInfo?.source)
        )}
      >
        {pipelineInfo?.source}
      </ExtLink>
    );
  };

  const buildELBInfo = (): ReactElement => {
    return (
      <ExtLink to={buildELBLink(amplifyConfig.aws_project_region)}>
        {pipelineInfo?.source}
      </ExtLink>
    );
  };

  const buildWAFInfo = (): ReactElement => {
    return (
      <ExtLink
        to={buildWAFLink(
          amplifyConfig.aws_project_region,
          pipelineInfo?.webACLScope
        )}
      >
        {pipelineInfo?.source}
      </ExtLink>
    );
  };

  const buildVPCInfo = (): ReactElement => {
    return (
      <ExtLink
        to={buildVPCLink(
          amplifyConfig.aws_project_region,
          defaultStr(pipelineInfo?.source)
        )}
      >
        {pipelineInfo?.source}
      </ExtLink>
    );
  };

  const buildCloudTrailInfo = (): ReactElement => {
    return (
      <ExtLink to={buildTrailLink(amplifyConfig.aws_project_region)}>
        {pipelineInfo?.source}
      </ExtLink>
    );
  };

  const buildConfigInfo = (): ReactElement => {
    return (
      <ExtLink to={buildConfigLink(amplifyConfig.aws_project_region)}>
        {pipelineInfo?.source}
      </ExtLink>
    );
  };

  const buildRDSInfo = (): ReactElement => {
    return (
      <ExtLink to={buildRDSLink(amplifyConfig.aws_project_region)}>
        {pipelineInfo?.source}
      </ExtLink>
    );
  };

  const buildLogLocationLink = () => {
    if (!pipelineInfo?.logLocation) {
      return "";
    } else if (pipelineInfo.logLocation.toLocaleLowerCase().startsWith("s3:")) {
      const { bucket, prefix } = splitStringToBucketAndPrefix(
        pipelineInfo.logLocation
      );
      return (
        <ExtLink
          to={buildS3Link(amplifyConfig.aws_project_region, bucket, prefix)}
        >
          {pipelineInfo?.logLocation}
        </ExtLink>
      );
    } else {
      return pipelineInfo.logLocation;
    }
  };

  const buildDiffServiceInfo = (): ReactElement | null => {
    let serviceInfo: ReactElement | null = null;
    if (pipelineInfo?.type === ServiceType.Lambda) {
      serviceInfo = buildLambdaInfo();
    }
    if (pipelineInfo?.type === ServiceType.S3) {
      serviceInfo = buildS3Info();
    }
    if (pipelineInfo?.type === ServiceType.CloudFront) {
      serviceInfo = buildCloudFrontInfo();
    }
    if (pipelineInfo?.type === ServiceType.ELB) {
      serviceInfo = buildELBInfo();
    }
    if (
      pipelineInfo?.type === ServiceType.WAF ||
      pipelineInfo?.type === ServiceType.WAFSampled
    ) {
      serviceInfo = buildWAFInfo();
    }
    if (pipelineInfo?.type === ServiceType.VPC) {
      serviceInfo = buildVPCInfo();
    }
    if (pipelineInfo?.type === ServiceType.CloudTrail) {
      serviceInfo = buildCloudTrailInfo();
    }
    if (pipelineInfo?.type === ServiceType.Config) {
      serviceInfo = buildConfigInfo();
    }
    if (pipelineInfo?.type === ServiceType.RDS) {
      serviceInfo = buildRDSInfo();
    }
    return serviceInfo;
  };

  const buildLogTypeValue = () => {
    const typeMappings: any = {
      [ServiceType.CloudFront]: {
        [DestinationType.KDS]: "servicelog:create.ingestTypeKDS",
        default: "servicelog:create.ingestTypeS3",
      },
      [ServiceType.CloudTrail]: {
        [DestinationType.CloudWatch]: "servicelog:create.ingestTypeCloudWatch",
        default: "servicelog:create.ingestTypeAmazonS3",
      },
      [ServiceType.WAF]: {
        default: "servicelog:create.ingestTypeFullRequest",
      },
      [ServiceType.WAFSampled]: {
        default: "servicelog:create.ingestTypeSampledRequest",
      },
      [ServiceType.ELB]: {
        default: "servicelog:create.ingestTypeALB",
      },
      [ServiceType.VPC]: {
        [DestinationType.CloudWatch]: "servicelog:create.ingestTypeCloudWatch",
        default: "servicelog:create.ingestTypeAmazonS3",
      },
      [ServiceType.S3]: {
        default: "servicelog:create.ingestTypeS3",
      },
      [ServiceType.Lambda]: {
        default: "servicelog:create.ingestTypeCloudWatch",
      },
      [ServiceType.Config]: {
        default: "servicelog:create.ingestTypeAmazonS3",
      },
      [ServiceType.RDS]: {
        default: "servicelog:create.ingestTypeAmazonS3",
      },
    };

    if (!pipelineInfo) {
      return "-";
    }

    const typeConfig = typeMappings[pipelineInfo?.type];

    const translationKey: string =
      typeConfig?.[pipelineInfo?.destinationType] || typeConfig?.default || "-";
    return t(translationKey);
  };

  return (
    <HeaderWithValueLabel
      numberOfColumns={3}
      headerTitle={t("servicelog:tab.logSource")}
      fixedDataList={[
        [
          {
            label: t("servicelog:detail.type"),
            data: t(ServiceTypeNameMap[defaultStr(pipelineInfo?.type)]),
          },
          {
            label: t("servicelog:detail.resources"),
            data: buildDiffServiceInfo(),
          },
          ...(pipelineInfo?.type === ServiceType.CloudFront &&
          pipelineInfo?.destinationType === DestinationType.KDS
            ? [
                {
                  label: t("servicelog:detail.samplingRate"),
                  data: ternary(
                    pipelineInfo?.samplingRate,
                    pipelineInfo?.samplingRate + "%",
                    "-"
                  ),
                },
              ]
            : []),
        ],
        [
          {
            label: t("servicelog:detail.logType"),
            data: buildLogTypeValue(),
          },
          {
            label: ternary(
              pipelineInfo?.destinationType === DestinationType.CloudWatch,
              t("servicelog:overview.logGroup"),
              t("servicelog:overview.logLocation")
            ),
            data:
              (pipelineInfo?.destinationType === DestinationType.KDS
                ? "Kinesis Data Streams"
                : "") ||
              buildLogLocationLink() ||
              "-",
          },
        ],

        [
          {
            label: t("resource:crossAccount.account"),
            data: (
              <AccountName
                accountId={pipelineInfo?.logSourceAccountId}
                region={amplifyConfig.aws_project_region}
              />
            ),
          },
        ],
      ]}
    />
  );
};

export default LogSource;
