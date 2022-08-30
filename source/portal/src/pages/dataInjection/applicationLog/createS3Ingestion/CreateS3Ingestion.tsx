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
import CreateTags from "./steps/CreateTags";
import Button from "components/Button";
import Breadcrumb from "components/Breadcrumb";
import { RouteComponentProps, useHistory } from "react-router-dom";
import { ArchiveFormat, LogSourceType, Tag } from "API";
import { ActionType, AppStateProps } from "reducer/appReducer";
import { useDispatch, useSelector } from "react-redux";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import StepChooseSource from "./steps/StepChooseSource";
import { SelectItem } from "components/Select/select";
import SpecifyLogConfig from "./steps/SpecifyLogConfig";
import { createAppLogIngestion, createLogSource } from "graphql/mutations";
import { AmplifyConfigType, YesNo } from "types";
import { appSyncRequestMutation } from "assets/js/request";

export interface IngestionFromS3PropsType {
  s3Object: SelectItem | null;
  indexPrefix: string;
  fileType: ArchiveFormat | string;
  isGzip: boolean;
  s3SourceId: string;
  logConfigId: string;
  accountId: string;
  logPath: string;
  createDashboard: string;
  subAccountVpcId: string;
  subAccountPublicSubnetIds: string;
  subAccountLinkId: string;
  tags: Tag[];
}

interface MatchParams {
  id: string;
}

