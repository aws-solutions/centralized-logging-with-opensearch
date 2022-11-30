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
import CreateStep from "components/CreateStep";
import SelectDomain from "./steps/SelectDomain";
import ConfigNetwork from "./steps/ConfigNetwork";
import CreateTags from "./steps/CreateTags";
import Button from "components/Button";
import Breadcrumb from "components/Breadcrumb";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { importDomain } from "graphql/mutations";
import { useHistory } from "react-router-dom";
import { ESVPCInfo, Tag } from "API";
import { ActionType, AppStateProps } from "reducer/appReducer";
import { useDispatch, useSelector } from "react-redux";
import { AmplifyConfigType } from "types";
import { getDomainVpc, validateVpcCidr } from "graphql/queries";
import { SelectItem } from "components/Select/select";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import { CreateLogMethod } from "assets/js/const";
export interface ImportedDomainType {
  showVPCAlert: boolean;
  creationMethod: string;
  logProcessVpcOptionList: SelectItem[];
  logProcessSubnetOptionList: SelectItem[];
  logProcessSecGroupList: SelectItem[];
  domainName: string;
  region: string;
  tags: Tag[];
  vpc: {
    securityGroupId: string;
    publicSubnetIds: string;
    privateSubnetIds: string;
    vpcId: string;
  };
}

