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
  AlarmMetricName,
  AppPipeline,
  BufferType,
  DestinationType,
  MonitorDetail,
  PipelineAlarmStatus,
  PipelineStatus,
  PipelineType,
  Resource,
  ResourceType,
  ServicePipeline,
} from "API";
import HeaderPanel from "components/HeaderPanel";
import Switch from "components/Switch";
import RefreshIcon from "@material-ui/icons/Refresh";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { InfoBarTypes } from "reducer/appReducer";
import LogProcessorAlarm from "./alarm/LogProcessorAlarm";
import KDSBufferLayerAlarm from "./alarm/KDSBufferLayerAlarm";
import S3BufferLayerAlarm from "./alarm/S3BufferLayerAlarm";
import LogSourceAlarm from "./alarm/LogSourceAlarm";
import Alert from "components/Alert";
import { appSyncRequestQuery } from "assets/js/request";
import {
  getAppLogIngestion,
  getAppPipeline,
  getPipelineAlarm,
  getServicePipeline,
  listResources,
} from "graphql/queries";
import FormItem from "components/FormItem";
import ExtLink from "components/ExtLink";
import AutoComplete from "components/AutoComplete";
import { SelectItem } from "components/Select/select";
import Button from "components/Button";
import {
  createPipelineAlarm,
  deletePipelineAlarm,
  updatePipelineAlarm,
} from "graphql/mutations";
import TextInput from "components/TextInput";
import { ServiceLogDetailProps } from "pages/dataInjection/serviceLog/ServiceLogDetail";
import ExpandableSection from "components/ExpandableSection";
import { ternary } from "assets/js/utils";
import { RootState } from "reducer/reducers";
import { useDispatch, useSelector } from "react-redux";
import {
  CreateAlarmActionTypes,
  CreateAlarmActions,
  SNSCreateMethod,
  validateAalrmInput,
} from "reducer/createAlarm";
import { Dispatch } from "redux";
import { identity } from "lodash";
import { TOPIC_NAME_REGEX } from "assets/js/const";

export interface LogSourceAlarmType {
  name: string;
  sourceType: string;
  resourceId: string;
  status: string;
}

export interface AlarmItemProps {
  pipelineId: string;
  type: PipelineType;
  refreshCount: number;
}

interface MonitoringProps {
  pageType: "create" | "detail";
  type: PipelineType;
  servicePipeline?: ServiceLogDetailProps;
  pipelineInfo?: AppPipeline;
  changeTopicName?: (topicName: string) => void;
  changeEmails?: (emails: string) => void;
  changePipelineMonitor?: (monitor?: MonitorDetail | null) => void;
}

