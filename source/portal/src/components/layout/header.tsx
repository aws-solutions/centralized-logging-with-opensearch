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
import SignOut from "components/SignOut";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { AmplifyConfigType, AppSyncAuthType } from "types";
import { AMPLIFY_CONFIG_JSON } from "assets/js/const";
import { RootState } from "reducer/reducers";
import { SignedInAppProps } from "router/SignedInApp";
import { User } from "oidc-client-ts";

const LHeader: React.FC<SignedInAppProps> = (props: SignedInAppProps) => {
  const { t } = useTranslation();
  const { oidcSignOut } = props;
  const { userEmail, amplifyConfig } = useSelector(
    (state: RootState) => state.app
  );
  const oidcSignOUt = () => {
    localStorage.removeItem(AMPLIFY_CONFIG_JSON);
    if (oidcSignOut) {
      oidcSignOut();
    }
    window.location.reload();
  };
  const [fullLogoutUrl, setFullLogoutUrl] = useState("");

  useEffect(() => {
    const configJSONObj: AmplifyConfigType = localStorage.getItem(
      AMPLIFY_CONFIG_JSON
    )
      ? JSON.parse(localStorage.getItem(AMPLIFY_CONFIG_JSON) ?? "")
      : {};

    const redirectUrl = configJSONObj.aws_oidc_customer_domain
      ? configJSONObj.aws_oidc_customer_domain
      : "https://" + configJSONObj.aws_cloudfront_url;
    if (configJSONObj.oidc_logout_url) {
      const queryParams = new URLSearchParams({
        client_id: configJSONObj.aws_oidc_client_id,
        id_token_hint:
          User.fromStorageString(
            localStorage.getItem(
              `oidc.user:${configJSONObj.aws_oidc_provider}:${configJSONObj.aws_oidc_client_id}`
            ) ?? ""
          )?.id_token ?? "",
        logout_uri: redirectUrl,
        redirect_uri: redirectUrl,
        post_logout_redirect_uri: redirectUrl,
      });
      const logoutUrl = new URL(configJSONObj.oidc_logout_url);
      logoutUrl.search = queryParams.toString();
      setFullLogoutUrl(logoutUrl.toString());
    }
  }, []);

  return (
    <header id="cloSignedHeader" className="lh-header">
      <div className="logo">{t("header.name")}</div>
      {
        <div className="user">
          {t("header.welcome")}, {userEmail} (
          {amplifyConfig.aws_appsync_authenticationType ===
            AppSyncAuthType.OPEN_ID && (
            <span
              role="none"
              data-testid="signout"
              className="cp sign-out"
              onClick={() => {
                if (fullLogoutUrl) {
                  oidcSignOUt?.(); //NOSONAR
                  window.location.href = fullLogoutUrl;
                }
                oidcSignOUt();
              }}
            >
              {t("header.logout")}
            </span>
          )}
          {amplifyConfig.aws_appsync_authenticationType ===
            AppSyncAuthType.AMAZON_COGNITO_USER_POOLS && (
            <SignOut className="cp sign-out" />
          )}
          )
        </div>
      }
      {}
    </header>
  );
};

export default LHeader;
