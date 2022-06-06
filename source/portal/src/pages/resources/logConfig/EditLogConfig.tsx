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
import React, { useState, useEffect } from "react";
import { RouteComponentProps, useHistory } from "react-router-dom";
import Swal from "sweetalert2";
import SideMenu from "components/SideMenu";
import Breadcrumb from "components/Breadcrumb";
import Button from "components/Button";
import { getLogConf } from "graphql/queries";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import LoadingText from "components/LoadingText";
import { updateLogConf } from "graphql/mutations";
import HelpPanel from "components/HelpPanel";
import LogConfigComp, { ExLogConf, PageType } from "../common/LogConfigComp";
import { LogType, MultiLineLogParser } from "API";
import { INVALID } from "assets/js/const";
import {
  buildRegexFromApacheLog,
  buildRegexFromNginxLog,
  buildSpringBootRegExFromConfig,
} from "assets/js/utils";
import { useTranslation } from "react-i18next";

interface MatchParams {
  id: string;
  name: string;
}

const EditLogConfig: React.FC<RouteComponentProps<MatchParams>> = (
  props: RouteComponentProps<MatchParams>
) => {
  const id: string = props.match.params.id;
  const { t } = useTranslation();
  const history = useHistory();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("resource:config.name"),
      link: "/resources/log-config",
    },
    {
      name: id,
      link: "/resources/log-config/detail/" + id,
    },
    { name: t("resource:config.edit") },
  ];

  const [loadingData, setLoadingData] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [curConfig, setCurConfig] = useState<ExLogConf>({
    __typename: "LogConf",
    id: "",
    confName: "",
    logPath: "",
    logType: null,
    multilineLogParser: null,
    createdDt: null,
    userLogFormat: "",
    regularExpression: "",
    regularSpecs: [],
  });
  const [showNameRequiredError, setShowNameRequiredError] = useState(false);
  const [showTypeRequiedError, setShowTypeRequiedError] = useState(false);
  const [showUserLogFormatError, setShowUserLogFormatError] = useState(false);
  const [showSampleLogRequiredError, setShowSampleLogRequiredError] =
    useState(false);
  const [showSampleLogInvalidError, setShowSampleLogInvalidError] =
    useState(false);

  const getLogConfigById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getLogConf, {
        id: id,
      });
      console.info("resData:", resData);
      const dataLogConfig: ExLogConf = resData.data.getLogConf;
      setCurConfig(dataLogConfig);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  const updateLogConfig = async () => {
    const createLogConfigParam = curConfig;

    if (!curConfig.confName?.trim()) {
      setShowNameRequiredError(true);
      return;
    }

    if (!curConfig.logType) {
      setShowTypeRequiedError(true);
      return;
    }

    if (
      curConfig.logType === LogType.MultiLineText ||
      curConfig.logType === LogType.SingleLineText
    ) {
      if (!curConfig.userSampleLog?.trim()) {
        setShowSampleLogRequiredError(true);
        return;
      } else {
        setShowSampleLogRequiredError(false);
      }

      if (!curConfig.regularSpecs || curConfig.regularSpecs.length <= 0) {
        Swal.fire(
          t("oops"),
          t("resource:config.parsing.regexLogParseError"),
          "warning"
        );
        return;
      }
    }

    if (showSampleLogInvalidError) {
      return;
    }

    try {
      setLoadingUpdate(true);
      const updateRes = await appSyncRequestMutation(
        updateLogConf,
        createLogConfigParam
      );
      console.info("createRes:", updateRes);
      setLoadingUpdate(false);
      history.push({
        pathname: "/resources/log-config",
      });
    } catch (error) {
      setLoadingUpdate(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getLogConfigById();
  }, []);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />

            {loadingData ? (
              <LoadingText text="" />
            ) : (
              <div className="m-w-1024">
                <LogConfigComp
                  pageType={PageType.Edit}
                  headerTitle={t("resource:config.name")}
                  curConfig={curConfig}
                  showNameRequiredError={showNameRequiredError}
                  showTypeRequiedError={showTypeRequiedError}
                  userLogFormatError={showUserLogFormatError}
                  sampleLogRequiredError={showSampleLogRequiredError}
                  sampleLogInvalid={showSampleLogInvalidError}
                  changeSampleLogInvalid={(invalid) => {
                    setShowSampleLogInvalidError(invalid);
                  }}
                  changeLogConfName={(name: string) => {
                    setCurConfig((prev: ExLogConf) => {
                      return { ...prev, confName: name };
                    });
                  }}
                  changeLogConfPath={(path: string) => {
                    setCurConfig((prev: ExLogConf) => {
                      return {
                        ...prev,
                        logPath: path,
                      };
                    });
                  }}
                  changeLogType={(type: LogType) => {
                    setCurConfig((prev: ExLogConf) => {
                      return {
                        ...prev,
                        userLogFormat: "",
                        regularExpression: "",
                        multilineLogParser: undefined,
                        userSampleLog: "",
                        regularSpecs: [],
                        logType: type,
                      };
                    });
                  }}
                  changeLogParser={(parser) => {
                    setCurConfig((prev: ExLogConf) => {
                      return {
                        ...prev,
                        multilineLogParser: parser,
                        userLogFormat: "",
                        regularExpression: "",
                        userSampleLog: "",
                        regularSpecs: [],
                      };
                    });
                  }}
                  changeRegExpSpecs={(spec) => {
                    setCurConfig((prev: ExLogConf) => {
                      return { ...prev, regularSpecs: spec };
                    });
                  }}
                  changeUserSmapleLog={(log) => {
                    setCurConfig((prev: ExLogConf) => {
                      return { ...prev, userSampleLog: log };
                    });
                  }}
                  changeUserLogFormat={(format) => {
                    let tmpExp = "";
                    if (curConfig.logType === LogType.Nginx) {
                      tmpExp = buildRegexFromNginxLog(format, true);
                    }
                    if (curConfig.logType === LogType.Apache) {
                      tmpExp = buildRegexFromApacheLog(format);
                    }
                    if (
                      curConfig.logType === LogType.SingleLineText ||
                      (curConfig.logType === LogType.MultiLineText &&
                        curConfig.multilineLogParser ===
                          MultiLineLogParser.CUSTOM)
                    ) {
                      tmpExp = format;
                    }
                    if (
                      curConfig.multilineLogParser ===
                      MultiLineLogParser.JAVA_SPRING_BOOT
                    ) {
                      tmpExp = buildSpringBootRegExFromConfig(format);
                    }
                    if (curConfig.logType === LogType.Nginx) {
                      if (tmpExp === INVALID) {
                        setShowUserLogFormatError(true);
                      } else {
                        setShowUserLogFormatError(false);
                      }
                    }
                    if (curConfig.logType === LogType.Apache) {
                      if (tmpExp === INVALID) {
                        setShowUserLogFormatError(true);
                      } else {
                        setShowUserLogFormatError(false);
                      }
                    }
                    setCurConfig((prev: ExLogConf) => {
                      return {
                        ...prev,
                        userLogFormat: format,
                        regularExpression: tmpExp !== INVALID ? tmpExp : "",
                      };
                    });
                  }}
                />

                <div className="button-action text-right">
                  <Button
                    btnType="text"
                    onClick={() => {
                      history.push({
                        pathname: "/resources/log-config/detail/" + id,
                      });
                    }}
                  >
                    {t("button.cancel")}
                  </Button>
                  <Button
                    btnType="primary"
                    loading={loadingUpdate}
                    onClick={() => {
                      updateLogConfig();
                    }}
                  >
                    {t("button.save")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default EditLogConfig;
