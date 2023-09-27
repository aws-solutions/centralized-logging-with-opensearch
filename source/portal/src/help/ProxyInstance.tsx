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
import { PROXY_INSTANCE_TYPE_AND_NUMBER_LIST } from "assets/js/const";
import React from "react";
import { useTranslation } from "react-i18next";

const ProxyInstance: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="gsui-help-container">
      <div className="gsui-help-content">
        <div>{t("info:proxyInstance.tips")}</div>
      </div>
      <div className="gsui-help-content">
        <table
          cellPadding={1}
          cellSpacing={1}
          width="100%"
          className="info-table"
        >
          <thead>
            <tr>
              <th>{t("info:proxyInstance.conUser")}</th>
              <th>{t("info:proxyInstance.instanceType")}</th>
              <th>{t("info:proxyInstance.proxyNumber")}</th>
            </tr>
          </thead>
          <tbody>
            {PROXY_INSTANCE_TYPE_AND_NUMBER_LIST.map((element) => {
              return (
                <tr key={element.instanceNumber}>
                  <td>{element.conUser}</td>
                  <td>{element.instanceType}</td>
                  <td>{element.instanceNumber}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProxyInstance;
