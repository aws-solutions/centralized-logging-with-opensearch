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
import React from "react";
import { Auth } from "aws-amplify";
import { AMPLIFY_CONFIG_JSON } from "assets/js/const";
import { useTranslation } from "react-i18next";

type propsType = {
  className?: string;
};

const SignOut: React.FC<propsType> = (props: propsType) => {
  const { t } = useTranslation();
  const signOut = async () => {
    localStorage.removeItem(AMPLIFY_CONFIG_JSON);
    await Auth.signOut({ global: true });
    window.location.reload();
  };

  return (
    <span className={props.className} onClick={signOut}>
      {t("header.logout")}
    </span>
  );
};

export default SignOut;
