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
import CreateStep from "components/CreateStep";
import SelectDomain from "./steps/SelectDomain";
import ConfigNetwork from "./steps/ConfigNetwork";
import Button from "components/Button";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { importDomain } from "graphql/mutations";
import { useNavigate } from "react-router-dom";
import { DomainRelevantResource, ESVPCInfo } from "API";
import { ActionType } from "reducer/appReducer";
import { useDispatch, useSelector } from "react-redux";
import { AmplifyConfigType } from "types";
import { getDomainVpc, validateVpcCidr } from "graphql/queries";
import { SelectItem } from "components/Select/select";
import { useTranslation } from "react-i18next";
import { CreateLogMethod, DOMAIN_ALLOW_STATUS } from "assets/js/const";
import ImportDomain from "./steps/ImportDomain";
import { Actions, RootState } from "reducer/reducers";
import { Dispatch } from "redux";
import CommonLayout from "pages/layout/CommonLayout";
export interface ImportedDomainType {
  showVPCAlert: boolean;
  creationMethod: string;
  logProcessVpcOptionList: SelectItem[];
  logProcessSubnetOptionList: SelectItem[];
  logProcessSecGroupList: SelectItem[];
  domainName: string;
  domainStatus: string;
  region: string;
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
      name: t("menu.importOS"),
    },
  ];
  const navigate = useNavigate();
  const dispatch = useDispatch<Dispatch<Actions>>();

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const [curStep, setCurStep] = useState(0);
  const [importedCluster, setImportedCluster] = useState<ImportedDomainType>({
    showVPCAlert: false,
    creationMethod: CreateLogMethod.Automatic,
    logProcessVpcOptionList: [],
    logProcessSubnetOptionList: [],
    logProcessSecGroupList: [],
    domainName: "",
    domainStatus: "",
    region: amplifyConfig.aws_project_region,
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
  const [domainId, setDomainId] = useState("");
  const [domainRelatedResources, setDomainRelatedResources] = useState<
    DomainRelevantResource[]
  >([]);
  const [disableViewButton, setDisableViewButton] = useState(false);

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
      const importRes = await appSyncRequestMutation(importDomain, {
        ...dataImportCluster,
      });
      setLoadingCreate(false);
      setDomainId(importRes.data.importDomain.id);
      setDomainRelatedResources(importRes.data.importDomain.resources);
      setDisableViewButton(false);
      setCurStep(2);
    } catch (error) {
      setLoadingCreate(false);
      setDisableViewButton(true);
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
        confirmImportDomain();
      }
    } catch (error) {
      setLoadingNext(false);
      console.error(error);
    }
  };

  const checkTheSelectedDomain = () => {
    if (!importedCluster.domainName) {
      setDomainEmptyError(true);
      return;
    }
    if (!DOMAIN_ALLOW_STATUS.includes(importedCluster.domainStatus)) {
      return;
    }
    setCurStep(1);
  };

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  useEffect(() => {
    if (DOMAIN_ALLOW_STATUS.includes(importedCluster.domainStatus)) {
      getDomainVPCInfoByName(importedCluster.domainName);
    }
  }, [importedCluster.domainStatus]);

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
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
                name: t("cluster:import.step.importDomain"),
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
                setDomainEmptyError(false);
                setImportedCluster((prev: ImportedDomainType) => {
                  return { ...prev, domainName: domain };
                });
              }}
              changeDomainStatus={(status: string) => {
                setImportedCluster((prev: ImportedDomainType) => {
                  return { ...prev, domainStatus: status };
                });
              }}
            />
          )}
          {curStep === 1 && (
            <ConfigNetwork
              esVPCInfo={esVPCInfo}
              importedCluster={importedCluster}
              changeVpc={(vpcId) => {
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
            <ImportDomain
              importedCluster={importedCluster}
              importedRes={domainRelatedResources}
            />
          )}
          <div className="button-action text-right">
            <Button
              data-testid="test-cancel-button"
              btnType="text"
              onClick={() => {
                navigate("/clusters/opensearch-domains");
              }}
            >
              {t("button.cancel")}
            </Button>
            {curStep > 0 && curStep < 2 && (
              <Button
                data-testid="test-previous-button"
                onClick={() => {
                  setCurStep((curStep) => {
                    return curStep - 1 < 0 ? 0 : curStep - 1;
                  });
                }}
              >
                {t("button.previous")}
              </Button>
            )}

            {curStep === 0 && (
              <Button
                data-testid="test-next-button"
                disabled={
                  !DOMAIN_ALLOW_STATUS.includes(importedCluster.domainStatus)
                }
                btnType="primary"
                loading={loadingNext}
                onClick={() => {
                  if (curStep === 0) {
                    checkTheSelectedDomain();
                  }
                }}
              >
                {t("button.next")}
              </Button>
            )}
            {curStep === 1 && (
              <Button
                data-testid="test-import-button"
                loading={loadingCreate || loadingNext}
                btnType="primary"
                onClick={() => {
                  if (
                    importedCluster.creationMethod === CreateLogMethod.Automatic
                  ) {
                    checkCIDRConflict();
                  } else {
                    confirmImportDomain();
                  }
                }}
              >
                {t("button.import")}
              </Button>
            )}
            {curStep === 2 && (
              <Button
                data-testid="test-view-button"
                disabled={disableViewButton}
                loading={loadingCreate}
                btnType="primary"
                onClick={() => {
                  navigate(`/clusters/opensearch-domains/detail/${domainId}`);
                }}
              >
                {t("button.viewDomain")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </CommonLayout>
  );
};

export default ImportOpenSearchCluster;
