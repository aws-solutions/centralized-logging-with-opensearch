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
import Breadcrumb from "components/Breadcrumb";
import CreateStep from "components/CreateStep";
import SideMenu from "components/SideMenu";
import SpecifySettings from "./step/SpecifySettings";
import SpecifyLogConfig from "./step/SpecifyLogConfig";
import CreateTags from "./step/CreateTags";
import Button from "components/Button";
import { useHistory, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HelpPanel from "components/HelpPanel";
import { EKSClusterLogSource, LogSourceType, Tag } from "API";
import { ActionType, AppStateProps } from "reducer/appReducer";
import { useDispatch, useSelector } from "react-redux";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { getDomainDetails, getEKSClusterDetails } from "graphql/queries";
import { AmplifyConfigType, CreationMethod, YesNo } from "types";
import LoadingText from "components/LoadingText";
import { createAppLogIngestion } from "graphql/mutations";
import { OptionType } from "components/AutoComplete/autoComplete";

interface MatchParams {
  id: string;
}

export interface EksIngestionPropsType {
  indexPrefixRequiredError?: boolean;
  indexPrefixFormatError?: boolean;
  shardNumFormatError?: boolean;
  maxShardNumFormatError?: boolean;
  warmTransError?: boolean;
  coldTransError?: boolean;
  retentionError?: boolean;
  shardsError?: boolean;
  pipelineRequiredError?: boolean;
  configRequiredError?: boolean;
  logPathEmptyError?: boolean;

  createMethod: string;
  existsPipeline: OptionType;
  warmEnable: boolean;
  coldEnable: boolean;
  confId: string;
  createDashboard: string;
  eksClusterId: string;
  logPath: string;

  aosParams: {
    coldLogTransition: string;
    domainName: string;
    engine: string;
    failedLogBucket: string;
    indexPrefix: string;
    logRetention: string;
    opensearchArn: string;
    opensearchEndpoint: string;
    replicaNumbers: string;
    shardNumbers: string;
    vpc: {
      privateSubnetIds: string;
      securityGroupId: string;
      vpcId: string;
    };
    warmLogTransition: string;
  };
  tags: Tag[];
  force: boolean;
}

const EksLogIngest: React.FC = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const { id }: MatchParams = useParams();
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  const [loadingEKSData, setLoadingEKSData] = useState(false);
  const [curStep, setCurStep] = useState(0);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [curEksLogSource, setCurEksLogSource] = useState<
    EKSClusterLogSource | undefined
  >();

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("menu.eksLog"),
      link: "/containers/eks-log",
    },
    {
      name: curEksLogSource?.eksClusterName || "",
      link: "/containers/eks-log/detail/" + id,
    },
    {
      name: t("ekslog:ingest.ingest"),
    },
  ];

  const [eksIngestionInfo, setEksIngestionInfo] =
    useState<EksIngestionPropsType>({
      createMethod: CreationMethod.Exists,
      existsPipeline: {
        name: "",
        value: "",
      },
      warmEnable: false,
      coldEnable: false,
      confId: "",
      createDashboard: YesNo.Yes,
      eksClusterId: "",
      logPath: "",
      aosParams: {
        coldLogTransition: "",
        domainName: "",
        engine: "",
        failedLogBucket: amplifyConfig.default_logging_bucket,
        indexPrefix: "",
        logRetention: "",
        opensearchArn: "",
        opensearchEndpoint: "",
        replicaNumbers: "1",
        shardNumbers: "1",
        vpc: {
          privateSubnetIds: "",
          securityGroupId: "",
          vpcId: "",
        },
        warmLogTransition: "",
      },
      tags: [],
      force: false,
    });

  const getEksLogById = async () => {
    try {
      setLoadingEKSData(true);
      const resEksData: any = await appSyncRequestQuery(getEKSClusterDetails, {
        eksClusterId: id,
      });
      const resAosData: any = await appSyncRequestQuery(getDomainDetails, {
        id: resEksData.data.getEKSClusterDetails.aosDomain.id,
      });
      const eksData = resEksData.data?.getEKSClusterDetails;
      const aosData = resAosData.data?.getDomainDetails;
      setCurEksLogSource(eksData);
      setEksIngestionInfo((prev) => {
        return {
          ...prev,
          eksClusterId: id,
          warmEnable: aosData?.nodes?.warmEnabled || false,
          coldEnable: aosData?.nodes?.coldEnabled || false,
          aosParams: {
            ...prev.aosParams,
            domainName: aosData?.domainName || "",
            opensearchArn: aosData?.domainArn || "",
            opensearchEndpoint: aosData?.endpoint || "",
            engine: aosData?.engine || "",
            vpc: {
              privateSubnetIds: aosData?.vpc?.privateSubnetIds || "",
              publicSubnetIds: aosData?.vpc?.publicSubnetIds || "",
              securityGroupId: aosData?.vpc?.securityGroupId || "",
              vpcId: aosData?.vpc?.vpcId || "",
            },
          },
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
      sourceIds: [eksIngestionInfo.eksClusterId],
      appPipelineId: pipelineId || eksIngestionInfo.existsPipeline.value,
      confId: eksIngestionInfo.confId,
      logPath: eksIngestionInfo.logPath,
      createDashboard: eksIngestionInfo.createDashboard,
      tags: eksIngestionInfo.tags,
    };
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createAppLogIngestion,
        logIngestionParams
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      history.push({
        pathname: `/containers/eks-log/detail/${id}`,
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
                  <CreateStep
                    list={[
                      {
                        name: t("ekslog:ingest.step.specifyPipeline"),
                      },
                      {
                        name: t("ekslog:ingest.step.specifyConfig"),
                      },
                      {
                        name: t("ekslog:ingest.step.createTags"),
                      },
                    ]}
                    activeIndex={curStep}
                  />
                </div>
                <div className="create-content m-w-1024">
                  {curStep === 0 && (
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
                  )}
                  {curStep === 1 && (
                    <SpecifyLogConfig
                      eksIngestionInfo={eksIngestionInfo}
                      changeLogConfig={(confId) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            configRequiredError: false,
                            confId: confId,
                          };
                        });
                      }}
                      changeSampleDashboard={(yesNo) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            createDashboard: yesNo,
                          };
                        });
                      }}
                      changeLogConfPath={(path) => {
                        setEksIngestionInfo((prev) => {
                          return {
                            ...prev,
                            logPathEmptyError: false,
                            logPath: path,
                          };
                        });
                      }}
                    />
                  )}
                  {curStep === 2 && (
                    <CreateTags
                      eksIngestionInfo={eksIngestionInfo}
                      changeTags={(tags) => {
                        setEksIngestionInfo((prev) => {
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
                          pathname: `/containers/eks-log/detail/${id}`,
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
                        onClick={() => {
                          if (curStep === 0) {
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
                          if (curStep === 1) {
                            if (!eksIngestionInfo.logPath) {
                              setEksIngestionInfo((prev) => {
                                return {
                                  ...prev,
                                  logPathEmptyError: true,
                                };
                              });
                              return;
                            }
                            if (!eksIngestionInfo.confId) {
                              setEksIngestionInfo((prev) => {
                                return {
                                  ...prev,
                                  configRequiredError: true,
                                };
                              });
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
                          console.info("confirm to create");
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
