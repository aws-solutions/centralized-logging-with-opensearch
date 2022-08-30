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
import Swal from "sweetalert2";
import CreateStep from "components/CreateStep";
import StepCreateInstanceGroup from "./steps/StepCreateInstanceGroup";
import ChooseInstanceGroup from "./steps/ChooseInstanceGroup";
import CreateTags from "./steps/CreateTags";
import Button from "components/Button";
import Breadcrumb from "components/Breadcrumb";
import { RouteComponentProps, useHistory } from "react-router-dom";
import { LogAgentStatus, LogSourceType, LogType, Tag } from "API";
import { ActionType } from "reducer/appReducer";
import { useDispatch } from "react-redux";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import ApplyLogConfig from "./steps/ApplyLogConfig";
import { InstanceGroup } from "API";
import { CreationMethod, YesNo } from "types";
import { appSyncRequestMutation } from "assets/js/request";
import {
  createAppLogIngestion,
  createInstanceGroup,
  createLogConf,
} from "graphql/mutations";
import { InstanceGroupType } from "pages/resources/instanceGroup/create/CreateInstanceGroup";
import { useTranslation } from "react-i18next";
import { InstanceWithStatus } from "pages/resources/common/InstanceGroupComp";
import { ExLogConf } from "pages/resources/common/LogConfigComp";

export interface IngestionPropsType {
  instanceGroupMethod: CreationMethod | string;
  logConfigMethod: CreationMethod | string;
  chooseInstanceGroup: InstanceGroup[];
  curLogConfig: ExLogConf | undefined;
  curInstanceGroup: InstanceGroupType | undefined;
  instanceGroupCheckedInstances: InstanceWithStatus[];
  createNewInstanceGroupId: string;
  logConfigNameError: boolean;
  logConfigTypeError: boolean;
  instanceGroupNameEmpty: boolean;
  showSampleLogRequiredError: boolean;
  showUserLogFormatError: boolean;
  showSampleLogInvalidError: boolean;
  logPathEmptyError: boolean;
  createDashboard: string;
  accountId: string;
  logPath: string;
  tags: Tag[];
}

interface MatchParams {
  id: string;
}

