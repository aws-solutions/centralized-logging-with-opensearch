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
import React, { useState } from "react";
import Swal from "sweetalert2";
import SideMenu from "components/SideMenu";
import Breadcrumb from "components/Breadcrumb";
import InstanceGroupComp, {
  InstanceWithStatus,
} from "../../common/InstanceGroupComp";
import Button from "components/Button";
import { useHistory } from "react-router-dom";
import { appSyncRequestMutation } from "assets/js/request";
import {
  createInstanceGroup,
  createInstanceGroupBaseOnASG,
} from "graphql/mutations";
import { LogAgentStatus, LogSourceType } from "API";
import { useTranslation } from "react-i18next";
import { OptionType } from "components/AutoComplete/autoComplete";

export interface InstanceGroupType {
  groupName: string;
  groupType: string | LogSourceType;
  asgObj: OptionType | null;
  instanceSet: string[];
}

const CreateInstanceGroup: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("resource:group.name"),
      link: "/resources/instance-group",
    },
    { name: t("resource:group.create.name") },
  ];

  const [checkedInstanceList, setCheckedInstanceList] = useState<
    InstanceWithStatus[]
  >([]);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [curCreateInstanceGroup, setCurCreateInstanceGroup] =
    useState<InstanceGroupType>({
      groupName: "",
      asgObj: null,
      groupType: LogSourceType.EC2,
      instanceSet: [],
    });
  const [createShowNameEmptyError, setCreateShowNameEmptyError] =
    useState(false);
  const [createButtonDisabled, setCreateButtonDisabled] = useState(false);
  const [curAccountId, setCurAccountId] = useState("");

  const createLogInstanceGroupByEC2 = async () => {
    // Check Instance Selected
    if (checkedInstanceList.length <= 0) {
      Swal.fire(
        t("oops"),
        t("resource:group.create.selectInstance"),
        "warning"
      );
      return;
    }

    // Check All Instance Install Agent Successfully
    const instanceStatusArr = checkedInstanceList.map(
      (instance) => instance.instanceStatus
    );

    // Count Online Count
    const agentOnlineCount = instanceStatusArr.filter(
      (item) => item === LogAgentStatus.Online
    ).length;

    // If agent online count
    if (agentOnlineCount <= 0 || agentOnlineCount < instanceStatusArr.length) {
      Swal.fire(t("oops"), t("resource:group.create.selectStatus"), "warning");
      return;
    }
    const createInstanceGroupParam = {
      groupName: curCreateInstanceGroup.groupName,
      accountId: curAccountId,
      instanceSet: checkedInstanceList.map((instance) => instance.id),
    };
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createInstanceGroup,
        createInstanceGroupParam
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      history.push({
        pathname: "/resources/instance-group",
      });
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  const createLogInstanceGroupByASG = async () => {
    // Check Instance Selected
    if (!curCreateInstanceGroup.asgObj) {
      Swal.fire(t("oops"), t("resource:group.create.asg.selectASG"), "warning");
      return;
    }

    const createInstanceGroupParam = {
      // region: "",
      groupName: curCreateInstanceGroup.groupName,
      accountId: curAccountId,
      autoScalingGroupName: curCreateInstanceGroup.asgObj.value,
    };
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createInstanceGroupBaseOnASG,
        createInstanceGroupParam
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      history.push({
        pathname: "/resources/instance-group",
      });
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  const createLogInstanceGroup = () => {
    // Check Name Empty
    if (!curCreateInstanceGroup.groupName) {
      setCreateShowNameEmptyError(true);
      return;
    }
    if (curCreateInstanceGroup.groupType === LogSourceType.EC2) {
      createLogInstanceGroupByEC2();
    }
    if (curCreateInstanceGroup.groupType === LogSourceType.ASG) {
      createLogInstanceGroupByASG();
    }
  };

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />
            <div>
              <InstanceGroupComp
                instanceGroup={curCreateInstanceGroup}
                showNameEmptyError={createShowNameEmptyError}
                accountId={curAccountId}
                changeCurAccount={(id) => {
                  setCurAccountId(id);
                }}
                setCreateDisabled={(disable) => {
                  console.info("disable:", disable);
                  setCreateButtonDisabled(disable);
                }}
                changeGroupName={(name) => {
                  setCreateShowNameEmptyError(false);
                  setCurCreateInstanceGroup((prev) => {
                    return { ...prev, groupName: name };
                  });
                }}
                changeInstanceSet={(sets) => {
                  console.info("changeInstanceSet sets:", sets);
                  setCheckedInstanceList(sets);
                }}
                changeASG={(asg) => {
                  setCurCreateInstanceGroup((prev) => {
                    return { ...prev, asgObj: asg };
                  });
                }}
                changeGroupType={(type) => {
                  setCurCreateInstanceGroup((prev) => {
                    return { ...prev, groupType: type };
                  });
                }}
              />
            </div>
            <div className="mt-20 button-action text-right">
              <Button
                btnType="text"
                onClick={() => {
                  history.push({
                    pathname: "/resources/instance-group",
                  });
                }}
              >
                {t("button.cancel")}
              </Button>
              <Button
                btnType="primary"
                loading={loadingCreate}
                disabled={createButtonDisabled}
                onClick={() => {
                  createLogInstanceGroup();
                }}
              >
                {t("button.create")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInstanceGroup;
