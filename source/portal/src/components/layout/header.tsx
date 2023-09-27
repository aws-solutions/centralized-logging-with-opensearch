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
import SignOut from "components/SignOut";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { AppSyncAuthType } from "types";
import { AMPLIFY_CONFIG_JSON } from "assets/js/const";
import { SignedInAppProps } from "App";
import { RootState } from "reducer/reducers";

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

  return (
    <header className="lh-header">
      <div className="logo">{t("header.name")}</div>
      {
        <div className="user">
          {t("header.welcome")}, {userEmail} (
          {amplifyConfig.aws_appsync_authenticationType ===
            AppSyncAuthType.OPEN_ID && (
            <span
              className="cp sign-out"
              onClick={() => {
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
