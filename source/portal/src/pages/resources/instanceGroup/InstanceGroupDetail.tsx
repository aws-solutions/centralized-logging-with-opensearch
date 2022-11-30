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
/* eslint-disable react/display-name */
import React, { useState, useEffect } from "react";
import { RouteComponentProps } from "react-router-dom";
import SideMenu from "components/SideMenu";
import Breadcrumb from "components/Breadcrumb";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import LoadingText from "components/LoadingText";
import { appSyncRequestQuery } from "assets/js/request";
import { getInstanceGroup } from "graphql/queries";
import { InstanceGroup, LogSourceType } from "API";
import {
  ASG_SELECTION,
  DEFAULT_INSTANCE_SELECTION,
  DEFAULT_PLATFORM,
  ResourceStatus,
} from "assets/js/const";
import { buildASGLink, formatLocalTime } from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Alert } from "assets/js/alert";
import AccountName from "pages/comps/account/AccountName";
import DetailEC2 from "./comps/DetailEC2";
import DetailASG from "./comps/DetailASG";
import ExtLink from "components/ExtLink";

interface MatchParams {
  id: string;
}

const InstanceGroupDetail: React.FC<RouteComponentProps<MatchParams>> = (
  props: RouteComponentProps<MatchParams>
) => {
  const id: string = props.match.params.id;
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const { t } = useTranslation();
  const [curInstanceGroup, setCurInstanceGroup] = useState<InstanceGroup>();
  const [loadingData, setLoadingData] = useState(true);

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("resource:group.name"),
      link: "/resources/instance-group",
    },
    { name: curInstanceGroup?.groupName || "" },
  ];

  const getInstanceGroupById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getInstanceGroup, {
        id: id,
      });
      console.info("resData:", resData);
      const dataInstanceGroup: InstanceGroup = resData.data.getInstanceGroup;
      if (dataInstanceGroup.status === ResourceStatus.INACTIVE) {
        Alert(t("resource:group.detail.notExist"));
        return;
      }
      setCurInstanceGroup(dataInstanceGroup);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getInstanceGroupById();
  }, []);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />
            {loadingData ? (
              <LoadingText text="" />
            ) : (
              <div className="pb-50">
                <>
                  <PagePanel title={curInstanceGroup?.groupName || ""}>
                    <>
                      <HeaderPanel title={t("resource:group.detail.general")}>
                        <div className="flex value-label-span">
                          <div className="flex-1">
                            <ValueWithLabel
                              label={t("resource:group.detail.name")}
                            >
                              <div>{curInstanceGroup?.groupName}</div>
                            </ValueWithLabel>
                            {curInstanceGroup?.accountId && (
                              <ValueWithLabel
                                label={t("resource:crossAccount.account")}
                              >
                                <AccountName
                                  accountId={curInstanceGroup?.accountId}
                                  region={amplifyConfig.aws_project_region}
                                />
                              </ValueWithLabel>
                            )}
                          </div>
                          <div className="flex-1 border-left-c">
                            <ValueWithLabel
                              label={t(
                                "resource:group.detail.instanceSelection"
                              )}
                            >
                              <div>
                                {curInstanceGroup?.groupType ===
                                LogSourceType.ASG
                                  ? ASG_SELECTION
                                  : DEFAULT_INSTANCE_SELECTION}
                              </div>
                            </ValueWithLabel>
                            {curInstanceGroup?.groupType ===
                              LogSourceType.ASG && (
                              <ValueWithLabel
                                label={t("resource:group.detail.asgName")}
                              >
                                <ExtLink
                                  to={buildASGLink(
                                    amplifyConfig.aws_project_region,
                                    curInstanceGroup.instanceSet?.[0] || ""
                                  )}
                                >
                                  {curInstanceGroup.instanceSet?.[0] || ""}
                                </ExtLink>
                              </ValueWithLabel>
                            )}
                          </div>
                          <div className="flex-1 border-left-c">
                            <ValueWithLabel
                              label={t("resource:group.detail.platform")}
                            >
                              <div>{DEFAULT_PLATFORM}</div>
                            </ValueWithLabel>
                          </div>
                          <div className="flex-1 border-left-c">
                            <ValueWithLabel
                              label={t("resource:group.detail.created")}
                            >
                              <div>
                                {formatLocalTime(
                                  curInstanceGroup?.createdDt || ""
                                )}
                              </div>
                            </ValueWithLabel>
                          </div>
                        </div>
                      </HeaderPanel>

                      {curInstanceGroup &&
                        (curInstanceGroup?.groupType === LogSourceType.ASG ? (
                          <DetailASG instanceGroup={curInstanceGroup} />
                        ) : (
                          <DetailEC2
                            loadingData={loadingData}
                            instanceGroup={curInstanceGroup}
                            refreshInstanceGroup={() => {
                              getInstanceGroupById();
                            }}
                          />
                        ))}
                    </>
                  </PagePanel>
                </>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstanceGroupDetail;
