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
import { EKSClusterLogSource, EKSDeployKind } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import {
  buildEKSLink,
  buildESLink,
  buildRoleLink,
  formatLocalTime,
} from "assets/js/utils";
import Breadcrumb from "components/Breadcrumb";
import CopyText from "components/CopyText";
import ExtLink from "components/ExtLink";
import HeaderPanel from "components/HeaderPanel";
import HelpPanel from "components/HelpPanel";
import LoadingText from "components/LoadingText";
import SideMenu from "components/SideMenu";
import { AntTab, AntTabs, TabPanel } from "components/Tab";
import ValueWithLabel from "components/ValueWithLabel";
import { getEKSClusterDetails } from "graphql/queries";
import AccountName from "pages/comps/account/AccountName";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import { AppStateProps, InfoBarTypes } from "reducer/appReducer";
import { AmplifyConfigType } from "types";
import DaemonsetGuide from "./detail/DaemonsetGuide";
import EksIngestions from "./detail/Ingestions";
import Tags from "./detail/Tags";

interface MatchParams {
  id: string;
  type: string;
}

const EksLogDetail: React.FC<RouteComponentProps<MatchParams>> = (
  props: RouteComponentProps<MatchParams>
) => {
  const id: string = props.match.params.id;
  const type: string = props.match.params.type;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  const [loadingData, setLoadingData] = useState(true);
  const [curEksLogSource, setCurEksLogSource] = useState<
    EKSClusterLogSource | undefined
  >();
  const [activeTab, setActiveTab] = useState(type === "guide" ? 1 : 0);
  const [showDaemonsetGuide, setShowDaemonsetGuide] = useState(false);

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("ekslog:name"),
      link: "/containers/eks-log",
    },
    {
      name: curEksLogSource?.eksClusterName || "",
    },
  ];

  const getEksLogSourceById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getEKSClusterDetails, {
        eksClusterId: id,
      });
      console.info(resData);
      const configData = resData.data.getEKSClusterDetails;
      setCurEksLogSource(configData);
      setLoadingData(false);
      setShowDaemonsetGuide(() => {
        return configData.deploymentKind === EKSDeployKind.DaemonSet;
      });
    } catch (error) {
      setCurEksLogSource(undefined);
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getEksLogSourceById();
  }, []);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <Breadcrumb list={breadCrumbList} />
          {loadingData ? (
            <LoadingText text="" />
          ) : (
            <div className="service-log">
              <div>
                <HeaderPanel title={t("ekslog:detail.config")}>
                  <div className="flex value-label-span">
                    <div className="flex-1">
                      <ValueWithLabel label={t("ekslog:detail.clusterName")}>
                        <div>
                          {curEksLogSource?.accountId ? (
                            <ExtLink
                              to={buildEKSLink(
                                amplifyConfig.aws_project_region,
                                curEksLogSource?.eksClusterName
                              )}
                            >
                              {curEksLogSource?.eksClusterName}
                            </ExtLink>
                          ) : (
                            curEksLogSource?.eksClusterName
                          )}
                        </div>
                      </ValueWithLabel>
                      <ValueWithLabel
                        label={t("ekslog:detail.deploymentPattern")}
                      >
                        <div>{curEksLogSource?.deploymentKind}</div>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel label={t("ekslog:detail.aos")}>
                        <ExtLink
                          to={buildESLink(
                            amplifyConfig.aws_project_region,
                            curEksLogSource?.aosDomain?.domainName || ""
                          )}
                        >
                          {curEksLogSource?.aosDomain?.domainName}
                        </ExtLink>
                      </ValueWithLabel>
                      {curEksLogSource?.accountId && (
                        <ValueWithLabel
                          label={t("resource:crossAccount.account")}
                        >
                          <AccountName
                            accountId={curEksLogSource?.accountId}
                            region={amplifyConfig.aws_project_region}
                          />
                        </ValueWithLabel>
                      )}
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel
                        label={t("ekslog:detail.iamRole")}
                        infoType={InfoBarTypes.EKS_IAM_ROLE}
                      >
                        <CopyText text={curEksLogSource?.logAgentRoleArn || ""}>
                          <ExtLink
                            to={buildRoleLink(
                              curEksLogSource?.logAgentRoleArn
                                ? curEksLogSource.logAgentRoleArn.split("/")[1]
                                : "",
                              amplifyConfig.aws_project_region
                            )}
                          >
                            {curEksLogSource?.logAgentRoleArn}
                          </ExtLink>
                        </CopyText>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel label={t("ekslog:detail.created")}>
                        <div>
                          {formatLocalTime(curEksLogSource?.createdDt || "")}
                        </div>
                      </ValueWithLabel>
                    </div>
                  </div>
                </HeaderPanel>
              </div>
              {curEksLogSource && (
                <div>
                  <AntTabs
                    value={activeTab}
                    onChange={(event, newTab) => {
                      setActiveTab(newTab);
                    }}
                  >
                    <AntTab label={t("ekslog:detail.tab.ingestions")} />
                    {showDaemonsetGuide && (
                      <AntTab label={t("ekslog:detail.tab.daemonsetGuide")} />
                    )}
                    <AntTab label={t("ekslog:detail.tab.tags")} />
                  </AntTabs>
                  <TabPanel value={activeTab} index={0}>
                    <EksIngestions eksLogSourceInfo={curEksLogSource} />
                  </TabPanel>
                  {showDaemonsetGuide && (
                    <TabPanel value={activeTab} index={1}>
                      <DaemonsetGuide eksLogSourceInfo={curEksLogSource} />
                    </TabPanel>
                  )}
                  <TabPanel
                    value={activeTab}
                    index={showDaemonsetGuide ? 2 : 1}
                  >
                    <Tags eksLogSourceInfo={curEksLogSource} />
                  </TabPanel>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default EksLogDetail;
