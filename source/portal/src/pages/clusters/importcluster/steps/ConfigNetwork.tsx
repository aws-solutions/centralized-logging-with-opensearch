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
import ExtLink from "components/ExtLink";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import Tiles from "components/Tiles";
import { CreateLogMethod } from "assets/js/const";
import FormItem from "components/FormItem";
import { listResources } from "graphql/queries";
import { appSyncRequestQuery } from "assets/js/request";
import { ESVPCInfo, Resource, ResourceType } from "API";
import { SelectItem } from "components/Select/select";
import Select from "components/Select";
import MultiSelect from "components/MultiSelect";
import { ImportedDomainType } from "../ImportCluster";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { InfoBarTypes } from "reducer/appReducer";
import { buildSGLink, buildSubnetLink, buildVPCLink } from "assets/js/utils";
import Alert from "components/Alert";
import { useTranslation } from "react-i18next";
import { RootState } from "reducer/reducers";
interface ConfigNetworkProps {
  importedCluster: ImportedDomainType;
  changeVpc: (domain: string) => void;
  changeSubnet: (subnets: string) => void;
  changeSecurityGroup: (securityGroup: string) => void;
  changeVPCList: (list: SelectItem[]) => void;
  changeSubnetList: (list: SelectItem[]) => void;
  changeSGList: (list: SelectItem[]) => void;
  changeVPCAlert: (show: boolean) => void;
  changeCreationMethod: (method: string) => void;
  esVPCInfo: ESVPCInfo;
}

