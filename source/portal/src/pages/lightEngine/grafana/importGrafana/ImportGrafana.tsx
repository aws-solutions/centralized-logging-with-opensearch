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
import CreateStep from "components/CreateStep";
import SideMenu from "components/SideMenu";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfigServer } from "./steps/ConfigServer";
import Button from "components/Button";
import { useNavigate } from "react-router-dom";
import { appSyncRequestMutation } from "assets/js/request";
import { createGrafana } from "graphql/mutations";
import { CreateTags } from "pages/dataInjection/common/CreateTags";
import { useTags } from "assets/js/hooks/useTags";
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

export const ImportGrafana = () => {
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
  const [curStep, setCurStep] = useState(0);
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

  const sideMenu = useMemo(() => <SideMenu />, []);
  const breadcrumb = useMemo(() => <Breadcrumb list={breadCrumbList} />, []);
  const createStep = useMemo(
    () => (
      <CreateStep
        list={[
          {
            name: t("lightengine:grafana.create.step.serverInfo"),
          },
          {
            name: t("lightengine:grafana.create.step.createTags"),
          },
        ]}
        activeIndex={curStep}
      />
    ),
    [curStep]
  );

  const tags = useTags();

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
        tags,
      });
      console.info("importRes:", importRes);
      navigate(`/grafana/list`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCreate(false);
    }
  };

  let nextButtonText = t("button.next");
  if (curStep === 0) {
    nextButtonText =
      grafanaState.status === DomainStatusCheckType.PASSED
        ? t("button.next")
        : t("button.saveAndValidate");
  }

  return (
    <div className="lh-main-content">
      {sideMenu}
      <div className="lh-container">
        <div className="lh-content">
          <div className="lh-import-cluster">
            {breadcrumb}
            <div className="create-wrapper">
              <div className="create-step">{createStep}</div>
              <div className="create-content m-w-1024">
                {curStep === 0 && (
                  <ConfigServer {...grafanaState} isNameReadOnly={false} />
                )}

                {curStep === 1 && <CreateTags />}
                <div className="button-action text-right">
                  <Button
                    btnType="text"
                    onClick={() => {
                      navigate("/grafana/list");
                    }}
                  >
                    {t("button.cancel")}
                  </Button>
                  {curStep > 0 && (
                    <Button
                      disabled={loadingCreate}
                      onClick={() => {
                        setCurStep((curStep) => {
                          return curStep - 1 < 0 ? 0 : curStep - 1;
                        });
                      }}
                    >
                      {t("button.previous")}
                    </Button>
                  )}

                  {curStep < 1 && (
                    <Button
                      loading={grafanaState.loading}
                      disabled={grafanaState.loading}
                      btnType="primary"
                      onClick={() => {
                        if (curStep === 0 && !isGrafanaValid) {
                          dispatch(grafana.actions.validateGrafana());
                          return;
                        }
                        if (curStep === 0) {
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
                          setCurStep(curStep + 1);
                        }
                      }}
                    >
                      {nextButtonText}
                    </Button>
                  )}

                  {curStep === 1 && (
                    <Button
                      btnType="primary"
                      onClick={confirmImportGrafana}
                      loading={loadingCreate}
                      disabled={loadingCreate}
                    >
                      {t("button.import")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