const ImportOpenSearchCluster: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("cluster:import.name"),
    },
  ];
  const history = useHistory();
  const dispatch = useDispatch();

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const [curStep, setCurStep] = useState(0);
  const [importedCluster, setImportedCluster] = useState<ImportedDomainType>({
    showVPCAlert: false,
    creationMethod: CreateLogMethod.Automatic,
    logProcessVpcOptionList: [],
    logProcessSubnetOptionList: [],
    logProcessSecGroupList: [],
    domainName: "",
    region: amplifyConfig.aws_project_region,
    tags: [],
    vpc: {
      securityGroupId: "",
      publicSubnetIds: "",
      privateSubnetIds: "",
      vpcId: "",
    },
  });

  const [loadingVPC, setLoadingVPC] = useState(false);
  const [esVPCInfo, setEsVPCInfo] = useState<ESVPCInfo>({
    __typename: "ESVPCInfo",
    vpcId: "",
    subnetIds: [],
    securityGroupIds: [],
    availabilityZones: [],
  });
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [domainEmptyError, setDomainEmptyError] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);

  const confirmImportDomain = async () => {
    try {
      setLoadingCreate(true);
      const dataImportCluster = JSON.parse(JSON.stringify(importedCluster));
      delete dataImportCluster.logProcessVpcOptionList;
      delete dataImportCluster.logProcessSubnetOptionList;
      delete dataImportCluster.logProcessSecGroupList;
      delete dataImportCluster.showVPCAlert;
      if (dataImportCluster.creationMethod === CreateLogMethod.Automatic) {
        delete dataImportCluster.vpc;
      }
      delete dataImportCluster.creationMethod;
      const importRes = await appSyncRequestMutation(
        importDomain,
        dataImportCluster
      );
      console.info("importRes:", importRes);
      setLoadingCreate(false);
      history.push({
        pathname: "/clusters/opensearch-domains",
      });
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  // Get Domain VPC Info by domainName
  const getDomainVPCInfoByName = async (domainName: string) => {
    try {
      setLoadingVPC(true);
      const resData: any = await appSyncRequestQuery(getDomainVpc, {
        domainName: domainName,
        region: amplifyConfig.aws_project_region,
      });
      console.info("resData:", resData);
      const dataVPCInfo: ESVPCInfo = resData.data.getDomainVpc;
      setEsVPCInfo(dataVPCInfo);
      setLoadingVPC(false);
    } catch (error) {
      setLoadingVPC(false);
      console.error(error);
    }
  };

  const checkCIDRConflict = async () => {
    try {
      setLoadingNext(true);
      const resData: any = await appSyncRequestQuery(validateVpcCidr, {
        domainName: importedCluster.domainName,
        region: amplifyConfig.aws_project_region,
      });
      setLoadingNext(false);
      if (resData.data.validateVpcCidr === "OK") {
        setCurStep(2);
      }
    } catch (error) {
      setLoadingNext(false);
      console.error(error);
    }
  };

  useEffect(() => {
    console.info("importedCluster:", importedCluster);
  }, [importedCluster]);

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="lh-import-cluster">
            <Breadcrumb list={breadCrumbList} />
            <div className="create-wrapper">
              <div className="create-step">
                <CreateStep
                  list={[
                    {
                      name: t("cluster:import.step.selectDomain"),
                    },
                    {
                      name: t("cluster:import.step.configNetwork"),
                    },
                    {
                      name: t("cluster:import.step.createTags"),
                    },
                  ]}
                  activeIndex={curStep}
                />
              </div>
              <div className="create-content m-w-1024">
                {curStep === 0 && (
                  <SelectDomain
                    disableSelect={loadingVPC}
                    importedCluster={importedCluster}
                    emptyError={domainEmptyError}
                    changeDomain={(domain) => {
                      console.info("domain:domain:", domain);
                      setDomainEmptyError(false);
                      getDomainVPCInfoByName(domain);
                      setImportedCluster((prev: ImportedDomainType) => {
                        return { ...prev, domainName: domain };
                      });
                    }}
                  />
                )}
                {curStep === 1 && (
                  <ConfigNetwork
                    esVPCInfo={esVPCInfo}
                    importedCluster={importedCluster}
                    changeVpc={(vpcId) => {
                      console.info("vpcId:vpcId:vpcId:", vpcId);
                      setImportedCluster((prev: ImportedDomainType) => {
                        return {
                          ...prev,
                          vpc: {
                            ...prev.vpc,
                            vpcId: vpcId,
                            privateSubnetIds: "",
                            securityGroupId: "",
                          },
                        };
                      });
                    }}
                    changeSubnet={(subnetIds) => {
                      setImportedCluster((prev: ImportedDomainType) => {
                        return {
                          ...prev,
                          vpc: {
                            ...prev.vpc,
                            privateSubnetIds: subnetIds,
                            publicSubnetIds: "",
                          },
                        };
                      });
                    }}
                    changeSecurityGroup={(sgId) => {
                      setImportedCluster((prev: ImportedDomainType) => {
                        return {
                          ...prev,
                          vpc: { ...prev.vpc, securityGroupId: sgId },
                        };
                      });
                    }}
                    changeVPCList={(list) => {
                      setImportedCluster((prev: ImportedDomainType) => {
                        return {
                          ...prev,
                          logProcessVpcOptionList: list,
                        };
                      });
                    }}
                    changeSubnetList={(list) => {
                      setImportedCluster((prev: ImportedDomainType) => {
                        return {
                          ...prev,
                          logProcessSubnetOptionList: list,
                        };
                      });
                    }}
                    changeSGList={(list) => {
                      setImportedCluster((prev: ImportedDomainType) => {
                        return {
                          ...prev,
                          logProcessSecGroupList: list,
                        };
                      });
                    }}
                    changeVPCAlert={(show) => {
                      setImportedCluster((prev: ImportedDomainType) => {
                        return {
                          ...prev,
                          showVPCAlert: show,
                        };
                      });
                    }}
                    changeCreationMethod={(method) => {
                      setImportedCluster((prev: ImportedDomainType) => {
                        return {
                          ...prev,
                          creationMethod: method,
                        };
                      });
                    }}
                  />
                )}
                {curStep === 2 && (
                  <CreateTags
                    importedCluster={importedCluster}
                    changeTags={(tags) => {
                      setImportedCluster((prev: ImportedDomainType) => {
                        return { ...prev, tags: tags };
                      });
                    }}
                  />
                )}
                <div className="button-action text-right">
                  <Button
                    btnType="text"
                    onClick={() => {
                      history.push({
                        pathname: "/clusters/opensearch-domains",
                      });
                    }}
                  >
                    {t("button.cancel")}
                  </Button>
                  {curStep > 0 && (
                    <Button
                      onClick={() => {
                        setCurStep((curStep) => {
                          return curStep - 1 < 0 ? 0 : curStep - 1;
                        });
                      }}
                    >
                      {t("button.previous")}
                    </Button>
                  )}

                  {curStep < 2 && (
                    <Button
                      btnType="primary"
                      loading={loadingNext}
                      onClick={() => {
                        if (!importedCluster.domainName) {
                          setDomainEmptyError(true);
                          setCurStep(0);
                        } else {
                          if (
                            curStep === 1 &&
                            importedCluster.creationMethod ===
                              CreateLogMethod.Automatic
                          ) {
                            checkCIDRConflict();
                          } else {
                            setCurStep((curStep) => {
                              return curStep > 2 ? 2 : curStep + 1;
                            });
                          }
                        }
                      }}
                    >
                      {t("button.next")}
                    </Button>
                  )}
                  {curStep === 2 && (
                    <Button
                      loading={loadingCreate}
                      btnType="primary"
                      onClick={() => {
                        confirmImportDomain();
                      }}
                    >
                      {t("button.import")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default ImportOpenSearchCluster;
