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
import { RouteComponentProps } from "react-router-dom";
import Breadcrumb from "components/Breadcrumb";
import LoadingText from "components/LoadingText";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import ExtLink from "components/ExtLink";
import { AntTabs, AntTab, TabPanel } from "components/Tab";
import Overview from "./detail/Overview";
import Lifecycle from "./detail/Lifecycle";
import Tags from "./detail/Tags";
import { appSyncRequestQuery } from "assets/js/request";
import { getServicePipeline } from "graphql/queries";
import { Parameter, ServicePipeline, ServiceType, Tag } from "API";
import {
  buildCloudFrontLink,
  buildConfigLink,
  buildELBLink,
  buildESLink,
  buildLambdaLink,
  buildRDSLink,
  buildS3Link,
  buildTrailLink,
  buildVPCLink,
  buildWAFLink,
  formatLocalTime,
} from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { AppStateProps } from "reducer/appReducer";
import { ServiceTypeMap } from "assets/js/const";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import AccountName from "pages/comps/account/AccountName";

interface MatchParams {
  id: string;
}

export interface ServiceLogDetailProps {
  type: string;
  // bucketName: string;
  source: string;
  esName: string;
  esIndex: string;
  logLocation: string;
  createSampleData: string;
  createTime: string;
  warnRetention: number | string;
  coldRetention: number | string;
  logRetention: number | string;
  shardNumbers: number | string;
  replicaNumbers: number | string;
  logSourceAccountId: string;
  tags: (Tag | null)[] | null | undefined;
}

