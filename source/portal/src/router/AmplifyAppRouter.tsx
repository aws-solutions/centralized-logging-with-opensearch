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
import { Auth, Hub } from "aws-amplify";
import { AuthState, onAuthUIStateChange } from "@aws-amplify/ui-components";

import { AMPLIFY_CONFIG_JSON } from "assets/js/const";
import { useDispatch } from "react-redux";
import { ActionType } from "reducer/appReducer";
import "@aws-amplify/ui-react/styles.css";
import SignedInApp from "./SignedInApp";
import AmplifyLoginPage from "./AmplifyLoginPage";
import { useTranslation } from "react-i18next";
import { Alert } from "assets/js/alert";

const AmplifyAppRouter: React.FC = () => {
  const { t } = useTranslation();
  const [authState, setAuthState] = useState<AuthState>();

  const dispatch = useDispatch();
  const onAuthEvent = (payload: any) => {
    if (payload?.data?.code === "ResourceNotFoundException") {
      window.localStorage.removeItem(AMPLIFY_CONFIG_JSON);
      window.location.reload();
    } else if (payload?.event === "tokenRefresh_failure") {
      const headerElement = document.getElementById("cloSignedHeader");
      if (headerElement) {
        Alert(t("signin.reSignInDesc"), t("signin.reSignIn"), "warning", true);
      }
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
          console.info(error?.message);
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

export default AmplifyAppRouter;
