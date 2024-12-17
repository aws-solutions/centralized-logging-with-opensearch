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
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ConfigServer } from "./steps/ConfigServer";
import Button from "components/Button";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
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
import { DomainStatusCheckType, Grafana } from "API";
import CommonLayout from "pages/layout/CommonLayout";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import { getGrafana } from "graphql/queries";
import { defaultStr, formatLocalTime } from "assets/js/utils";

export const UpdateGrafana: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const dispatch = useDispatch<any>();
  const grafanaState = useGrafana();
  const [loadingGrafana, setLoadingGrafana] = useState(false);
  const [currentGrafana, setCurrentGrafana] = useState<Grafana>();

  const getGrafanaById = async () => {
    setLoadingGrafana(true);
    try {
      const res = await appSyncRequestQuery(getGrafana, { id });
      setCurrentGrafana(res.data.getGrafana);
      dispatch(
        grafana.actions.nameChanged(
          decodeURIComponent(defaultStr(res.data?.getGrafana?.name))
        )
      );
      dispatch(
        grafana.actions.urlChanged(
          decodeURIComponent(defaultStr(res.data?.getGrafana?.url))
        )
      );
    } catch (error) {
      console.info(error);
    } finally {
      setLoadingGrafana(false);
    }
  };

  useEffect(() => {
    if (id) {
      getGrafanaById();
    }
  }, [id]);

  const navigate = useNavigate();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("lightengine:grafana.name"), link: "/grafana/list" },
    {
      name: t("lightengine:grafana.edit"),
    },
  ];
  const [loadingUpdate, setLoadingUpdate] = useState(false);

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

  return (
    <CommonLayout loadingData={loadingGrafana} breadCrumbList={breadCrumbList}>
      <div className="create-wrapper">
        <div className="create-content m-w-1024">
          <HeaderWithValueLabel
            headerTitle={t("lightengine:grafana.create.generalConfig")}
            numberOfColumns={2}
            dataList={[
              {
                label: t("lightengine:grafana.create.name"),
                data: currentGrafana?.name,
              },
              {
                label: t("lightengine:grafana.create.created"),
                data: formatLocalTime(defaultStr(currentGrafana?.createdAt)),
              },
            ]}
          />

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
              loading={loadingUpdate || grafanaState.loading}
              disabled={loadingUpdate || grafanaState.loading}
              btnType="primary"
              onClick={() => {
                if (!isGrafanaValid) {
                  dispatch(grafana.actions.validateGrafana());
                  return;
                }
                console.log("grafanaState:", grafanaState);
                if (grafanaState.status === DomainStatusCheckType.NOT_STARTED) {
                  dispatch(
                    validateGrafanaConnection({
                      url: grafanaState.grafanaUrl,
                      token: grafanaState.grafanaToken,
                    })
                  );
                }
                if (grafanaState.status === DomainStatusCheckType.PASSED) {
                  confirmUpdateGrafana();
                }
              }}
            >
              {t("button.save")}
            </Button>
          </div>
        </div>
      </div>
    </CommonLayout>
  );
};
