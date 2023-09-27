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
import ValueWithLabel from "components/ValueWithLabel";
import HeaderPanel from "components/HeaderPanel";
import ExtLink from "components/ExtLink";
import CopyText from "components/CopyText";
import { DomainDetails, EngineType, StorageType } from "API";
import { useTranslation } from "react-i18next";

interface OverviewProps {
  domainInfo: DomainDetails | undefined | null;
}

const Overview: React.FC<OverviewProps> = ({ domainInfo }: OverviewProps) => {
  const { t } = useTranslation();
  return (
    <div>
      <HeaderPanel title={t("cluster:detail.overview.name")}>
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("cluster:detail.overview.domainARN")}>
              <div>
                <CopyText text={domainInfo?.domainArn || ""}>
                  {domainInfo?.domainArn || ""}
                </CopyText>
              </div>
            </ValueWithLabel>
            <ValueWithLabel label={t("cluster:detail.overview.vpcEndpoint")}>
              <div>
                <CopyText text={`https://${domainInfo?.endpoint}` || ""}>
                  <ExtLink to={`https://${domainInfo?.endpoint}` || "/"}>
                    {t("cluster:detail.overview.clickOpen")}
                  </ExtLink>
                </CopyText>
              </div>
            </ValueWithLabel>
            {domainInfo?.engine === EngineType.Elasticsearch && (
              <ValueWithLabel label={t("cluster:detail.overview.kibana")}>
                <div>
                  <CopyText
                    text={`https://${domainInfo?.endpoint}/_plugin/kibana/`}
                  >
                    <ExtLink
                      to={
                        `https://${domainInfo?.endpoint}/_plugin/kibana/` || "/"
                      }
                    >
                      {t("cluster:detail.overview.clickOpen")}
                    </ExtLink>
                  </CopyText>
                </div>
              </ValueWithLabel>
            )}
            {domainInfo?.engine === EngineType.OpenSearch && (
              <ValueWithLabel label={t("cluster:detail.overview.osDashboard")}>
                <div>
                  <CopyText
                    text={`https://${domainInfo?.endpoint}/_dashboards`}
                  >
                    <ExtLink
                      to={`https://${domainInfo?.endpoint}/_dashboards` || "/"}
                    >
                      {t("cluster:detail.overview.clickOpen")}
                    </ExtLink>
                  </CopyText>
                </div>
              </ValueWithLabel>
            )}
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("cluster:detail.overview.az")}>
              <div>{domainInfo?.esVpc?.availabilityZones?.length || 0}</div>
            </ValueWithLabel>
            <ValueWithLabel label={t("cluster:detail.overview.instanceType")}>
              <div>{domainInfo?.nodes?.instanceType}</div>
            </ValueWithLabel>
            <ValueWithLabel label={t("cluster:detail.overview.numberNodes")}>
              <div>{domainInfo?.nodes?.instanceCount}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("cluster:detail.overview.masterNode")}>
              <div>{domainInfo?.nodes?.dedicatedMasterCount}</div>
            </ValueWithLabel>
            <ValueWithLabel
              label={t("cluster:detail.overview.masterInstanceType")}
            >
              <div>{domainInfo?.nodes?.dedicatedMasterType}</div>
            </ValueWithLabel>
            <ValueWithLabel label={t("cluster:detail.overview.warmNodes")}>
              <div>{domainInfo?.nodes?.warmCount}</div>
            </ValueWithLabel>
            <ValueWithLabel
              label={t("cluster:detail.overview.warmInstanceType")}
            >
              <div>{domainInfo?.nodes?.warmType}</div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("cluster:detail.overview.dataStoreType")}>
              <div>{domainInfo?.storageType}</div>
            </ValueWithLabel>
            {domainInfo?.storageType === StorageType.EBS && (
              <div>
                <ValueWithLabel
                  label={t("cluster:detail.overview.ebsVolumeType")}
                >
                  <div>{domainInfo?.volume?.type}</div>
                </ValueWithLabel>
                <ValueWithLabel
                  label={t("cluster:detail.overview.ebsVolumeSize")}
                >
                  <div>{domainInfo?.volume?.size} GiB</div>
                </ValueWithLabel>
              </div>
            )}
          </div>
        </div>
      </HeaderPanel>
    </div>
  );
};

export default Overview;
