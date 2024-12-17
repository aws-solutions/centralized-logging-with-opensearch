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
import {
  LogSourceType,
  EKSSourceInput,
  CRI,
  EKSDeployKind,
  CreateLogSourceMutationVariables,
} from "API";
import { appSyncRequestMutation } from "assets/js/request";
import Button from "components/Button";
import { createLogSource } from "graphql/mutations";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import SpecifyEksSource from "./steps/SpecifyEksSource";
import CommonLayout from "pages/layout/CommonLayout";
import PagePanel from "components/PagePanel";

export const DEFAULT_EMPTY_EKS_SOURCE_INPUT: EKSSourceInput = {
  eksClusterName: "",
  cri: CRI.containerd,
  deploymentKind: EKSDeployKind.DaemonSet,
};

export const DEFAULT_EMPTY_EKS_CLUSTER_LOG_SOURCE: CreateLogSourceMutationVariables =
  {
    type: LogSourceType.EKSCluster,
    region: "",
    eks: DEFAULT_EMPTY_EKS_SOURCE_INPUT,
    accountId: "",
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
  const navigate = useNavigate();
  const [curEksClusterLogSourceInfo, setCurEksClusterLogSourceInfo] =
    useState<CreateLogSourceMutationVariables>(
      DEFAULT_EMPTY_EKS_CLUSTER_LOG_SOURCE
    );
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [eksEmptyError, setEksEmptyError] = useState(false);

  const validateEksSourceInput = () => {
    if (
      !curEksClusterLogSourceInfo.eks?.eksClusterName ||
      curEksClusterLogSourceInfo.eks?.eksClusterName.length <= 0
    ) {
      setEksEmptyError(true);
      return false;
    }
    return true;
  };

  const confirmImportEksCluster = async () => {
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(createLogSource, {
        ...curEksClusterLogSourceInfo,
      });
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      navigate("/containers/eks-log");
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <PagePanel
        title={t("ekslog:create.eksSource.importCluster")}
        desc={t("ekslog:create.eksSource.importClusterDesc")}
      >
        <div className="create-content m-w-1024">
          <SpecifyEksSource
            eksClusterLogSource={curEksClusterLogSourceInfo}
            eksEmptyError={eksEmptyError}
            changeCurAccount={(id) => {
              setEksEmptyError(false);
              setCurEksClusterLogSourceInfo(
                (prev: CreateLogSourceMutationVariables) => {
                  return {
                    ...prev,
                    eks: {
                      ...prev.eks,
                      eksClusterName: "",
                    },
                    accountId: id,
                  };
                }
              );
            }}
            changeEksClusterSource={(clusterName: string) => {
              if (clusterName) {
                setEksEmptyError(false);
              }
              setEksEmptyError(false);
              setCurEksClusterLogSourceInfo(
                (prev: CreateLogSourceMutationVariables) => {
                  return {
                    ...prev,
                    eks: {
                      ...prev.eks,
                      eksClusterName: clusterName,
                    },
                  };
                }
              );
            }}
            changeEksLogAgentPattern={(pattern: EKSDeployKind) => {
              setCurEksClusterLogSourceInfo(
                (prev: CreateLogSourceMutationVariables) => {
                  return {
                    ...prev,
                    eks: {
                      ...prev.eks,
                      deploymentKind: pattern,
                    },
                  };
                }
              );
            }}
          />
          <div className="button-action text-right">
            <Button
              data-testid="eks-cancel-button"
              btnType="text"
              onClick={() => {
                navigate("/containers/eks-log");
              }}
            >
              {t("button.cancel")}
            </Button>

            <Button
              data-testid="eks-create-button"
              loading={loadingCreate}
              btnType="primary"
              onClick={() => {
                if (!validateEksSourceInput()) {
                  return;
                }
                confirmImportEksCluster();
              }}
            >
              {t("button.import")}
            </Button>
          </div>
        </div>
      </PagePanel>
    </CommonLayout>
  );
};

export default ImportEksCluster;
