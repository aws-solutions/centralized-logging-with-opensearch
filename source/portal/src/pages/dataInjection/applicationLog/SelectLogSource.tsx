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
import IMAGE_SL_Amazon_EC2 from "assets/images/type/amazon_ec2.svg";
import IMAGE_SL_Amazon_EKS from "assets/images/type/amazon_eks.svg";
import IMAGE_SL_Amazon_S3_2 from "assets/images/type/amazon_s3_2.svg";
import IMAGE_SL_SYSLOG from "assets/images/type/syslog.svg";
import IMAGE_SL_SYSLOG_ARCH from "assets/images/type/syslog_arch.svg";
import IMAGE_SL_Amazon_EKS_ARCH from "assets/images/type/amazon_eks_arch.svg";
import IMAGE_SL_Amazon_EC2_ARCH from "assets/images/type/amazon_ec2_arch.svg";
import IMAGE_SL_Amazon_S3_ARCH_ONE_TIME from "assets/images/type/s3-source-one-time.svg";
import IMAGE_SL_Amazon_S3_ARCH_ON_GOING from "assets/images/type/s3-source-on-going.svg";

import { AppLogSourceType } from "assets/js/const";
import classNames from "classnames";
import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Breadcrumb from "components/Breadcrumb";
import Button from "components/Button";
import ExtLink from "components/ExtLink";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { ActionType } from "reducer/appReducer";
import { AntTab, AntTabs, TabPanel } from "components/Tab";
import { identity } from "lodash";

const AppLogSourceMap = {
  [AppLogSourceType.EC2]: {
    value: AppLogSourceType.EC2,
    name: "applog:logSourceDesc.ec2.title",
    descLink: {
      href: "https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/prerequisites-2.html#amazon-ec2-instance-group",
      i18nKey: "applog:logSourceDesc.ec2.instanceGroup",
    },
    img: IMAGE_SL_Amazon_EC2,
    archImg: IMAGE_SL_Amazon_EC2_ARCH,
    disabled: false,
  },
  [AppLogSourceType.EKS]: {
    value: AppLogSourceType.EKS,
    name: "applog:logSourceDesc.eks.title",
    descLink: { href: "", i18nKey: "" },
    img: IMAGE_SL_Amazon_EKS,
    archImg: IMAGE_SL_Amazon_EKS_ARCH,
    disabled: false,
  },
  [AppLogSourceType.SYSLOG]: {
    value: AppLogSourceType.SYSLOG,
    name: "applog:logSourceDesc.syslog.title",
    descLink: { href: "", i18nKey: "" },
    img: IMAGE_SL_SYSLOG,
    archImg: IMAGE_SL_SYSLOG_ARCH,
    disabled: false,
  },
  [AppLogSourceType.S3]: {
    value: AppLogSourceType.S3,
    name: "applog:logSourceDesc.s3.title",
    descLink: { href: "", i18nKey: "" },
    img: IMAGE_SL_Amazon_S3_2,
    archImg: "",
    disabled: false,
  },
};

const AppLogSourceList = [
  AppLogSourceMap[AppLogSourceType.EC2],
  AppLogSourceMap[AppLogSourceType.EKS],
  AppLogSourceMap[AppLogSourceType.S3],
  AppLogSourceMap[AppLogSourceType.SYSLOG],
];

interface LogSourceDescProps {
  type: AppLogSourceType;
}

const LogSourceDesc: React.FC<LogSourceDescProps> = (
  props: LogSourceDescProps
) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const { type } = props;
  return (
    <div>
      <div className="ingest-desc-title">
        {t(`applog:logSourceDesc.${type}.title`)}
      </div>
      <div className="ingest-desc-desc"></div>
      {AppLogSourceMap[type].descLink.i18nKey && (
        <ExtLink to={AppLogSourceMap[type].descLink.href}>
          {t(AppLogSourceMap[type].descLink.i18nKey)}
        </ExtLink>
      )}
      {t(`applog:logSourceDesc.${type}.desc`)}
      <div>
        <ul>
          <li>{t(`applog:logSourceDesc.${type}.li1`)}</li>
          <li>{t(`applog:logSourceDesc.${type}.li2`)}</li>
          <li>{t(`applog:logSourceDesc.${type}.li3`)}</li>
        </ul>
      </div>
      <div className="ingest-desc-title">
        {t(`applog:logSourceDesc.${type}.arch.title`)}
      </div>
      <div className="ingest-desc-desc">
        {t(`applog:logSourceDesc.${type}.arch.desc`)}
      </div>
      {type !== AppLogSourceType.S3 && (
        <div className="mt-10">
          <img
            className="img-border"
            alt="architecture"
            width="80%"
            src={AppLogSourceMap[type].archImg}
          />
        </div>
      )}
      {type === AppLogSourceType.S3 && (
        <React.Fragment>
          <AntTabs
            value={activeTab}
            onChange={(event, newTab) => {
              setActiveTab(newTab);
            }}
          >
            <AntTab label={t("applog:logSourceDesc.s3.step1.onGoing")} />
            <AntTab label={t("applog:logSourceDesc.s3.step1.oneTimeLoad")} />
          </AntTabs>
          <TabPanel value={activeTab} index={0}>
            <div className="mt-10">
              <img
                className="img-border"
                alt="architecture"
                width="80%"
                src={IMAGE_SL_Amazon_S3_ARCH_ON_GOING}
              />
            </div>
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <div className="mt-10">
              <img
                className="img-border"
                alt="architecture"
                width="80%"
                src={IMAGE_SL_Amazon_S3_ARCH_ONE_TIME}
              />
            </div>
          </TabPanel>
        </React.Fragment>
      )}
    </div>
  );
};

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

  const goToCreatePage = () => {
    navigate(`/log-pipeline/application-log/create/${appLogSourceType}`);
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
                    <LogSourceDesc type={appLogSourceType} />
                  </div>
                </HeaderPanel>
              </PagePanel>
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
