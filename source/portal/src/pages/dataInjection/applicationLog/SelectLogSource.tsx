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
import { AppLogSourceType } from "assets/js/const";
import classNames from "classnames";
import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Breadcrumb from "components/Breadcrumb";
import Button from "components/Button";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { ActionType } from "reducer/appReducer";
import { identity } from "lodash";
import { AnalyticEngineTypes } from "../serviceLog/create/common/SpecifyAnalyticsEngine";
import { SelectAnalyticsEngine } from "../common/SelectAnalyticsEngine";
import { PipelineType } from "API";
import { AppLogSourceMap } from "./common/AppPipelineDesc";

const AppLogSourceList = [
  AppLogSourceMap[AppLogSourceType.EC2],
  AppLogSourceMap[AppLogSourceType.EKS],
  AppLogSourceMap[AppLogSourceType.S3],
  AppLogSourceMap[AppLogSourceType.SYSLOG],
];

const SelectLogSource: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("applog:name"),
      link: "/log-pipeline/application-log",
    },
    { name: t("applog:selectLogSource.name") },
  ];
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [appLogSourceType, setAppLogSourceType] = useState(
    AppLogSourceType.EC2
  );
  const [engineType, setEngineType] = useState(AnalyticEngineTypes.OPENSEARCH);

  const goToCreatePage = () => {
    navigate(`/log-pipeline/application-log/create/${appLogSourceType}`);
    navigate(
      `/log-pipeline/application-log/create/${appLogSourceType}?engineType=${engineType}`
    );
  };

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />
            <div className="m-w-1024">
              <PagePanel title={t("applog:selectLogSource.name")}>
                <HeaderPanel title={t("applog:selectLogSource.logSources")}>
                  <div>
                    <div className="service-item-list">
                      {AppLogSourceList.map((element, index) => {
                        return (
                          <label key={identity(index)}>
                            <div
                              className={classNames("service-item", {
                                active: element.value === appLogSourceType,
                                disabled: element.disabled,
                              })}
                            >
                              <div className="name">
                                <input
                                  disabled={element.disabled}
                                  onChange={() => {
                                    console.info("changed");
                                  }}
                                  onClick={() => {
                                    setAppLogSourceType(element.value);
                                    setEngineType(
                                      AnalyticEngineTypes.OPENSEARCH
                                    );
                                  }}
                                  checked={element.value === appLogSourceType}
                                  name="service"
                                  type="radio"
                                />{" "}
                                {t(element.name)}
                              </div>
                              <div className="image">
                                <img
                                  width="64"
                                  alt={element.name}
                                  src={element.img}
                                />
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </HeaderPanel>
              </PagePanel>
              <SelectAnalyticsEngine
                pipelineType={PipelineType.APP}
                appLogType={appLogSourceType}
                engineType={engineType}
                setEngineType={setEngineType}
              />
              <div className="button-action text-right">
                <Button
                  btnType="text"
                  onClick={() => {
                    navigate("/log-pipeline/application-log");
                  }}
                >
                  {t("button.cancel")}
                </Button>
                <Button
                  btnType="primary"
                  onClick={() => {
                    goToCreatePage();
                  }}
                >
                  {t("button.next")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default SelectLogSource;
