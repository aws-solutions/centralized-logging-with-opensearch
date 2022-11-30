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
import React, { useState, useEffect } from "react";
import RefreshIcon from "@material-ui/icons/Refresh";
import { Instance, InstanceGroup, LogAgentStatus } from "API";
import { SelectType, TablePanel } from "components/TablePanel";
import Status from "components/Status/Status";
import { DEFAULT_AGENT_VERSION } from "assets/js/const";
import { useTranslation } from "react-i18next";
import { InstanceWithStatus } from "pages/resources/common/InstanceGroupComp";
import { buildEC2LInk } from "assets/js/utils";
import Button from "components/Button";
import LoadingText from "components/LoadingText";
import { AmplifyConfigType } from "types";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { getLogAgentStatus, listInstances } from "graphql/queries";
import {
  addInstancesToInstanceGroup,
  deleteInstancesFromInstanceGroup,
} from "graphql/mutations";
import Swal from "sweetalert2";
import Modal from "components/Modal";
import InstanceTable from "pages/resources/common/InstanceTable";

interface DetailEC2Props {
  instanceGroup: InstanceGroup;
  loadingData: boolean;
  refreshInstanceGroup: () => void;
}

const DetailEC2: React.FC<DetailEC2Props> = (props: DetailEC2Props) => {
  const { instanceGroup, loadingData, refreshInstanceGroup } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  const [instanceInfoList, setInstanceInfoList] = useState<
    InstanceWithStatus[]
  >([]);
  const [loadingInstance, setLoadingInstance] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);

  const [removeInstanceList, setRemoveInstanceList] = useState<Instance[]>([]);
  const [checkedInstanceList, setCheckedInstanceList] = useState<
    InstanceWithStatus[]
  >([]);
  const [openAddInstance, setOpenAddInstance] = useState(false);
  const [openRemoveInstance, setOpenRemoveInstance] = useState(false);
  const [loadingRemove, setLoadingRemove] = useState(false);
  const [loadingAdd, setLoadingAdd] = useState(false);

  const getAllInstanceDetailAndStatus = async () => {
    if (
      instanceGroup &&
      instanceGroup.instanceSet &&
      instanceGroup.instanceSet.length > 0
    ) {
      const tmpInstanceInfoList: InstanceWithStatus[] = [];
      setLoadingRefresh(true);
      // setInstanceInfoList([]);
      for (let i = 0; i < instanceGroup.instanceSet.length; i++) {
        const dataInstanceInfo = await appSyncRequestQuery(listInstances, {
          maxResults: 50,
          nextToken: "",
          accountId: instanceGroup?.accountId || "",
          region: amplifyConfig.aws_project_region,
          instanceSet: instanceGroup.instanceSet[i],
        });
        const dataInstanceStatusInfo = await appSyncRequestQuery(
          getLogAgentStatus,
          {
            instanceId: instanceGroup.instanceSet[i],
            region: amplifyConfig.aws_project_region,
            accountId: instanceGroup?.accountId || "",
          }
        );
        tmpInstanceInfoList.push({
          ...(dataInstanceInfo.data.listInstances?.instances?.[0] || {
            id: instanceGroup.instanceSet[i],
          }),
          instanceStatus: dataInstanceStatusInfo.data.getLogAgentStatus,
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
      await appSyncRequestMutation(deleteInstancesFromInstanceGroup, {
        sourceId: instanceGroup.id,
        instanceIdSet: removeInstanceList.map((element) => element.id),
      });
      setLoadingInstance(true);
      setInstanceInfoList([]);
      setLoadingRemove(false);
      setOpenRemoveInstance(false);
      refreshInstanceGroup();
    } catch (error) {
      setLoadingRemove(false);
      setOpenRemoveInstance(false);
      console.error(error);
    }
  };

  const confirmAddInstance = async () => {
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

    setLoadingAdd(true);

    await appSyncRequestMutation(addInstancesToInstanceGroup, {
      sourceId: instanceGroup.id,
      instanceIdSet: checkedInstanceList.map((element) => element.id),
    });
    setLoadingInstance(true);
    setInstanceInfoList([]);
    setLoadingAdd(false);
    setOpenAddInstance(false);
    refreshInstanceGroup();
  };

  useEffect(() => {
    if (instanceGroup.instanceSet && instanceGroup.instanceSet.length > 0) {
      setLoadingInstance(true);
      getAllInstanceDetailAndStatus().then(() => {
        setLoadingInstance(false);
        getAllInstanceDetailAndStatus();
      });
    }
  }, [instanceGroup.instanceSet]);

  return (
    <div>
      <TablePanel
        title={t("resource:group.detail.list.groups")}
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
            cell: (e: InstanceWithStatus) => {
              return e.name || t("unknown");
            },
          },
          {
            id: "instanceId",
            header: t("resource:group.detail.list.instanceId"),
            cell: (e: InstanceWithStatus) => {
              return (
                <a
                  target="_blank"
                  href={buildEC2LInk(amplifyConfig.aws_project_region, e.id)}
                  rel="noreferrer"
                >
                  {e.id}
                </a>
              );
            },
          },
          {
            id: "ip",
            header: t("resource:group.detail.list.primaryIP"),
            cell: (e: InstanceWithStatus) => {
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
            cell: (e: InstanceWithStatus) => {
              return <Status status={e.instanceStatus || ""} />;
            },
          },
        ]}
        items={instanceInfoList}
        actions={
          <div>
            <Button
              disabled={loadingInstance}
              btnType="primary"
              onClick={() => {
                setOpenAddInstance(true);
              }}
            >
              {t("button.addInstances")}
            </Button>
            <Button
              disabled={removeInstanceList.length <= 0}
              onClick={() => {
                setOpenRemoveInstance(true);
              }}
            >
              {t("button.removeInstances")}
            </Button>
            <Button
              btnType="icon"
              disabled={loadingData || loadingRefresh}
              onClick={() => {
                console.info("refresh click");
                getAllInstanceDetailAndStatus();
              }}
            >
              {loadingRefresh ? (
                <LoadingText />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
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
            defaultDisabledIds={instanceGroup.instanceSet || []}
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
          {removeInstanceList.map((element, index) => {
            return (
              <div key={index}>
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
