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
  Codec,
  DestinationType,
  EngineType,
  ServiceType,
  MonitorInput,
  DomainStatusCheckType,
  DomainStatusCheckResponse,
} from "API";
import { CreateLogMethod, ServiceLogType } from "assets/js/const";
import { Alert } from "assets/js/alert";
import { OptionType } from "components/AutoComplete/autoComplete";
import Breadcrumb from "components/Breadcrumb";
import Button from "components/Button";
import CreateStep from "components/CreateStep";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  AmplifyConfigType,
  WarmTransitionType,
  YesNo,
  SERVICE_LOG_INDEX_SUFFIX,
} from "types";
import SpecifyOpenSearchCluster, {
  AOSInputValidRes,
  checkOpenSearchInput,
  covertParametersByKeyAndConditions,
} from "../common/SpecifyCluster";
import SpecifySettings from "./steps/SpecifySettings";
import { useDispatch, useSelector } from "react-redux";
import { appSyncRequestMutation } from "assets/js/request";
import { createServicePipeline } from "graphql/mutations";
import {
  bucketNameIsValid,
  splitStringToBucketAndPrefix,
} from "assets/js/utils";
import { SelectItem } from "components/Select/select";
import { VPCLogSourceType } from "./steps/comp/SourceType";
import { MONITOR_ALARM_INIT_DATA } from "assets/js/init";
import AlarmAndTags from "../../../../pipelineAlarm/AlarmAndTags";
import { Actions, RootState } from "reducer/reducers";
import { useTags } from "assets/js/hooks/useTags";
import { Dispatch } from "redux";
import { useAlarm } from "assets/js/hooks/useAlarm";
import {
  CreateAlarmActionTypes,
  validateAalrmInput,
} from "reducer/createAlarm";

const BASE_EXCLUDE_PARAMS = [
  "esDomainId",
  "vpcLogObj",
  "taskType",
  "manualBucketS3Path",
  "warmEnable",
  "coldEnable",
  "tmpFlowList",
  "vpcLogSourceType",
  "s3FLowList",
  "cwlFlowList",
  "vpcLogSourceType",
  "showSuccessTextType",
  "rolloverSizeNotSupport",
];

const S3_EXCLUDE_PARAMS = [
  ...BASE_EXCLUDE_PARAMS,
  "logSource",
  "logFormat",
  "logType",
  "minCapacity",
  "maxCapacity",
  "shardCount",
];
const CWL_EXCLUDE_PARAMS = [
  ...BASE_EXCLUDE_PARAMS,
  "logBucketName",
  "logBucketPrefix",
];

export interface VpcLogTaskProps {
  type: ServiceType;
  source: string;
  target: string;
  logSourceAccountId: string;
  logSourceRegion: string;
  destinationType: string;
  params: {
    engineType: string;
    warmEnable: boolean;
    coldEnable: boolean;
    logBucketName: string;
    vpcLogObj: OptionType | null;
    taskType: string;
    manualBucketS3Path: string;
    logBucketPrefix: string;
    endpoint: string;
    domainName: string;
    esDomainId: string;
    indexPrefix: string;
    createDashboard: string;
    vpcId: string;
    subnetIds: string;
    securityGroupId: string;

    shardNumbers: string;
    replicaNumbers: string;

    enableRolloverByCapacity: boolean;
    warmTransitionType: string;
    warmAge: string;
    coldAge: string;
    retainAge: string;
    rolloverSize: string;
    indexSuffix: string;
    codec: string;
    refreshInterval: string;

    s3FLowList: SelectItem[];
    cwlFlowList: SelectItem[];
    tmpFlowList: SelectItem[];
    vpcLogSourceType: string;
    showSuccessTextType: string;

    shardCount: string;
    minCapacity: string;
    enableAutoScaling: string;
    maxCapacity: string;

    logType: string;
    logSource: string;
    logFormat: string;

    rolloverSizeNotSupport: boolean;
  };
  monitor: MonitorInput;
}

