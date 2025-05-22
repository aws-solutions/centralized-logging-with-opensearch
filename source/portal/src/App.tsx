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
import Axios from "axios";
import { Amplify, I18n } from "aws-amplify";

import { AMPLIFY_CONFIG_JSON } from "assets/js/const";
import { useDispatch } from "react-redux";
import { ActionType } from "reducer/appReducer";
import LoadingText from "components/LoadingText";
import { AmplifyConfigType, AppSyncAuthType } from "types";
import { AuthProvider } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";
import { useTranslation } from "react-i18next";
import "@aws-amplify/ui-react/styles.css";
import { defaultStr } from "assets/js/utils";
import OIDCAppRouter from "router/OIDCAppRouter";
import AmplifyAppRouter from "router/AmplifyAppRouter";

const App: React.FC = () => {
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [oidcConfig, setOidcConfig] = useState<any>();
  const [authType, setAuthType] = useState<AppSyncAuthType>(
    AppSyncAuthType.OPEN_ID
  );
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();

  const setAmplifyDict = async () => {
    await Axios.get(`/amplify-zh.json`)
      .then((res) => {
        I18n.putVocabularies({
          zh: res.data,
        });
        I18n.setLanguage(i18n.language);
      })
      .catch((error) => {
        console.info(error);
      });
  };

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

  const getConfigData = async () => {
    // Get config
    const timeStamp = new Date().getTime();
    const res = await Axios.get(`/aws-exports.json?timestamp=${timeStamp}`);
    const configData: AmplifyConfigType = res.data;
    if (res.data['aws_appsync_authenticationType'] === AppSyncAuthType.OPEN_ID && !configData.oidc_logout_url) {
      // Get oidc logout url from openid configuration
      await Axios.get(
        `${configData.aws_oidc_provider}/.well-known/openid-configuration`
      ).then((oidcRes) => {
        configData.oidc_logout_url = oidcRes.data.end_session_endpoint;
      });
    }
    localStorage.setItem(AMPLIFY_CONFIG_JSON, JSON.stringify(res.data));
    initAuthentication(configData);
    setLoadingConfig(false);
  };

  const setLocalStorageAfterLoad = async () => {
    if (localStorage.getItem(AMPLIFY_CONFIG_JSON)) {
      const configData = JSON.parse(
        defaultStr(localStorage.getItem(AMPLIFY_CONFIG_JSON))
      );
      initAuthentication(configData);
      setLoadingConfig(false);
    } else {
      setLoadingConfig(true);
      setAmplifyDict();
      await getConfigData();
    }
  };

  useEffect(() => {
    document.title = t("title");
    if (window.performance) {
      if (performance.getEntriesByType("navigation")?.[0]?.type === "reload") {
        setLoadingConfig(true);
        setAmplifyDict();
        getConfigData();
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
