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
import CreateStep from "components/CreateStep";
import { createLogSource } from "graphql/mutations";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ActionType } from "reducer/appReducer";
import SpecifyEksSource from "./steps/SpecifyEksSource";
import { CreateTags } from "pages/dataInjection/common/CreateTags";
import { useTags } from "assets/js/hooks/useTags";
import CommonLayout from "pages/layout/CommonLayout";

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
  const dispatch = useDispatch();
  const tags = useTags();
  const [curStep, setCurStep] = useState(0);
  const [curEksClusterLogSourceInfo, setCurEksClusterLogSourceInfo] =
    useState<CreateLogSourceMutationVariables>(
      DEFAULT_EMPTY_EKS_CLUSTER_LOG_SOURCE
    );
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [eksEmptyError, setEksEmptyError] = useState(false);

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  const validateEksSourceInput = () => {
    if (
      !curEksClusterLogSourceInfo.eks?.eksClusterName ||
      curEksClusterLogSourceInfo.eks?.eksClusterName.length <= 0
    ) {
      setEksEmptyError(true);
      setCurStep(0);
      return false;
    }
    return true;
  };

  const confirmImportEksCluster = async () => {
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(createLogSource, {
        ...curEksClusterLogSourceInfo,
        tags,
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
      <div className="create-wrapper">
        <div className="create-step">
          <CreateStep
            list={[
              {
                name: t("ekslog:create.step.specifyEksSource"),
              },
              {
                name: t("ekslog:create.step.createTags"),
              },
            ]}
            activeIndex={curStep}
          />
        </div>
        <div className="create-content m-w-800">
          {curStep === 0 && (
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
          )}
          {curStep === 1 && <CreateTags />}
          <div className="button-action text-right">
            <Button
              btnType="text"
              onClick={() => {
                navigate("/containers/eks-log");
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

            {curStep < 1 && (
              <Button
                btnType="primary"
                onClick={() => {
                  if (curStep === 0) {
                    if (!validateEksSourceInput()) {
                      return;
                    }
                  }
                  setCurStep((curStep) => {
                    return curStep + 1 > 1 ? 1 : curStep + 1;
                  });
                }}
              >
                {t("button.next")}
              </Button>
            )}
            {curStep === 1 && (
              <Button
                loading={loadingCreate}
                btnType="primary"
                onClick={() => {
                  confirmImportEksCluster();
                }}
              >
                {t("button.import")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </CommonLayout>
  );
};

export default ImportEksCluster;