const DEFAULT_TASK_VALUE: VpcLogTaskProps = {
  type: ServiceType.VPC,
  source: "",
  target: "",
  logSourceAccountId: "",
  logSourceRegion: "",
  destinationType: "",
  params: {
    engineType: "",
    warmEnable: false,
    coldEnable: false,
    logBucketName: "",
    vpcLogObj: null,
    taskType: CreateLogMethod.Automatic,
    manualBucketS3Path: "",
    logBucketPrefix: "",
    endpoint: "",
    domainName: "",
    esDomainId: "",
    indexPrefix: "",
    createDashboard: YesNo.Yes,
    vpcId: "",
    subnetIds: "",
    securityGroupId: "",

    shardNumbers: "1",
    replicaNumbers: "1",

    enableRolloverByCapacity: true,
    warmTransitionType: WarmTransitionType.IMMEDIATELY,
    warmAge: "0",
    coldAge: "60",
    retainAge: "180",
    rolloverSize: "30",
    indexSuffix: SERVICE_LOG_INDEX_SUFFIX.yyyy_MM_dd,
    codec: Codec.best_compression,
    refreshInterval: "1s",

    s3FLowList: [],
    cwlFlowList: [],
    tmpFlowList: [],
    vpcLogSourceType: "",
    showSuccessTextType: "",

    shardCount: "1",
    minCapacity: "1",
    enableAutoScaling: YesNo.No,
    maxCapacity: "1",

    logType: "VPCFlow",
    logSource: "",
    logFormat: "",

    rolloverSizeNotSupport: false,
  },
  monitor: MONITOR_ALARM_INIT_DATA,
};

