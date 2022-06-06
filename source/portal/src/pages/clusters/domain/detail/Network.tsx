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
import ValueWithLabel from "components/ValueWithLabel";
import HeaderPanel from "components/HeaderPanel";
import CopyText from "components/CopyText";
import { DomainDetails } from "API";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { AppStateProps, InfoBarTypes } from "reducer/appReducer";
import {
  buildRoleLink,
  buildSGLink,
  buildSubnetLink,
  buildVPCLink,
} from "assets/js/utils";
import { t } from "i18next";

interface OverviewProps {
  domainInfo: DomainDetails | undefined | null;
}

const Network: React.FC<OverviewProps> = ({ domainInfo }: OverviewProps) => {
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  return (
    <div>
      <HeaderPanel title={t("cluster:detail.network.name")}>
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("cluster:detail.network.vpc")}>
              <CopyText text={domainInfo?.esVpc?.vpcId || ""}>
                <ExtLink
                  to={buildVPCLink(
                    domainInfo?.esVpc?.vpcId || "",
                    amplifyConfig.aws_project_region
                  )}
                >
                  {domainInfo?.esVpc?.vpcId || ""}
                </ExtLink>
              </CopyText>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("cluster:detail.network.securityGroups")}>
              <div>
                {domainInfo?.esVpc?.securityGroupIds?.map((element, index) => {
                  return (
                    <div key={index}>
                      <ExtLink
                        to={buildSGLink(
                          element || "",
                          amplifyConfig.aws_project_region
                        )}
                      >
                        {element}
                      </ExtLink>
                    </div>
                  );
                })}
              </div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("cluster:detail.network.iamRole")}>
              <div>
                <ExtLink
                  to={buildRoleLink(
                    "AWSServiceRoleForAmazonOpenSearchService",
                    amplifyConfig.aws_project_region
                  )}
                >{`AWSServiceRoleForAmazonOpenSearchService`}</ExtLink>
              </div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("cluster:detail.network.azSubnets")}>
              <div>
                {domainInfo?.esVpc?.subnetIds?.map((element, index) => {
                  return (
                    <div key={index}>
                      <ExtLink
                        to={buildSubnetLink(
                          element,
                          amplifyConfig.aws_project_region
                        )}
                      >{`${
                        domainInfo.esVpc?.availabilityZones?.[index]
                      }:${" "}${element}`}</ExtLink>
                    </div>
                  );
                })}
              </div>
            </ValueWithLabel>
          </div>
        </div>
      </HeaderPanel>

      <HeaderPanel
        title={t("cluster:detail.network.logProcessing")}
        infoType={InfoBarTypes.LOG_PROCESSING}
      >
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel label={t("cluster:detail.network.vpc")}>
              <CopyText text={domainInfo?.vpc?.vpcId || ""}>
                <ExtLink
                  to={buildVPCLink(
                    domainInfo?.vpc?.vpcId || "",
                    amplifyConfig.aws_project_region
                  )}
                >
                  {domainInfo?.vpc?.vpcId || ""}
                </ExtLink>
              </CopyText>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("cluster:detail.network.securityGroups")}>
              <div>
                <ExtLink
                  to={buildSGLink(
                    domainInfo?.vpc?.securityGroupId || "",
                    amplifyConfig.aws_project_region
                  )}
                >
                  {domainInfo?.vpc?.securityGroupId || ""}
                </ExtLink>
              </div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("cluster:detail.network.azSubnets")}>
              <div>
                {domainInfo?.vpc?.privateSubnetIds
                  ?.split(",")
                  .map((element, index) => {
                    return (
                      <div key={index}>
                        <ExtLink
                          to={buildSubnetLink(
                            element,
                            amplifyConfig.aws_project_region
                          )}
                        >
                          {element}
                        </ExtLink>
                      </div>
                    );
                  })}
                {domainInfo?.vpc?.publicSubnetIds
                  ?.split(",")
                  .map((element, index) => {
                    return element ? (
                      <div key={index}>
                        <ExtLink
                          to={buildSubnetLink(
                            element,
                            amplifyConfig.aws_project_region
                          )}
                        >
                          {element}
                        </ExtLink>
                      </div>
                    ) : (
                      ""
                    );
                  })}
              </div>
            </ValueWithLabel>
          </div>
        </div>
      </HeaderPanel>
    </div>
  );
};

export default Network;