const ServiceLogDetail: React.FC<RouteComponentProps<MatchParams>> = (
  props: RouteComponentProps<MatchParams>
) => {
  const id: string = props.match.params.id;
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("servicelog:name"),
      link: "/log-pipeline/service-log",
    },
    {
      name: id,
    },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const [loadingData, setLoadingData] = useState(true);
  const [curPipeline, setCurPipeline] = useState<
    ServiceLogDetailProps | undefined
  >();
  const [activeTab, setActiveTab] = useState(0);

  const changeTab = (event: any, newTab: number) => {
    console.info("newTab:", newTab);
    setActiveTab(newTab);
  };

  const getParamValueByKey = (
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

  const getPipelineById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getServicePipeline, {
        id: id,
      });
      console.info("resData:", resData);
      const dataPipelne: ServicePipeline = resData.data.getServicePipeline;

      let tmpLogLocation = "";
      if (
        dataPipelne.type === ServiceType.S3 ||
        dataPipelne.type === ServiceType.CloudTrail ||
        dataPipelne.type === ServiceType.CloudFront ||
        dataPipelne.type === ServiceType.ELB ||
        dataPipelne.type === ServiceType.WAF ||
        dataPipelne.type === ServiceType.VPC ||
        dataPipelne.type === ServiceType.Config
      ) {
        tmpLogLocation = `s3://${getParamValueByKey(
          dataPipelne.parameters,
          "logBucketName"
        )}/${getParamValueByKey(dataPipelne.parameters, "logBucketPrefix")}`;
      }

      if (
        dataPipelne.type === ServiceType.Lambda ||
        dataPipelne.type === ServiceType.RDS
      ) {
        tmpLogLocation = `${getParamValueByKey(
          dataPipelne.parameters,
          "logGroupNames"
        )}`;
      }

      // setCurDomain(dataDomain);
      setCurPipeline({
        type: dataPipelne.type,
        source: dataPipelne.source || "",
        // bucketName: getParamValueByKey(dataPipelne.parameters, "logBucketName"),
        esName: getParamValueByKey(dataPipelne.parameters, "domainName"),
        esIndex: getParamValueByKey(dataPipelne.parameters, "indexPrefix"),
        logLocation: tmpLogLocation,
        createSampleData: getParamValueByKey(
          dataPipelne.parameters,
          "createDashboard"
        ),
        createTime: formatLocalTime(dataPipelne?.createdDt || ""),
        warnRetention:
          getParamValueByKey(dataPipelne.parameters, "daysToWarm") || "-",
        coldRetention:
          getParamValueByKey(dataPipelne.parameters, "daysToCold") || "-",
        logRetention:
          getParamValueByKey(dataPipelne.parameters, "daysToRetain") || "-",
        shardNumbers:
          getParamValueByKey(dataPipelne.parameters, "shardNumbers") || "-",
        replicaNumbers:
          getParamValueByKey(dataPipelne.parameters, "replicaNumbers") || "-",
        logSourceAccountId:
          getParamValueByKey(dataPipelne.parameters, "logSourceAccountId") ||
          "-",
        tags: dataPipelne.tags,
      });
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getPipelineById();
  }, []);

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
              <div>
                <HeaderPanel title={t("servicelog:detail.generalConfig")}>
                  <div className="flex value-label-span">
                    <div className="flex-1">
                      <ValueWithLabel label={t("servicelog:detail.type")}>
                        <div>{ServiceTypeMap[curPipeline?.type || ""]}</div>
                      </ValueWithLabel>
                      {curPipeline?.logSourceAccountId && (
                        <ValueWithLabel
                          label={t("resource:crossAccount.account")}
                        >
                          <AccountName
                            accountId={curPipeline?.logSourceAccountId}
                            region={amplifyConfig.aws_project_region}
                          />
                        </ValueWithLabel>
                      )}
                    </div>
                    <div className="flex-1 border-left-c">
                      {curPipeline?.type === ServiceType.Lambda && (
                        <ValueWithLabel
                          label={t("servicelog:detail.functionName")}
                        >
                          <ExtLink
                            to={buildLambdaLink(
                              amplifyConfig.aws_project_region,
                              curPipeline?.source || ""
                            )}
                          >
                            {curPipeline?.source}
                          </ExtLink>
                        </ValueWithLabel>
                      )}
                      {curPipeline?.type === ServiceType.S3 && (
                        <ValueWithLabel
                          label={t("servicelog:detail.bucketName")}
                        >
                          <ExtLink
                            to={buildS3Link(
                              amplifyConfig.aws_project_region,
                              curPipeline?.source || ""
                            )}
                          >
                            {curPipeline?.source}
                          </ExtLink>
                        </ValueWithLabel>
                      )}
                      {curPipeline?.type === ServiceType.CloudFront && (
                        <ValueWithLabel
                          label={t("servicelog:detail.distributionId")}
                        >
                          <ExtLink
                            to={buildCloudFrontLink(
                              amplifyConfig.aws_project_region,
                              curPipeline?.source || ""
                            )}
                          >
                            {curPipeline?.source}
                          </ExtLink>
                        </ValueWithLabel>
                      )}
                      {curPipeline?.type === ServiceType.ELB && (
                        <ValueWithLabel label={t("servicelog:detail.albName")}>
                          <ExtLink
                            to={buildELBLink(amplifyConfig.aws_project_region)}
                          >
                            {curPipeline?.source}
                          </ExtLink>
                        </ValueWithLabel>
                      )}
                      {(curPipeline?.type === ServiceType.WAF ||
                        curPipeline?.type === ServiceType.WAFSampled) && (
                        <ValueWithLabel label={t("servicelog:detail.wafName")}>
                          <ExtLink
                            to={buildWAFLink(amplifyConfig.aws_project_region)}
                          >
                            {curPipeline?.source}
                          </ExtLink>
                        </ValueWithLabel>
                      )}
                      {curPipeline?.type === ServiceType.VPC && (
                        <ValueWithLabel label={t("servicelog:detail.vpcId")}>
                          <ExtLink
                            to={buildVPCLink(
                              amplifyConfig.aws_project_region,
                              curPipeline?.source
                            )}
                          >
                            {curPipeline?.source}
                          </ExtLink>
                        </ValueWithLabel>
                      )}
                      {curPipeline?.type === ServiceType.CloudTrail && (
                        <ValueWithLabel
                          label={t("servicelog:detail.trailName")}
                        >
                          <ExtLink
                            to={buildTrailLink(
                              amplifyConfig.aws_project_region
                            )}
                          >
                            {curPipeline?.source}
                          </ExtLink>
                        </ValueWithLabel>
                      )}
                      {curPipeline?.type === ServiceType.Config && (
                        <ValueWithLabel label={t("servicelog:detail.config")}>
                          <ExtLink
                            to={buildConfigLink(
                              amplifyConfig.aws_project_region
                            )}
                          >
                            {curPipeline?.source}
                          </ExtLink>
                        </ValueWithLabel>
                      )}
                      {curPipeline?.type === ServiceType.RDS && (
                        <ValueWithLabel label={t("servicelog:detail.dbID")}>
                          <ExtLink
                            to={buildRDSLink(amplifyConfig.aws_project_region)}
                          >
                            {curPipeline?.source}
                          </ExtLink>
                        </ValueWithLabel>
                      )}
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel label={t("servicelog:detail.aos")}>
                        <ExtLink
                          to={buildESLink(
                            amplifyConfig.aws_project_region,
                            curPipeline?.esName || ""
                          )}
                        >
                          {curPipeline?.esName}
                        </ExtLink>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel label={t("servicelog:detail.index")}>
                        <div>{curPipeline?.esIndex}</div>
                      </ValueWithLabel>
                    </div>
                  </div>
                </HeaderPanel>
              </div>
              <div>
                <AntTabs
                  value={activeTab}
                  onChange={(event, newTab) => {
                    changeTab(event, newTab);
                  }}
                >
                  <AntTab label={t("servicelog:tab.overview")} />
                  <AntTab label={t("servicelog:tab.lifecycle")} />
                  <AntTab label={t("servicelog:tab.tags")} />
                </AntTabs>
                <TabPanel value={activeTab} index={0}>
                  <Overview pipelineInfo={curPipeline} />
                </TabPanel>
                <TabPanel value={activeTab} index={1}>
                  <Lifecycle pipelineInfo={curPipeline} />
                </TabPanel>
                <TabPanel value={activeTab} index={2}>
                  <Tags pipelineInfo={curPipeline} />
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
