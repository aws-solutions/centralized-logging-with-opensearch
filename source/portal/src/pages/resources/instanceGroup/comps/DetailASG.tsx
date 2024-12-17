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
import React, { useState } from "react";
import { AntTab, AntTabs, TabPanel } from "components/Tab";
import InstanceTable from "pages/resources/common/InstanceTable";
import { EC2GroupPlatform, LogSource } from "API";
import { useTranslation } from "react-i18next";

import ASGGuide from "./ASGGuide";
import { defaultStr } from "assets/js/utils";
import InstancePermission from "pages/dataInjection/applicationLog/common/InstancePermission";

interface DetailASGProps {
  instanceGroup: LogSource;
}

const DetailASG: React.FC<DetailASGProps> = (props: DetailASGProps) => {
  const { instanceGroup } = props;
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("instanceTable");

  return (
    <div data-testid="asg-detail-tab">
      <AntTabs
        value={activeTab}
        onChange={(event, newTab) => {
          setActiveTab(newTab);
        }}
      >
        <AntTab
          data-testid="instanceTable"
          label={t("resource:group.detail.asg.instance")}
          value="instanceTable"
        />
        <AntTab
          data-testid="instanceTable"
          label={t("resource:group.detail.permissions")}
          value="permissions"
        />
        <AntTab
          data-testid="asgGuide"
          label={t("resource:group.detail.asg.asgGuide")}
          value="asgGuide"
        />
      </AntTabs>
      <TabPanel value={activeTab} index="instanceTable">
        <InstanceTable
          platform={instanceGroup.ec2?.groupPlatform ?? EC2GroupPlatform.Linux}
          disableChangePlatform
          isASGList
          defaultTagFilter={[
            {
              Key: "tag:aws:autoscaling:groupName",
              Values: [
                instanceGroup.ec2?.asgName ? instanceGroup.ec2?.asgName : "",
              ],
            },
          ]}
          accountId={defaultStr(instanceGroup.accountId)}
        />
      </TabPanel>
      <TabPanel value={activeTab} index="permissions">
        <InstancePermission />
      </TabPanel>
      <TabPanel value={activeTab} index="asgGuide">
        <ASGGuide instanceGroup={instanceGroup} />
      </TabPanel>
    </div>
  );
};

export default DetailASG;
