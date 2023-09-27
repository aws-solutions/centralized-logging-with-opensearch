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
import Breadcrumb from "components/Breadcrumb";
import CreateStep from "components/CreateStep";
import SideMenu from "components/SideMenu";
import SpecifySettings from "./step/SpecifySettings";
import Button from "components/Button";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HelpPanel from "components/HelpPanel";
import { EKSDeployKind, LogSource, LogSourceType } from "API";
import { ActionType } from "reducer/appReducer";
import { useDispatch } from "react-redux";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { getLogSource } from "graphql/queries";
import { CreationMethod } from "types";
import LoadingText from "components/LoadingText";
import { createAppLogIngestion } from "graphql/mutations";
import { OptionType } from "components/AutoComplete/autoComplete";
import HeaderPanel from "components/HeaderPanel";
import LogPathInput from "pages/dataInjection/applicationLog/common/LogPathInput";
import PagePanel from "components/PagePanel";
import { UnmodifiableLogConfigSelector } from "pages/dataInjection/applicationLog/common/UnmodifiableLogConfigSelector";
import { Validator } from "pages/comps/Validator";
import { CreateTags } from "pages/dataInjection/common/CreateTags";
import { useTags } from "assets/js/hooks/useTags";
import { hasSamePrefix } from "assets/js/utils";

export interface EksIngestionPropsType {
  createMethod: CreationMethod;
  pipelineRequiredError?: boolean;
  existsPipeline: OptionType;
  eksClusterId: string;
  logPath: string;
  force: boolean;
}

