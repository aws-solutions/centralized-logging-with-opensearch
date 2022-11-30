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
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Link, Route, Switch } from "react-router-dom";
import Button from "components/Button";
import Axios from "axios";
import Amplify, { Hub } from "aws-amplify";
import { AmplifyAuthenticator, AmplifySignIn } from "@aws-amplify/ui-react";
import { AuthState, onAuthUIStateChange } from "@aws-amplify/ui-components";

import Footer from "components/layout/footer";
import Home from "pages/home/Home";
import ServiceLog from "pages/dataInjection/serviceLog/ServiceLog";
import ServiceLogCreateChooseType from "pages/dataInjection/serviceLog/create/CreateChooseType";
import ImportOpenSearchCluster from "pages/clusters/importcluster/ImportCluster";
import CreateS3 from "pages/dataInjection/serviceLog/create/s3/CreateS3";
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
import CreatePipeline from "pages/dataInjection/applicationLog/create/CreatePipeline";
import CreateIngestion from "pages/dataInjection/applicationLog/createIngestion/CreateIngestion";
import CreateSysLogIngestion from "pages/dataInjection/applicationLog/createSyslogIngestion/CreateSysLogIngestion";
import CrossAccountList from "pages/resources/crossAccount/CrossAccountList";
import LinkAnAccount from "pages/resources/crossAccount/LinkAnAccount";

import { AMPLIFY_CONFIG_JSON, AMPLIFY_ZH_DICT } from "assets/js/const";
import { useDispatch } from "react-redux";
import { ActionType } from "reducer/appReducer";
import LoadingText from "components/LoadingText";
import ServiceLogDetail from "pages/dataInjection/serviceLog/ServiceLogDetail";
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
import { I18n } from "aws-amplify";
import CreateEKSIngestion from "pages/dataInjection/applicationLog/createEKSIngestion/CreateEKSIngestion";

export interface SignedInAppProps {
  oidcSignOut?: () => void;
}

const AmplifyLoginPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <AmplifyAuthenticator>
        <AmplifySignIn
          headerText={t("signin.signInToLogHub")}
          slot="sign-in"
          usernameAlias="username"
          submitButtonText={t("signin.signIn")}
          formFields={[
            {
              type: "username",
              label: t("signin.email"),
              placeholder: t("signin.inputEmail"),
              required: true,
              inputProps: { autoComplete: "off" },
            },
            {
              type: "password",
              label: t("signin.password"),
              placeholder: t("signin.inputPassword"),
              required: true,
              inputProps: { autoComplete: "off" },
            },
          ]}
        >
          <div slot="secondary-footer-content"></div>
        </AmplifySignIn>
      </AmplifyAuthenticator>
    </div>
  );
};

