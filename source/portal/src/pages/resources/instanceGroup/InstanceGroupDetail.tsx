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
import React, { useState, useEffect } from "react";
import { RouteComponentProps } from "react-router-dom";
import RefreshIcon from "@material-ui/icons/Refresh";
import SideMenu from "components/SideMenu";
import Breadcrumb from "components/Breadcrumb";
import PagePanel from "components/PagePanel";
import Button from "components/Button";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import { SelectType, TablePanel } from "components/TablePanel";
import LoadingText from "components/LoadingText";
// import { Pagination } from "@material-ui/lab";
import Status from "components/Status/Status";
import { appSyncRequestQuery } from "assets/js/request";
import {
  getInstanceGroup,
  getLogAgentStatus,
  listInstances,
} from "graphql/queries";
import { Instance, InstanceGroup } from "API";
import {
  DEFAULT_AGENT_VERSION,
  DEFAULT_INSTANCE_SELECTION,
  DEFAULT_PLATFORM,
  ResourceStatus,
} from "assets/js/const";
import { buildEC2LInk, formatLocalTime } from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Alert } from "assets/js/alert";

interface MatchParams {
  id: string;
}
interface InstanceWithStatus extends Instance {
  instanceStatus: string;
}

const InstanceGroupDetail: React.FC<RouteComponentProps<MatchParams>> = (
  props: RouteComponentProps<MatchParams>
) => {
  const id: string = props.match.params.id;
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const { t } = useTranslation();
  const [curInstanceGroup, setCurInstanceGroup] = useState<InstanceGroup>();
  const [instanceIdList, setInstanceIdList] = useState<(string | null)[]>([]);
  const [instanceInfoList, setInstanceInfoList] = useState<
    InstanceWithStatus[]
  >([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingInstance, setLoadingInstance] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);

  const getInstanceGroupById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getInstanceGroup, {
        id: id,
      });
      console.info("resData:", resData);
      const dataInstanceGroup: InstanceGroup = resData.data.getInstanceGroup;
      if (dataInstanceGroup.status === ResourceStatus.INACTIVE) {
        Alert(t("resource:group.detail.notExist"));
        return;
      }
      setCurInstanceGroup(dataInstanceGroup);
      setInstanceIdList(dataInstanceGroup.instanceSet || []);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  const getAllInstanceDetailAndStatus = async () => {
    const tmpInstanceInfoList: InstanceWithStatus[] = [];
    setLoadingRefresh(true);
    // setInstanceInfoList([]);
    for (let i = 0; i < instanceIdList.length; i++) {
      const dataInstanceInfo = await appSyncRequestQuery(listInstances, {
        maxResults: 50,
        nextToken: "",
        instanceSet: instanceIdList[i],
      });
      const dataInstanceStatusInfo = await appSyncRequestQuery(
        getLogAgentStatus,
        {
          instanceId: instanceIdList[i],
        }
      );
      tmpInstanceInfoList.push({
        ...(dataInstanceInfo.data.listInstances?.instances?.[0] || {
          id: instanceIdList[i],
        }),
        instanceStatus: dataInstanceStatusInfo.data.getLogAgentStatus,
      });
    }
    // console.info("tmpInstanceInfoList:", tmpInstanceInfoList);
    setLoadingRefresh(false);
    setInstanceInfoList(tmpInstanceInfoList);
  };

  useEffect(() => {
    getInstanceGroupById();
  }, []);

  useEffect(() => {
    if (instanceIdList && instanceIdList.length > 0) {
      setLoadingInstance(true);
      getAllInstanceDetailAndStatus().then(() => {
        setLoadingInstance(false);
      });
    }
  }, [instanceIdList]);

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("resource:group.name"),
      link: "/resources/instance-group",
    },
    { name: curInstanceGroup?.groupName || "" },
  ];

  // const handlePageChange = () => {
  //   setLoadingData(false);
  //   console.info("page change");
  // };

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />
            {loadingData ? (
              <LoadingText text="" />
            ) : (
              <div className="pb-50">
                <PagePanel title={curInstanceGroup?.groupName || ""}>
                  <HeaderPanel title={t("resource:group.detail.general")}>
                    <div className="flex value-label-span">
                      <div className="flex-1">
                        <ValueWithLabel label={t("resource:group.detail.name")}>
                          <div>{curInstanceGroup?.groupName}</div>
                        </ValueWithLabel>
                      </div>
                      <div className="flex-1 border-left-c">
                        <ValueWithLabel
                          label={t("resource:group.detail.instanceSelection")}
                        >
                          <div>{DEFAULT_INSTANCE_SELECTION}</div>
                        </ValueWithLabel>
                      </div>
                      <div className="flex-1 border-left-c">
                        <ValueWithLabel
                          label={t("resource:group.detail.platform")}
                        >
                          <div>{DEFAULT_PLATFORM}</div>
                        </ValueWithLabel>
                      </div>
                      <div className="flex-1 border-left-c">
                        <ValueWithLabel
                          label={t("resource:group.detail.created")}
                        >
                          <div>
                            {formatLocalTime(curInstanceGroup?.createdDt || "")}
                          </div>
                        </ValueWithLabel>
                      </div>
                    </div>
                  </HeaderPanel>

                  <TablePanel
                    title={t("resource:group.detail.list.groups")}
                    changeSelected={(item) => {
                      console.info("item:", item);
                    }}
                    loading={loadingInstance}
                    selectType={SelectType.NONE}
                    columnDefinitions={[
                      {
                        id: "Name",
                        header: t("resource:group.detail.list.name"),
                        cell: (e: InstanceWithStatus) => {
                          return e.name;
                        },
                      },
                      {
                        id: "instanceId",
                        header: t("resource:group.detail.list.instanceId"),
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
                        header: t("resource:group.detail.list.primaryIP"),
                        cell: (e: InstanceWithStatus) => {
                          return e.ipAddress;
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
                          btnType="icon"
                          disabled={loadingData || loadingRefresh}
                          // loading={loadingRefresh}
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
                    pagination={
                      <div></div>
                      // <Pagination
                      //   count={4}
                      //   page={1}
                      //   onChange={handlePageChange}
                      //   size="small"
                      // />
                    }
                  />
                </PagePanel>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstanceGroupDetail;
