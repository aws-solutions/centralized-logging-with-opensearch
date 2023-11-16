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

import Breadcrumb from "components/Breadcrumb";
import SideMenu from "components/SideMenu";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ConfigServer } from "./steps/ConfigServer";
import Button from "components/Button";
import { appSyncRequestMutation } from "assets/js/request";
import { updateGrafana } from "graphql/mutations";
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

export const UpdateGrafana = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const dispatch = useDispatch<any>();
  const grafanaState = useGrafana();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  useEffect(() => {
    const url = queryParams.get("url");
    const name = queryParams.get("name");
    dispatch(grafana.actions.nameChanged(decodeURIComponent(name ?? "")));
    dispatch(grafana.actions.urlChanged(decodeURIComponent(url ?? "")));
  }, [location.search]);

  const navigate = useNavigate();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("lightengine:grafana.name"), link: "/grafana/list" },
    {
      name: t("lightengine:grafana.edit"),
    },
  ];
  const [loadingCreate, setLoadingUpdate] = useState(false);

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

  const sideMenu = useMemo(() => <SideMenu />, []);
  const breadcrumb = useMemo(() => <Breadcrumb list={breadCrumbList} />, []);

  const confirmUpdateGrafana = async () => {
    if (!isGrafanaValid) {
      return;
    }
    try {
      setLoadingUpdate(true);
      const updateRes = await appSyncRequestMutation(updateGrafana, {
        id: decodeURIComponent(id ?? ""),
        url: grafanaState.grafanaUrl,
        token: grafanaState.grafanaToken,
      });
      console.info("updateRes:", updateRes);
      navigate(`/grafana/list`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingUpdate(false);
    }
  };

  const nextButtonText =
    grafanaState.status === DomainStatusCheckType.PASSED
      ? t("button.save")
      : t("button.validate");

  return (
    <div className="lh-main-content">
      {sideMenu}
      <div className="lh-container">
        <div className="lh-content">
          <div className="lh-import-cluster">
            {breadcrumb}
            <div className="create-wrapper">
              <div className="create-content m-w-1024">
                <ConfigServer {...grafanaState} isNameReadOnly={true} />
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
                    loading={loadingCreate || grafanaState.loading}
                    disabled={loadingCreate || grafanaState.loading}
                    btnType="primary"
                    onClick={() => {
                      if (!isGrafanaValid) {
                        dispatch(grafana.actions.validateGrafana());
                        return;
                      }
                      console.log("grafanaState:", grafanaState)
                      if (
                        grafanaState.status ===
                        DomainStatusCheckType.NOT_STARTED
                      ) {
                        dispatch(
                          validateGrafanaConnection({
                            url: grafanaState.grafanaUrl,
                            token: grafanaState.grafanaToken,
                          })
                        );
                      }
                      if (
                        grafanaState.status === DomainStatusCheckType.PASSED
                      ) {
                        confirmUpdateGrafana();
                      }
                    }}
                  >
                    {nextButtonText}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
