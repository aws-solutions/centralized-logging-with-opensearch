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

import React from "react";
import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Button from "components/Button";

import Home from "pages/home/Home";
import ServiceLog from "pages/dataInjection/serviceLog/ServiceLog";
import ServiceLogCreateChooseType from "pages/dataInjection/serviceLog/create/CreateChooseType";
import ImportOpenSearchCluster from "pages/clusters/importcluster/ImportCluster";
import CreateS3 from "pages/dataInjection/serviceLog/create/s3/CreateS3";
import AppLogCreateS3 from "pages/dataInjection/applicationLog/create/s3/CreateS3";
import AppLogCreateSyslog from "pages/dataInjection/applicationLog/create/syslog/CreateSyslog";
import AppLogCreateEKS from "pages/dataInjection/applicationLog/create/eks/CreateEKS";
import CreateCloudTrail from "pages/dataInjection/serviceLog/create/cloudtrail/CreateCloudTrail";
import CreateELB from "pages/dataInjection/serviceLog/create/elb/CreateELB";
import CreateWAF from "pages/dataInjection/serviceLog/create/waf/CreateWAF";
import CreateVPCLog from "pages/dataInjection/serviceLog/create/vpc/CreateVPC";
import ESDomainList from "pages/clusters/domain/DomainList";
import ESDomainDetail from "pages/clusters/domain/DomainDetail";
import NginxForOpenSearch from "pages/clusters/domain/NginxForOpenSearch";
import CreateRDS from "pages/dataInjection/serviceLog/create/rds/CreateRDS";
import CreateCloudFront from "pages/dataInjection/serviceLog/create/cloudfront/CreateCloudFront";
import CreateLambda from "pages/dataInjection/serviceLog/create/lambda/CreateLambda";
import ApplicationLog from "pages/dataInjection/applicationLog/ApplicationLog";
import LogConfig from "pages/resources/logConfig/LogConfig";
import InstanceGroupList from "pages/resources/instanceGroup/InstanceGroupList";
import ConfigDetail from "pages/resources/logConfig/ConfigDetail";
import CreateLogConfig from "pages/resources/logConfig/CreateLogConfig";
import EditLogConfig from "pages/resources/logConfig/EditLogConfig";
import InstanceGroupDetail from "pages/resources/instanceGroup/InstanceGroupDetail";
import CreateInstanceGroup from "pages/resources/instanceGroup/create/CreateInstanceGroup";
import ApplicationLogDetail from "pages/dataInjection/applicationLog/ApplicationLogDetail";
import CrossAccountList from "pages/resources/crossAccount/CrossAccountList";
import LinkAnAccount from "pages/resources/crossAccount/LinkAnAccount";

import ServiceLogDetail from "pages/dataInjection/serviceLog/ServiceLogDetail";
import LoggingEvents from "pages/loggingEvents/EventList";
import DomainAlarm from "pages/clusters/domain/DomainAlarm";
import EksLogList from "pages/containers/eksLog/EksLogList";
import ImportEksCluster from "pages/containers/eksLog/create/ImportEksCluster";
import EksLogDetail from "pages/containers/eksLog/EksLogDetail";
import EksLogIngest from "pages/containers/eksLog/createIngestion/EksLogIngest";
import EksIngestionDetail from "pages/dataInjection/ingestiondetail/EksIngestionDetail";
import CreateConfig from "pages/dataInjection/serviceLog/create/config/CreateConfig";
import CrossAccountDetail from "pages/resources/crossAccount/CrossAccountDetail";
import AppIngestionDetail from "pages/dataInjection/ingestiondetail/AppIngestionDetail";
import { useTranslation } from "react-i18next";
import SelectLogSource from "pages/dataInjection/applicationLog/SelectLogSource";
import AppLogCreateEC2 from "pages/dataInjection/applicationLog/create/ec2/CreateEC2";
import OnlySyslogIngestion from "pages/dataInjection/applicationLog/create/syslog/OnlyCreateSyslogIngestion";
import "@aws-amplify/ui-react/styles.css";
import { GrafanaList } from "pages/lightEngine/grafana/GrafanaList";
import { ImportGrafana } from "pages/lightEngine/grafana/importGrafana/ImportGrafana";
import { UpdateGrafana } from "pages/lightEngine/grafana/importGrafana/UpdateGrafana";
import CommonLayout from "pages/layout/CommonLayout";
import { ApplicationLogImport } from "pages/dataInjection/applicationLog/ApplicationLogImport";
import ApplicationLogEdit from "pages/dataInjection/applicationLog/ApplicationLogEdit";

