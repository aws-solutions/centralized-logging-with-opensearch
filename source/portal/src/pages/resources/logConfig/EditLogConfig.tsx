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
import LogConfigComp, { ExLogConf, PageType } from "../common/LogConfigComp";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { defaultStr } from "assets/js/utils";
import { appSyncRequestQuery } from "assets/js/request";
import { getLogConfig } from "graphql/queries";
import { useDispatch } from "react-redux";
import { AppDispatch } from "reducer/store";
import { setEditLogConfig } from "reducer/createLogConfig";
import { useLogConfig } from "assets/js/hooks/useLogConfig";
import { handleErrorMessage } from "assets/js/alert";

const EditLogConfig: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const logConfig = useLogConfig();
  const dispatch = useDispatch<AppDispatch>();
  const [loadingData, setLoadingData] = useState(false);
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("resource:config.name"),
      link: "/resources/log-config",
    },
    {
      name: defaultStr(logConfig?.data.name),
      link: "/resources/log-config/detail/" + id,
    },
    { name: t("resource:config.edit") },
  ];

  const getLogConfigById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getLogConfig, {
        id: encodeURIComponent(defaultStr(id)),
        version: 0,
      });
      const dataLogConfig: ExLogConf = resData.data.getLogConfig;
      if (!dataLogConfig.filterConfigMap) {
        dataLogConfig.filterConfigMap = {
          enabled: false,
          filters: [],
        };
      }
      dispatch(setEditLogConfig(dataLogConfig));
      setLoadingData(false);
    } catch (error: any) {
      setLoadingData(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  useEffect(() => {
    if (id) {
      getLogConfigById();
    }
  }, [id]);

  return (
    <LogConfigComp
      loadingData={loadingData}
      headerTitle={t("resource:config.name")}
      breadCrumbList={breadCrumbList}
      pageType={PageType.Edit}
      logConfig={logConfig}
    />
  );
};

export default EditLogConfig;
