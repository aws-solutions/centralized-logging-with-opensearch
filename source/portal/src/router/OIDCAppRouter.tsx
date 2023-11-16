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

import React, { useEffect } from "react";
import Button from "components/Button";

import { useDispatch } from "react-redux";
import { ActionType } from "reducer/appReducer";
import LoadingText from "components/LoadingText";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import "@aws-amplify/ui-react/styles.css";
import SignedInApp from "./SignedInApp";

const OIDCAppRouter: React.FC = () => {
  const auth = useAuth();
  const { t } = useTranslation();
  const dispatch = useDispatch();

  useEffect(() => {
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

export default OIDCAppRouter;