const AppRouter: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Router>
      <main className="lh-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/clusters/opensearch-domains"
            element={<ESDomainList />}
          />
          <Route
            path="/clusters/opensearch-domains/detail/:id"
            element={<ESDomainDetail />}
          />
          <Route
            path="/clusters/opensearch-domains/detail/:name/:id/access-proxy"
            element={<NginxForOpenSearch />}
          />
          <Route
            path="/clusters/opensearch-domains/detail/:name/:id/create-alarm"
            element={<DomainAlarm />}
          />
          <Route
            path="/clusters/import-opensearch-cluster"
            element={<ImportOpenSearchCluster />}
          />
          <Route path="/log-pipeline/service-log" element={<ServiceLog />} />
          <Route
            path="/log-pipeline/service-log/detail/:id"
            element={<ServiceLogDetail />}
          />
          <Route
            path="/log-pipeline/application-log/create"
            element={<SelectLogSource />}
          />
          <Route
            path="/log-pipeline/application-log/create/ec2"
            element={<AppLogCreateEC2 />}
          />
          <Route
            path="/log-pipeline/application-log/create/s3"
            element={<AppLogCreateS3 />}
          />
          <Route
            path="/log-pipeline/application-log/create/syslog"
            element={<AppLogCreateSyslog />}
          />
          <Route
            path="/log-pipeline/application-log/create/eks"
            element={<AppLogCreateEKS />}
          />
          <Route
            path="/log-pipeline/service-log/create"
            element={<ServiceLogCreateChooseType />}
          />
          <Route
            path="/log-pipeline/service-log/create/s3"
            element={<CreateS3 />}
          />
          <Route
            path="/log-pipeline/service-log/create/cloudtrail"
            element={<CreateCloudTrail />}
          />
          <Route
            path="/log-pipeline/service-log/create/rds"
            element={<CreateRDS />}
          />
          <Route
            path="/log-pipeline/service-log/create/cloudfront"
            element={<CreateCloudFront />}
          />
          <Route
            path="/log-pipeline/service-log/create/lambda"
            element={<CreateLambda />}
          />
          <Route
            path="/log-pipeline/service-log/create/elb"
            element={<CreateELB />}
          />
          <Route
            path="/log-pipeline/service-log/create/waf"
            element={<CreateWAF />}
          />
          <Route
            path="/log-pipeline/service-log/create/vpclogs"
            element={<CreateVPCLog />}
          />
          <Route
            path="/log-pipeline/service-log/create/config"
            element={<CreateConfig />}
          />
          {/* Application Log Router Start */}
          <Route
            path="/log-pipeline/application-log"
            element={<ApplicationLog />}
          />
          <Route
            path="/log-pipeline/application-log/detail/:id"
            element={<ApplicationLogDetail />}
          />
          <Route
            path="/log-pipeline/application-log/edit/:id"
            element={<ApplicationLogEdit />}
          />
          <Route
            path="/log-pipeline/application-log/detail/:id/create-ingestion-instance"
            element={<AppLogCreateEC2 />}
          />
          <Route
            path="/log-pipeline/application-log/detail/:id/create-ingestion-eks"
            element={<AppLogCreateEKS />}
          />
          <Route
            path="/log-pipeline/application-log/detail/:id/create-ingestion-syslog"
            element={<OnlySyslogIngestion />}
          />
          <Route
            path="/log-pipeline/application-log/ingestion/detail/:id"
            element={<AppIngestionDetail />}
          />
          <Route
            path="/log-pipeline/application-log/import"
            element={<ApplicationLogImport />}
          />
          {/* Application Log Router End */}

          {/* EKS Log Router Start */}
          <Route path="/containers/eks-log" element={<EksLogList />} />
          <Route
            path="/containers/eks-log/detail/:id/"
            element={<EksLogDetail />}
          />
          <Route
            path="/containers/eks-log/detail/:id/:type"
            element={<EksLogDetail />}
          />
          <Route
            path="/containers/eks-log/create"
            element={<ImportEksCluster />}
          />
          <Route
            path="/containers/eks-log/:id/ingestion"
            element={<EksLogIngest />}
          />
          <Route
            path="/containers/eks-log/:eksId/ingestion/detail/:id"
            element={<EksIngestionDetail />}
          />
          {/* EKS Log Router End */}

          {/* Instance Group Router Start */}
          <Route
            path="/resources/instance-group"
            element={<InstanceGroupList />}
          />
          <Route
            path="/resources/instance-group/detail/:id"
            element={<InstanceGroupDetail />}
          />
          <Route
            path="/resources/instance-group/create"
            element={<CreateInstanceGroup />}
          />
          {/* Instance Group Router End */}

          {/* Log Config Router Start */}
          <Route path="/resources/log-config" element={<LogConfig />} />
          <Route
            path="/resources/log-config/detail/:id"
            element={<ConfigDetail />}
          />
          <Route
            path="/resources/log-config/detail/:id/:version"
            element={<ConfigDetail />}
          />
          <Route
            path="/resources/log-config/detail/:id/revision/:revision/edit"
            element={<EditLogConfig />}
          />
          <Route
            path="/resources/log-config/create"
            element={<CreateLogConfig />}
          />

          {/* Log Config Router End */}

          {/* Member Account Router Start */}
          <Route
            path="/resources/cross-account"
            element={<CrossAccountList />}
          />
          <Route
            path="/resources/cross-account/link"
            element={<LinkAnAccount />}
          />
          <Route
            path="/resources/cross-account/detail/:id"
            element={<CrossAccountDetail />}
          />
          {/* Member Account Router End */}

          {/* Monitoring and Logging Router Start */}
          <Route
            path="/log-pipeline/log-events/detail/:type/:id/:logGroupName/:logStreamName"
            element={<LoggingEvents />}
          />
          {/* Monitoring and Logging Router End */}

          {/* Light Engine Router Start */}
          <Route path="/grafana/list" element={<GrafanaList />} />
          <Route path="/grafana/import" element={<ImportGrafana />} />
          <Route path="/grafana/edit/:id" element={<UpdateGrafana />} />
          {/* Monitoring and Logging Router End */}

          <Route
            path="*"
            element={
              <CommonLayout hideHelper hideMenu>
                <div className="not-found">
                  <h1>{t("pageNotFound")}</h1>
                  <Link to="/">
                    <Button>{t("home")}</Button>
                  </Link>
                </div>
              </CommonLayout>
            }
          />
        </Routes>
      </main>
    </Router>
  );
};

export default AppRouter;