const EksLogIngest: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { t } = useTranslation();

  const [loadingEKSData, setLoadingEKSData] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [curEksLogSource, setCurEksLogSource] = useState<
    LogSource | undefined
  >();

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("menu.eksLog"),
      link: "/containers/eks-log",
    },
    {
      name: curEksLogSource?.eks?.eksClusterName || "",
      link: "/containers/eks-log/detail/" + id,
    },
    {
      name: t("ekslog:ingest.ingest"),
    },
  ];
  const tags = useTags();

  const [eksIngestionInfo, setEksIngestionInfo] =
    useState<EksIngestionPropsType>({
      eksClusterId: "",
      createMethod: CreationMethod.Exists,
      existsPipeline: {
        name: "",
        value: "",
        logConfigId: "",
      },
      logPath: "",
      force: false,
    });

  const logPathValidator = new Validator(() => {
    if (!eksIngestionInfo.logPath) {
      throw new Error(t("applog:ingestion.applyConfig.inputLogPath") || "");
    }

    // check esk sidecar path
    if (curEksLogSource?.eks?.deploymentKind === EKSDeployKind.Sidecar) {
      const multiPathArray = eksIngestionInfo.logPath?.split(",");
      if (multiPathArray.length > 1 && !hasSamePrefix(multiPathArray)) {
        throw new Error(t("error.sideCarPathInvalid") || "");
      }
    }

    if (!eksIngestionInfo.logPath.startsWith("/")) {
      throw new Error(
        t("applog:ingestion.applyConfig.logPathMustBeginWithSlash") || ""
      );
    }
  });

  const getEksLogById = async () => {
    try {
      setLoadingEKSData(true);
      const resEksData: any = await appSyncRequestQuery(getLogSource, {
        type: LogSourceType.EKSCluster,
        sourceId: id,
      });
      const eksData = resEksData.data?.getLogSource;
      console.info("eksData:", eksData);
      setCurEksLogSource(eksData);
      setEksIngestionInfo((prev) => {
        return {
          ...prev,
          eksClusterId: id || "",
        };
      });

      setLoadingEKSData(false);
    } catch (error) {
      setLoadingEKSData(false);
      console.error(error);
    }
  };

  const confirmCreateEksLogIngestionWithExistsPipeline = async (
    pipelineId?: string
  ) => {
    const logIngestionParams = {
      sourceType: LogSourceType.EKSCluster,
      sourceId: eksIngestionInfo.eksClusterId,
      appPipelineId: pipelineId || eksIngestionInfo.existsPipeline.value,
      tags,
      logPath: eksIngestionInfo.logPath,
      autoAddPermission: false,
    };
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createAppLogIngestion,
        logIngestionParams
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      // We set the showEKSDaemonSetModal to be true here
      // and it will be disabled for Sidecar scenario in EksLogDetail.tsx
      navigate(`/containers/eks-log/detail/${id}`, {
        state: {
          showEKSDaemonSetModal: true,
          eksSourceId: id,
        },
      });
    } catch (error: any) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getEksLogById();
  }, []);

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  useEffect(() => {
    console.info("eksIngestionInfo:", eksIngestionInfo);
  }, [eksIngestionInfo]);

  const stepComps = [
    {
      name: t("ekslog:ingest.step.specifyPipeline"),
      disabled: false,
      element: (
        <SpecifySettings
          eksIngestionInfo={eksIngestionInfo}
          changeExistsPipeline={(pipeline) => {
            setEksIngestionInfo((prev) => {
              return {
                ...prev,
                pipelineRequiredError: false,
                existsPipeline: pipeline,
              };
            });
          }}
        />
      ),
      validators: [],
    },
    {
      name: t("applog:logSourceDesc.eks.step2.naviTitle"),
      element: (
        <PagePanel
          title={t("applog:logSourceDesc.eks.step2.title")}
          desc={t("")}
        >
          <HeaderPanel title={t("resource:config.common.logPath")}>
            <LogPathInput
              value={eksIngestionInfo.logPath}
              setValue={(value) => {
                setEksIngestionInfo((prev) => {
                  return {
                    ...prev,
                    logPath: value as string,
                  };
                });
              }}
              logSourceType={LogSourceType.EKSCluster}
              validator={logPathValidator}
            />
          </HeaderPanel>
          <HeaderPanel title={t("resource:config.common.logPath")}>
            <UnmodifiableLogConfigSelector
              hideRefreshButton
              hideViewDetailButton
              title={t("applog:logSourceDesc.eks.step2.logConfigName")}
              desc=""
              configId={eksIngestionInfo.existsPipeline.logConfigId || ""}
              configVersion={
                eksIngestionInfo.existsPipeline.logConfigVersionNumber || 0
              }
            />
          </HeaderPanel>
        </PagePanel>
      ),
      validators: [logPathValidator],
    },
    {
      name: t("applog:logSourceDesc.eks.step5.naviTitle"),
      element: (
        <PagePanel title={t("applog:logSourceDesc.eks.step5.title")}>
          <CreateTags />
        </PagePanel>
      ),
      validators: [],
    },
  ].filter((each) => !each.disabled);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="lh-import-cluster">
            <Breadcrumb list={breadCrumbList} />

            {loadingEKSData ? (
              <LoadingText />
            ) : (
              <div className="create-wrapper">
                <div className="create-step">
                  <CreateStep list={stepComps} activeIndex={currentStep} />
                </div>
                <div className="create-content m-w-1024">
                  {stepComps[currentStep].element}
                  <div className="button-action text-right">
                    <Button
                      btnType="text"
                      onClick={() => {
                        navigate(`/containers/eks-log/detail/${id}`);
                      }}
                    >
                      {t("button.cancel")}
                    </Button>
                    {currentStep > 0 && (
                      <Button
                        onClick={() => {
                          setCurrentStep(Math.max(currentStep - 1, 0));
                        }}
                      >
                        {t("button.previous")}
                      </Button>
                    )}

                    {currentStep < stepComps.length - 1 && (
                      <Button
                        btnType="primary"
                        onClick={() => {
                          if (currentStep === 0) {
                            if (
                              eksIngestionInfo.createMethod ===
                                CreationMethod.Exists &&
                              !eksIngestionInfo.existsPipeline?.value
                            ) {
                              setEksIngestionInfo((prev) => {
                                return {
                                  ...prev,
                                  pipelineRequiredError: true,
                                };
                              });
                              return;
                            }
                          }
                          if (
                            stepComps[currentStep].validators
                              .map((each) => each.validate())
                              .every(Boolean)
                          ) {
                            setCurrentStep(
                              Math.min(currentStep + 1, stepComps.length)
                            );
                          }
                        }}
                      >
                        {t("button.next")}
                      </Button>
                    )}
                    {currentStep === stepComps.length - 1 && (
                      <Button
                        loading={loadingCreate}
                        btnType="primary"
                        onClick={() => {
                          confirmCreateEksLogIngestionWithExistsPipeline();
                        }}
                      >
                        {t("button.create")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default EksLogIngest;
