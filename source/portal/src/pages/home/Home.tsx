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
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import "./home.scss";
import Button from "components/Button";
import HeaderPanel from "components/HeaderPanel";
import { useNavigate } from "react-router";
import SideMenu from "components/SideMenu";
import {
  buildSolutionDocsLink,
  WORKSHOP_DOCS_LINK,
  OS_SERVICE_LINK,
  URL_FEEDBACK,
} from "assets/js/const";

enum CreateType {
  Domain = "Domain",
  ServicePipeline = "ServicePipeline",
  AppPipeline = "AppPipeline",
}

const HomeSelectOptions = [
  {
    title: "home:getStarted.domain",
    desc: "home:getStarted.domainDesc",
    value: CreateType.Domain,
  },
  {
    title: "home:getStarted.pipeline",
    desc: "home:getStarted.pipelineDesc",
    value: CreateType.ServicePipeline,
  },
  {
    title: "home:getStarted.appPipeline",
    desc: "home:getStarted.appPipelineDesc",
    value: CreateType.AppPipeline,
  },
];

const Home: React.FC = () => {
  const [createType, setCreateType] = useState<string>(CreateType.Domain);
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="home-header">
          <div className="home-header-content">
            <div className="home-header-tc">
              <div className="small-title">{t("home:analytics")}</div>
              <div className="main-title">{t("name")}</div>
              <div className="main-desc">{t("home:subTitle")}</div>
              <div className="small-desc">{t("home:subDesc")}</div>
            </div>
          </div>
        </div>
        <div className="home-content">
          <div className="home-content-left">
            <div className="home-box-title">{t("home:benefits.title")}</div>
            <div className="home-box">
              <div className="box-item">
                <div className="sub-title">
                  {t("home:benefits.consoleTitle")}
                </div>
                <div>{t("home:benefits.consoleDesc")}</div>
              </div>
              <div className="box-item">
                <div className="sub-title">
                  {t("home:benefits.ingestionTitle")}
                </div>
                <div>{t("home:benefits.ingestionDesc")}</div>
              </div>
              <div className="box-item">
                <div className="sub-title">
                  {t("home:benefits.codelessTitle")}
                </div>
                <div>{t("home:benefits.codelessDesc")}</div>
              </div>
              <div className="box-item">
                <div className="sub-title">
                  {t("home:benefits.insightTitle")}
                </div>
                <div>{t("home:benefits.insightDesc")}</div>
              </div>
            </div>

            <div className="home-box-title">{t("home:useCase.title")}</div>
            <div className="home-box">
              <div className="box-item">
                <div className="sub-title">
                  {t("home:useCase.troubleTitle")}
                </div>
                <div>{t("home:useCase.troubleDesc")}</div>
              </div>
              <div className="box-item">
                <div className="sub-title">
                  {t("home:useCase.complianceTitle")}
                </div>
                <div>{t("home:useCase.complianceDesc")}</div>
              </div>
            </div>
          </div>
          <div className="home-content-right">
            <div className="get-start-box">
              <div className="start-title">{t("home:getStarted.title")}</div>
              {HomeSelectOptions.map((element) => {
                return (
                  <div key={element.title} className="home-select-item">
                    <label className="flex">
                      <div>
                        <input
                          checked={createType === element.value}
                          onChange={(event) => {
                            setCreateType(event.target.value);
                          }}
                          value={element.value}
                          name="createType"
                          type="radio"
                        />
                      </div>
                      <div>
                        <div className="sel-title">{t(element.title)}</div>
                        <div className="sel-desc">{t(element.desc)}</div>
                      </div>
                    </label>
                  </div>
                );
              })}

              <div className="mt-10">
                {createType === CreateType.Domain && (
                  <Button
                    btnType="primary"
                    onClick={() => {
                      navigate("/clusters/import-opensearch-cluster");
                    }}
                  >
                    {t("button.importDomain")}
                  </Button>
                )}
                {createType === CreateType.ServicePipeline && (
                  <Button
                    btnType="primary"
                    onClick={() => {
                      navigate("/log-pipeline/service-log/create");
                    }}
                  >
                    {t("button.createIngestion")}
                  </Button>
                )}
                {createType === CreateType.AppPipeline && (
                  <Button
                    btnType="primary"
                    onClick={() => {
                      navigate("/log-pipeline/application-log/create");
                    }}
                  >
                    {t("button.createIngestion")}
                  </Button>
                )}
              </div>
            </div>

            <div>
              <HeaderPanel
                contentNoPadding
                title={t("home:gettingStarted.title")}
              >
                <ul className="home-link-ul">
                  <li>
                    <a
                      href={buildSolutionDocsLink("getting-started.html")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("home:gettingStarted.firstInSolution")}
                    </a>
                  </li>
                  <li>
                    <a
                      href={buildSolutionDocsLink(
                        "amazon-cloudtrail-logs.html"
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("home:gettingStarted.analyseLog")}
                    </a>
                  </li>
                  <li>
                    <a
                      href={buildSolutionDocsLink("json-format-logs.html")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("home:gettingStarted.workingWithJSON")}
                    </a>
                  </li>
                  <li>
                    <a
                      href={buildSolutionDocsLink("multi-line-text.html")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("home:gettingStarted.workingWithSpringBoot")}
                    </a>
                  </li>
                  <li>
                    <a
                      href={WORKSHOP_DOCS_LINK}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("home:gettingStarted.solutionWorkShop")}
                    </a>
                  </li>
                </ul>
              </HeaderPanel>
            </div>

            <div>
              <HeaderPanel
                contentNoPadding
                title={t("home:moreResource.title")}
              >
                <ul className="home-link-ul">
                  <li>
                    <a
                      href={buildSolutionDocsLink("")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("home:moreResource.doc")}
                    </a>
                  </li>
                  <li>
                    <a
                      href={buildSolutionDocsLink(
                        "frequently-asked-questions.html"
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("home:moreResource.faq")}
                    </a>
                  </li>
                  <li>
                    <a href={URL_FEEDBACK} target="_blank" rel="noreferrer">
                      {t("home:moreResource.issue")}
                    </a>
                  </li>
                  <li>
                    <a href={OS_SERVICE_LINK}>
                      {t("home:moreResource.openSearch")}
                    </a>
                  </li>
                </ul>
              </HeaderPanel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
