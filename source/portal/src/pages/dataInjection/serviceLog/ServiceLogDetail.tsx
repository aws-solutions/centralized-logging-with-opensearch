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
import Breadcrumb from "components/Breadcrumb";
import LoadingText from "components/LoadingText";
import ExtLink from "components/ExtLink";
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
} from "API";
import {
  buildCfnLink,
  buildESLink,
  buildGlueTableLink,
  buildOSIPipelineNameByPipelineId,
  defaultStr,
  formatLocalTime,
  isOSIPipeline,
  ternary,
} from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { ServiceTypeMapMidSuffix } from "assets/js/const";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import Monitoring from "./detail/Monitoring";
import Logging from "./detail/Logging";
import Alarm from "./detail/Alarm";
import { RootState } from "reducer/reducers";
import Tags from "../common/Tags";
import HeaderWithValueLabel, {
  LabelValueDataItem,
} from "pages/comps/HeaderWithValueLabel";
import LogSource from "./detail/LogSource";
import AnalyticsEngine from "./detail/AnalyticsEngine";
import LogProcessor from "./detail/LogProcessor";
import Status from "components/Status/Status";
import { LightEngineAnalyticsEngineDetails } from "../common/LightEngineAnalyticsEngineDetails";
import { LightEngineLogProcessor } from "../common/LightEngineLogProcessor";
import { LightEngineLoggingList } from "../common/LightEngineLoggingList";

