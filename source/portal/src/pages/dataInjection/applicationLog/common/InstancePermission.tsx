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
import Alert from "components/Alert";
import HeaderPanel from "components/HeaderPanel";
import React from "react";
import { useTranslation } from "react-i18next";
import Permission from "../detail/Permission";

const InstancePermission: React.FC = () => {
  const { t } = useTranslation();
  return (
    <HeaderPanel title={t("resource:group.detail.permissions")}>
      <div>
        <Alert content={t("applog:instancePermission.alertContent")} />
        <div className="mt-10">
          <Permission />
        </div>
      </div>
    </HeaderPanel>
  );
};

export default InstancePermission;
