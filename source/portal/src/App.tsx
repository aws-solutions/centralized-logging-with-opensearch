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
import React, { useEffect, useState } from "react";
import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Button from "components/Button";
import Axios from "axios";
import { Amplify, Auth, Hub, I18n } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import { AuthState, onAuthUIStateChange } from "@aws-amplify/ui-components";

import Footer from "components/layout/footer";
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

import { AMPLIFY_CONFIG_JSON, AMPLIFY_ZH_DICT } from "assets/js/const";
import { useDispatch } from "react-redux";
import { ActionType } from "reducer/appReducer";
import LoadingText from "components/LoadingText";
import ServiceLogDetail from "pages/dataInjection/serviceLog/ServiceLogDetail";
import LoggingEvents from "pages/loggingEvents/EventList";
import DomainAlarm from "pages/clusters/domain/DomainAlarm";
import LHeader from "components/layout/header";
import { AmplifyConfigType, AppSyncAuthType } from "types";
import { AuthProvider, useAuth } from "react-oidc-context";
import EksLogList from "pages/containers/eksLog/EksLogList";
import ImportEksCluster from "pages/containers/eksLog/create/ImportEksCluster";
import EksLogDetail from "pages/containers/eksLog/EksLogDetail";
import EksLogIngest from "pages/containers/eksLog/createIngestion/EksLogIngest";
import EksIngestionDetail from "pages/dataInjection/ingestiondetail/EksIngestionDetail";
import { WebStorageStateStore } from "oidc-client-ts";
import CreateConfig from "pages/dataInjection/serviceLog/create/config/CreateConfig";
import CrossAccountDetail from "pages/resources/crossAccount/CrossAccountDetail";
import AppIngestionDetail from "pages/dataInjection/ingestiondetail/AppIngestionDetail";
import { useTranslation } from "react-i18next";
import SelectLogSource from "pages/dataInjection/applicationLog/SelectLogSource";
import AppLogCreateEC2 from "pages/dataInjection/applicationLog/create/ec2/CreateEC2";
import OnlySyslogIngestion from "pages/dataInjection/applicationLog/create/syslog/OnlyCreateSyslogIngestion";
import "@aws-amplify/ui-react/styles.css";

export interface SignedInAppProps {
  oidcSignOut?: () => void;
}

const loginComponents = {
  Header() {
    const { t } = useTranslation();
    return (
      <div className="clo-login-title">{t("signin.signInToSolution")}</div>
    );
  },
};

const AmplifyLoginPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="clo-login">
      <Authenticator
        hideSignUp
        components={loginComponents}
        formFields={{
          signIn: {
            username: {
              label: t("signin.email") || "",
              placeholder: t("signin.inputEmail") || "",
              isRequired: true,
            },
            password: {
              label: t("signin.password") || "",
              placeholder: t("signin.inputPassword") || "",
              isRequired: true,
            },
          },
        }}
      ></Authenticator>
    </div>
  );
};

const SignedInApp: React.FC<SignedInAppProps> = (props: SignedInAppProps) => {
  const { t } = useTranslation();
  return (
    <div className="App">
      <LHeader oidcSignOut={props.oidcSignOut} />
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
              path="/resources/log-config/detail/:id/edit"
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
            <Route
              path="*"
              element={
                <div className="lh-main-content">
                  <div className="lh-container pd-20">
                    <div className="not-found">
                      <h1>{t("pageNotFound")}</h1>
                      <Link to="/">
                        <Button>{t("home")}</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              }
            />
          </Routes>
        </main>
      </Router>
      <footer className="lh-footer">
        <Footer />
      </footer>
    </div>
  );
};

