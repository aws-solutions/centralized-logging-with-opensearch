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
import { LogAgentStatus, LogSourceType, Tag } from "API";
import { ActionType } from "reducer/appReducer";
import { useDispatch } from "react-redux";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { InstanceGroup } from "API";
import { CreationMethod, YesNo } from "types";
import { appSyncRequestMutation } from "assets/js/request";
import {
  createAppLogIngestion,
  createInstanceGroup,
  createInstanceGroupBaseOnASG,
  createLogConf,
} from "graphql/mutations";
import { InstanceGroupType } from "pages/resources/instanceGroup/create/CreateInstanceGroup";
import { useTranslation } from "react-i18next";
import { InstanceWithStatus } from "pages/resources/common/InstanceGroupComp";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import ApplyLogConfig from "../common/ApplyLogConfig";
import {
  checkConfigInput,
  ConfigValidateType,
  removeNewLineBreack,
} from "assets/js/applog";

export interface IngestionPropsType {
  instanceGroupMethod: CreationMethod | string;
  chooseInstanceGroup: InstanceGroup[];
  curInstanceGroup: InstanceGroupType;
  instanceGroupCheckedInstances: InstanceWithStatus[];
  createNewInstanceGroupId: string;
  instanceGroupNameEmpty: boolean;

  logConfigMethod: CreationMethod | string;
  curLogConfig: ExLogConf;
  logConfigError: ConfigValidateType;
  logPathEmptyError: boolean;
  showChooseExistsError: boolean;

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
    curLogConfig: {
      __typename: "LogConf",
      id: "",
      confName: "",
      logType: null,
      multilineLogParser: null,
      createdDt: null,
      userSampleLog: "",
      userLogFormat: "",
      regularExpression: "",
      regularSpecs: [],
      processorFilterRegex: {
        enable: false,
        filters: [],
      },
    },
    curInstanceGroup: {
      groupName: "",
      asgObj: null,
      groupType: LogSourceType.EC2,
      instanceSet: [],
    },
    instanceGroupCheckedInstances: [],
    createNewInstanceGroupId: "",
    instanceGroupNameEmpty: false,
    logConfigError: {
      logConfigNameError: false,
      logConfigTypeError: false,
      showSampleLogRequiredError: false,
      showUserLogFormatError: false,
      showSampleLogInvalidError: false,
      showRegexLogParseError: false,
    },
    logPathEmptyError: false,
    showChooseExistsError: false,
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

  // Create Log Config
  const createLogConfig = async () => {
    console.info("ingestionInfo?.curLogConfig:", ingestionInfo?.curLogConfig);
    if (ingestionInfo?.curLogConfig) {
      const validateRes: any = checkConfigInput(ingestionInfo?.curLogConfig);
      setIngestionInfo((prev) => {
        return {
          ...prev,
          logConfigError: validateRes,
        };
      });

      // if validate result has true value, return because some filed invalidate
      console.info(
        "Object.keys(validateRes).map((key: string) => validateRes[key]):",
        Object.keys(validateRes).map((key: string) => validateRes[key])
      );
      if (
        Object.keys(validateRes)
          .map((key: string) => validateRes[key])
          .includes(true)
      ) {
        return;
      }

      // Remove \n\t\r from regularExpression and userLogFormat
      const createLogConfigParam: ExLogConf = removeNewLineBreack(
        ingestionInfo.curLogConfig
      );

      try {
        setLoadingCreateLogConfig(true);
        const createRes = await appSyncRequestMutation(
          createLogConf,
          createLogConfigParam
        );
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
    } else {
      // Set config name error when log config is null
      setIngestionInfo((prev) => {
        return {
          ...prev,
          logConfigError: {
            ...prev.logConfigError,
            logConfigNameError: true,
          },
        };
      });
    }
  };

  // Create Instance Group createInstanceGroup
  const confirmCreateInstanceGroupByEC2 = async () => {
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

  const confirmCreateLogInstanceGroupByASG = async () => {
    // Check Instance Selected
    if (!ingestionInfo.curInstanceGroup.asgObj) {
      Swal.fire(t("oops"), t("resource:group.create.asg.selectASG"), "warning");
      return;
    }

    const createInstanceGroupParam = {
      // region: "",
      groupName: ingestionInfo.curInstanceGroup.groupName,
      accountId: ingestionInfo.accountId,
      autoScalingGroupName: ingestionInfo.curInstanceGroup.asgObj.value,
    };
    try {
      setLoadingCreateInstanceGroup(true);
      const createRes = await appSyncRequestMutation(
        createInstanceGroupBaseOnASG,
        createInstanceGroupParam
      );
      console.info("createRes:", createRes);
      const tmpCreateGroup = {
        id: createRes.data.createInstanceGroupBaseOnASG,
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
      setLoadingCreate(false);
      console.error(error);
    }
  };

  const confirmCreateInstanceGroup = () => {
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

    if (ingestionInfo.curInstanceGroup.groupType === LogSourceType.EC2) {
      confirmCreateInstanceGroupByEC2();
    }
    if (ingestionInfo.curInstanceGroup.groupType === LogSourceType.ASG) {
      confirmCreateLogInstanceGroupByASG();
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
                      if (method) {
                        setIngestionInfo((prev) => {
                          return {
                            ...prev,
                            instanceGroupMethod: method,
                          };
                        });
                      }
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
                    changeASG={(asg) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          curInstanceGroup: {
                            ...prev.curInstanceGroup,
                            asgObj: asg,
                          },
                        };
                      });
                    }}
                    changeGroupType={(type) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          curInstanceGroup: {
                            ...prev.curInstanceGroup,
                            groupType: type,
                          },
                        };
                      });
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
                    hideLogPath={false}
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
                    changeExistsConfig={(configId) => {
                      const tmpConf: ExLogConf = {
                        __typename: "LogConf",
                        id: configId,
                        confName: "",
                        logType: null,
                        multilineLogParser: null,
                        createdDt: null,
                        userSampleLog: "",
                        userLogFormat: "",
                        regularExpression: "",
                        regularSpecs: [],
                        processorFilterRegex: {
                          enable: false,
                          filters: [],
                        },
                      };
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          curLogConfig: tmpConf,
                          showChooseExistsError: false,
                        };
                      });
                    }}
                    changeUserLogFormatError={(error) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          logConfigError: {
                            ...prev.logConfigError,
                            showUserLogFormatError: error,
                          },
                        };
                      });
                    }}
                    changeSampleLogFormatInvalid={(invalid) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          logConfigError: {
                            ...prev.logConfigError,
                            showSampleLogInvalidError: invalid,
                          },
                        };
                      });
                    }}
                    hideNameError={() => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          logConfigError: {
                            ...prev.logConfigError,
                            logConfigNameError: false,
                          },
                        };
                      });
                    }}
                    hideTypeError={() => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          logConfigError: {
                            ...prev.logConfigError,
                            logConfigTypeError: false,
                          },
                        };
                      });
                    }}
                    changeCurLogConfig={(config) => {
                      setIngestionInfo((prev) => {
                        return {
                          ...prev,
                          curLogConfig: config,
                          logConfigError: {
                            ...prev.logConfigError,
                            showSampleLogRequiredError: config?.userSampleLog
                              ? false
                              : true,
                          },
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
                          if (
                            !ingestionInfo?.curLogConfig?.id &&
                            ingestionInfo.logConfigMethod ===
                              CreationMethod.Exists
                          ) {
                            setIngestionInfo((prev) => {
                              return {
                                ...prev,
                                showChooseExistsError: true,
                              };
                            });
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
