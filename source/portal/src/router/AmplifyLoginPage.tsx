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
import { useTranslation } from "react-i18next";
import { Authenticator } from "@aws-amplify/ui-react";

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

export default AmplifyLoginPage;
