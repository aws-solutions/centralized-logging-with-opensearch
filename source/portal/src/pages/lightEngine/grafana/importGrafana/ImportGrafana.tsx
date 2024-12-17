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

import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfigServer } from "./steps/ConfigServer";
import Button from "components/Button";
import { useNavigate } from "react-router-dom";
import { appSyncRequestMutation } from "assets/js/request";
import { createGrafana } from "graphql/mutations";
import {
  grafana,
  validateGrafanaConnection,
  validateGrafanaName,
  validateGrafanaToken,
  validateGrafanaUrl,
} from "reducer/grafana";
import { useDispatch } from "react-redux";
import { useGrafana } from "assets/js/hooks/useGrafana";
import { DomainStatusCheckType } from "API";
import CommonLayout from "pages/layout/CommonLayout";

export const ImportGrafana: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<any>();
  const grafanaState = useGrafana();

  const navigate = useNavigate();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("lightengine:grafana.name"), link: "/grafana/list" },
    {
      name: t("lightengine:grafana.import"),
    },
  ];
  const [loadingCreate, setLoadingCreate] = useState(false);

  const isGrafanaValid = useMemo(() => {
    return (
      validateGrafanaName(grafanaState.grafanaName) === "" &&
      validateGrafanaUrl(grafanaState.grafanaUrl) === "" &&
      validateGrafanaToken(grafanaState.grafanaToken) === ""
    );
  }, [
    grafanaState.grafanaName,
    grafanaState.grafanaUrl,
    grafanaState.grafanaToken,
  ]);

  const confirmImportGrafana = async () => {
    if (!isGrafanaValid) {
      return;
    }
    try {
      setLoadingCreate(true);
      const importRes = await appSyncRequestMutation(createGrafana, {
        name: grafanaState.grafanaName,
        url: grafanaState.grafanaUrl,
        token: grafanaState.grafanaToken,
      });
      console.info("importRes:", importRes);
      navigate(`/grafana/list`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCreate(false);
    }
  };

  const validateGrafana = () => {
    if (!isGrafanaValid) {
      dispatch(grafana.actions.validateGrafana());
      return;
    }
    dispatch(
      validateGrafanaConnection({
        url: grafanaState.grafanaUrl,
        token: grafanaState.grafanaToken,
      })
    );
  };

  useEffect(() => {
    if (grafanaState.status === DomainStatusCheckType.PASSED) {
      confirmImportGrafana();
    }
  }, [grafanaState.status]);

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-content m-w-1024">
        <ConfigServer {...grafanaState} isNameReadOnly={false} />
        <div className="button-action text-right">
          <Button
            btnType="text"
            onClick={() => {
              navigate("/grafana/list");
            }}
          >
            {t("button.cancel")}
          </Button>
          <Button
            btnType="primary"
            onClick={validateGrafana}
            loading={loadingCreate || grafanaState.loading}
            disabled={loadingCreate}
          >
            {t("button.validateAndImport")}
          </Button>
        </div>
      </div>
    </CommonLayout>
  );
};