const Alarm: React.FC<MonitoringProps> = (props: MonitoringProps) => {
  const { t } = useTranslation();
  const {
    monitor: pipelineMonitor,
    snsObj,
    isConfirmed,
    topicCheckOption,
    selectExistSNSError,
    snsTopicError,
    snsEmailError,
  } = useSelector((state: RootState) => state.createAlarm);
  const createMonitor = useSelector((state: RootState) => state.createAlarm);

  const dispatch = useDispatch<Dispatch<CreateAlarmActions>>();

  const {
    pageType,
    type,
    pipelineInfo,
    servicePipeline,
    changeTopicName,
    changeEmails,
    changePipelineMonitor,
  } = props;

  const CreateAlarmOptionList = [
    {
      name: t("common:alarm.chooseExistTopic"),
      value: SNSCreateMethod.ChooseExistTopic,
    },
    {
      name: t("common:alarm.createTopic"),
      value: SNSCreateMethod.ChooseCreateTopic,
    },
  ];

  const initAlarmStatus = useMemo(() => {
    if (pageType === "detail") {
      if (type === PipelineType.SERVICE) {
        return (
          servicePipeline?.monitor.pipelineAlarmStatus ===
          PipelineAlarmStatus.ENABLED
        );
      }
      if (type === PipelineType.APP) {
        return (
          pipelineInfo?.monitor?.pipelineAlarmStatus ===
          PipelineAlarmStatus.ENABLED
        );
      }
    }
    return pipelineMonitor.pipelineAlarmStatus === PipelineAlarmStatus.ENABLED;
  }, [pageType, type, servicePipeline, servicePipeline]);

  const [alarmEnableStatus, setAlarmEnableStatus] = useState(initAlarmStatus);

  const [loadingEnableAlarm, setLoadingEnableAlarm] = useState(false);
  const [loadingSaveSNS, setLoadingSaveSNS] = useState(false);
  const [isSNSNotEditable, setIsSNSNotEditable] = useState(true);
  const [loadingSNSList, setLoadingSNSList] = useState(false);
  const [snsOptionList, setSNSOptionList] = useState<SelectItem[]>([]);
  const [loadingFLBAlarm, setLoadingFLBAlarm] = useState(false);
  const [logSourceAlarmList, setLogSourceAlarmList] = useState<
    LogSourceAlarmType[]
  >([]);
  const [refreshCount, setRefreshCount] = useState(0);

  const getSNSList = async () => {
    try {
      setLoadingSNSList(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.SNS,
      });
      const dataList: Resource[] = resData.data.listResources;
      const tmpOptionList: SelectItem[] = [];
      dataList.forEach((element) => {
        tmpOptionList.push({
          name: element.name,
          value: element.id,
        });
      });
      setSNSOptionList(tmpOptionList);
      setLoadingSNSList(false);
    } catch (error) {
      console.error(error);
    }
  };

  const updateParentMonitor = async () => {
    await getSNSList();
    if (type === PipelineType.APP) {
      const resData: any = await appSyncRequestQuery(getAppPipeline, {
        id: pipelineInfo?.pipelineId,
      });
      const dataPipeline: AppPipeline = resData.data.getAppPipeline;
      dispatch({
        type: CreateAlarmActionTypes.CHANGE_SNS_OBJ,
        obj: {
          name: dataPipeline?.monitor?.snsTopicName || "",
          value: dataPipeline?.monitor?.snsTopicArn || "",
        },
      });
      changePipelineMonitor && changePipelineMonitor(dataPipeline.monitor);
    } else {
      const resData: any = await appSyncRequestQuery(getServicePipeline, {
        id: servicePipeline?.id,
      });
      const dataPipeline: ServicePipeline = resData.data.getServicePipeline;
      dispatch({
        type: CreateAlarmActionTypes.CHANGE_SNS_OBJ,
        obj: {
          name: dataPipeline?.monitor?.snsTopicName || "",
          value: dataPipeline?.monitor?.snsTopicArn || "",
        },
      });
      changePipelineMonitor && changePipelineMonitor(dataPipeline.monitor);
    }
    if (type === PipelineType.APP) {
      await getFLBLogSourceAlarmsStatus();
    }
  };

  const enableAlarms = async () => {
    try {
      setLoadingEnableAlarm(true);
      await appSyncRequestQuery(createPipelineAlarm, {
        emails: pipelineMonitor.emails,
        pipelineId:
          type === PipelineType.APP
            ? pipelineInfo?.pipelineId
            : servicePipeline?.id,
        pipelineType: type,
        snsTopicArn: pipelineMonitor.snsTopicArn,
        snsTopicName: pipelineMonitor.snsTopicName,
      });
      if (pageType === "detail") {
        await updateParentMonitor();
      }
      setAlarmEnableStatus(true);
      setLoadingEnableAlarm(false);
    } catch (error) {
      console.error(error);
      setLoadingEnableAlarm(false);
    }
  };

  const disableAlarms = async () => {
    try {
      await appSyncRequestQuery(deletePipelineAlarm, {
        pipelineId:
          type === PipelineType.APP
            ? pipelineInfo?.pipelineId
            : servicePipeline?.id,
        pipelineType: type,
      });
      if (pageType === "detail") {
        await updateParentMonitor();
      }
      console.log("Alarms disabled");
    } catch (error) {
      console.error(error);
    }
  };

  const updateAlarms = async () => {
    try {
      setLoadingSaveSNS(true);
      await appSyncRequestQuery(updatePipelineAlarm, {
        emails: pipelineMonitor.emails,
        pipelineId:
          type === PipelineType.APP
            ? pipelineInfo?.pipelineId
            : servicePipeline?.id,
        pipelineType: type,
        snsTopicArn: snsObj?.value,
      });
      await updateParentMonitor();
      setLoadingSaveSNS(false);
    } catch (error) {
      setLoadingSaveSNS(false);
      console.error(error);
    }
  };

  const getFLBLogSourceAlarmsStatus = async () => {
    if (pipelineInfo?.status !== PipelineStatus.ACTIVE) {
      return;
    }
    try {
      setLogSourceAlarmList([]);
      setLoadingFLBAlarm(true);
      const flbOutputRetriedRecordsRes: any = await appSyncRequestQuery(
        getPipelineAlarm,
        {
          alarmName: AlarmMetricName.FLUENTBIT_OUTPUT_RETRIED_RECORDS_ALARM,
          pipelineId: pipelineInfo?.pipelineId,
          pipelineType: type,
        }
      );
      const alarms: LogSourceAlarmType[] =
        flbOutputRetriedRecordsRes?.data?.getPipelineAlarm?.alarms || [];
      for (const alarm of alarms) {
        const resourceId = alarm.resourceId;
        const ingestionRes: any = await appSyncRequestQuery(
          getAppLogIngestion,
          {
            id: resourceId,
          }
        );
        alarm.sourceType =
          ingestionRes?.data?.getAppLogIngestion?.sourceType || "";
      }
      setLogSourceAlarmList(alarms);
      setLoadingFLBAlarm(false);
    } catch (error) {
      setLoadingFLBAlarm(false);
      console.error(error);
    }
  };

  useEffect(() => {
    if (alarmEnableStatus) {
      if (pageType === "detail") {
        updateParentMonitor();
      }
      dispatch({
        type: CreateAlarmActionTypes.CHANGE_CONFIRM_STATUS,
        status: true,
      });
    } else {
      dispatch({
        type: CreateAlarmActionTypes.CLEAR_ALARM,
      });
      getSNSList();
    }
  }, [alarmEnableStatus]);

  useEffect(() => {
    if (alarmEnableStatus) {
      if (type === PipelineType.APP) {
        getFLBLogSourceAlarmsStatus();
      }
    }
  }, [refreshCount]);

  return (
    <div>
      <HeaderPanel
        title={ternary(
          pageType === "detail",
          t("applog:detail.tab.alarm"),
          t("alarm.alarms")
        )}
        infoType={InfoBarTypes.PIPELINE_ALARM}
        desc={t("common:alarm.createTitleDesc")}
        action={
          <>
            {alarmEnableStatus &&
              (pipelineInfo?.status === PipelineStatus.ACTIVE ||
                servicePipeline?.status === PipelineStatus.ACTIVE) &&
              pageType === "detail" && (
                <Button
                  onClick={() => {
                    setRefreshCount((prev) => prev + 1);
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </Button>
              )}
          </>
        }
      >
        {ternary(
          ((pipelineInfo?.status === PipelineStatus.ACTIVE ||
            servicePipeline?.status === PipelineStatus.ACTIVE) &&
            pageType === "detail") ||
            pageType === "create",
          <div>
            <div>
              <Switch
                label={t("common:alarm.alarms")}
                desc={t("common:alarm.desc")}
                isOn={isConfirmed}
                handleToggle={() => {
                  if (alarmEnableStatus) {
                    if (pageType === "detail") {
                      disableAlarms();
                    } else {
                      dispatch({
                        type: CreateAlarmActionTypes.CLEAR_ALARM,
                      });
                    }
                    setAlarmEnableStatus(false);
                  }
                  dispatch({
                    type: CreateAlarmActionTypes.CHANGE_CONFIRM_STATUS,
                    status: !isConfirmed,
                  });
                }}
              />
            </div>

            {!alarmEnableStatus && (
              <div className="alarm-preset-gray-bg">
                <ExpandableSection
                  defaultExpanded={false}
                  headerText={t("alarm.expandPresetAlarm")}
                >
                  <div className="preset-alarm-list">
                    <p>{t("alarm.list.PROCESSOR_ERROR_INVOCATION_ALARM")}</p>
                    <p>{t("alarm.list.PROCESSOR_ERROR_RECORD_ALARM")}</p>
                    <p>{t("alarm.list.PROCESSOR_DURATION_ALARM")}</p>
                    <p>{t("alarm.list.OLDEST_MESSAGE_AGE_ALARM")}</p>
                    <p>{t("alarm.list.KDS_THROTTLED_RECORDS_ALARM")}</p>
                    {type === PipelineType.APP && (
                      <p>
                        {t("alarm.list.FLUENTBIT_OUTPUT_RETRIED_RECORDS_ALARM")}
                      </p>
                    )}
                  </div>
                </ExpandableSection>
              </div>
            )}

            {!alarmEnableStatus && isConfirmed && (
              <>
                <FormItem optionTitle="" optionDesc="">
                  <>
                    {CreateAlarmOptionList.map((element, index) => {
                      return (
                        <div key={identity(index)}>
                          <label>
                            <input
                              value={element.value}
                              onChange={async (e) => {
                                dispatch({
                                  type: CreateAlarmActionTypes.CHANGE_ALARM_OPTION,
                                  option: e.target.value,
                                });
                              }}
                              checked={element.value === topicCheckOption}
                              name="chooseTopicOption"
                              type="radio"
                            />{" "}
                            {element.name}
                          </label>
                        </div>
                      );
                    })}
                    {topicCheckOption === SNSCreateMethod.ChooseExistTopic && (
                      <FormItem
                        optionTitle=""
                        optionDesc=""
                        errorText={
                          selectExistSNSError && t(selectExistSNSError)
                        }
                      >
                        <AutoComplete
                          outerLoading
                          className="m-w-75p"
                          placeholder={t("common:alarm.selectSNS")}
                          loading={loadingSNSList}
                          optionList={snsOptionList}
                          value={snsObj}
                          onChange={(event, data) => {
                            dispatch({
                              type: CreateAlarmActionTypes.CHANGE_SNS_OBJ,
                              obj: data,
                            });
                          }}
                        />
                      </FormItem>
                    )}
                    {topicCheckOption === SNSCreateMethod.ChooseCreateTopic && (
                      <>
                        <FormItem
                          optionTitle={t("alarm.topicName")}
                          optionDesc={t("alarm.topicNameDesc")}
                          errorText={snsTopicError && t(snsTopicError)}
                        >
                          <TextInput
                            className="m-w-75p"
                            value={pipelineMonitor.snsTopicName ?? ""}
                            placeholder="MyTopic"
                            onChange={(event) => {
                              if (
                                event.target.value !== "" &&
                                !new RegExp(TOPIC_NAME_REGEX).test(
                                  event.target.value
                                )
                              ) {
                                return false;
                              }
                              changeTopicName &&
                                changeTopicName(event.target.value);
                            }}
                          />
                        </FormItem>
                        <FormItem
                          optionTitle={t("common:alarm.emailTitle")}
                          optionDesc={t("common:alarm.emailDesc")}
                          errorText={snsEmailError && t(snsEmailError)}
                        >
                          <TextInput
                            className="m-w-75p"
                            value={pipelineMonitor.emails ?? ""}
                            placeholder="ops@example.com"
                            onChange={(event) => {
                              changeEmails && changeEmails(event.target.value);
                            }}
                          />
                        </FormItem>
                      </>
                    )}
                    {pageType === "detail" && (
                      <Button
                        btnType="primary"
                        loading={loadingEnableAlarm}
                        disabled={loadingEnableAlarm}
                        onClick={() => {
                          if (!validateAalrmInput(createMonitor)) {
                            dispatch({
                              type: CreateAlarmActionTypes.VALIDATE_ALARM_INPUT,
                            });
                            return;
                          }
                          enableAlarms();
                        }}
                      >
                        {t("button.create")}
                      </Button>
                    )}
                  </>
                </FormItem>
              </>
            )}

            {alarmEnableStatus &&
              type === PipelineType.APP &&
              pageType === "detail" && (
                <>
                  {pipelineInfo?.bufferType !== BufferType.None && (
                    <LogProcessorAlarm
                      type={PipelineType.APP}
                      pipelineId={pipelineInfo?.pipelineId || ""}
                      refreshCount={refreshCount}
                    />
                  )}
                  {pipelineInfo?.bufferType === BufferType.KDS && (
                    <KDSBufferLayerAlarm
                      type={PipelineType.APP}
                      pipelineId={pipelineInfo.pipelineId}
                      refreshCount={refreshCount}
                    />
                  )}
                  {pipelineInfo?.bufferType === BufferType.S3 && (
                    <S3BufferLayerAlarm
                      type={PipelineType.APP}
                      pipelineId={pipelineInfo.pipelineId}
                      refreshCount={refreshCount}
                    />
                  )}
                  <LogSourceAlarm
                    loadingData={loadingFLBAlarm}
                    flbSourceAlarmList={logSourceAlarmList}
                  />
                </>
              )}

            {alarmEnableStatus &&
              type === PipelineType.SERVICE &&
              pageType === "detail" && (
                <>
                  <LogProcessorAlarm
                    type={PipelineType.SERVICE}
                    pipelineId={servicePipeline?.id || ""}
                    refreshCount={refreshCount}
                  />
                  {ternary(
                    (servicePipeline?.type === "CloudTrail" &&
                      servicePipeline?.destinationType ===
                        DestinationType.CloudWatch) ||
                      (servicePipeline?.type === "CloudFront" &&
                        servicePipeline?.destinationType ===
                          DestinationType.KDS) ||
                      (servicePipeline?.type === "VPC" &&
                        servicePipeline?.destinationType ===
                          DestinationType.CloudWatch),
                    <KDSBufferLayerAlarm
                      type={PipelineType.SERVICE}
                      pipelineId={servicePipeline?.id || ""}
                      refreshCount={refreshCount}
                    />,
                    <div>
                      <S3BufferLayerAlarm
                        type={PipelineType.SERVICE}
                        pipelineId={servicePipeline?.id || ""}
                        refreshCount={refreshCount}
                      />
                    </div>
                  )}
                </>
              )}
          </div>,
          <Alert content={t("alarm.notActive")} />
        )}
      </HeaderPanel>

      {alarmEnableStatus &&
        isConfirmed &&
        (pipelineInfo?.status === PipelineStatus.ACTIVE ||
          servicePipeline?.status === PipelineStatus.ACTIVE) &&
        pageType === "detail" && (
          <HeaderPanel
            title={t("common:alarm.notification")}
            desc={<div>{t("common:alarm.titleDesc")}</div>}
          >
            <FormItem
              optionTitle={t("common:alarm.snsTopic")}
              optionDesc={
                <div>
                  {t("common:alarm.notificationDesc")}
                  <ExtLink to="/"> {t("common:alarm.learnMore")}</ExtLink>
                </div>
              }
            >
              <div className="flex">
                <div style={{ width: 500 }}>
                  <AutoComplete
                    outerLoading
                    disabled={isSNSNotEditable}
                    placeholder={t("common:alarm.selectSNS")}
                    loading={loadingSNSList}
                    optionList={snsOptionList}
                    value={snsObj}
                    onChange={(event, data) => {
                      dispatch({
                        type: CreateAlarmActionTypes.CHANGE_SNS_OBJ,
                        obj: data,
                      });
                    }}
                  />
                </div>
                <div className="ml-10">
                  <Button
                    btnType="default"
                    disabled={!isSNSNotEditable}
                    onClick={() => {
                      setIsSNSNotEditable(!isSNSNotEditable);
                    }}
                  >
                    {t("button.edit")}
                  </Button>
                </div>

                <div className="ml-10">
                  <Button
                    btnType="primary"
                    disabled={isSNSNotEditable || loadingSaveSNS}
                    loading={loadingSaveSNS}
                    onClick={() => {
                      updateAlarms();
                      setIsSNSNotEditable(true);
                    }}
                  >
                    {t("button.save")}
                  </Button>
                </div>
              </div>
            </FormItem>
          </HeaderPanel>
        )}
    </div>
  );
};

export default Alarm;