const CreateVPCLog: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("servicelog:name"),
      link: "/log-pipeline/service-log",
    },
    {
      name: t("servicelog:create.name"),
      link: "/log-pipeline/service-log/create",
    },
    { name: t("servicelog:create.service.vpc") },
  ];
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const dispatch = useDispatch<Dispatch<Actions>>();

  const [curStep, setCurStep] = useState(0);
  const [nextStepDisable, setNextStepDisable] = useState(false);
  const [vpcLogIsChanging, setVpcLogIsChanging] = useState(false);
  const [domainListIsLoading, setDomainListIsLoading] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);

  const [vpcLogPipelineTask, setVpcLogPipelineTask] =
    useState<VpcLogTaskProps>(DEFAULT_TASK_VALUE);

  const [autoVpcEmptyError, setAutoVpcEmptyError] = useState(false);
  const [manualVpcEmptyError, setManualVpcEmptyError] = useState(false);
  const [manualS3EmptyError, setManualS3EmptyError] = useState(false);
  const [manualS3PathInvalid, setManualS3PathInvalid] = useState(false);
  const [esDomainEmptyError, setEsDomainEmptyError] = useState(false);
  const [sourceTypeEmptyError, setSourceTypeEmptyError] = useState(false);
  const [vpcFlowLogEmptyError, setVpcFlowLogEmptyError] = useState(false);

  const [shardNumError, setShardNumError] = useState(false);
  const [maxShardNumError, setMaxShardNumError] = useState(false);

  const [aosInputValidRes, setAosInputValidRes] = useState<AOSInputValidRes>({
    shardsInvalidError: false,
    warmLogInvalidError: false,
    coldLogInvalidError: false,
    logRetentionInvalidError: false,
    coldMustLargeThanWarm: false,
    logRetentionMustThanColdAndWarm: false,
    capacityInvalidError: false,
    indexEmptyError: false,
    indexNameFormatError: false,
  });
  const [domainCheckStatus, setDomainCheckStatus] =
    useState<DomainStatusCheckResponse>();

  const tags = useTags();
  const monitor = useAlarm();

  const confirmCreatePipeline = async () => {
    const createPipelineParams: any = {};
    createPipelineParams.type = ServiceType.VPC;
    createPipelineParams.source = vpcLogPipelineTask.source;
    createPipelineParams.target = vpcLogPipelineTask.target;
    createPipelineParams.tags = tags;
    createPipelineParams.logSourceAccountId =
      vpcLogPipelineTask.logSourceAccountId;
    createPipelineParams.logSourceRegion = amplifyConfig.aws_project_region;
    createPipelineParams.destinationType = vpcLogPipelineTask.destinationType;

    createPipelineParams.monitor = monitor.monitor;

    let tmpParamList: any = [];

    if (vpcLogPipelineTask.destinationType === DestinationType.S3) {
      tmpParamList = covertParametersByKeyAndConditions(
        vpcLogPipelineTask,
        S3_EXCLUDE_PARAMS
      );

      // Add defaultCmkArnParam
      tmpParamList.push({
        parameterKey: "defaultCmkArnParam",
        parameterValue: amplifyConfig.default_cmk_arn,
      });
    }

    if (vpcLogPipelineTask.destinationType === DestinationType.CloudWatch) {
      tmpParamList = covertParametersByKeyAndConditions(
        vpcLogPipelineTask,
        CWL_EXCLUDE_PARAMS
      );
    }

    // Add Default Failed Log Bucket
    tmpParamList.push({
      parameterKey: "backupBucketName",
      parameterValue: amplifyConfig.default_logging_bucket,
    });

    createPipelineParams.parameters = tmpParamList;
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createServicePipeline,
        createPipelineParams
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      navigate("/log-pipeline/service-log");
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  const isVpcSettingValid = () => {
    if (nextStepDisable) {
      return false;
    }

    if (vpcLogPipelineTask.params.taskType === CreateLogMethod.Automatic) {
      if (!vpcLogPipelineTask.params.vpcLogObj) {
        setAutoVpcEmptyError(true);
        return false;
      }
    }

    if (vpcLogPipelineTask.params.taskType === CreateLogMethod.Manual) {
      if (!vpcLogPipelineTask.source) {
        setManualVpcEmptyError(true);
        return false;
      }
    }

    // check source type
    if (!vpcLogPipelineTask.destinationType) {
      setSourceTypeEmptyError(true);
      return false;
    }

    if (
      vpcLogPipelineTask.destinationType === DestinationType.S3 &&
      vpcLogPipelineTask.params.taskType === CreateLogMethod.Manual
    ) {
      // check manual s3 empty
      if (!vpcLogPipelineTask.params.manualBucketS3Path.trim()) {
        setManualS3EmptyError(true);
        return false;
      }
      // check manual s3 format invalid
      if (
        !vpcLogPipelineTask.params.manualBucketS3Path
          .toLowerCase()
          .startsWith("s3") ||
        !bucketNameIsValid(vpcLogPipelineTask.params.logBucketName)
      ) {
        setManualS3PathInvalid(true);
        return false;
      }
    }

    // check cwl log need logsource
    if (
      vpcLogPipelineTask.params.taskType === CreateLogMethod.Automatic &&
      vpcLogPipelineTask.destinationType === DestinationType.CloudWatch &&
      vpcLogPipelineTask.params.vpcLogSourceType === VPCLogSourceType.NONE &&
      !vpcLogPipelineTask.params.logSource
    ) {
      Alert(t("servicelog:vpc.needEnableLoggingCWL"));
      return false;
    }

    // check log source empty when flow log list length lager than 1
    if (
      vpcLogPipelineTask.params.taskType === CreateLogMethod.Automatic &&
      vpcLogPipelineTask.params.tmpFlowList.length > 1 &&
      !vpcLogPipelineTask.params.logSource
    ) {
      setVpcFlowLogEmptyError(true);
      return false;
    }

    // check s3 log need bucket name
    if (
      (vpcLogPipelineTask.params.taskType === CreateLogMethod.Automatic &&
        vpcLogPipelineTask.params.vpcLogSourceType === VPCLogSourceType.NONE) ||
      ((vpcLogPipelineTask.params.vpcLogSourceType ===
        VPCLogSourceType.MULTI_S3_DIFF_REGION ||
        vpcLogPipelineTask.params.vpcLogSourceType ===
          VPCLogSourceType.ONE_S3_DIFF_REGION ||
        vpcLogPipelineTask.params.vpcLogSourceType === "") &&
        !vpcLogPipelineTask.params.logBucketName)
    ) {
      Alert(t("servicelog:vpc.needEnableLogging"));
      return false;
    }

    // check manul log source empty
    if (vpcLogPipelineTask.params.taskType === CreateLogMethod.Manual) {
      if (
        vpcLogPipelineTask.destinationType === DestinationType.CloudWatch &&
        !vpcLogPipelineTask.params.logSource
      ) {
        setVpcFlowLogEmptyError(true);
        return false;
      }
    }

    // check kds settings
    if (vpcLogPipelineTask.destinationType === DestinationType.CloudWatch) {
      // check min shard
      if (
        vpcLogPipelineTask.params.minCapacity === "" ||
        parseInt(vpcLogPipelineTask.params.minCapacity) < 1
      ) {
        setShardNumError(true);
        return false;
      }
      const intStartShardNum = parseInt(vpcLogPipelineTask.params.minCapacity);
      const intMaxShardNum = parseInt(vpcLogPipelineTask.params.maxCapacity);

      // check max shard
      if (
        vpcLogPipelineTask.params.enableAutoScaling === YesNo.Yes &&
        (intMaxShardNum <= 0 ||
          Number.isNaN(intMaxShardNum) ||
          intMaxShardNum <= intStartShardNum)
      ) {
        setMaxShardNumError(true);
        return false;
      }
    }
    return true;
  };

  const isClusterValid = () => {
    if (!vpcLogPipelineTask.params.domainName) {
      setEsDomainEmptyError(true);
      return false;
    } else {
      setEsDomainEmptyError(false);
    }
    const validRes = checkOpenSearchInput(vpcLogPipelineTask);
    setAosInputValidRes(validRes);
    if (Object.values(validRes).indexOf(true) >= 0) {
      return false;
    }
    return true;
  };

  const isNextDisabled = () => {
    return (
      vpcLogIsChanging ||
      domainListIsLoading ||
      (curStep === 1 &&
        domainCheckStatus?.status !== DomainStatusCheckType.PASSED)
    );
  };

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="lh-create-log">
            <Breadcrumb list={breadCrumbList} />
            <div className="create-wrapper">
              <div className="create-step">
                <CreateStep
                  list={[
                    {
                      name: t("servicelog:create.step.specifySetting"),
                    },
                    {
                      name: t("servicelog:create.step.specifyDomain"),
                    },
                    {
                      name: t("servicelog:create.step.createTags"),
                    },
                  ]}
                  activeIndex={curStep}
                />
              </div>
              <div className="create-content m-w-800">
                {curStep === 0 && (
                  <SpecifySettings
                    vpcLogTask={vpcLogPipelineTask}
                    manualVpcEmptyError={manualVpcEmptyError}
                    manualS3EmptyError={manualS3EmptyError}
                    manualS3PathInvalid={manualS3PathInvalid}
                    autoVpcEmptyError={autoVpcEmptyError}
                    sourceTypeEmptyError={sourceTypeEmptyError}
                    vpcFlowLogEmptyError={vpcFlowLogEmptyError}
                    shardNumError={shardNumError}
                    maxShardNumError={maxShardNumError}
                    setISChanging={(status) => {
                      setVpcLogIsChanging(status);
                    }}
                    changeCrossAccount={(id) => {
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          logSourceAccountId: id,
                        };
                      });
                    }}
                    changeTaskType={(taskType) => {
                      setAutoVpcEmptyError(false);
                      setManualVpcEmptyError(false);
                      setVpcLogPipelineTask({
                        ...DEFAULT_TASK_VALUE,
                        params: {
                          ...DEFAULT_TASK_VALUE.params,
                          taskType: taskType,
                        },
                      });
                    }}
                    changeVpcLogObj={(vpcLogObj) => {
                      setAutoVpcEmptyError(false);
                      setSourceTypeEmptyError(false);
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          source: vpcLogObj?.value || "",
                          destinationType: "",
                          params: {
                            ...prev.params,
                            logBucketName: "",
                            logBucketPrefix: "",
                            indexPrefix: vpcLogObj?.value?.toLowerCase() || "",
                            vpcLogObj: vpcLogObj,
                            vpcLogSourceType: "",
                          },
                        };
                      });
                    }}
                    changeLogBucket={(bucketName) => {
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            logBucketName: bucketName,
                          },
                        };
                      });
                    }}
                    changeLogPrefix={(prefix) => {
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            logBucketPrefix: prefix,
                          },
                        };
                      });
                    }}
                    changeManualS3={(manualPath) => {
                      setManualS3EmptyError(false);
                      setManualS3PathInvalid(false);
                      const { bucket, prefix } =
                        splitStringToBucketAndPrefix(manualPath);
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            manualBucketS3Path: manualPath,
                            logBucketName: bucket,
                            logBucketPrefix: prefix,
                          },
                        };
                      });
                    }}
                    setNextStepDisableStatus={(status) => {
                      setNextStepDisable(status);
                    }}
                    changeSourceType={(type) => {
                      setVpcFlowLogEmptyError(false);
                      setSourceTypeEmptyError(false);
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          destinationType: type,
                          params: {
                            ...prev.params,
                            logSource: "",
                            logFormat: "",
                          },
                        };
                      });
                    }}
                    changeVPCFLowLog={(flow) => {
                      setVpcFlowLogEmptyError(false);
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            logSource: flow,
                          },
                        };
                      });
                    }}
                    changeS3FlowList={(list) => {
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            s3FLowList: list,
                          },
                        };
                      });
                    }}
                    changeCWLFlowList={(list) => {
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            cwlFlowList: list,
                          },
                        };
                      });
                    }}
                    changeTmpFlowList={(list) => {
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            tmpFlowList: list,
                          },
                        };
                      });
                    }}
                    changeVPCId={(vpcId) => {
                      setManualVpcEmptyError(false);
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          source: vpcId,
                          params: {
                            ...prev.params,
                            indexPrefix: vpcId.toLowerCase(),
                          },
                        };
                      });
                    }}
                    changeLogFormat={(format) => {
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            logFormat: format,
                          },
                        };
                      });
                    }}
                    changeVpcLogSourceType={(type) => {
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            vpcLogSourceType: type,
                          },
                        };
                      });
                    }}
                    changeMinCapacity={(num) => {
                      setShardNumError(false);
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            shardCount: num,
                            minCapacity: num,
                          },
                        };
                      });
                    }}
                    changeEnableAS={(enable) => {
                      setMaxShardNumError(false);
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            enableAutoScaling: enable,
                          },
                        };
                      });
                    }}
                    changeMaxCapacity={(num) => {
                      setMaxShardNumError(false);
                      setVpcLogPipelineTask((prev) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            maxCapacity: num,
                          },
                        };
                      });
                    }}
                  />
                )}
                {curStep === 1 && (
                  <SpecifyOpenSearchCluster
                    taskType={ServiceLogType.Amazon_VPCLogs}
                    pipelineTask={vpcLogPipelineTask}
                    esDomainEmptyError={esDomainEmptyError}
                    changeLoadingDomain={(loading) => {
                      setDomainListIsLoading(loading);
                    }}
                    aosInputValidRes={aosInputValidRes}
                    changeShards={(shards) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          shardsInvalidError: false,
                        };
                      });
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            shardNumbers: shards,
                          },
                        };
                      });
                    }}
                    changeReplicas={(replicas) => {
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            replicaNumbers: replicas,
                          },
                        };
                      });
                    }}
                    changeBucketIndex={(indexPrefix) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          indexEmptyError: false,
                          indexNameFormatError: false,
                        };
                      });
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            indexPrefix: indexPrefix,
                          },
                        };
                      });
                    }}
                    changeOpenSearchCluster={(cluster) => {
                      const NOT_SUPPORT_VERSION =
                        cluster?.engine === EngineType.Elasticsearch ||
                        parseFloat(cluster?.version || "") < 1.3;
                      setEsDomainEmptyError(false);
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          target: cluster?.domainName || "",
                          engine: cluster?.engine || "",
                          params: {
                            ...prev.params,
                            engineType: cluster?.engine || "",
                            domainName: cluster?.domainName || "",
                            esDomainId: cluster?.id || "",
                            endpoint: cluster?.endpoint || "",
                            securityGroupId:
                              cluster?.vpc?.securityGroupId || "",
                            subnetIds: cluster?.vpc?.privateSubnetIds || "",
                            vpcId: cluster?.vpc?.vpcId || "",
                            warmEnable: cluster?.nodes?.warmEnabled || false,
                            coldEnable: cluster?.nodes?.coldEnabled || false,
                            rolloverSizeNotSupport: NOT_SUPPORT_VERSION,
                            enableRolloverByCapacity: !NOT_SUPPORT_VERSION,
                            rolloverSize: NOT_SUPPORT_VERSION ? "" : "30",
                          },
                        };
                      });
                    }}
                    changeSampleDashboard={(yesNo) => {
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            createDashboard: yesNo,
                          },
                        };
                      });
                    }}
                    changeWarnLogTransition={(value: string) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          warmLogInvalidError: false,
                        };
                      });
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            warmAge: value,
                          },
                        };
                      });
                    }}
                    changeColdLogTransition={(value: string) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          coldLogInvalidError: false,
                          coldMustLargeThanWarm: false,
                        };
                      });
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            coldAge: value,
                          },
                        };
                      });
                    }}
                    changeLogRetention={(value: string) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          logRetentionInvalidError: false,
                          logRetentionMustThanColdAndWarm: false,
                        };
                      });
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            retainAge: value,
                          },
                        };
                      });
                    }}
                    changeIndexSuffix={(suffix: string) => {
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            indexSuffix: suffix,
                          },
                        };
                      });
                    }}
                    changeEnableRollover={(enable: boolean) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          capacityInvalidError: false,
                        };
                      });
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            enableRolloverByCapacity: enable,
                          },
                        };
                      });
                    }}
                    changeRolloverSize={(size: string) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          capacityInvalidError: false,
                        };
                      });
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            rolloverSize: size,
                          },
                        };
                      });
                    }}
                    changeCompressionType={(codec: string) => {
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            codec: codec,
                          },
                        };
                      });
                    }}
                    changeWarmSettings={(type: string) => {
                      setAosInputValidRes((prev) => {
                        return {
                          ...prev,
                          coldMustLargeThanWarm: false,
                        };
                      });
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            warmTransitionType: type,
                          },
                        };
                      });
                    }}
                    domainCheckedStatus={domainCheckStatus}
                    changeOSDomainCheckStatus={(status) => {
                      setVpcLogPipelineTask((prev: VpcLogTaskProps) => {
                        return {
                          ...prev,
                          params: {
                            ...prev.params,
                            replicaNumbers: status.multiAZWithStandbyEnabled
                              ? "2"
                              : "1",
                          },
                        };
                      });
                      setDomainCheckStatus(status);
                    }}
                  />
                )}
                {curStep === 2 && (
                  <div>
                    <AlarmAndTags pipelineTask={vpcLogPipelineTask} />
                  </div>
                )}
                <div className="button-action text-right">
                  <Button
                    btnType="text"
                    onClick={() => {
                      navigate("/log-pipeline/service-log/create");
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
                      disabled={isNextDisabled()}
                      btnType="primary"
                      onClick={() => {
                        if (curStep === 0 && !isVpcSettingValid()) {
                          return;
                        }
                        if (curStep === 1 && !isClusterValid()) {
                          return;
                        }
                        // Check domain connection status
                        if (
                          curStep === 1 &&
                          domainCheckStatus?.status !==
                            DomainStatusCheckType.PASSED
                        ) {
                          return;
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
                        if (!validateAalrmInput(monitor)) {
                          dispatch({
                            type: CreateAlarmActionTypes.VALIDATE_ALARM_INPUT,
                          });
                          return;
                        }
                        confirmCreatePipeline();
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

export default CreateVPCLog;
