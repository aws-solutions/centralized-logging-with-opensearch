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
import { LogAgentStatus, TagFilterInput } from "API";
import { DEFAULT_AGENT_VERSION } from "assets/js/const";
import { buildEC2LInk } from "assets/js/utils";
import Button from "components/Button";
import LoadingText from "components/LoadingText";
import Status from "components/Status/Status";
import { SelectType, TablePanel } from "components/TablePanel";
import TagFilter from "components/TagFilter";
import TextInput from "components/TextInput";
import { useTranslation } from "react-i18next";
import { InstanceWithStatus } from "./InstanceGroupComp";
import Swal from "sweetalert2";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { requestInstallLogAgent } from "graphql/mutations";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { AppStateProps } from "reducer/appReducer";
import { getLogAgentStatus, listInstances } from "graphql/queries";

const PAGE_SIZE = 50;

interface InstanceTableProps {
  isASGList?: boolean;
  defaultTagFilter?: TagFilterInput[];
  accountId: string;
  changeInstanceSet: (instances: any) => void;
  setCreateDisabled: (disable: boolean) => void;
  defaultDisabledIds?: (string | null)[];
}

const InstanceTable: React.FC<InstanceTableProps> = (
  props: InstanceTableProps
) => {
  const {
    isASGList,
    defaultTagFilter,
    accountId,
    changeInstanceSet,
    setCreateDisabled,
    defaultDisabledIds,
  } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const [loadingData, setLoadingData] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [loadingInstall, setLoadingInstall] = useState(false);
  const [instanceList, setInstanceList] = useState<InstanceWithStatus[]>([]);
  const [tagFilter, setTagFilter] = useState<TagFilterInput[]>(
    defaultTagFilter || []
  );
  const [selectInstanceList, setSelectInstanceList] = useState<
    InstanceWithStatus[]
  >([]);
  const [showInstanceList, setShowInstanceList] = useState<
    InstanceWithStatus[]
  >([]);
  const [startCheckStatus, setStartCheckStatus] = useState(false);
  const [getStatusInterval, setGetStatusInterval] = useState<any>();
  const [searchParams, setSearchParams] = useState("");
  const [reloadTableData, setReloadTableData] = useState(false);
  const [hasMoreInstance, setHasMoreInstance] = useState(false);
  const [nextToken, setNextToken] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadmoreIsClick, setLoadmoreIsClick] = useState(false);

  const getMoreInstanceWithStatus = async () => {
    if (nextToken) {
      setLoadingMore(true);
      setLoadmoreIsClick(true);
      const moreInstanceData: any = await appSyncRequestQuery(listInstances, {
        maxResults: PAGE_SIZE,
        nextToken: nextToken,
        tags: tagFilter,
        accountId: accountId,
        region: amplifyConfig.aws_project_region,
      });
      const dataInstanceList: InstanceWithStatus[] =
        moreInstanceData.data.listInstances.instances;
      console.info("moreInstanceData:", moreInstanceData);
      if (moreInstanceData.data.listInstances.nextToken) {
        setHasMoreInstance(true);
        setNextToken(moreInstanceData.data.listInstances.nextToken);
      } else {
        setHasMoreInstance(false);
        setNextToken("");
      }
      const tmpInstanceInfoList: InstanceWithStatus[] = [...instanceList];
      await Promise.all(
        dataInstanceList.map(async (item) => {
          const statusData = await appSyncRequestQuery(getLogAgentStatus, {
            instanceId: item.id,
            accountId: accountId,
          });
          tmpInstanceInfoList.push({
            ...item,
            instanceStatus: statusData.data.getLogAgentStatus,
          });
        })
      );
      setLoadingMore(false);
      setInstanceList(tmpInstanceInfoList);
    }
  };

  // Get All Instance Status
  const getAllInstanceWithStatus = async (refresh = false) => {
    if (!refresh) {
      setInstanceList([]);
      setSelectInstanceList([]);
      setLoadingData(true);
      setReloadTableData(true);
    }
    const resInstanceData: any = await appSyncRequestQuery(listInstances, {
      maxResults: PAGE_SIZE,
      nextToken: "",
      tags: tagFilter,
      accountId: accountId,
      region: amplifyConfig.aws_project_region,
    });
    const dataInstanceList: InstanceWithStatus[] =
      resInstanceData.data.listInstances.instances;
    if (resInstanceData.data.listInstances.nextToken) {
      setHasMoreInstance(true);
      setNextToken(resInstanceData.data.listInstances.nextToken);
    } else {
      setHasMoreInstance(false);
      setNextToken("");
    }

    const tmpInstanceInfoList: InstanceWithStatus[] = [];
    await Promise.all(
      dataInstanceList.map(async (item) => {
        const statusData = await appSyncRequestQuery(getLogAgentStatus, {
          instanceId: item.id,
          accountId: accountId,
        });
        tmpInstanceInfoList.push({
          ...item,
          instanceStatus: statusData.data.getLogAgentStatus,
        });
      })
    );
    setLoadingData(false);
    setReloadTableData(false);
    setInstanceList(tmpInstanceInfoList);
  };

  // Install Log Agent
  const installLogAgentByInstance = async () => {
    if (selectInstanceList.length <= 0) {
      Swal.fire(t("oops"), t("resource:group.comp.selectInstance"), "warning");
      return;
    }
    clearInterval(getStatusInterval);
    setStartCheckStatus(false);
    setCreateDisabled(true);
    try {
      setLoadingInstall(true);
      const installIds = selectInstanceList.map((instance) => instance.id);
      const installRes: any = await appSyncRequestMutation(
        requestInstallLogAgent,
        {
          instanceIdSet: installIds,
          region: amplifyConfig.aws_project_region,
          accountId: accountId,
        }
      );
      console.info("installRes:", installRes);
      setLoadingInstall(false);
      setStartCheckStatus(true);
      getAllInstanceStatus(selectInstanceList);
      setCreateDisabled(false);
    } catch (error) {
      console.error(error);
      setCreateDisabled(false);
      setLoadingInstall(false);
    }
  };

  // Get Instance Status
  const getAllInstanceStatus = async (
    selInstanceListParam: InstanceWithStatus[]
  ) => {
    console.info("call getAllInstanceStatus");
    setLoadingRefresh(true);
    setCreateDisabled(true);
    const tmpInstanceInfoList: InstanceWithStatus[] = [];
    const checkedIdArr = selInstanceListParam.map((instance) => instance.id);
    const tmpSelectInstanceList: InstanceWithStatus[] = [];
    await Promise.all(
      instanceList.map(async (item) => {
        const statusData = await appSyncRequestQuery(getLogAgentStatus, {
          instanceId: item.id,
          accountId: accountId,
        });
        tmpInstanceInfoList.push({
          ...item,
          instanceStatus: statusData.data.getLogAgentStatus,
        });
        if (checkedIdArr.indexOf(item.id) >= 0) {
          tmpSelectInstanceList.push({
            ...item,
            instanceStatus: statusData.data.getLogAgentStatus,
          });
        }
      })
    );
    setCreateDisabled(false);
    setLoadingRefresh(false);
    setInstanceList(tmpInstanceInfoList);
    changeInstanceSet(tmpSelectInstanceList);
  };

  // Get instance group list when page rendered.
  useEffect(() => {
    getAllInstanceWithStatus();
  }, [tagFilter, accountId]);

  useEffect(() => {
    clearInterval(getStatusInterval);
    setStartCheckStatus(false);
  }, [accountId]);

  // Auto Loop to check instance status
  useEffect(() => {
    let id: any = 0;
    if (startCheckStatus) {
      id = setInterval(() => {
        getAllInstanceStatus(selectInstanceList);
        setSelectInstanceList((prev) => {
          getAllInstanceStatus([...prev]);
          return prev;
        });
      }, 6000);
      setGetStatusInterval(id);
    } else {
      clearInterval(id);
      clearInterval(getStatusInterval);
    }
    return () => clearInterval(id);
  }, [startCheckStatus]);

  useEffect(() => {
    console.info("[selectInstanceList]CHANGED");
    changeInstanceSet(selectInstanceList);
  }, [selectInstanceList]);

  useEffect(() => {
    setShowInstanceList(
      instanceList
        .filter((element) => {
          return element.id.indexOf(searchParams) >= 0;
        })
        .sort((a, b) => (a.id > b.id ? 1 : -1))
    );
  }, [instanceList, searchParams]);

  // add tag filter
  const addTag = (tag: TagFilterInput) => {
    setTagFilter((prev) => {
      const tmpList = JSON.parse(JSON.stringify(prev));
      const target = tmpList.find((tmp: TagFilterInput) => tmp.Key === tag.Key);
      if (target) {
        target.Values = target.Values.concat(tag.Values || []);
      } else {
        tmpList.push(tag);
      }
      return tmpList;
    });
  };

  // remove tag filter
  const removeTag = (keyIndex: number, valueIndex: number) => {
    setTagFilter((prev) => {
      const tmpList = JSON.parse(JSON.stringify(prev));
      if (tmpList[keyIndex].Values.length === 1) {
        tmpList.splice(keyIndex, 1);
      } else {
        tmpList[keyIndex].Values.splice(valueIndex, 1);
      }
      return tmpList;
    });
  };

  return (
    <div>
      <div className="pb-20">
        <TablePanel
          defaultDisabledIds={defaultDisabledIds}
          title={t("resource:group.comp.instances.title")}
          isReload={reloadTableData}
          changeSelected={(item) => {
            setSelectInstanceList(item);
          }}
          loading={loadingData}
          selectType={isASGList ? SelectType.NONE : SelectType.CHECKBOX}
          columnDefinitions={
            isASGList
              ? [
                  {
                    id: "Name",
                    header: t("resource:group.comp.instances.name"),
                    cell: (e: InstanceWithStatus) => {
                      return e.name;
                    },
                  },
                  {
                    id: "instanceId",
                    header: t("resource:group.comp.instances.instanceId"),
                    cell: (e: InstanceWithStatus) => {
                      return (
                        <a
                          target="_blank"
                          href={buildEC2LInk(
                            amplifyConfig.aws_project_region,
                            e.id
                          )}
                          rel="noreferrer"
                        >
                          {e.id}
                        </a>
                      );
                    },
                  },

                  {
                    id: "ip",
                    header: t("resource:group.comp.instances.primaryIp"),
                    cell: (e: InstanceWithStatus) => {
                      return e.ipAddress;
                    },
                  },
                ]
              : [
                  {
                    id: "Name",
                    header: t("resource:group.comp.instances.name"),
                    cell: (e: InstanceWithStatus) => {
                      return e.name;
                    },
                  },
                  {
                    id: "instanceId",
                    header: t("resource:group.comp.instances.instanceId"),
                    cell: (e: InstanceWithStatus) => {
                      return (
                        <a
                          target="_blank"
                          href={buildEC2LInk(
                            amplifyConfig.aws_project_region,
                            e.id
                          )}
                          rel="noreferrer"
                        >
                          {e.id}
                        </a>
                      );
                    },
                  },

                  {
                    id: "ip",
                    header: t("resource:group.comp.instances.primaryIp"),
                    cell: (e: InstanceWithStatus) => {
                      return e.ipAddress;
                    },
                  },
                  {
                    id: "agent",
                    header: t("resource:group.comp.instances.logAgent"),
                    cell: (e: InstanceWithStatus) => {
                      return e.instanceStatus !==
                        LogAgentStatus.Not_Installed ? (
                        e.instanceStatus === LogAgentStatus.Installing ? (
                          <Status status={LogAgentStatus.Installing} />
                        ) : (
                          DEFAULT_AGENT_VERSION
                        )
                      ) : (
                        "-"
                      );
                    },
                  },
                  {
                    id: "pendingStatus",
                    header: t("resource:group.comp.instances.pendingStatus"),
                    cell: (e: InstanceWithStatus) => {
                      return e.instanceStatus !==
                        LogAgentStatus.Not_Installed ? (
                        e.instanceStatus === LogAgentStatus.Installing ? (
                          "-"
                        ) : (
                          <Status status={e.instanceStatus || ""} />
                        )
                      ) : (
                        "-"
                      );
                    },
                  },
                ]
          }
          items={showInstanceList}
          actions={
            isASGList ? (
              <div></div>
            ) : (
              <div>
                <Button
                  btnType="icon"
                  disabled={
                    loadingData ||
                    loadingRefresh ||
                    loadingInstall ||
                    startCheckStatus
                  }
                  onClick={() => {
                    if (!startCheckStatus) {
                      getAllInstanceWithStatus();
                    }
                  }}
                >
                  {loadingData || loadingRefresh ? (
                    <LoadingText />
                  ) : (
                    <RefreshIcon fontSize="small" />
                  )}
                </Button>
                <Button
                  btnType="primary"
                  loading={loadingInstall}
                  onClick={() => {
                    installLogAgentByInstance();
                  }}
                >
                  {t("button.installAgent")}
                </Button>
              </div>
            )
          }
          filter={
            isASGList ? (
              <div></div>
            ) : (
              <div>
                <TextInput
                  value={searchParams}
                  isSearch={true}
                  placeholder={t("resource:group.comp.instances.filter")}
                  onChange={(event) => {
                    console.info("event:", event);
                    setSearchParams(event.target.value);
                  }}
                />
                <TagFilter
                  tags={tagFilter}
                  addTag={addTag}
                  removeTag={removeTag}
                ></TagFilter>
              </div>
            )
          }
          pagination={<div></div>}
        />
        {!hasMoreInstance && !loadingData && loadmoreIsClick && (
          <div className="no-more-data">{t("noMoreInstance")}</div>
        )}
        {hasMoreInstance && (
          <div className="pd-20 text-center">
            <Button
              disabled={loadingRefresh || loadingInstall || loadingData}
              loadingColor="#666"
              loading={loadingMore}
              onClick={() => {
                getMoreInstanceWithStatus();
              }}
            >
              {t("button.loadMoreInstance")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstanceTable;
