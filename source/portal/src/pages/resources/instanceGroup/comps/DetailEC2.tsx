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
import React, { useState, useEffect } from "react";
import {
  Instance,
  LogSource,
  LogAgentStatus,
  LogSourceType,
  LogSourceUpdateAction,
} from "API";
import { SelectType, TablePanel } from "components/TablePanel";
import Status from "components/Status/Status";
import { DEFAULT_AGENT_VERSION } from "assets/js/const";
import { useTranslation } from "react-i18next";
import { buildEC2LInk } from "assets/js/utils";
import Button from "components/Button";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { getInstanceAgentStatus, listInstances } from "graphql/queries";
import { updateLogSource } from "graphql/mutations";
import Swal from "sweetalert2";
import Modal from "components/Modal";
import InstanceTable, {
  InstanceWithStatusType,
} from "pages/resources/common/InstanceTable";
import { handleErrorMessage } from "assets/js/alert";
import { RootState } from "reducer/reducers";
import ButtonRefresh from "components/ButtonRefresh";

interface DetailEC2Props {
  instanceGroup: LogSource;
  loadingData: boolean;
  disableAddInstance?: boolean;
  disableRemoveInstance?: boolean;
  refreshInstanceGroup: () => void;
}

const DetailEC2: React.FC<DetailEC2Props> = (props: DetailEC2Props) => {
  const { instanceGroup, loadingData, refreshInstanceGroup } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const [instanceInfoList, setInstanceInfoList] = useState<
    InstanceWithStatusType[]
  >([]);
  const [loadingInstance, setLoadingInstance] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);

  const [removeInstanceList, setRemoveInstanceList] = useState<Instance[]>([]);
  const [checkedInstanceList, setCheckedInstanceList] = useState<
    InstanceWithStatusType[]
  >([]);
  const [openAddInstance, setOpenAddInstance] = useState(false);
  const [openRemoveInstance, setOpenRemoveInstance] = useState(false);
  const [loadingRemove, setLoadingRemove] = useState(false);
  const [loadingAdd, setLoadingAdd] = useState(false);

  const getAllInstanceDetailAndStatus = async () => {
    if (
      instanceGroup &&
      instanceGroup.ec2?.instances &&
      instanceGroup.ec2?.instances.length > 0
    ) {
      const tmpInstanceInfoList: InstanceWithStatusType[] = [];
      setLoadingRefresh(true);
      for (let i = 0; i < instanceGroup.ec2?.instances.length; i++) {
        // Get a single instance info
        const dataInstanceInfo = await appSyncRequestQuery(listInstances, {
          maxResults: 50,
          nextToken: "",
          accountId: instanceGroup?.accountId || "",
          region: amplifyConfig.aws_project_region,
          instanceSet: [instanceGroup.ec2?.instances[i]?.instanceId],
        });

        // Get the agent status of this instance
        const firstStatusCallResp = await appSyncRequestQuery(
          getInstanceAgentStatus,
          {
            instanceIds: [instanceGroup.ec2?.instances[i]?.instanceId],
            accountId: instanceGroup?.accountId || "",
          }
        );
        // Delay for 2 seconds before get the instances status
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const statusData = await appSyncRequestQuery(getInstanceAgentStatus, {
          instanceIds: [instanceGroup.ec2?.instances[i]?.instanceId],
          commandId: firstStatusCallResp.data.getInstanceAgentStatus.commandId,
          accountId: instanceGroup?.accountId || "",
        });

        const instanceStatusList =
          statusData.data.getInstanceAgentStatus.instanceAgentStatusList;

        // Update tmpInstanceInfoList with instanceStatus
        tmpInstanceInfoList.push({
          ...(dataInstanceInfo.data.listInstances?.instances?.[0] || {
            id: instanceGroup.ec2?.instances[i]?.instanceId,
          }),
          status: dataInstanceInfo.data.listInstances?.instances?.[0]
            ? instanceStatusList[0].status
            : "Unknown",
        });
      }
      setLoadingRefresh(false);
      setInstanceInfoList(tmpInstanceInfoList);
    }
  };

  // Rmove Instance from instanc group
  const confirmRemoveInstance = async () => {
    console.info("removeInstanceList", removeInstanceList);
    try {
      setLoadingRemove(true);
      await appSyncRequestMutation(updateLogSource, {
        type: LogSourceType.EC2,
        sourceId: instanceGroup.sourceId,
        action: LogSourceUpdateAction.REMOVE,
        ec2: {
          instances: removeInstanceList.map((instance) => ({
            instanceId: instance.id,
          })),
        },
      });
      setLoadingInstance(true);
      setInstanceInfoList([]);
      setLoadingRemove(false);
      setOpenRemoveInstance(false);
      refreshInstanceGroup();
    } catch (error: any) {
      setLoadingRemove(false);
      setOpenRemoveInstance(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  const confirmAddInstance = async () => {
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

    setLoadingAdd(true);
    await appSyncRequestMutation(updateLogSource, {
      type: LogSourceType.EC2,
      sourceId: instanceGroup.sourceId,
      action: LogSourceUpdateAction.ADD,
      ec2: {
        instances: checkedInstanceList.map((instance) => ({
          instanceId: instance.id,
        })),
      },
    });
    setLoadingInstance(true);
    setInstanceInfoList([]);
    setLoadingAdd(false);
    setOpenAddInstance(false);
    refreshInstanceGroup();
  };

  useEffect(() => {
    if (
      instanceGroup.ec2?.instances &&
      instanceGroup.ec2?.instances.length > 0
    ) {
      setLoadingInstance(true);
      getAllInstanceDetailAndStatus().then(() => {
        setLoadingInstance(false);
        getAllInstanceDetailAndStatus();
      });
    }
  }, [instanceGroup.ec2?.instances]);

  const renderInstanceId = (data: InstanceWithStatusType) => {
    return (
      <a
        target="_blank"
        href={buildEC2LInk(amplifyConfig.aws_project_region, data?.id || "")}
        rel="noreferrer"
      >
        {data.id}
      </a>
    );
  };

  const renderStatus = (data: InstanceWithStatusType) => {
    return <Status status={data.status || ""} />;
  };

  return (
    <div>
      <TablePanel
        trackId="id"
        title={t("instances") + `(${instanceInfoList.length})`}
        changeSelected={(item) => {
          console.info("item:", item);
          setRemoveInstanceList(item);
        }}
        loading={loadingInstance}
        selectType={SelectType.CHECKBOX}
        columnDefinitions={[
          {
            id: "Name",
            header: t("resource:group.detail.list.name"),
            cell: (e: InstanceWithStatusType) => {
              return e.name || t("unknown");
            },
          },
          {
            id: "instanceId",
            header: t("resource:group.detail.list.instanceId"),
            cell: (e: InstanceWithStatusType) => renderInstanceId(e),
          },
          {
            id: "ip",
            header: t("resource:group.detail.list.primaryIP"),
            cell: (e: InstanceWithStatusType) => {
              return e.ipAddress || t("unknown");
            },
          },
          {
            id: "agent",
            header: t("resource:group.detail.list.agent"),
            cell: () => {
              return DEFAULT_AGENT_VERSION;
            },
          },
          {
            id: "agentStatus",
            header: t("resource:group.detail.list.agentStatus"),
            cell: (e: InstanceWithStatusType) => renderStatus(e),
          },
        ]}
        items={instanceInfoList}
        actions={
          <div>
            {!props.disableAddInstance && (
              <Button
                disabled={loadingInstance}
                btnType="primary"
                onClick={() => {
                  setOpenAddInstance(true);
                }}
              >
                {t("button.addInstances")}
              </Button>
            )}

            {!props.disableRemoveInstance && (
              <Button
                disabled={removeInstanceList.length <= 0}
                onClick={() => {
                  setOpenRemoveInstance(true);
                }}
              >
                {t("button.removeInstances")}
              </Button>
            )}
            <Button
              btnType="icon"
              disabled={loadingData || loadingRefresh}
              onClick={() => {
                console.info("refresh click");
                getAllInstanceDetailAndStatus();
              }}
            >
              <ButtonRefresh loading={loadingRefresh} />
            </Button>
          </div>
        }
        pagination={<div></div>}
      />
      <Modal
        title={t("resource:group.detail.addInstances")}
        fullWidth={true}
        isOpen={openAddInstance}
        closeModal={() => {
          setOpenAddInstance(false);
        }}
        actions={
          <div className="button-action no-pb text-right">
            <Button
              disabled={loadingAdd}
              btnType="text"
              onClick={() => {
                setOpenAddInstance(false);
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              loading={loadingAdd}
              btnType="primary"
              onClick={() => {
                confirmAddInstance();
              }}
            >
              {t("button.add")}
            </Button>
          </div>
        }
      >
        <div className="plr-10">
          <InstanceTable
            accountId={instanceGroup?.accountId || ""}
            changeInstanceSet={(sets) => {
              setCheckedInstanceList(sets);
            }}
            setCreateDisabled={(disable) => {
              console.info(disable);
            }}
            // defaultDisabledIds={instanceGroup.ec2?.instances || []}
          />
        </div>
      </Modal>

      <Modal
        title={t("resource:group.detail.removeInstances")}
        fullWidth={false}
        isOpen={openRemoveInstance}
        closeModal={() => {
          setOpenRemoveInstance(false);
        }}
        actions={
          <div className="button-action no-pb text-right">
            <Button
              disabled={loadingRemove}
              btnType="text"
              onClick={() => {
                setOpenRemoveInstance(false);
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              loading={loadingRemove}
              btnType="primary"
              onClick={() => {
                confirmRemoveInstance();
              }}
            >
              {t("button.remove")}
            </Button>
          </div>
        }
      >
        <div className="modal-content">
          {t("resource:group.detail.removeInstancesTips")}
          {removeInstanceList.map((element) => {
            return (
              <div key={element.id}>
                <a
                  target="_blank"
                  href={buildEC2LInk(
                    amplifyConfig.aws_project_region,
                    element.id
                  )}
                  rel="noreferrer"
                >
                  {element.id}
                </a>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default DetailEC2;