const CreateIngestion: React.FC<RouteComponentProps<MatchParams>> = (
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
      name: t("applog:ingestion.name"),
    },
  ];
  const history = useHistory();
  const dispatch = useDispatch();

  const [curStep, setCurStep] = useState(0);
  const [ingestionInfo, setIngestionInfo] = useState<IngestionPropsType>({
    instanceGroupMethod: CreationMethod.New,
    logConfigMethod: CreationMethod.New,
    chooseInstanceGroup: [],
    curLogConfig: undefined,
    curInstanceGroup: undefined,
    instanceGroupCheckedInstances: [],
    createNewInstanceGroupId: "",
    logConfigNameError: false,
    logConfigTypeError: false,
    instanceGroupNameEmpty: false,
    showSampleLogRequiredError: false,
    showUserLogFormatError: false,
    showSampleLogInvalidError: false,
    logPathEmptyError: false,
    createDashboard: YesNo.Yes,
    accountId: "",
    logPath: "",
    tags: [],
  });

  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [loadingCreateLogConfig, setLoadingCreateLogConfig] = useState(false);
  const [loadingCreateInstanceGroup, setLoadingCreateInstanceGroup] =
    useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  // const [domainEmptyError, setDomainEmptyError] = useState(false);
  const createLogConfig = async () => {
    if (!ingestionInfo?.curLogConfig?.confName?.trim()) {
      setIngestionInfo((prev) => {
        return {
          ...prev,
          logConfigNameError: true,
        };
      });
      return;
    }

    if (!ingestionInfo?.curLogConfig?.logType) {
      setIngestionInfo((prev) => {
        return {
          ...prev,
          logConfigTypeError: true,
        };
      });
      return;
    }

    if (
      ingestionInfo?.curLogConfig.logType === LogType.MultiLineText ||
      ingestionInfo?.curLogConfig.logType === LogType.SingleLineText
    ) {
      if (!ingestionInfo?.curLogConfig.userSampleLog?.trim()) {
        setIngestionInfo((prev) => {
          return {
            ...prev,
            showSampleLogRequiredError: true,
          };
        });
        return;
      }

      if (
        !ingestionInfo?.curLogConfig?.regularSpecs ||
        ingestionInfo?.curLogConfig?.regularSpecs.length <= 0
      ) {
        Swal.fire(
          t("oops"),
          t("resource:config.parsing.regexLogParseError"),
          "warning"
        );
        return;
      }
    }

    console.info("ingestionInfoingestionInfoingestionInfo:", ingestionInfo);

    // Check user log format
    if (ingestionInfo?.showUserLogFormatError) {
      return;
    }

    // Check sample log required
    if (ingestionInfo?.showSampleLogRequiredError) {
      return;
    }

    // Check sample log is valid
    if (ingestionInfo?.showSampleLogInvalidError) {
      return;
    }

    const createLogConfigParam = ingestionInfo?.curLogConfig;

    if (
      ingestionInfo?.curLogConfig.logType === LogType.MultiLineText ||
      ingestionInfo?.curLogConfig.logType === LogType.SingleLineText
    ) {
      createLogConfigParam.regularExpression =
        ingestionInfo?.curLogConfig.regularExpression
          ?.trim()
          .replace(/[\n\t\r]/g, "");
      createLogConfigParam.userLogFormat =
        ingestionInfo?.curLogConfig.userLogFormat
          ?.trim()
          .replace(/[\n\t\r]/g, "");
    }

    try {
      setLoadingCreateLogConfig(true);
      const createRes = await appSyncRequestMutation(
        createLogConf,
        ingestionInfo.curLogConfig
      );
      console.info("createRes:", createRes);
      // createRes.data.createLogConf = "f174ab6b-9e63-4ef8-8311-46b6bffdcd98";
      setIngestionInfo((prev: any) => {
        return {
          ...prev,
          curLogConfig: {
            ...prev.curLogConfig,
            id: createRes.data.createLogConf,
          },
        };
      });
      setLoadingCreateLogConfig(false);
      setCurStep(3);
    } catch (error) {
      setLoadingCreateLogConfig(false);
      console.error(error);
    }
  };

  // Create Instance Group createInstanceGroup
  const confirmCreateInstanceGroup = async () => {
    // Check Name Empty
    if (!ingestionInfo.curInstanceGroup?.groupName) {
      setIngestionInfo((prev) => {
        return {
          ...prev,
          instanceGroupNameEmpty: true,
        };
      });
      return;
    }

    // Check Instance Selected
    if (
      !ingestionInfo.instanceGroupCheckedInstances ||
      ingestionInfo.instanceGroupCheckedInstances.length <= 0
    ) {
      Swal.fire(t("oops"), t("applog:ingestion.selectInstance"), "warning");
      return;
    }

    // Check All Instance Install Agent Successfully
    const instanceStatusArr = ingestionInfo?.instanceGroupCheckedInstances?.map(
      (instance) => instance.instanceStatus
    );

    // Count Online Count
    const agentOnlineCount = instanceStatusArr?.filter(
      (item) => item === LogAgentStatus.Online
    ).length;

    // If agent online count
    if (agentOnlineCount <= 0 || agentOnlineCount < instanceStatusArr.length) {
      Swal.fire(
        t("oops"),
        t("applog:ingestion.selectOnlineInstance"),
        "warning"
      );
      return;
    }
    const createInstanceGroupParam = {
      groupName: ingestionInfo.curInstanceGroup.groupName,
      accountId: ingestionInfo.accountId,
      instanceSet: ingestionInfo.instanceGroupCheckedInstances.map(
        (instance) => instance.id
      ),
    };
    try {
      setLoadingCreateInstanceGroup(true);
      const createRes = await appSyncRequestMutation(
        createInstanceGroup,
        createInstanceGroupParam
      );
      console.info("createRes:", createRes);
      const tmpCreateGroup = {
        id: createRes.data.createInstanceGroup,
      };
      setLoadingCreateInstanceGroup(false);
      setIngestionInfo((prev: any) => {
        return {
          ...prev,
          createNewInstanceGroupId: tmpCreateGroup.id,
          chooseInstanceGroup: [tmpCreateGroup],
        };
      });
      setCurStep(1);
    } catch (error) {
      setLoadingCreateInstanceGroup(false);
      console.error(error);
    }
  };

  const confirmCreateLogIngestion = async () => {
    const logIngestionParams = {
      appPipelineId: id,
      sourceType: LogSourceType.EC2,
      confId: ingestionInfo.curLogConfig?.id,
      sourceIds: ingestionInfo.chooseInstanceGroup.map((a) => a.id),
      createDashboard: ingestionInfo.createDashboard,
      logPath: ingestionInfo.logPath,
      stackId: "",
      stackName: "",
      tags: ingestionInfo.tags,
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
        pathname: `/log-pipeline/application-log/detail/${id}`,
      });
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

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
                      name: t("applog:ingestion.step.createInstanceGroup"),
                    },
                    {
                      name: t("applog:ingestion.step.chooseInstanceGroup"),
                    },
                    {
                      name: t("applog:ingestion.step.applyConfig"),
                    },
                    {
                      name: t("applog:ingestion.step.createTags"),
                    },
                  ]}
                  activeIndex={curStep}
                />
              </div>
              <div className="create-content m-w-1024">
                {curStep === 0 && (
                  <StepCreateInstanceGroup
                    pipelineId={id}
                    emptyError={ingestionInfo.instanceGroupNameEmpty}
                    clearEmptyError={() => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          instanceGroupNameEmpty: false,
                        };
                      });
                    }}
                    changeCurAccountId={(id) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          accountId: id,
                        };
                      });
                    }}
                    ingestionInfo={ingestionInfo}
                    changeInstanceGroup={(instanceGroup) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          curInstanceGroup: instanceGroup,
                        };
                      });
                    }}
                    changeCreationMethod={(method) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          instanceGroupMethod: method,
                        };
                      });
                    }}
                    changeSelectInstanceSet={(sets) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          instanceGroupCheckedInstances: sets,
                        };
                      });
                    }}
                    changeLoadingRefresh={(refresh) => {
                      setLoadingRefresh(refresh);
                    }}
                  />
                )}
                {curStep === 1 && (
                  <ChooseInstanceGroup
                    ingestionInfo={ingestionInfo}
                    selectInstanceGroup={(list) => {
                      console.info("list:", list);
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          chooseInstanceGroup: list,
                        };
                      });
                    }}
                  />
                )}
                {curStep === 2 && (
                  <ApplyLogConfig
                    ingestionInfo={ingestionInfo}
                    changeLogPath={(path) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          logPath: path,
                          logPathEmptyError: false,
                        };
                      });
                    }}
                    changeUserLogFormatError={(error) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          showUserLogFormatError: error,
                        };
                      });
                    }}
                    changeSampleLogFormatInvalid={(invalid) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          showSampleLogInvalidError: invalid,
                        };
                      });
                    }}
                    hideNameError={() => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          logConfigNameError: false,
                        };
                      });
                    }}
                    hideTypeError={() => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          logConfigTypeError: false,
                        };
                      });
                    }}
                    changeCurLogConfig={(config) => {
                      console.info("config:", config);
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          curLogConfig: config,
                          showSampleLogRequiredError: config?.userSampleLog
                            ? false
                            : true,
                        };
                      });
                    }}
                    changeLogCreationMethod={(method) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          logConfigMethod: method,
                        };
                      });
                    }}
                    changeSampleDashboard={(yesNo) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          createDashboard: yesNo,
                        };
                      });
                    }}
                    changeLoadingConfig={(loading) => {
                      setLoadingRefresh(loading);
                    }}
                  />
                )}
                {curStep === 3 && (
                  <CreateTags
                    ingestionInfo={ingestionInfo}
                    changeTags={(tags) => {
                      setIngestionInfo((prev) => {
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

                  {curStep < 3 && (
                    <Button
                      btnType="primary"
                      loading={
                        loadingCreateLogConfig || loadingCreateInstanceGroup
                      }
                      disabled={loadingRefresh}
                      onClick={() => {
                        if (
                          curStep === 0 &&
                          ingestionInfo.instanceGroupMethod ===
                            CreationMethod.New
                        ) {
                          confirmCreateInstanceGroup();
                          return;
                        }
                        if (
                          curStep === 1 &&
                          ingestionInfo.chooseInstanceGroup.length <= 0
                        ) {
                          Swal.fire(
                            "Oops...",
                            t(
                              "applog:ingestion.chooseInstanceGroup.instanceGroupRequiredError"
                            ),
                            "warning"
                          );
                          return;
                        }
                        if (curStep === 2) {
                          if (!ingestionInfo.logPath) {
                            setIngestionInfo((prev) => {
                              return {
                                ...prev,
                                logPathEmptyError: true,
                              };
                            });
                            return;
                          }
                          if (
                            ingestionInfo.logConfigMethod ===
                              CreationMethod.New &&
                            !ingestionInfo.curLogConfig?.id
                          ) {
                            createLogConfig();
                            return;
                          }
                        }
                        setCurStep((curStep) => {
                          return curStep + 1 > 3 ? 3 : curStep + 1;
                        });
                      }}
                    >
                      {t("button.next")}
                    </Button>
                  )}
                  {curStep === 3 && (
                    <Button
                      loading={loadingCreate}
                      btnType="primary"
                      onClick={() => {
                        confirmCreateLogIngestion();
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

export default CreateIngestion;
