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
/* eslint-disable react/display-name */
import React, { useState, useEffect } from "react";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import { appSyncRequestQuery } from "assets/js/request";
import { getLogSource } from "graphql/queries";
import { EC2GroupType, LogSource, LogSourceType } from "API";
import { ResourceStatus } from "assets/js/const";
import { buildASGLink, defaultStr, formatLocalTime } from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Alert } from "assets/js/alert";
import AccountName from "pages/comps/account/AccountName";
import DetailEC2 from "./comps/DetailEC2";
import DetailASG from "./comps/DetailASG";
import ExtLink from "components/ExtLink";
import { useParams } from "react-router-dom";
import { RootState } from "reducer/reducers";
import CommonLayout from "pages/layout/CommonLayout";

const InstanceGroupDetail: React.FC = () => {
  const { id } = useParams();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const { t } = useTranslation();
  const [curInstanceGroup, setCurInstanceGroup] = useState<LogSource>();
  const [loadingData, setLoadingData] = useState(true);

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("resource:group.name"),
      link: "/resources/instance-group",
    },
    { name: defaultStr(curInstanceGroup?.ec2?.groupName) },
  ];

  const getInstanceGroupById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getLogSource, {
        sourceId: encodeURIComponent(defaultStr(id)),
        type: LogSourceType.EC2,
      });
      const dataInstanceGroup: LogSource = resData.data.getLogSource;
      if (
        (dataInstanceGroup.status as unknown as ResourceStatus) ===
        ResourceStatus.INACTIVE
      ) {
        Alert(t("resource:group.detail.notExist"));
        return;
      }
      setCurInstanceGroup(dataInstanceGroup);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    getInstanceGroupById();
  }, []);

  return (
    <CommonLayout breadCrumbList={breadCrumbList} loadingData={loadingData}>
      <div className="pb-50">
        <PagePanel title={defaultStr(curInstanceGroup?.ec2?.groupName)}>
          <>
            <HeaderPanel title={t("resource:group.detail.general")}>
              <div className="flex value-label-span">
                <div className="flex-1">
                  <ValueWithLabel label={t("resource:group.detail.name")}>
                    <div>{curInstanceGroup?.ec2?.groupName}</div>
                  </ValueWithLabel>
                  <ValueWithLabel label={t("resource:group.detail.created")}>
                    <div>
                      {formatLocalTime(defaultStr(curInstanceGroup?.createdAt))}
                    </div>
                  </ValueWithLabel>
                </div>
                <div className="flex-1 border-left-c">
                  <ValueWithLabel
                    label={t("resource:group.detail.instanceGroupType")}
                  >
                    <div>
                      {curInstanceGroup?.ec2?.groupType === EC2GroupType.ASG
                        ? t("resource:group.asg")
                        : t("resource:group.manual")}
                    </div>
                  </ValueWithLabel>
                  {curInstanceGroup?.ec2?.groupType === EC2GroupType.ASG && (
                    <ValueWithLabel label={t("resource:group.detail.asgName")}>
                      <ExtLink
                        to={buildASGLink(
                          amplifyConfig.aws_project_region,
                          defaultStr(curInstanceGroup.ec2.asgName)
                        )}
                      >
                        {defaultStr(curInstanceGroup.ec2.asgName)}
                      </ExtLink>
                    </ValueWithLabel>
                  )}
                </div>
                <div className="flex-1 border-left-c">
                  <ValueWithLabel label={t("resource:group.detail.platform")}>
                    <div>{curInstanceGroup?.ec2?.groupPlatform}</div>
                  </ValueWithLabel>
                </div>
                <div className="flex-1 border-left-c">
                  {curInstanceGroup?.accountId && (
                    <ValueWithLabel label={t("resource:group.detail.account")}>
                      <AccountName
                        accountId={curInstanceGroup?.accountId}
                        region={amplifyConfig.aws_project_region}
                      />
                    </ValueWithLabel>
                  )}
                </div>
              </div>
            </HeaderPanel>

            {curInstanceGroup &&
              (curInstanceGroup?.ec2?.groupType === EC2GroupType.ASG ? (
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
      </div>
    </CommonLayout>
  );
};

export default InstanceGroupDetail;
