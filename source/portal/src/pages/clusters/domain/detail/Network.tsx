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
import CopyText from "components/CopyText";
import { DomainDetails } from "API";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { InfoBarTypes } from "reducer/appReducer";
import {
  buildRoleLink,
  buildSGLink,
  buildSubnetLink,
  buildVPCLink,
} from "assets/js/utils";
import { t } from "i18next";
import { RootState } from "reducer/reducers";

interface OverviewProps {
  domainInfo: DomainDetails | undefined | null;
}

const Network: React.FC<OverviewProps> = ({ domainInfo }: OverviewProps) => {
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
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
                    amplifyConfig.aws_project_region,
                    domainInfo?.esVpc?.vpcId || ""
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
                {domainInfo?.esVpc?.securityGroupIds?.map((element) => {
                  return (
                    <div key={element}>
                      <ExtLink
                        to={buildSGLink(
                          amplifyConfig.aws_project_region,
                          element || ""
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
                    <div key={element}>
                      <ExtLink
                        to={buildSubnetLink(
                          amplifyConfig.aws_project_region,
                          element
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
                    amplifyConfig.aws_project_region,
                    domainInfo?.vpc?.vpcId || ""
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
                    amplifyConfig.aws_project_region,
                    domainInfo?.vpc?.securityGroupId || ""
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
                  .map((element) => {
                    return (
                      <div key={element}>
                        <ExtLink
                          to={buildSubnetLink(
                            amplifyConfig.aws_project_region,
                            element
                          )}
                        >
                          {element}
                        </ExtLink>
                      </div>
                    );
                  })}
                {domainInfo?.vpc?.publicSubnetIds?.split(",").map((element) => {
                  return element ? (
                    <div key={element}>
                      <ExtLink
                        to={buildSubnetLink(
                          amplifyConfig.aws_project_region,
                          element
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
