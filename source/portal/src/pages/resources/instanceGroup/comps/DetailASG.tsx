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
import { LogSource } from "API";
import { useTranslation } from "react-i18next";

import ASGGuide from "./ASGGuide";

interface DetailASGProps {
  instanceGroup: LogSource;
}

const DetailASG: React.FC<DetailASGProps> = (props: DetailASGProps) => {
  const { instanceGroup } = props;
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <AntTabs
        value={activeTab}
        onChange={(event, newTab) => {
          setActiveTab(newTab);
        }}
      >
        <AntTab label={t("resource:group.detail.asg.asgGuide")} />
        <AntTab label={t("resource:group.detail.asg.instance")} />
      </AntTabs>
      <TabPanel value={activeTab} index={0}>
        <ASGGuide instanceGroup={instanceGroup} />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <InstanceTable
          isASGList
          defaultTagFilter={[
            {
              Key: "tag:aws:autoscaling:groupName",
              Values: [
                instanceGroup.ec2?.asgName ? instanceGroup.ec2?.asgName : "",
              ],
            },
          ]}
          accountId={instanceGroup.accountId || ""}
          changeInstanceSet={(sets) => {
            console.info(sets);
          }}
          setCreateDisabled={(disable) => {
            console.info(disable);
          }}
        />
      </TabPanel>
    </div>
  );
};

export default DetailASG;
