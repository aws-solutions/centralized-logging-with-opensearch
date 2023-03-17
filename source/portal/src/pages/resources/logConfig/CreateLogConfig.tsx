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
import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import Swal from "sweetalert2";
import SideMenu from "components/SideMenu";
import Breadcrumb from "components/Breadcrumb";
import Button from "components/Button";
import { appSyncRequestMutation } from "assets/js/request";
import { createLogConf } from "graphql/mutations";
import LogConfigComp, { ExLogConf, PageType } from "../common/LogConfigComp";
import { LogType, MultiLineLogParser, SyslogParser } from "API";
import {
  INVALID,
  RFC3164_DEFAULT_REGEX,
  RFC5424_DEFAULT_REGEX,
} from "assets/js/const";
import { getRegexAndTimeByConfigAndFormat } from "assets/js/utils";
import HelpPanel from "components/HelpPanel";
import { useTranslation } from "react-i18next";

const CreateLogConfig: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("resource:config.name"),
      link: "/resources/log-config",
    },
    { name: t("resource:config.create") },
  ];

  const [curConfig, setCurConfig] = useState<ExLogConf>({
    __typename: "LogConf",
    id: "",
    confName: "",
    logPath: "",
    logType: null,
    multilineLogParser: null,
    createdDt: null,
    userSampleLog: "",
    userLogFormat: "",
    regularExpression: "",
    regularSpecs: [],
    processorFilterRegex: {
      enable: false,
      filters: [],
    },
  });
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [showNameRequiredError, setShowNameRequiredError] = useState(false);
  const [showTypeRequiedError, setShowTypeRequiedError] = useState(false);
  const [showUserLogFormatError, setShowUserLogFormatError] = useState(false);
  const [showSampleLogRequiredError, setShowSampleLogRequiredError] =
    useState(false);
  const [showSampleLogInvalidError, setShowSampleLogInvalidError] =
    useState(false);

  const createLogConfig = async () => {
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

    const createLogConfigParam = curConfig;
    // set spec to empty when create nginx / apache
    if (
      curConfig.logType === LogType.Apache ||
      curConfig.logType === LogType.Nginx
    ) {
      createLogConfigParam.regularSpecs = [];
    }

    if (
      curConfig.logType === LogType.MultiLineText ||
      curConfig.logType === LogType.SingleLineText
    ) {
      createLogConfigParam.regularExpression = curConfig.regularExpression
        ?.trim()
        .replace(/[\n\t\r]/g, "");
      createLogConfigParam.userLogFormat = curConfig.userLogFormat
        ?.trim()
        .replace(/[\n\t\r]/g, "");
    }

    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createLogConf,
        createLogConfigParam
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      history.push({
        pathname: "/resources/log-config",
      });
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />
            <div className="m-w-1024">
              <LogConfigComp
                isLoading={false}
                pageType={PageType.New}
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
                  setShowNameRequiredError(false);
                  setCurConfig((prev: ExLogConf) => {
                    return { ...prev, confName: name };
                  });
                }}
                changeLogType={(type: LogType) => {
                  setShowTypeRequiedError(false);
                  setShowUserLogFormatError(false);
                  setShowSampleLogRequiredError(false);
                  setCurConfig((prev: ExLogConf) => {
                    return {
                      ...prev,
                      userLogFormat: "",
                      regularExpression:
                        type === LogType.SingleLineText ? "(?<log>.+)" : "",
                      multilineLogParser: undefined,
                      syslogParser: undefined,
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
                      regularExpression:
                        parser === MultiLineLogParser.CUSTOM
                          ? "(?<log>.+)"
                          : "",
                      userSampleLog: "",
                      regularSpecs: [],
                    };
                  });
                }}
                changeSyslogParser={(parser) => {
                  let tmpSyslogRegex = "";
                  if (parser === SyslogParser.RFC3164) {
                    tmpSyslogRegex = RFC3164_DEFAULT_REGEX;
                  } else if (parser === SyslogParser.RFC5424) {
                    tmpSyslogRegex = RFC5424_DEFAULT_REGEX;
                  }

                  setCurConfig((prev: ExLogConf) => {
                    return {
                      ...prev,
                      syslogParser: parser,
                      userLogFormat: "",
                      regularExpression: tmpSyslogRegex,
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
                changeSelectKeyList={(keyList) => {
                  setCurConfig((prev: ExLogConf) => {
                    return { ...prev, selectKeyList: keyList };
                  });
                }}
                changeRegexKeyList={(list) => {
                  setCurConfig((prev: ExLogConf) => {
                    return {
                      ...prev,
                      regexKeyList: list,
                    };
                  });
                }}
                changeFilterRegex={(filter) => {
                  setCurConfig((prev: ExLogConf) => {
                    return { ...prev, processorFilterRegex: filter };
                  });
                }}
                changeUserSmapleLog={(log) => {
                  if (log) {
                    setShowSampleLogRequiredError(false);
                  }
                  setCurConfig((prev: ExLogConf) => {
                    return { ...prev, regularSpecs: [], userSampleLog: log };
                  });
                }}
                changeTimeKey={(key) => {
                  setCurConfig((prev: ExLogConf) => {
                    return { ...prev, timeKey: key };
                  });
                }}
                changeTimeOffset={(offset) => {
                  setCurConfig((prev: ExLogConf) => {
                    return { ...prev, timeOffset: offset };
                  });
                }}
                changeUserLogFormat={(format) => {
                  const { tmpExp, tmpTimeExp } =
                    getRegexAndTimeByConfigAndFormat(curConfig, format);
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
                      timeRegularExpression: tmpTimeExp,
                    };
                  });
                }}
              />

              <div className="button-action text-right">
                <Button
                  btnType="text"
                  onClick={() => {
                    history.push({
                      pathname: "/resources/log-config",
                    });
                  }}
                >
                  {t("button.cancel")}
                </Button>
                <Button
                  btnType="primary"
                  loading={loadingCreate}
                  onClick={() => {
                    createLogConfig();
                  }}
                >
                  {t("button.create")}
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

export default CreateLogConfig;
