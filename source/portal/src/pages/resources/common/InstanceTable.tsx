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
import { EC2GroupPlatform, LogAgentStatus, TagFilterInput } from "API";
import { buildSolutionDocsLink, getFLBVersionByType } from "assets/js/const";
import {
  buildEC2LInk,
  defaultArray,
  defaultStr,
  formatLocalTime,
  ternary,
} from "assets/js/utils";
import Button from "components/Button";
import Switch from "components/Switch";
import LoadingText from "components/LoadingText";
import Status from "components/Status/Status";
import { SelectType, TablePanel } from "components/TablePanel";
import TagFilter from "components/TagFilter";
import TextInput from "components/TextInput";
import { useTranslation } from "react-i18next";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { requestInstallLogAgent } from "graphql/mutations";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { getInstanceAgentStatus, listInstances } from "graphql/queries";
import { handleErrorMessage, Alert } from "assets/js/alert";
import ClickableRichTooltip from "components/ClickableRichTooltip";
import ExtLink from "components/ExtLink";
import cloneDeep from "lodash.clonedeep";
import { RootState } from "reducer/reducers";
import { defaultTo } from "lodash";
import ButtonRefresh from "components/ButtonRefresh";
import SelectPlatform from "./SelectPlatform";

const PAGE_SIZE = 50;
const REFRESH_INTERVAL = 20000; // 20 seconds to refresh
export interface InstanceItemType {
  computerName: string;
  id: string;
  ipAddress: string;
  name: string;
  platformName: string;
}

export interface ListInstanceResponse {
  instances: InstanceItemType[];
  nextToken: string;
}

export interface InstanceStatusType {
  curlOutput: string;
  instanceId: string;
  invocationOutput: string;
  status: string;
}

export interface CommandResponse {
  commandId: string;
  instanceAgentStatusList: InstanceStatusType[];
}

export type InstanceWithStatusType = Partial<InstanceItemType> &
  Partial<InstanceStatusType>;

interface InstanceTableProps {
  platform: EC2GroupPlatform;
  changePlatform?: (platform: EC2GroupPlatform) => void;
  disableChangePlatform?: boolean;
  isASGList?: boolean;
  defaultTagFilter?: TagFilterInput[];
  accountId: string;
  changeInstanceSet?: (instances: any) => void;
  setCreateDisabled?: (disable: boolean) => void;
  defaultDisabledIds?: (string | null)[];
  description?: string;
}