const CreateS3Ingestion: React.FC<RouteComponentProps<MatchParams>> = (
  props: RouteComponentProps<MatchParams>
) => {
  const id: string = props.match.params.id;
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("applog:name"),
      link: "/log-pipeline/application-log",
    },
    {
      name: id,
      link: "/log-pipeline/application-log/detail/" + id,
    },
    {
      name: t("applog:ingestion.s3.ingestFromS3"),
    },
  ];
  const history = useHistory();
  const dispatch = useDispatch();

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  const [curStep, setCurStep] = useState(0);
  const [ingestionInfo, setIngestionInfo] = useState<IngestionFromS3PropsType>({
    s3Object: null,
    indexPrefix: "",
    fileType: "",
    isGzip: false,
    s3SourceId: "",
    logConfigId: "",
    accountId: "",
    logPath: "",
    createDashboard: YesNo.No,
    subAccountVpcId: "",
    subAccountPublicSubnetIds: "",
    subAccountLinkId: "",
    tags: [],
  });

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingCreateSource, setLoadingCreateSource] = useState(false);
  const [s3BucketRequireError, setS3BucketRequireError] = useState(false);
  const [fileTypeRequireError, setFileTypeRequireError] = useState(false);
  const [logConfigRequireError, setLogConfigRequireError] = useState(false);
  const [vpcRequiredError, setVpcRequiredError] = useState(false);
  const [subnetsRequiredError, setSubnetsRequiredError] = useState(false);

  const createS3LogSource = async () => {
    if (ingestionInfo.accountId) {
      if (!ingestionInfo.subAccountVpcId) {
        setVpcRequiredError(true);
        return;
      }
      if (!ingestionInfo.subAccountPublicSubnetIds) {
        setSubnetsRequiredError(true);
        return;
      }
    }
    if (!ingestionInfo.s3Object) {
      setS3BucketRequireError(true);
      return;
    }
    if (!ingestionInfo.fileType) {
      setFileTypeRequireError(true);
      return;
    }
    const logSourceParams = {
      sourceType: LogSourceType.S3,
      archiveFormat: ingestionInfo.isGzip ? "gzip" : ingestionInfo.fileType,
      region: amplifyConfig.aws_project_region,
      accountId: ingestionInfo.accountId,
      s3Name: ingestionInfo.s3Object?.value,
      s3Prefix: ingestionInfo.indexPrefix,
      subAccountVpcId: ingestionInfo.subAccountVpcId,
      subAccountPublicSubnetIds: ingestionInfo.subAccountPublicSubnetIds,
      subAccountLinkId: ingestionInfo.subAccountLinkId,
    };
    try {
      setLoadingCreateSource(true);
      const createRes = await appSyncRequestMutation(
        createLogSource,
        logSourceParams
      );
      setLoadingCreateSource(false);
      if (createRes.data && createRes.data.createLogSource) {
        setIngestionInfo((prev) => {
          return {
            ...prev,
            s3SourceId: createRes.data.createLogSource,
          };
        });
        setCurStep(1);
      }
    } catch (error) {
      setLoadingCreateSource(false);
      console.error(error);
    }
  };

  const createS3LogIngestion = async () => {
    const ingestionParams = {
      sourceType: LogSourceType.S3,
      appPipelineId: id,
      confId: ingestionInfo.logConfigId,
      sourceIds: [ingestionInfo.s3SourceId],
      tags: ingestionInfo.tags,
      createDashboard: YesNo.No,
      logPath: `s3://${ingestionInfo.s3Object?.value}/${ingestionInfo.indexPrefix}`,
      stackId: "",
      stackName: "",
    };
    console.info("ingestionParams:", ingestionParams);
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createAppLogIngestion,
        ingestionParams
      );
      setLoadingCreate(false);
      console.info("createIngestionRes:", createRes);
      if (createRes.data) {
        history.push({
          pathname: `/log-pipeline/application-log/detail/${id}`,
        });
      }
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  useEffect(() => {
    console.info("ingestionInfo:", ingestionInfo);
  }, [ingestionInfo]);

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
                      name: t("applog:ingestion.s3.step.specifySource"),
                    },
                    {
                      name: t("applog:ingestion.s3.step.specifyConfig"),
                    },
                    {
                      name: t("applog:ingestion.step.createTags"),
                    },
                  ]}
                  activeIndex={curStep}
                  selectStep={(step: number) => {
                    if (step === 1 || step === 2) {
                      if (!ingestionInfo.s3SourceId) {
                        return;
                      }
                    }
                    setCurStep(step);
                  }}
                />
              </div>
              <div className="create-content m-w-1024">
                {curStep === 0 && (
                  <div>
                    <StepChooseSource
                      ingestionInfo={ingestionInfo}
                      showS3RequireError={s3BucketRequireError}
                      showFileTypeError={fileTypeRequireError}
                      showVpcRequiredError={vpcRequiredError}
                      showSubnetsRequiredError={subnetsRequiredError}
                      changeCurAccount={(id, account) => {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            accountId: id,
                            subAccountLinkId: account?.id || "",
                            subAccountVpcId: account?.subAccountVpcId || "",
                            subAccountPublicSubnetIds:
                              account?.subAccountPublicSubnetIds || "",
                          };
                        });
                      }}
                      changeLinkedAccountVPC={(vpc) => {
                        setVpcRequiredError(false);
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            subAccountVpcId: vpc,
                          };
                        });
                      }}
                      changeLinkedAccountSubnets={(subnets) => {
                        setSubnetsRequiredError(false);
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            subAccountPublicSubnetIds: subnets,
                          };
                        });
                      }}
                      changeIsGzip={(gzip) => {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            s3SourceId: "",
                            isGzip: gzip,
                          };
                        });
                      }}
                      changeS3Object={(s3) => {
                        if (s3) {
                          setS3BucketRequireError(false);
                          setIngestionInfo((prev) => {
                            return {
                              ...prev,
                              s3SourceId: "",
                            };
                          });
                        }
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            s3Object: s3,
                          };
                        });
                      }}
                      changeIndexPrefix={(index) => {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            indexPrefix: index,
                          };
                        });
                      }}
                      changeFileType={(type) => {
                        if (type) {
                          setFileTypeRequireError(false);
                        }
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            s3SourceId: "",
                            logConfigId: "",
                            fileType: type,
                          };
                        });
                      }}
                    />
                  </div>
                )}
                {curStep === 1 && (
                  <div>
                    <SpecifyLogConfig
                      s3IngestionInfo={ingestionInfo}
                      showLogConfigError={logConfigRequireError}
                      changeLogConfig={(confId) => {
                        if (confId) {
                          setLogConfigRequireError(false);
                        }
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            logConfigId: confId,
                          };
                        });
                      }}
                    />
                  </div>
                )}
                {curStep === 2 && (
                  <div>
                    <CreateTags
                      s3IngestionInfo={ingestionInfo}
                      changeTags={(tags) => {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            tags: tags,
                          };
                        });
                      }}
                    />
                  </div>
                )}
                <div className="button-action text-right">
                  <Button
                    btnType="text"
                    onClick={() => {
                      history.push({
                        pathname: `/log-pipeline/application-log/detail/${id}`,
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
                      loading={loadingCreateSource}
                      disabled={loadingCreateSource}
                      onClick={() => {
                        if (curStep === 0 && !ingestionInfo.s3SourceId) {
                          createS3LogSource();
                        } else {
                          setCurStep(1);
                        }
                        if (curStep === 1) {
                          if (!ingestionInfo.logConfigId) {
                            setLogConfigRequireError(true);
                            return;
                          } else {
                            setCurStep(2);
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
                        if (!ingestionInfo.logConfigId) {
                          setLogConfigRequireError(true);
                          setCurStep(1);
                          return;
                        }
                        createS3LogIngestion();
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

export default CreateS3Ingestion;