const SignedInApp: React.FC<SignedInAppProps> = (props: SignedInAppProps) => {
  return (
    <div className="App">
      <LHeader oidcSignOut={props.oidcSignOut} />
      <Router>
        <main className="lh-main">
          <Switch>
            <Route exact path="/" component={Home} />
            <Route
              exact
              path="/clusters/opensearch-domains"
              component={ESDomainList}
            />
            <Route
              exact
              path="/clusters/opensearch-domains/detail/:id"
              component={ESDomainDetail}
            />
            <Route
              exact
              path="/clusters/opensearch-domains/detail/:name/:id/access-proxy"
              component={NginxForOpenSearch}
            />
            <Route
              exact
              path="/clusters/opensearch-domains/detail/:name/:id/create-alarm"
              component={DomainAlarm}
            />
            <Route
              exact
              path="/clusters/import-opensearch-cluster"
              component={ImportOpenSearchCluster}
            />
            <Route
              exact
              path="/log-pipeline/service-log"
              component={ServiceLog}
            />
            <Route
              exact
              path="/log-pipeline/service-log/detail/:id"
              component={ServiceLogDetail}
            />
            <Route
              exact
              path="/log-pipeline/service-log/create"
              component={ServiceLogCreateChooseType}
            />
            <Route
              exact
              path="/log-pipeline/service-log/create/s3"
              component={CreateS3}
            />
            <Route
              exact
              path="/log-pipeline/service-log/create/cloudtrail"
              component={CreateCloudTrail}
            />
            <Route
              exact
              path="/log-pipeline/service-log/create/rds"
              component={CreateRDS}
            />
            <Route
              exact
              path="/log-pipeline/service-log/create/cloudfront"
              component={CreateCloudFront}
            />
            <Route
              exact
              path="/log-pipeline/service-log/create/lambda"
              component={CreateLambda}
            />
            <Route
              exact
              path="/log-pipeline/service-log/create/elb"
              component={CreateELB}
            />
            <Route
              exact
              path="/log-pipeline/service-log/create/waf"
              component={CreateWAF}
            />
            <Route
              exact
              path="/log-pipeline/service-log/create/vpclogs"
              component={CreateVPCLog}
            />
            <Route
              exact
              path="/log-pipeline/service-log/create/config"
              component={CreateConfig}
            />
            {/* Application Log Router Start */}
            <Route
              exact
              path="/log-pipeline/application-log"
              component={ApplicationLog}
            />
            <Route
              exact
              path="/log-pipeline/application-log/detail/:id"
              component={ApplicationLogDetail}
            />
            <Route
              exact
              path="/log-pipeline/application-log/create"
              component={CreatePipeline}
            />
            <Route
              exact
              path="/log-pipeline/application-log/detail/:id/create-ingestion-instance"
              component={CreateIngestion}
            />
            <Route
              exact
              path="/log-pipeline/application-log/detail/:id/create-ingestion-eks"
              component={CreateEKSIngestion}
            />
            <Route
              exact
              path="/log-pipeline/application-log/detail/:id/create-ingestion-syslog"
              component={CreateSysLogIngestion}
            />
            <Route
              exact
              path="/log-pipeline/application-log/ingestion/detail/:id"
              component={AppIngestionDetail}
            />
            {/* Application Log Router End */}

            {/* EKS Log Router Start */}
            <Route exact path="/containers/eks-log" component={EksLogList} />
            <Route
              exact
              path="/containers/eks-log/detail/:id/"
              component={EksLogDetail}
            />
            <Route
              exact
              path="/containers/eks-log/detail/:id/:type"
              component={EksLogDetail}
            />
            <Route
              exact
              path="/containers/eks-log/create"
              component={ImportEksCluster}
            />
            <Route
              exact
              path="/containers/eks-log/:id/ingestion"
              component={EksLogIngest}
            />
            <Route
              exact
              path="/containers/eks-log/:eksId/ingestion/detail/:id"
              component={EksIngestionDetail}
            />
            {/* EKS Log Router End */}

            {/* Instance Group Router Start */}
            <Route
              exact
              path="/resources/instance-group"
              component={InstanceGroupList}
            />
            <Route
              exact
              path="/resources/instance-group/detail/:id"
              component={InstanceGroupDetail}
            />
            <Route
              exact
              path="/resources/instance-group/create"
              component={CreateInstanceGroup}
            />
            {/* Instance Group Router End */}

            {/* Log Config Router Start */}
            <Route exact path="/resources/log-config" component={LogConfig} />
            <Route
              exact
              path="/resources/log-config/detail/:id"
              component={ConfigDetail}
            />
            <Route
              exact
              path="/resources/log-config/detail/:id/edit"
              component={EditLogConfig}
            />
            <Route
              exact
              path="/resources/log-config/create"
              component={CreateLogConfig}
            />

            {/* Log Config Router End */}

            {/* Member Account Router Start */}
            <Route
              exact
              path="/resources/cross-account"
              component={CrossAccountList}
            />
            <Route
              exact
              path="/resources/cross-account/link"
              component={LinkAnAccount}
            />
            <Route
              exact
              path="/resources/cross-account/detail/:id"
              component={CrossAccountDetail}
            />
            {/* Member Account Router End */}

            <Route
              render={() => (
                <div className="lh-main-content">
                  <div className="lh-container pd-20">
                    <div className="not-found">
                      <h1>Page Not Found</h1>
                      <Link to="/">
                        <Button>Home</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            />
          </Switch>
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
    }
  };
  Hub.listen("auth", (data) => {
    const { payload } = data;
    onAuthEvent(payload);
  });
  useEffect(() => {
    return onAuthUIStateChange((nextAuthState, authData: any) => {
      dispatch({
        type: ActionType.UPDATE_USER_EMAIL,
        email: authData?.attributes?.email,
      });
      setAuthState(nextAuthState);
    });
  }, []);

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

  // console.info("auth.activeNavigator:", auth.activeNavigator);
  // switch (auth.activeNavigator) {
  //   case "signinSilent":
  //     return <div>Signing you in...</div>;
  //   case "signoutRedirect":
  //     return <div>Signing you out...</div>;
  // }
  useEffect(() => {
    // the `return` is important - addAccessTokenExpiring() returns a cleanup function
    return auth?.events?.addAccessTokenExpiring((event) => {
      console.info("addAccessTokenExpiring:event:", event);
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
            {t("signin.signInToLogHub")}
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
      // Amplify.configure(configData);
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
      if (performance.navigation.type === 1) {
        // console.info("This page is reloaded");
        const timeStamp = new Date().getTime();
        setLoadingConfig(true);
        Axios.get(`/aws-exports.json?timestamp=${timeStamp}`).then((res) => {
          const configData: AmplifyConfigType = res.data;
          localStorage.setItem(AMPLIFY_CONFIG_JSON, JSON.stringify(res.data));
          initAuthentication(configData);
          setLoadingConfig(false);
        });
      } else {
        // console.info("This page is not reloaded");
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
