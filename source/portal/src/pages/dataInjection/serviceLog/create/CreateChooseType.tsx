/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import classNames from "classnames";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import {
  ServiceLogList,
  ServiceLogType,
  ServiceLogTypeMap,
} from "assets/js/const";

import Button from "components/Button";
import S3Desc from "./common/desc/S3Desc";
import RDSDesc from "./common/desc/RDSDesc";
import CloudTrailDesc from "./common/desc/CloudTrailDesc";
import CloudFrontDesc from "./common/desc/CloudFrontDesc";
import LambdaDesc from "./common/desc/LambdaDesc";
import ELBDesc from "./common/desc/ELBDesc";
import WAFDesc from "./common/desc/WAFDesc";
import ConfigDesc from "./common/desc/ConfigDesc";
import Breadcrumb from "components/Breadcrumb";
import { useDispatch } from "react-redux";
import { ActionType } from "reducer/appReducer";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import VPCDesc from "./common/desc/VPCDesc";

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
  const history = useHistory();
  const dispatch = useDispatch();

  const [logType, setLogType] = useState(ServiceLogType.Amazon_S3);

  const goToCreatePage = () => {
    console.info("ServiceLogTypeMap:", ServiceLogTypeMap);
    console.info("logType:", logType);
    history.push({
      pathname: `/log-pipeline/service-log/create/${ServiceLogTypeMap[logType]}`,
    });
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
              <PagePanel title={t("servicelog:create.select")}>
                <HeaderPanel title={t("servicelog:create.awsServices")}>
                  <div>
                    <div className="service-item-list">
                      {ServiceLogList.map((element, index) => {
                        return (
                          <label key={index}>
                            <div
                              className={classNames("service-item", {
                                active: element.value === logType,
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
                                    setLogType(element.value);
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
                    {logType === ServiceLogType.Amazon_S3 && <S3Desc />}
                    {logType === ServiceLogType.Amazon_RDS && <RDSDesc />}
                    {logType === ServiceLogType.Amazon_CloudTrail && (
                      <CloudTrailDesc />
                    )}
                    {logType === ServiceLogType.Amazon_CloudFront && (
                      <CloudFrontDesc />
                    )}
                    {logType === ServiceLogType.Amazon_Lambda && <LambdaDesc />}
                    {logType === ServiceLogType.Amazon_ELB && <ELBDesc />}
                    {logType === ServiceLogType.Amazon_WAF && <WAFDesc />}
                    {logType === ServiceLogType.Amazon_VPCLogs && <VPCDesc />}
                    {logType === ServiceLogType.Amazon_Config && <ConfigDesc />}
                  </div>
                </HeaderPanel>
              </PagePanel>
              <div className="button-action text-right">
                <Button
                  btnType="text"
                  onClick={() => {
                    history.push({
                      pathname: `/log-pipeline/service-log`,
                    });
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

export default CreateChooseType;
