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
import { LogSource } from "API";
import { handleErrorMessage } from "assets/js/alert";
import { appSyncRequestQuery } from "assets/js/request";
import HeaderPanel from "components/HeaderPanel";
import { getAutoScalingGroupConf } from "graphql/queries";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ASGGuideInfo from "./ASGGuideInfo";

interface ASGGuideProps {
  instanceGroup: LogSource;
}

const ASGGuide: React.FC<ASGGuideProps> = (props: ASGGuideProps) => {
  const { instanceGroup } = props;
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [guide, setGuide] = useState("");
  const getASGConfig = async () => {
    setLoading(true);
    try {
      const res = await appSyncRequestQuery(getAutoScalingGroupConf, {
        groupId: instanceGroup.sourceId,
      });
      console.info("res:", res);
      setGuide(res.data.getAutoScalingGroupConf);
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      handleErrorMessage(error.message);
    }
  };

  useEffect(() => {
    if (instanceGroup.sourceId) {
      getASGConfig();
    }
  }, [instanceGroup.sourceId]);

  return (
    <HeaderPanel
      data-testid="asg-group-container"
      title={t("resource:group.detail.asg.asgGuide")}
    >
      <ASGGuideInfo guide={guide} loading={loading} />
    </HeaderPanel>
  );
};

export default ASGGuide;
