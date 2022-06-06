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
import { EKSDeployKind, Tag } from "API";
import { appSyncRequestMutation } from "assets/js/request";
import Breadcrumb from "components/Breadcrumb";
import Button from "components/Button";
import CreateStep from "components/CreateStep";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { importEKSCluster } from "graphql/mutations";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { ActionType } from "reducer/appReducer";
import CreateTags from "./steps/CreateTags";
import SpecifyDomain from "./steps/SpecifyDomain";
import SpecifyEksSource from "./steps/SpecifyEksSource";

export interface EKSClusterLogSourceType {
  aosDomainId: string;
  eksClusterName: string;
  deploymentKind: EKSDeployKind;
  tags: Tag[];
}

export const DEFAULT_EMPTY_EKS_CLUSTER_LOG_SOURCE: EKSClusterLogSourceType = {
  aosDomainId: "",
  eksClusterName: "",
  deploymentKind: EKSDeployKind.DaemonSet,
  tags: [],
};

const ImportEksCluster: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("ekslog:name"),
      link: "/containers/eks-log",
    },
    {
      name: t("ekslog:create.name"),
    },
  ];
  const history = useHistory();
  const dispatch = useDispatch();

  const [curStep, setCurStep] = useState(0);
  const [curEksClusterLogSourceInfo, setCurEksClusterLogSourceInfo] =
    useState<EKSClusterLogSourceType>(DEFAULT_EMPTY_EKS_CLUSTER_LOG_SOURCE);
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [eksEmptyError, setEksEmptyError] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  const validateEksSourceInput = () => {
    if (
      !curEksClusterLogSourceInfo.eksClusterName ||
      curEksClusterLogSourceInfo.eksClusterName.length <= 0
    ) {
      setEksEmptyError(true);
      setCurStep(0);
      return false;
    }
    return true;
  };

  const validateOpenSearchInput = () => {
    if (
      !curEksClusterLogSourceInfo.aosDomainId ||
      curEksClusterLogSourceInfo.aosDomainId.length <= 0
    ) {
      setEsDomainEmptyError(true);
      setCurStep(1);
      return false;
    }
    return true;
  };

  const confirmImportEksCluster = async () => {
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        importEKSCluster,
        curEksClusterLogSourceInfo
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      history.push({
        pathname: "/containers/eks-log",
      });
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

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
                      name: t("ekslog:create.step.specifyEksSource"),
                    },
                    {
                      name: t("ekslog:create.step.specifyOS"),
                    },
                    {
                      name: t("ekslog:create.step.createTags"),
                    },
                  ]}
                  activeIndex={curStep}
                  selectStep={(step: number) => {
                    console.info("step:", step);
                    setCurStep(step);
                  }}
                />
              </div>
              <div className="create-content m-w-1024">
                {curStep === 0 && (
                  <SpecifyEksSource
                    eksClusterLogSource={curEksClusterLogSourceInfo}
                    eksEmptyError={eksEmptyError}
                    changeEksClusterSource={(clusterName: string) => {
                      if (clusterName) {
                        setEksEmptyError(false);
                      }
                      setCurEksClusterLogSourceInfo(
                        (prev: EKSClusterLogSourceType) => {
                          return {
                            ...prev,
                            eksClusterName: clusterName,
                          };
                        }
                      );
                    }}
                    changeEksLogAgentPattern={(pattern: EKSDeployKind) => {
                      setCurEksClusterLogSourceInfo(
                        (prev: EKSClusterLogSourceType) => {
                          return {
                            ...prev,
                            deploymentKind: pattern,
                          };
                        }
                      );
                    }}
                  />
                )}
                {curStep === 1 && (
                  <SpecifyDomain
                    eksClusterLogSource={curEksClusterLogSourceInfo}
                    changeOpenSearchCluster={(clusterId) => {
                      if (clusterId) {
                        setEsDomainEmptyError(false);
                      }
                      setCurEksClusterLogSourceInfo((prev) => {
                        return {
                          ...prev,
                          aosDomainId: clusterId || "",
                        };
                      });
                    }}
                    changeLoadingDomain={(loading: boolean) => {
                      setDomainListIsLoading(loading);
                    }}
                    esDomainEmptyError={esDomainEmptyError}
                  />
                )}
                {curStep === 2 && (
                  <CreateTags
                    importedCluster={curEksClusterLogSourceInfo}
                    changeTags={(tags) => {
                      setCurEksClusterLogSourceInfo((prev) => {
                        return {
                          ...prev,
                          tags: tags,
                        };
                      });
                    }}
                  />
                )}
                <div className="button-action text-right">
                  <Button
                    btnType="text"
                    onClick={() => {
                      history.push({
                        pathname: "/containers/eks-log",
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
                      disabled={domainListIsLoading}
                      onClick={() => {
                        if (curStep === 0) {
                          if (!validateEksSourceInput()) {
                            return;
                          }
                        }
                        if (curStep === 1) {
                          if (!validateOpenSearchInput()) {
                            return;
                          }
                        }
                        setCurStep((curStep) => {
                          return curStep + 1 > 2 ? 2 : curStep + 1;
                        });
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
                        confirmImportEksCluster();
                      }}
                    >
                      {t("button.create")}
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

export default ImportEksCluster;
