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
import React, { useState } from "react";
import Swal from "sweetalert2";
import SideMenu from "components/SideMenu";
import Breadcrumb from "components/Breadcrumb";
import InstanceGroupComp from "../../common/InstanceGroupComp";
import Button from "components/Button";
import { useNavigate } from "react-router-dom";
import { appSyncRequestMutation } from "assets/js/request";
import { createLogSource } from "graphql/mutations";
import {
  EC2GroupPlatform,
  EC2GroupType,
  LogAgentStatus,
  LogSourceType,
  SubAccountLink,
} from "API";
import { useTranslation } from "react-i18next";
import { OptionType } from "components/AutoComplete/autoComplete";
import { InstanceWithStatusType } from "pages/resources/common/InstanceTable";
import UpdateSubAccountModal from "pages/comps/account/UpdateSubAccountModal";

export interface InstanceGroupType {
  groupName: string;
  groupType: string | LogSourceType;
  asgObj: OptionType | null;
  instanceSet: string[];
}

const CreateInstanceGroup: React.FC = () => {
  const navigate = useNavigate();
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
    InstanceWithStatusType[]
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
  const [subAccountInfo, setSubAccountInfo] = useState<SubAccountLink | null>(
    null
  );
  const [needUpdateSubAccount, setNeedUpdateSubAccount] = useState(false);

  const createLogInstanceGroupByEC2 = async () => {
    // check sub account has upload event sns
    if (
      curAccountId &&
      !subAccountInfo?.subAccountFlbConfUploadingEventTopicArn
    ) {
      setNeedUpdateSubAccount(true);
      return false;
    } else {
      setNeedUpdateSubAccount(false);
    }

    // Check Instance Selected
    if (checkedInstanceList.length <= 0) {
      Swal.fire(
        t("oops") || "",
        t("resource:group.create.selectInstance") || "",
        "warning"
      );
      return;
    }

    // Check All Instance Install Agent Successfully
    const instanceStatusArr = checkedInstanceList.map(
      (instance) => instance.status
    );

    // Count Online Count
    const agentOnlineCount = instanceStatusArr.filter(
      (item) => item === LogAgentStatus.Online
    ).length;

    // If agent online count
    if (agentOnlineCount <= 0 || agentOnlineCount < instanceStatusArr.length) {
      Swal.fire(
        t("oops") || "",
        t("resource:group.create.selectStatus") || "",
        "warning"
      );
      return;
    }
    const createLogSourceParam = {
      type: LogSourceType.EC2,
      accountId: curAccountId,
      ec2: {
        groupName: curCreateInstanceGroup.groupName,
        groupType: EC2GroupType.EC2,
        groupPlatform: EC2GroupPlatform.Linux,
        instances: checkedInstanceList.map((instance) => ({
          instanceId: instance.id,
        })),
      },
    };
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createLogSource,
        createLogSourceParam
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      navigate("/resources/instance-group");
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  const createLogSourceByASG = async () => {
    // Check Instance Selected
    if (!curCreateInstanceGroup.asgObj) {
      Swal.fire(
        t("oops") || "",
        t("resource:group.create.asg.selectASG") || "",
        "warning"
      );
      return;
    }

    const createLogSourceParam = {
      // region: "",
      type: LogSourceType.EC2,
      accountId: curAccountId,
      ec2: {
        groupName: curCreateInstanceGroup.groupName,
        groupType: EC2GroupType.ASG,
        asgName: curCreateInstanceGroup.asgObj.value,
        groupPlatform: EC2GroupPlatform.Linux,
        instances: { instanceId: curCreateInstanceGroup.asgObj.value },
      },
    };
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createLogSource,
        createLogSourceParam
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      navigate("/resources/instance-group");
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
    if (curCreateInstanceGroup.groupType === EC2GroupType.EC2) {
      createLogInstanceGroupByEC2();
    }
    if (curCreateInstanceGroup.groupType === EC2GroupType.ASG) {
      createLogSourceByASG();
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
                changeCurAccount={(id, account) => {
                  setCurAccountId(id);
                  setSubAccountInfo(account);
                }}
                setCreateDisabled={(disable) => {
                  setCreateButtonDisabled(disable);
                }}
                changeGroupName={(name) => {
                  setCreateShowNameEmptyError(false);
                  setCurCreateInstanceGroup((prev) => {
                    return { ...prev, groupName: name };
                  });
                }}
                changeInstanceSet={(sets) => {
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
                  navigate("/resources/instance-group");
                }}
              >
                {t("button.cancel")}
              </Button>
              <Button
                btnType="primary"
                disabled={createButtonDisabled}
                loading={loadingCreate}
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
      <UpdateSubAccountModal
        accountInfo={subAccountInfo}
        showModal={needUpdateSubAccount}
        closeModal={() => {
          setNeedUpdateSubAccount(false);
        }}
      />
    </div>
  );
};

export default CreateInstanceGroup;
