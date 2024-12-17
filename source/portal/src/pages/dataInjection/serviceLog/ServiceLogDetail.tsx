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
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { AntTabs, AntTab, TabPanel } from "components/Tab";
import { ApiResponse, appSyncRequestQuery } from "assets/js/request";
import {
  getLightEngineServicePipelineDetail,
  getServicePipeline,
} from "graphql/queries";
import {
  DestinationType,
  Parameter,
  ServicePipeline,
  ServiceType,
  Tag,
  PipelineStatus,
  PipelineAlarmStatus,
  PipelineMonitorStatus,
  AnalyticEngineType,
  LightEnginePipelineDetailResponse,
  AnalyticsEngine as AnalyticsEngineType,
  Schedule,
  PipelineType,
  LogEventQueueType,
} from "API";
import {
  buildOSIPipelineNameByPipelineId,
  defaultStr,
  formatLocalTime,
  isOSIPipeline,
} from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import Monitoring from "./detail/Monitoring";
import Logging from "./detail/Logging";
import Alarm from "./detail/Alarm";
import { RootState } from "reducer/reducers";
import Tags from "../common/Tags";
import LogSource from "./detail/LogSource";
import LogProcessor from "./detail/LogProcessor";
import { LightEngineAnalyticsEngineDetails } from "../common/LightEngineAnalyticsEngineDetails";
import { LightEngineLogProcessor } from "../common/LightEngineLogProcessor";
import { LightEngineLoggingList } from "../common/LightEngineLoggingList";
import CommonLayout from "pages/layout/CommonLayout";
import GeneralConfig from "../common/details/GeneralConfig";
import HeaderPanel from "components/HeaderPanel";
import Alert from "components/Alert";
import AnalyticsEngineDetails from "../common/details/AnalyticsEngineDetails";

export const getParamValueByKey = (
  dataList: (Parameter | null)[] | null | undefined,
  key: string
) => {
  if (dataList) {
    return defaultStr(
      dataList.find((element) => element?.parameterKey === key)?.parameterValue
    );
  }
  return "-";
};

export interface SvcDetailProps {
  pipelineInfo: ServiceLogDetailProps | undefined;
  amplifyConfig?: AmplifyConfigType;
}

export interface ServiceLogDetailProps {
  id: string;
  type: string;
  status: PipelineStatus;
  // bucketName: string;
  engineType?: AnalyticEngineType;
  source: string;
  esName: string;
  esIndex: string;
  logLocation: string;
  createSampleData: string;
  createTime: string;
  warmAge: number | string;
  coldAge: number | string;
  retainAge: number | string;
  warnRetention: number | string;
  coldRetention: number | string;
  logRetention: number | string;
  shardNumbers: number | string;
  replicaNumbers: number | string;
  logSourceAccountId: string;
  destinationType: string;
  samplingRate: string;
  minCapacity: string;
  maxCapacity: string;
  enableAutoScaling: string;
  rolloverSize: string;
  indexSuffix: string;
  codec: string;
  fieldNames: string;
  tags: (Tag | null)[] | null | undefined;
  // Monitor relative
  sourceSQS?: string | null;
  sourceKDS?: string | null;
  sourceKDF?: string | null;
  logEventQueueType?: LogEventQueueType | null;
  processorLambda?: string | null;
  helperLambda?: string | null;
  failedS3Bucket: string;
  webACLScope: string;
  stackId: string;
  monitor: {
    status?: PipelineMonitorStatus | null;
    backupBucketName?: string | null;
    errorLogPrefix?: string | null;
    pipelineAlarmStatus?: PipelineAlarmStatus | null;
    snsTopicName?: string | null;
    snsTopicArn?: string | null;
    emails?: string | null;
  };
  osiParams: {
    minCapacity?: number | string | null;
    maxCapacity?: number | string | null;
  };
  osiPipelineName?: string | null;
  // lightEngine Lifecycle
  logArchiveAge?: string;
  logArchiveSchedule?: string;
  logMergerAge?: string;
  logMergerSchedule?: string;
  logProcessorSchedule?: string;
  importDashboards?: string;
  logProcessorConcurrency?: string;
  error?: string | null;
}