const ConfigNetwork: React.FC<ConfigNetworkProps> = (
  props: ConfigNetworkProps
) => {
  const {
    importedCluster,
    changeVpc,
    changeSubnet,
    changeSecurityGroup,
    changeVPCList,
    changeSubnetList,
    changeSGList,
    changeVPCAlert,
    changeCreationMethod,
    esVPCInfo,
  } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const [loadingRes, setLoadingRes] = useState(false);

  const convertResourceToOptionList = (
    resList: Resource[],
    type: ResourceType
  ): SelectItem[] => {
    const tmpOptionList: SelectItem[] = [];
    resList.forEach((element) => {
      if (type === ResourceType.VPC) {
        tmpOptionList.push({
          name: `${element.id}(${element.name})`,
          value: element.id,
        });
      }
      if (type === ResourceType.SecurityGroup) {
        tmpOptionList.push({
          name: `${element.id}(${element.name})`,
          value: element.id,
        });
      }
      if (type === ResourceType.Subnet) {
        tmpOptionList.push({
          name: `${element.id}(${element.name})`,
          value: element.id,
          optTitle: element.description || "",
        });
      }
    });

    return tmpOptionList;
  };

  const getResources = async (type: ResourceType, parentId?: string) => {
    try {
      setLoadingRes(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: type,
        parentId: parentId,
      });
      console.info("domainNames:", resData.data);
      const dataList = resData.data.listResources;
      const list = convertResourceToOptionList(dataList, type);
      if (type === ResourceType.VPC) {
        changeVPCList(list);
      }
      if (type === ResourceType.Subnet) {
        changeSubnetList(list);
      }
      if (type === ResourceType.SecurityGroup) {
        changeSGList(list);
      }
      setLoadingRes(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getResources(ResourceType.VPC);
  }, []);

  return (
    <div>
      <HeaderPanel title={t("cluster:import.configNetwork.osNetwork")}>
        <div className="flex value-label-span">
          <div className="flex-1">
            <ValueWithLabel
              label={t("cluster:import.configNetwork.clusterVPC")}
            >
              <ExtLink
                to={`${buildVPCLink(
                  amplifyConfig.aws_project_region,
                  esVPCInfo.vpcId
                )}`}
              >
                {esVPCInfo.vpcId}
              </ExtLink>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("cluster:import.configNetwork.clusterSG")}>
              <div>
                {esVPCInfo?.securityGroupIds?.map((element) => {
                  return (
                    <div key={element}>
                      <ExtLink
                        to={buildSGLink(
                          amplifyConfig.aws_project_region,
                          element || ""
                        )}
                      >
                        {element}
                      </ExtLink>
                    </div>
                  );
                })}
              </div>
            </ValueWithLabel>
          </div>
          <div className="flex-1 border-left-c">
            <ValueWithLabel label={t("cluster:import.configNetwork.clusterAZ")}>
              <div>
                {esVPCInfo?.subnetIds?.map((element, index) => {
                  return (
                    <div key={element}>
                      <ExtLink
                        to={buildSubnetLink(
                          amplifyConfig.aws_project_region,
                          element
                        )}
                      >{`${
                        esVPCInfo.availabilityZones?.[index]
                      }:${" "}${element}`}</ExtLink>
                    </div>
                  );
                })}
              </div>
            </ValueWithLabel>
          </div>
        </div>
      </HeaderPanel>
      <HeaderPanel title={t("cluster:import.configNetwork.creation")}>
        <div>
          <FormItem
            optionTitle={t("cluster:import.configNetwork.method")}
            optionDesc=""
            infoType={InfoBarTypes.CREATION_METHOD_NETWORK}
          >
            <Tiles
              value={importedCluster.creationMethod}
              onChange={(event) => {
                changeCreationMethod(event.target.value);
              }}
              items={[
                {
                  label: t("cluster:import.configNetwork.auto"),
                  description: t("cluster:import.configNetwork.autoDesc"),
                  value: CreateLogMethod.Automatic,
                },
                {
                  label: t("cluster:import.configNetwork.manual"),
                  description: t("cluster:import.configNetwork.manualDesc"),
                  value: CreateLogMethod.Manual,
                },
              ]}
            />
          </FormItem>
        </div>
      </HeaderPanel>

      {CreateLogMethod.Manual === importedCluster.creationMethod && (
        <HeaderPanel
          infoType={InfoBarTypes.LOG_PROCESSING_NETWORK}
          title={t("cluster:import.configNetwork.layerNetwork")}
          desc={t("cluster:import.configNetwork.layerNetworkDesc")}
        >
          <div>
            {importedCluster.showVPCAlert && (
              <div className="m-w-75p">
                <Alert
                  title={t("cluster:import.configNetwork.configTip")}
                  content={t("cluster:import.configNetwork.configTipDesc")}
                />
              </div>
            )}
            <FormItem
              optionTitle={t("cluster:import.configNetwork.vpc")}
              optionDesc={t("cluster:import.configNetwork.vpcDesc")}
            >
              <Select
                loading={loadingRes}
                className="m-w-75p"
                optionList={importedCluster.logProcessVpcOptionList}
                value={importedCluster.vpc.vpcId}
                onChange={(event) => {
                  changeVpc(event.target.value);
                  getResources(ResourceType.Subnet, event.target.value);
                  getResources(ResourceType.SecurityGroup, event.target.value);
                  if (event.target.value !== esVPCInfo.vpcId) {
                    changeVPCAlert(true);
                  } else {
                    changeVPCAlert(false);
                  }
                }}
                placeholder={t("cluster:import.configNetwork.chooseVPC")}
              />
            </FormItem>

            <FormItem
              optionTitle={t(
                "cluster:import.configNetwork.logProcessSubnetGroup"
              )}
              optionDesc={t(
                "cluster:import.configNetwork.logProcessSubnetGroupDesc"
              )}
            >
              <MultiSelect
                loading={loadingRes}
                className="m-w-75p"
                optionList={importedCluster.logProcessSubnetOptionList}
                value={
                  importedCluster.vpc.privateSubnetIds
                    ? importedCluster.vpc.privateSubnetIds.split(",")
                    : []
                }
                onChange={(subnetIds) => {
                  console.info(subnetIds);
                  if (subnetIds) {
                    changeSubnet(subnetIds.join(","));
                  }
                }}
                placeholder={t("cluster:import.configNetwork.chooseSubnet")}
              />
            </FormItem>

            <FormItem
              optionTitle={t("cluster:import.configNetwork.logProcessSG")}
              optionDesc={t("cluster:import.configNetwork.logProcessSGDesc")}
            >
              <Select
                loading={loadingRes}
                className="m-w-75p"
                optionList={importedCluster.logProcessSecGroupList}
                value={importedCluster.vpc.securityGroupId}
                onChange={(event) => {
                  changeSecurityGroup(event.target.value);
                }}
                placeholder={t("cluster:import.configNetwork.chooseSG")}
              />
            </FormItem>
          </div>
        </HeaderPanel>
      )}
    </div>
  );
};

export default ConfigNetwork;