const AmplifyAppRouter: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>();

  const dispatch = useDispatch();
  const onAuthEvent = (payload: any) => {
    if (payload?.data?.code === "ResourceNotFoundException") {
      window.localStorage.removeItem(AMPLIFY_CONFIG_JSON);
      window.location.reload();
    } else {
      Auth?.currentAuthenticatedUser()
        .then((authData: any) => {
          dispatch({
            type: ActionType.UPDATE_USER_EMAIL,
            email: authData?.attributes?.email,
          });
          setAuthState(AuthState.SignedIn);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  };
  Hub.listen("auth", (data) => {
    const { payload } = data;
    onAuthEvent(payload);
  });

  useEffect(() => {
    if (authState === undefined) {
      Auth?.currentAuthenticatedUser()
        .then((authData: any) => {
          dispatch({
            type: ActionType.UPDATE_USER_EMAIL,
            email: authData?.attributes?.email,
          });
          setAuthState(AuthState.SignedIn);
        })
        .catch((error) => {
          console.error(error);
        });
    }
    return onAuthUIStateChange((nextAuthState, authData: any) => {
      setAuthState(nextAuthState);
      dispatch({
        type: ActionType.UPDATE_USER_EMAIL,
        email: authData?.attributes?.email,
      });
    });
  }, [authState]);

  return authState === AuthState.SignedIn ? (
    <SignedInApp />
  ) : (
    <AmplifyLoginPage />
  );
};

const OIDCAppRouter: React.FC = () => {
  const auth = useAuth();
  const { t } = useTranslation();
  const dispatch = useDispatch();

  useEffect(() => {
    // the `return` is important - addAccessTokenExpiring() returns a cleanup function
    return auth?.events?.addAccessTokenExpiring(() => {
      auth.signinSilent();
    });
  }, [auth.events, auth.signinSilent]);

  if (auth.isLoading) {
    return (
      <div className="pd-20 text-center">
        <LoadingText text={t("loading")} />
      </div>
    );
  }

  if (auth.error) {
    if (auth.error.message.startsWith("No matching state")) {
      window.location.href = "/";
      return null;
    }
    return <div>Oops... {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {
    dispatch({
      type: ActionType.UPDATE_USER_EMAIL,
      email: auth.user?.profile?.email,
    });
    return (
      <div>
        <SignedInApp
          oidcSignOut={() => {
            auth.removeUser();
          }}
        />
      </div>
    );
  }

  return (
    <div className="oidc-login">
      <div>
        <div className="title">{t("name")}</div>
      </div>
      {
        <div>
          <Button
            btnType="primary"
            onClick={() => {
              auth.signinRedirect();
            }}
          >
            {t("signin.signInToSolution")}
          </Button>
        </div>
      }
    </div>
  );
};

const App: React.FC = () => {
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [oidcConfig, setOidcConfig] = useState<any>();
  const [authType, setAuthType] = useState<AppSyncAuthType>(
    AppSyncAuthType.OPEN_ID
  );
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  I18n.putVocabularies(AMPLIFY_ZH_DICT);
  I18n.setLanguage(i18n.language);

  const initAuthentication = (configData: AmplifyConfigType) => {
    dispatch({
      type: ActionType.UPDATE_AMPLIFY_CONFIG,
      amplifyConfig: configData,
    });
    setAuthType(configData.aws_appsync_authenticationType);
    if (configData.aws_appsync_authenticationType === AppSyncAuthType.OPEN_ID) {
      const settings = {
        userStore: new WebStorageStateStore({ store: window.localStorage }),
        authority: configData.aws_oidc_provider,
        scope: "openid email profile",
        automaticSilentRenew: true,
        client_id: configData.aws_oidc_client_id,
        redirect_uri: configData.aws_oidc_customer_domain
          ? configData.aws_oidc_customer_domain
          : "https://" + configData.aws_cloudfront_url,
      };
      setOidcConfig(settings);
    } else {
      Amplify.configure(configData);
    }
  };

  const setLocalStorageAfterLoad = () => {
    if (localStorage.getItem(AMPLIFY_CONFIG_JSON)) {
      const configData = JSON.parse(
        localStorage.getItem(AMPLIFY_CONFIG_JSON) || ""
      );
      initAuthentication(configData);
      setLoadingConfig(false);
    } else {
      const timeStamp = new Date().getTime();
      setLoadingConfig(true);
      Axios.get(`/aws-exports.json?timestamp=${timeStamp}`).then((res) => {
        const configData: AmplifyConfigType = res.data;
        localStorage.setItem(AMPLIFY_CONFIG_JSON, JSON.stringify(res.data));
        initAuthentication(configData);
        setLoadingConfig(false);
      });
    }
  };

  useEffect(() => {
    document.title = t("title");
    if (window.performance) {
      if (performance.getEntriesByType("navigation")[0]?.type === "reload") {
        const timeStamp = new Date().getTime();
        setLoadingConfig(true);
        Axios.get(`/aws-exports.json?timestamp=${timeStamp}`).then((res) => {
          const configData: AmplifyConfigType = res.data;
          localStorage.setItem(AMPLIFY_CONFIG_JSON, JSON.stringify(res.data));
          initAuthentication(configData);
          setLoadingConfig(false);
        });
      } else {
        setLocalStorageAfterLoad();
      }
    } else {
      setLocalStorageAfterLoad();
    }
  }, []);

  if (loadingConfig) {
    return (
      <div className="pd-20 text-center">
        <LoadingText text={t("loading")} />
      </div>
    );
  }

  if (authType === AppSyncAuthType.OPEN_ID) {
    return (
      <AuthProvider {...oidcConfig}>
        <OIDCAppRouter />
      </AuthProvider>
    );
  }

  return <AmplifyAppRouter />;
};

export default App;