export const getParamValueByKey = (
  dataList: (Parameter | null)[] | null | undefined,
  key: string
) => {
  if (dataList) {
    return (
      dataList.find((element) => element?.parameterKey === key)
        ?.parameterValue || ""
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
      name: id || "",
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
  const [activeTab, setActiveTab] = useState(0);
  const [analyticsEngine, setAnalyticsEngine] = useState<
    AnalyticsEngineType | undefined
  >();
  const [schedules, setSchedules] = useState<Schedule[] | undefined>();
  console.log(analyticsEngine, schedules);

  const changeTab = (event: any, newTab: number) => {
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
      pipelineData.type === ServiceType.Config
    );
  };

  const getPipelineById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getServicePipeline, {
        id: id,
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
        dataPipeline.type === ServiceType.RDS
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
        status: dataPipeline.status || PipelineStatus.ERROR,
        source: defaultStr(dataPipeline.source),
        esName: getParamValueByKey(dataPipeline.parameters, "domainName"),
        esIndex: getParamValueByKey(dataPipeline.parameters, "indexPrefix"),
        logLocation: tmpLogLocation,
        createSampleData: getParamValueByKey(
          dataPipeline.parameters,
          "createDashboard"
        ),
        createTime: formatLocalTime(dataPipeline?.createdAt || ""),
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
        logSourceAccountId:
          getParamValueByKey(dataPipeline.parameters, "logSourceAccountId") ||
          dataPipeline.logSourceAccountId ||
          "",
        destinationType: dataPipeline.destinationType || "",
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

  // New Detail Logic
  const buildCloudFrontFields = (): LabelValueDataItem | undefined => {
    if (
      curPipeline?.type === ServiceType.CloudFront &&
      curPipeline.destinationType === DestinationType.KDS
    ) {
      return {
        label: t("servicelog:detail.fields"),
        data: curPipeline?.fieldNames,
      };
    }
  };

  const buildOpenSearchIndexInfo = () => {
    const openSearchIndexInfo: LabelValueDataItem[] = [
      {
        label: t("servicelog:detail.index"),
        data: `${curPipeline?.esIndex}${
          ServiceTypeMapMidSuffix[curPipeline?.type || ""]
        }`,
      },
    ];
    return [...openSearchIndexInfo];
  };

  const buildLightEngineTableInfo = () => [
    {
      label: t("applog:detail.logTable"),
      data: (
        <ExtLink
          to={buildGlueTableLink(
            amplifyConfig.aws_project_region,
            analyticsEngine?.table?.databaseName,
            analyticsEngine?.table?.tableName
          )}
        >
          {analyticsEngine?.table?.tableName}
        </ExtLink>
      ),
    },
  ];

  const buildGrafanaDashboardInfo = () => [
    {
      label: t("applog:detail.grafanaDashboard"),
      data: (
        <>
          <div>
            {analyticsEngine?.metric?.dashboardLink && (
              <ExtLink to={analyticsEngine?.metric.dashboardLink ?? ""}>
                {analyticsEngine?.metric.dashboardName ?? "-"}
              </ExtLink>
            )}
          </div>
          <div>
            <ExtLink to={analyticsEngine?.table?.dashboardLink ?? ""}>
              {analyticsEngine?.table?.dashboardName ?? "-"}
            </ExtLink>
          </div>
        </>
      ),
    },
  ];

  const buildCFNStackInfo = () => {
    return [
      {
        label: t("servicelog:detail.cfnStack"),
        data: (
          <ExtLink
            to={buildCfnLink(
              amplifyConfig.aws_project_region,
              curPipeline?.stackId ?? ""
            )}
          >
            {curPipeline?.stackId?.match(/:stack\/(.*?)\//)?.[1]}
          </ExtLink>
        ),
      },
    ];
  };

  const buildOpenSearchInfo = () => {
    const openSearchInfo: LabelValueDataItem[] = [
      {
        label: t("servicelog:detail.aos"),
        data: (
          <ExtLink
            to={buildESLink(
              amplifyConfig.aws_project_region,
              curPipeline?.esName || ""
            )}
          >
            {curPipeline?.esName}
          </ExtLink>
        ),
      },
    ];
    return [...openSearchInfo];
  };

  const buildPipelineStatusInfo = (): LabelValueDataItem[] => {
    return [
      {
        label: t("applog:list.status"),
        data: <Status status={curPipeline?.status || "-"} />,
      },
    ];
  };

  const buildCreateTimeInfo = (): LabelValueDataItem[] => {
    return [
      {
        label: t("servicelog:detail.createdAt"),
        data: formatLocalTime(curPipeline?.createTime || ""),
      },
    ];
  };

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <Breadcrumb list={breadCrumbList} />
          {loadingData ? (
            <LoadingText text="" />
          ) : (
            <div className="service-log">
              <HeaderWithValueLabel
                numberOfColumns={5}
                headerTitle={t("servicelog:detail.generalConfig")}
                fixedDataList={[
                  isLightEngine
                    ? buildLightEngineTableInfo()
                    : buildOpenSearchIndexInfo(),
                  buildCFNStackInfo(),
                  isLightEngine
                    ? buildGrafanaDashboardInfo()
                    : buildOpenSearchInfo(),
                  buildPipelineStatusInfo(),
                  buildCreateTimeInfo(),
                ]}
                additionalData={buildCloudFrontFields()}
              />

              <div>
                <AntTabs
                  value={activeTab}
                  onChange={(event, newTab) => {
                    changeTab(event, newTab);
                  }}
                >
                  <AntTab label={t("servicelog:tab.logSource")} />
                  <AntTab label={t("servicelog:tab.analyticsEngine")} />
                  <AntTab label={t("servicelog:tab.logProcessor")} />
                  <AntTab label={t("servicelog:tab.monitoring")} />
                  <AntTab label={t("servicelog:tab.logging")} />
                  {!isOSIPipeline(curPipeline) && (
                    <AntTab label={t("servicelog:tab.alarm")} />
                  )}
                  <AntTab label={t("servicelog:tab.tags")} />
                </AntTabs>
                <TabPanel value={activeTab} index={0}>
                  <LogSource pipelineInfo={curPipeline} />
                </TabPanel>
                <TabPanel value={activeTab} index={1}>
                  {isLightEngine ? (
                    <LightEngineAnalyticsEngineDetails
                      pipelineInfo={svcPipeline}
                      analyticsEngine={analyticsEngine}
                    />
                  ) : (
                    <AnalyticsEngine
                      pipelineInfo={curPipeline}
                      amplifyConfig={amplifyConfig}
                    />
                  )}
                </TabPanel>
                <TabPanel value={activeTab} index={2}>
                  {isLightEngine ? (
                    <LightEngineLogProcessor schedules={schedules} />
                  ) : (
                    <LogProcessor
                      amplifyConfig={amplifyConfig}
                      pipelineInfo={curPipeline}
                    />
                  )}
                </TabPanel>
                <TabPanel value={activeTab} index={3}>
                  <Monitoring pipelineInfo={curPipeline} />
                </TabPanel>
                <TabPanel value={activeTab} index={4}>
                  {isLightEngine ? (
                    <LightEngineLoggingList
                      schedules={schedules ?? []}
                      pipelineId={curPipeline?.id ?? ""}
                      pipelineType={PipelineType.SERVICE}
                    />
                  ) : (
                    <Logging pipelineInfo={curPipeline} />
                  )}
                </TabPanel>
                {!isOSIPipeline(curPipeline) && (
                  <TabPanel value={activeTab} index={5}>
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
                )}
                <TabPanel
                  value={activeTab}
                  index={ternary(isOSIPipeline(curPipeline), 5, 6)}
                >
                  <Tags tags={curPipeline?.tags} />
                </TabPanel>
              </div>
            </div>
          )}
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default ServiceLogDetail;