const ServiceLogDetail: React.FC = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("servicelog:name"),
      link: "/log-pipeline/service-log",
    },
    {
      name: defaultStr(id),
    },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const [loadingData, setLoadingData] = useState(true);
  const [curPipeline, setCurPipeline] = useState<
    ServiceLogDetailProps | undefined
  >();
  const [svcPipeline, setSvcPipeline] = useState<ServicePipeline | undefined>();
  const [activeTab, setActiveTab] = useState("logSource");
  const [analyticsEngine, setAnalyticsEngine] = useState<
    AnalyticsEngineType | undefined
  >();
  const [schedules, setSchedules] = useState<Schedule[] | undefined>();

  const changeTab = (event: any, newTab: string) => {
    setActiveTab(newTab);
  };

  const isS3BucketLogs = (pipelineData: ServicePipeline) => {
    return (
      pipelineData.type === ServiceType.S3 ||
      pipelineData.type === ServiceType.CloudTrail ||
      pipelineData.type === ServiceType.CloudFront ||
      pipelineData.type === ServiceType.ELB ||
      pipelineData.type === ServiceType.WAF ||
      pipelineData.type === ServiceType.VPC ||
      pipelineData.type === ServiceType.Config ||
      pipelineData.type === ServiceType.WAFSampled ||
      pipelineData.type === ServiceType.RDS
    );
  };

  const getPipelineById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getServicePipeline, {
        id: encodeURIComponent(defaultStr(id)),
      });
      const dataPipeline: ServicePipeline = resData.data.getServicePipeline;
      let tmpLogLocation = "";
      if (isS3BucketLogs(dataPipeline)) {
        tmpLogLocation = `s3://${getParamValueByKey(
          dataPipeline.parameters,
          "logBucketName"
        )}/${getParamValueByKey(dataPipeline.parameters, "logBucketPrefix")}`;
      }

      if (
        dataPipeline.type === ServiceType.Lambda ||
        (dataPipeline.type === ServiceType.RDS &&
          !dataPipeline.logEventQueueType)
      ) {
        tmpLogLocation = `${getParamValueByKey(
          dataPipeline.parameters,
          "logGroupNames"
        )}`;
      }

      if (dataPipeline.destinationType === DestinationType.CloudWatch) {
        tmpLogLocation = `${getParamValueByKey(
          dataPipeline.parameters,
          "logSource"
        )}`;
      }

      setCurPipeline({
        id: defaultStr(id),
        engineType: dataPipeline.engineType ?? AnalyticEngineType.OpenSearch,
        type: dataPipeline.type,
        status: dataPipeline.status ?? PipelineStatus.ERROR,
        source: defaultStr(dataPipeline.source),
        esName: getParamValueByKey(dataPipeline.parameters, "domainName"),
        esIndex: getParamValueByKey(dataPipeline.parameters, "indexPrefix"),
        logLocation: tmpLogLocation,
        createSampleData: getParamValueByKey(
          dataPipeline.parameters,
          "createDashboard"
        ),
        createTime: formatLocalTime(defaultStr(dataPipeline?.createdAt)),
        warnRetention: getParamValueByKey(
          dataPipeline.parameters,
          "daysToWarm"
        ),
        coldRetention: getParamValueByKey(
          dataPipeline.parameters,
          "daysToCold"
        ),
        logRetention: getParamValueByKey(
          dataPipeline.parameters,
          "daysToRetain"
        ),
        warmAge: getParamValueByKey(dataPipeline.parameters, "warmAge"),
        coldAge: getParamValueByKey(dataPipeline.parameters, "coldAge"),
        retainAge: getParamValueByKey(dataPipeline.parameters, "retainAge"),
        shardNumbers: getParamValueByKey(
          dataPipeline.parameters,
          "shardNumbers"
        ),
        replicaNumbers: getParamValueByKey(
          dataPipeline.parameters,
          "replicaNumbers"
        ),
        logSourceAccountId: defaultStr(
          getParamValueByKey(dataPipeline.parameters, "logSourceAccountId"),
          dataPipeline?.logSourceAccountId
        ),
        destinationType: defaultStr(dataPipeline.destinationType),
        samplingRate: getParamValueByKey(
          dataPipeline.parameters,
          "samplingRate"
        ),
        minCapacity: getParamValueByKey(dataPipeline.parameters, "minCapacity"),
        maxCapacity: getParamValueByKey(dataPipeline.parameters, "maxCapacity"),
        enableAutoScaling: getParamValueByKey(
          dataPipeline.parameters,
          "enableAutoScaling"
        ),
        rolloverSize: getParamValueByKey(
          dataPipeline.parameters,
          "rolloverSize"
        ),
        indexSuffix: getParamValueByKey(dataPipeline.parameters, "indexSuffix"),
        codec: getParamValueByKey(dataPipeline.parameters, "codec"),
        fieldNames: getParamValueByKey(dataPipeline.parameters, "fieldNames"),
        tags: dataPipeline.tags,
        logEventQueueType: dataPipeline.logEventQueueType,
        sourceKDS: dataPipeline.bufferResourceName,
        sourceSQS: dataPipeline.logEventQueueName,
        sourceKDF: dataPipeline.deliveryStreamName,
        processorLambda: dataPipeline.processorLogGroupName,
        helperLambda: dataPipeline.helperLogGroupName,
        failedS3Bucket: `${dataPipeline.monitor?.backupBucketName}/${dataPipeline.monitor?.errorLogPrefix}`,
        webACLScope: getParamValueByKey(dataPipeline.parameters, "webACLScope"),
        stackId: defaultStr(dataPipeline.stackId),
        monitor: {
          status: dataPipeline?.monitor?.status,
          backupBucketName: "",
          errorLogPrefix: "",
          pipelineAlarmStatus: dataPipeline.monitor?.pipelineAlarmStatus,
          snsTopicName: defaultStr(dataPipeline.monitor?.snsTopicName),
          snsTopicArn: defaultStr(dataPipeline.monitor?.snsTopicArn),
          emails: defaultStr(dataPipeline.monitor?.emails),
        },
        osiParams: {
          minCapacity: dataPipeline.osiParams?.minCapacity,
          maxCapacity: dataPipeline.osiParams?.maxCapacity,
        },
        osiPipelineName: buildOSIPipelineNameByPipelineId(
          defaultStr(dataPipeline?.id)
        ),
        logArchiveAge: dataPipeline.lightEngineParams?.logArchiveAge,
        logArchiveSchedule: dataPipeline.lightEngineParams?.logArchiveSchedule,
        logMergerAge: dataPipeline.lightEngineParams?.logMergerAge,
        logMergerSchedule: dataPipeline.lightEngineParams?.logMergerSchedule,
        logProcessorSchedule:
          dataPipeline.lightEngineParams?.logProcessorSchedule,
        importDashboards: dataPipeline.lightEngineParams?.importDashboards,
        logProcessorConcurrency: dataPipeline.logProcessorConcurrency ?? "-",
        error: dataPipeline.error,
      });
      setSvcPipeline(dataPipeline);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getPipelineById();
  }, []);

  const isLightEngine = useMemo(
    () => svcPipeline?.engineType === AnalyticEngineType.LightEngine,
    [svcPipeline]
  );

  useEffect(() => {
    (async () => {
      if (svcPipeline?.engineType !== AnalyticEngineType.LightEngine) {
        return;
      }
      const lightEngineAppPipelineDetail: ApiResponse<
        "getLightEngineServicePipelineDetail",
        LightEnginePipelineDetailResponse
      > = await appSyncRequestQuery(getLightEngineServicePipelineDetail, {
        pipelineId: svcPipeline?.id,
      });
      setAnalyticsEngine(
        lightEngineAppPipelineDetail.data.getLightEngineServicePipelineDetail
          .analyticsEngine ?? undefined
      );
      setSchedules(
        (lightEngineAppPipelineDetail.data.getLightEngineServicePipelineDetail
          .schedules as Schedule[]) ?? []
      );
    })();
  }, [svcPipeline?.engineType]);

  const isNotActive =
    curPipeline?.status === PipelineStatus.CREATING ||
    curPipeline?.status === PipelineStatus.ERROR;

  const buildAnalyticsEngineDetails = () => {
    if (isNotActive) {
      return (
        <HeaderPanel title={t("pipeline.detail.analyticsEngine")}>
          <Alert content={t("alarm.notActive")} />
        </HeaderPanel>
      );
    }

    if (isLightEngine) {
      return (
        <LightEngineAnalyticsEngineDetails
          pipelineType={PipelineType.SERVICE}
          servicePipeline={curPipeline}
          analyticsEngine={analyticsEngine}
        />
      );
    } else {
      return (
        <AnalyticsEngineDetails
          pipelineType={PipelineType.SERVICE}
          servicePipelineInfo={curPipeline}
        />
      );
    }
  };

  const buildLogProcessor = () => {
    if (isNotActive) {
      return (
        <HeaderPanel title={t("servicelog:tab.logProcessor")}>
          <Alert content={t("alarm.notActive")} />
        </HeaderPanel>
      );
    }
    if (isLightEngine) {
      return <LightEngineLogProcessor schedules={schedules ?? []} />;
    } else {
      return (
        <LogProcessor
          amplifyConfig={amplifyConfig}
          pipelineInfo={curPipeline}
        />
      );
    }
  };

  const buildLogging = () => {
    if (!curPipeline || isNotActive) {
      return (
        <HeaderPanel title={t("servicelog:tab.logging")}>
          <Alert content={t("alarm.notActive")} />
        </HeaderPanel>
      );
    }
    if (isLightEngine) {
      return (
        <LightEngineLoggingList
          schedules={schedules ?? []}
          pipelineId={curPipeline?.id ?? ""}
          pipelineType={PipelineType.SERVICE}
        />
      );
    } else {
      return <Logging pipelineInfo={curPipeline} />;
    }
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList} loadingData={loadingData}>
      <GeneralConfig
        pipelineType={PipelineType.SERVICE}
        servicePipeline={curPipeline}
        analyticsEngine={analyticsEngine}
        isLightEngine={isLightEngine}
      />
      <div>
        <AntTabs
          value={activeTab}
          onChange={(event, newTab) => {
            changeTab(event, newTab);
          }}
        >
          <AntTab label={t("servicelog:tab.logSource")} value="logSource" />
          <AntTab label={t("servicelog:tab.analyticsEngine")} value="engine" />
          <AntTab label={t("servicelog:tab.logProcessor")} value="processor" />
          <AntTab label={t("servicelog:tab.monitoring")} value="monitoring" />
          <AntTab label={t("servicelog:tab.logging")} value="logging" />
          {!isOSIPipeline(curPipeline) && (
            <AntTab label={t("servicelog:tab.alarm")} value="alarm" />
          )}
          <AntTab label={t("servicelog:tab.tags")} value="tags" />
        </AntTabs>
        <TabPanel value={activeTab} index="logSource">
          <LogSource pipelineInfo={curPipeline} />
        </TabPanel>
        <TabPanel value={activeTab} index="engine">
          {buildAnalyticsEngineDetails()}
        </TabPanel>
        <TabPanel value={activeTab} index="processor">
          {buildLogProcessor()}
        </TabPanel>
        <TabPanel value={activeTab} index="monitoring">
          <Monitoring
            isLightEngine={isLightEngine}
            pipelineInfo={curPipeline}
          />
        </TabPanel>
        <TabPanel value={activeTab} index="logging">
          {buildLogging()}
        </TabPanel>
        <TabPanel value={activeTab} index="alarm">
          <Alarm
            pipelineInfo={curPipeline}
            changePipelineMonitor={(monitor) => {
              setCurPipeline((prev: any) => {
                return {
                  ...prev,
                  monitor: monitor,
                };
              });
            }}
          />
        </TabPanel>
        <TabPanel value={activeTab} index="tags">
          <Tags tags={curPipeline?.tags} />
        </TabPanel>
      </div>
    </CommonLayout>
  );
};

export default ServiceLogDetail;
