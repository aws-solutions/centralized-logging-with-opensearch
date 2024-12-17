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
import { useNavigate } from "react-router-dom";
import classNames from "classnames";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import {
  ServiceLogList,
  ServiceLogType,
  ServiceLogTypeMap,
} from "assets/js/const";

import Button from "components/Button";
import { useDispatch, useSelector } from "react-redux";
import { ActionType } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import { identity } from "lodash";
import { SelectAnalyticsEngine } from "pages/dataInjection/common/SelectAnalyticsEngine";
import { DestinationType, PipelineType } from "API";
import {
  AmplifyConfigType,
  AnalyticEngineTypes,
  RDSIngestOption,
  WAFIngestOption,
} from "types";
import CommonLayout from "pages/layout/CommonLayout";
import ServicePipelineDesc from "./common/desc/ServicePipelineDesc";
import { RootState } from "reducer/reducers";

const disableLightEngineConditions: {
  [key in ServiceLogType]?: DestinationType | WAFIngestOption;
} = {
  [ServiceLogType.Amazon_CloudFront]: DestinationType.KDS,
  [ServiceLogType.Amazon_WAF]: WAFIngestOption.SampledRequest,
  [ServiceLogType.Amazon_VPCLogs]: DestinationType.CloudWatch,
  [ServiceLogType.Amazon_CloudTrail]: DestinationType.CloudWatch,
};

const CreateChooseType: React.FC = () => {
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("servicelog:name"),
      link: "/log-pipeline/service-log",
    },
    { name: t("servicelog:create.name") },
  ];
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const [logType, setLogType] = useState(ServiceLogType.Amazon_CloudFront);
  const [engineType, setEngineType] = useState(AnalyticEngineTypes.OPENSEARCH);
  const [ingestLogType, setIngestLogType] = useState<string>(
    DestinationType.S3
  );
  const [disableLightEngine, setDisableLightEngine] = useState(false);
  const goToCreatePage = () => {
    navigate(
      `/log-pipeline/service-log/create/${ServiceLogTypeMap[logType]}?engineType=${engineType}&ingestLogType=${ingestLogType}`
    );
  };

  useEffect(() => {
    dispatch({ type: ActionType.CLOSE_SIDE_MENU });
  }, []);

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="m-w-1024">
        <PagePanel
          title={t("servicelog:create.select")}
          desc={t("servicelog:create.desc")}
        >
          <HeaderPanel title={t("servicelog:create.awsServices")}>
            <div>
              <div className="service-item-list">
                {ServiceLogList.map((element, index) => {
                  return (
                    <label key={identity(index)}>
                      <div
                        className={classNames("service-item", {
                          active: element.value === logType,
                          disabled: element.disabled,
                        })}
                      >
                        <div className="name">
                          <input
                            data-testid={`engine-type-${element.value}`}
                            disabled={element.disabled}
                            onChange={() => {
                              console.info("changed");
                            }}
                            onClick={() => {
                              setDisableLightEngine(false);
                              setLogType(element.value);
                              setEngineType(AnalyticEngineTypes.OPENSEARCH);
                              switch (element.value) {
                                case ServiceLogType.Amazon_CloudFront:
                                  setIngestLogType(DestinationType.S3);
                                  break;
                                case ServiceLogType.Amazon_WAF:
                                  setIngestLogType(WAFIngestOption.FullRequest);
                                  break;
                                case ServiceLogType.Amazon_VPCLogs:
                                  setIngestLogType(DestinationType.S3);
                                  break;
                                case ServiceLogType.Amazon_CloudTrail:
                                  setIngestLogType(DestinationType.S3);
                                  break;
                                case ServiceLogType.Amazon_RDS:
                                  setIngestLogType(RDSIngestOption.MySQL);
                                  break;
                                default:
                                  break;
                              }
                            }}
                            checked={element.value === logType}
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
              <ServicePipelineDesc
                region={amplifyConfig.aws_project_region}
                logType={logType}
                ingestLogType={ingestLogType}
                changeIngestLogType={(type) => {
                  const shouldDisableLightEngine =
                    logType in disableLightEngineConditions &&
                    type === disableLightEngineConditions[logType];
                  if (shouldDisableLightEngine) {
                    setEngineType(AnalyticEngineTypes.OPENSEARCH);
                    setDisableLightEngine(true);
                  } else {
                    setDisableLightEngine(false);
                  }
                  setIngestLogType(type);
                }}
              />
            </div>
          </HeaderPanel>
          <SelectAnalyticsEngine
            pipelineType={PipelineType.SERVICE}
            svcLogType={logType}
            engineType={engineType}
            setEngineType={setEngineType}
            disableLightEngine={disableLightEngine}
            ingestLogType={ingestLogType}
          />
        </PagePanel>
        <div className="button-action text-right">
          <Button
            data-testid="cancel-button"
            btnType="text"
            onClick={() => {
              navigate(`/log-pipeline/service-log`);
            }}
          >
            {t("button.cancel")}
          </Button>
          <Button
            data-testid="next-button"
            btnType="primary"
            onClick={() => {
              goToCreatePage();
            }}
          >
            {t("button.next")}
          </Button>
        </div>
      </div>
    </CommonLayout>
  );
};

export default CreateChooseType;