let intervalId: any = 0;

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
    platform,
    changePlatform,
    disableChangePlatform,
    description,
  } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const [loadingData, setLoadingData] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [instanceWithStatusList, setInstanceWithStatusList] = useState<
    InstanceWithStatusType[]
  >([]);
  const [loadingInstall, setLoadingInstall] = useState(false);
  const [tagFilter, setTagFilter] = useState<TagFilterInput[]>(
    defaultArray(defaultTagFilter, [])
  );
  const [selectInstanceList, setSelectInstanceList] = useState<
    InstanceWithStatusType[]
  >([]);
  const [enableAutoRefresh, setEnableAutoRefresh] = useState(false);
  const [searchParams, setSearchParams] = useState("");
  const [hasMoreInstance, setHasMoreInstance] = useState(false);
  const [nextToken, setNextToken] = useState("");
  const [loadMoreIsClick, setLoadMoreIsClick] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState("");
  const [showInstanceList, setShowInstanceList] = useState<
    InstanceWithStatusType[]
  >([]);

  // refresh instance status
  const refreshToGetInstanceStatus = async () => {
    if (loadMoreIsClick && selectInstanceList.length <= 0) {
      Alert(
        defaultStr(t("resource:group.comp.selectInstance")),
        defaultStr(t("oops")),
        "warning"
      );
      setEnableAutoRefresh(false);
      return;
    }
    let needUpdateInstances = instanceWithStatusList.map(
      (element) => element.instanceId
    );
    if (selectInstanceList.length > 0) {
      // refresh selected instances
      needUpdateInstances = selectInstanceList.map(
        (element) => element.instanceId
      );
    }
    setLoadingRefresh(true);
    const statusData = await appSyncRequestQuery(getInstanceAgentStatus, {
      instanceIds: [...new Set(needUpdateInstances)],
      accountId: accountId,
    });
    const instanceStatusResp: CommandResponse =
      statusData.data.getInstanceAgentStatus;

    const updatedInstances = instanceWithStatusList.map((instance) => {
      const statusUpdate = instanceStatusResp.instanceAgentStatusList.find(
        (status) => status.instanceId === instance.instanceId
      );
      if (statusUpdate) {
        return { ...instance, status: statusUpdate.status };
      }
      return instance;
    });
    setInstanceWithStatusList(updatedInstances);
    setLoadingRefresh(false);
    console.info("statusData:", statusData);
  };

  const handleRefreshLogicGetInstanceIds = (refresh: boolean) => {
    if (refresh) {
      // if has selected instance, get instance status by selected instance
      if (selectInstanceList.length > 0) {
        return selectInstanceList.map((instance) => instance.id);
      } else {
        // get all instance with status
        return instanceWithStatusList.map((instance) => instance.id);
      }
    } else {
      return instanceWithStatusList.map((instance) => instance.id);
    }
  };

  const getMergedStatusInstance = (
    fetchStatusList: InstanceItemType[] | InstanceWithStatusType[],
    instanceStatusList: InstanceStatusType[]
  ) => {
    const tmpInstanceWithStatus: InstanceWithStatusType[] = [];
    for (const instanceInfo of fetchStatusList) {
      let mergedObj;
      // find same id object
      const statusInfo = instanceStatusList?.find(
        (status) => status?.instanceId === instanceInfo?.id
      );
      if (statusInfo) {
        // found
        mergedObj = { ...instanceInfo, ...statusInfo };
      } else {
        mergedObj = {
          ...instanceInfo,
          ...{
            instanceId: instanceInfo?.id,
            status: LogAgentStatus.Offline,
            invocationOutput: t("resource:group.comp.defaultOfflineError"),
            curlOutput: "",
          },
        };
      }
      // merge and push to template array
      tmpInstanceWithStatus.push(mergedObj);
    }
    return tmpInstanceWithStatus;
  };

  // Get All Instance Status
  const getAllInstanceWithStatus = async (
    refresh = false,
    isLoadingMore = false
  ) => {
    ternary(
      !refresh,
      () => {
        setLoadingData(true);
        setInstanceWithStatusList([]);
      },
      () => {
        setCreateDisabled?.(true);
      }
    )();
    if (isLoadingMore) {
      setLoadingMore(true);
    }
    setLoadingRefresh(true);
    let instanceIDs = [];
    let dataInstanceList: InstanceItemType[] = [];
    let instanceListNextToken = "";
    if (!refresh || isLoadingMore) {
      if (isLoadingMore) {
        setLoadMoreIsClick(true);
      }
      const resInstanceData = await appSyncRequestQuery(listInstances, {
        maxResults: PAGE_SIZE,
        nextToken: ternary(refresh, defaultTo(nextToken, ""), ""),
        tags: tagFilter,
        accountId: accountId,
        region: amplifyConfig.aws_project_region,
        platformType: platform,
      });
      const instanceRespData: ListInstanceResponse =
        resInstanceData.data.listInstances;
      if (isLoadingMore) {
        dataInstanceList = [...instanceRespData.instances];
      } else {
        dataInstanceList = instanceRespData.instances;
      }
      instanceListNextToken = instanceRespData.nextToken;
      instanceIDs = [...instanceRespData.instances].map(
        (instance) => instance.id
      );
    } else {
      instanceIDs = handleRefreshLogicGetInstanceIds(refresh);
    }
    const statusData = await appSyncRequestQuery(getInstanceAgentStatus, {
      instanceIds: [...new Set(instanceIDs)],
      accountId: accountId,
    });

    const instanceStatusResp: CommandResponse =
      statusData.data.getInstanceAgentStatus;
    const instanceStatusList = instanceStatusResp.instanceAgentStatusList;

    let tmpInstanceWithStatus: InstanceWithStatusType[] = [];

    let fetchStatusList: InstanceItemType[] | InstanceWithStatusType[] =
      dataInstanceList;
    if (refresh && !isLoadingMore) {
      fetchStatusList = instanceWithStatusList;
    }

    tmpInstanceWithStatus = getMergedStatusInstance(
      fetchStatusList,
      instanceStatusList
    );

    // Set Token after Load more and status
    ternary(
      instanceListNextToken,
      () => {
        setHasMoreInstance(true);
        setNextToken(instanceListNextToken);
      },
      () => {
        setHasMoreInstance(false);
        setNextToken("");
      }
    )();

    if (!refresh || isLoadingMore) {
      setInstanceWithStatusList((prev) => {
        return [...prev, ...tmpInstanceWithStatus];
      });
    }

    setLoadingData(false);
    setLoadingRefresh(false);
    setCreateDisabled?.(false);
    setLoadingMore(false);
  };

  // Install Log Agent
  const installLogAgentByInstance = async () => {
    if (selectInstanceList.length <= 0) {
      Alert(t("resource:group.comp.selectInstance"), t("oops"), "warning");
      return;
    }
    clearInterval(intervalId);
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
      setEnableAutoRefresh(true);
    } catch (error: any) {
      setLoadingInstall(false);
      setEnableAutoRefresh(true);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  // Get instance group list when page rendered.
  useEffect(() => {
    setNextToken("");
    setLoadMoreIsClick(false);
    setCreateDisabled?.(true);
    clearInterval(intervalId);
    getAllInstanceWithStatus();
    // reset select items
    changeInstanceSet?.([]);
    setSelectInstanceList([]);
  }, [tagFilter, accountId, platform]);

  useEffect(() => {
    if (enableAutoRefresh) {
      setLastUpdateTime(
        t("applog:installAgent.lastUpdateTime") +
          formatLocalTime(new Date().toISOString())
      );
      refreshToGetInstanceStatus();
      intervalId = setInterval(() => {
        refreshToGetInstanceStatus();
        setLastUpdateTime(
          t("applog:installAgent.lastUpdateTime") +
            formatLocalTime(new Date().toISOString())
        );
      }, REFRESH_INTERVAL);
    } else {
      clearInterval(intervalId);
    }
    return () => clearInterval(intervalId);
  }, [enableAutoRefresh]);

  useEffect(() => {
    const cloneInstanceList = cloneDeep(instanceWithStatusList);
    setShowInstanceList(
      cloneInstanceList
        .filter((element) => {
          return defaultStr(element?.id).indexOf(searchParams) >= 0;
        })
        .sort((a, b) =>
          (a?.name?.toLowerCase() || "") > (b?.name?.toLowerCase() || "")
            ? 1
            : -1
        )
    );
  }, [instanceWithStatusList, searchParams]);

  // add tag filter
  const addTag = (tag: TagFilterInput) => {
    setTagFilter((prev) => {
      const tmpList = JSON.parse(JSON.stringify(prev));
      const target = tmpList.find((tmp: TagFilterInput) => tmp.Key === tag.Key);
      if (target) {
        target.Values = target.Values.concat(defaultArray(tag.Values, []));
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

  const renderInstanceId = (data: InstanceWithStatusType) => {
    return (
      <a
        target="_blank"
        href={buildEC2LInk(
          amplifyConfig.aws_project_region,
          defaultStr(data.id)
        )}
        rel="noreferrer"
      >
        {data.id}
      </a>
    );
  };

  const renderAgentInstallStatus = (data: InstanceWithStatusType) => {
    if (data.status !== LogAgentStatus.Not_Installed) {
      if (data.status === LogAgentStatus.Installing) {
        return <Status status={LogAgentStatus.Installing} />;
      } else {
        return getFLBVersionByType(platform);
      }
    } else {
      return "-";
    }
  };

  const renderAgentStatus = (data: InstanceWithStatusType) => {
    if (data.status !== LogAgentStatus.Not_Installed) {
      if (data.status === LogAgentStatus.Installing) {
        return "-";
      } else {
        return (
          <ClickableRichTooltip
            content={
              <div style={{ maxWidth: "30em" }}>
                {t("applog:installAgent.invocationOutputFirst")}
                {data.invocationOutput}
                {t("applog:installAgent.invocationOutputMid")}
                {
                  <ExtLink to={buildSolutionDocsLink("troubleshooting.html")}>
                    {t("doc.guide")}
                  </ExtLink>
                }{" "}
                {t("applog:installAgent.invocationOutputLast")}
              </div>
            }
            placement="left"
            disabled={
              data.status !== LogAgentStatus.Offline ||
              data.invocationOutput === ""
            }
          >
            <div className="flex">
              <Status
                isLink={data.status === LogAgentStatus.Offline}
                status={defaultStr(data.status)}
              />
              {loadingRefresh && (
                <div className="ml-5">
                  <LoadingText />
                </div>
              )}
            </div>
          </ClickableRichTooltip>
        );
      }
    } else {
      return "-";
    }
  };

  return (
    <div>
      <div className="pb-20">
        <TablePanel
          variant="header-panel"
          trackId="id"
          defaultDisabledIds={defaultDisabledIds}
          title={t("resource:group.comp.instances.title")}
          desc={description}
          changeSelected={(item) => {
            setSelectInstanceList(item);
            changeInstanceSet?.(item);
          }}
          loading={loadingData}
          selectType={isASGList ? SelectType.NONE : SelectType.CHECKBOX}
          columnDefinitions={
            isASGList
              ? [
                  {
                    id: "Name",
                    header: t("resource:group.comp.instances.name"),
                    cell: (e: InstanceWithStatusType) => {
                      return e.name;
                    },
                  },
                  {
                    id: "instanceId",
                    header: t("resource:group.comp.instances.instanceId"),
                    cell: (e: InstanceWithStatusType) => renderInstanceId(e),
                  },

                  {
                    id: "ip",
                    header: t("resource:group.comp.instances.primaryIp"),
                    cell: (e: InstanceWithStatusType) => {
                      return e.ipAddress;
                    },
                  },
                ]
              : [
                  {
                    id: "Name",
                    header: t("resource:group.comp.instances.name"),
                    cell: (e: InstanceWithStatusType) => {
                      return e.name;
                    },
                  },
                  {
                    id: "instanceId",
                    header: t("resource:group.comp.instances.instanceId"),
                    cell: (e: InstanceWithStatusType) => renderInstanceId(e),
                  },

                  {
                    id: "ip",
                    header: t("resource:group.comp.instances.primaryIp"),
                    cell: (e: InstanceWithStatusType) => {
                      return e.ipAddress;
                    },
                  },
                  {
                    id: "agent",
                    header: t("resource:group.comp.instances.logAgent"),
                    cell: (e: InstanceWithStatusType) =>
                      renderAgentInstallStatus(e),
                  },
                  {
                    id: "pendingStatus",
                    width: 200,
                    header: (
                      <div>
                        {t("resource:group.comp.instances.pendingStatus")}
                        <div className="last-update-time">
                          {lastUpdateTime}{" "}
                        </div>
                      </div>
                    ),
                    cell: (e: InstanceWithStatusType) => renderAgentStatus(e),
                  },
                ]
          }
          items={showInstanceList}
          actions={
            isASGList ? (
              <div className="flex">
                <Switch
                  isOn={enableAutoRefresh}
                  handleToggle={() => {
                    setEnableAutoRefresh(!enableAutoRefresh);
                  }}
                  label={" "}
                />
                <div className="ml-5 font-bold">
                  {t("applog:installAgent.refreshSwitch")}
                </div>
              </div>
            ) : (
              <div className="flex align-center">
                <div className="flex mr-10">
                  <Switch
                    isOn={enableAutoRefresh}
                    handleToggle={() => {
                      setEnableAutoRefresh(!enableAutoRefresh);
                    }}
                    label={" "}
                  />
                  <div className="ml-5 font-bold">
                    {t("applog:installAgent.refreshSwitch")}
                  </div>
                </div>
                <Button
                  btnType="icon"
                  disabled={loadingData || loadingRefresh || loadingInstall}
                  onClick={() => {
                    // click refresh
                    refreshToGetInstanceStatus();
                  }}
                >
                  <ButtonRefresh loading={loadingData || loadingRefresh} />
                </Button>
                <Button
                  data-testid="install-agent-button"
                  btnType="primary"
                  loading={loadingInstall}
                  disabled={loadingData || loadingInstall}
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
                <div className="flex gap-10">
                  <div style={{ width: 150 }}>
                    <SelectPlatform
                      platform={platform}
                      disableChangePlatform={
                        disableChangePlatform ?? loadingData
                      }
                      changePlatform={(pf) => {
                        changePlatform?.(pf);
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <TextInput
                      value={searchParams}
                      isSearch={true}
                      placeholder={t("resource:group.comp.instances.filter")}
                      onChange={(event) => {
                        console.info("event:", event);
                        setSearchParams(event.target.value);
                      }}
                    />
                  </div>
                </div>
                <TagFilter
                  tags={tagFilter}
                  addTag={addTag}
                  removeTag={removeTag}
                ></TagFilter>
              </div>
            )
          }
          pagination={<></>}
        />

        {!hasMoreInstance && !loadingData && loadMoreIsClick && (
          <div className="no-more-data">{t("noMoreInstance")}</div>
        )}
        {hasMoreInstance && (
          <div className="pd-20 text-center">
            <Button
              disabled={loadingRefresh || loadingInstall || loadingData}
              loadingColor="#666"
              loading={loadingMore}
              onClick={() => {
                getAllInstanceWithStatus(true, true);
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
