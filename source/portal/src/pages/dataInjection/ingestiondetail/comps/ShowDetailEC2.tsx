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
import { LogSource, LogSourceType } from "API";
import { Alert } from "assets/js/alert";
import { ResourceStatus } from "assets/js/const";
import { appSyncRequestQuery } from "assets/js/request";
import { getLogSource } from "graphql/queries";
import DetailEC2 from "pages/resources/instanceGroup/comps/DetailEC2";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface ShowDetailEC2Props {
  instanceGroupId: string;
}

const ShowDetailEC2: React.FC<ShowDetailEC2Props> = (
  props: ShowDetailEC2Props
) => {
  const [loadingData, setLoadingData] = useState(true);
  const [curInstanceGroup, setCurInstanceGroup] = useState<LogSource>({
    __typename: "LogSource",
    sourceId: "",
  });
  const { t } = useTranslation();

  const getInstanceGroupById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getLogSource, {
        sourceId: props.instanceGroupId,
        type: LogSourceType.EC2,
      });
      console.info("resData:", resData);
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
      console.error(error);
    }
  };

  useEffect(() => {
    getInstanceGroupById();
  }, []);

  return (
    <DetailEC2
      loadingData={loadingData}
      instanceGroup={curInstanceGroup}
      disableAddInstance
      disableRemoveInstance
      refreshInstanceGroup={() => {
        getInstanceGroupById();
      }}
    />
  );
};

export default ShowDetailEC2;
