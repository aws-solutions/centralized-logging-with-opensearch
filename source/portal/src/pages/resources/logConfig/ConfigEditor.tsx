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
import React, { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import SideMenu from "components/SideMenu";
import Breadcrumb from "components/Breadcrumb";
import Button from "components/Button";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import {
  createLogConfig as createLogConfigMutation,
  updateLogConfig as updateLogConfigMutation,
} from "graphql/mutations";
import LogConfigComp, { ExLogConf, PageType } from "../common/LogConfigComp";
import { LogType, MultiLineLogParser, SyslogParser } from "API";
import {
  INVALID,
  RFC3164_DEFAULT_REGEX,
  RFC5424_DEFAULT_REGEX,
} from "assets/js/const";
import {
  containsNonLatinCodepoints,
  getRegexAndTimeByConfigAndFormat,
} from "assets/js/utils";
import HelpPanel from "components/HelpPanel";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { handleErrorMessage } from "assets/js/alert";
import { SampleLogParsingRefType } from "../common/SampleLogParsing";
import { Validator } from "pages/comps/Validator";
import { BreadcrumbType } from "components/Breadcrumb/breadcrumb";
import { getLogConfig } from "graphql/queries";
import LoadingText from "components/LoadingText";

export const DEFAULT_MULTILINE_REGEX = "(?<log>.+)";

interface BreadCrumbListProps {
  pageType: PageType;
  breadCrumbList: BreadcrumbType[];
}

const LogConfigEditor: React.FC<BreadCrumbListProps> = (
  props: BreadCrumbListProps
) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { breadCrumbList, pageType } = props;

  const [curConfig, setCurConfig] = useState<ExLogConf>({
    __typename: "LogConfig",
    id: "",
    name: "",
    logType: null,
    multilineLogParser: null,
    createdAt: null,
    userSampleLog: "",
    userLogFormat: "",
    regex: "",
    regexFieldSpecs: [],
    filterConfigMap: {
      enabled: false,
      filters: [],
    },
    timeKey: "",
    timeOffset: "",
  });

  const editBreadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("resource:config.name"),
      link: "/resources/log-config",
    },
    {
      name: curConfig?.name || "",
      link: "/resources/log-config/detail/" + id,
    },
    { name: t("resource:config.edit") },
  ];

  const [loadingData, setLoadingData] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [showNameRequiredError, setShowNameRequiredError] = useState(false);
  const [showTypeRequiredError, setShowTypeRequiredError] = useState(false);
  const [showUserLogFormatError, setShowUserLogFormatError] = useState(false);
  const [showSampleLogRequiredError, setShowSampleLogRequiredError] =
    useState(false);
  const [showSampleLogInvalidError, setShowSampleLogInvalidError] =
    useState(false);
  const [sysLogParserError, setSysLogParserError] = useState(false);

  const sampleLogParsingRef = useRef<SampleLogParsingRefType>(null);

  const isSpringBoot = () => {
    return (
      curConfig.logType === LogType.MultiLineText &&
      curConfig.multilineLogParser === MultiLineLogParser.JAVA_SPRING_BOOT
    );
  };

  const isNeedCustomFormatType = () => {
    return (
      curConfig.logType === LogType.Apache ||
      curConfig.logType === LogType.Nginx ||
      isSpringBoot()
    );
  };

  const userLogFormatValidator = new Validator(() => {
    if (isNeedCustomFormatType() && curConfig.userLogFormat === "") {
      throw new Error(t("resource:config.parsing.userLogFormatNotEmpty") || "");
    }

    if (
      isSpringBoot() &&
      containsNonLatinCodepoints(curConfig.userLogFormat ?? "")
    ) {
      throw new Error(t("resource:config.parsing.userLogFormatError") || "");
    }
  });

  const regexValidator = new Validator(() => {
    if (curConfig.regex === "") {
      throw new Error(t("resource:config.parsing.regexMustNotBeEmpty") || "");
    }
  });

  const validateJSONAndSyslog = () => {
    if (curConfig.logType === LogType.JSON) {
      if (!curConfig.userSampleLog?.trim()) {
        setShowSampleLogRequiredError(true);
        return false;
      }
      if (!curConfig.jsonSchema) {
        Swal.fire(
          t("oops") || "",
          t("resource:config.parsing.regexLogParseError") || "",
          "warning"
        );
        return false;
      }
    }

    if (curConfig.logType === LogType.Syslog) {
      if (!curConfig.syslogParser) {
        setSysLogParserError(true);
        return false;
      }
    }

    if (
      curConfig.logType === LogType.Syslog &&
      curConfig.syslogParser === SyslogParser.CUSTOM &&
      !regexValidator.validate()
    ) {
      return false;
    }
    return true;
  };

  const validateParameters = () => {
    if (
      curConfig.logType === LogType.MultiLineText ||
      curConfig.logType === LogType.SingleLineText
    ) {
      if (!userLogFormatValidator.validate() || !regexValidator.validate()) {
        return false;
      }
      if (!curConfig.userSampleLog?.trim()) {
        setShowSampleLogRequiredError(true);
        return false;
      }

      if (!curConfig.regexFieldSpecs || curConfig.regexFieldSpecs.length <= 0) {
        Swal.fire(
          t("oops") || "",
          t("resource:config.parsing.regexLogParseError") || "",
          "warning"
        );
        return false;
      }
    }

    if (!validateJSONAndSyslog()) {
      return false;
    }

    if (showSampleLogInvalidError) {
      return false;
    }
    return true;
  };

  const checkParamInput = () => {
    if (
      sampleLogParsingRef.current &&
      !sampleLogParsingRef.current.validate()
    ) {
      return false;
    }

    if (!curConfig.name?.trim()) {
      setShowNameRequiredError(true);
      return false;
    }

    if (!curConfig.logType) {
      setShowTypeRequiredError(true);
      return false;
    }

    if (!validateParameters()) {
      return false;
    }

    return true;
  };

  const mutationLogConfig = async () => {
    if (!checkParamInput()) {
      return;
    }

    const createLogConfigParam = curConfig;
    // set spec to empty when create nginx / apache
    if (
      curConfig.logType === LogType.Apache ||
      curConfig.logType === LogType.Nginx
    ) {
      if (!userLogFormatValidator.validate()) {
        return;
      }
      createLogConfigParam.regexFieldSpecs = [];
    }

    if (
      curConfig.logType === LogType.MultiLineText ||
      curConfig.logType === LogType.SingleLineText
    ) {
      createLogConfigParam.regex = curConfig.regex
        ?.trim()
        .replace(/[\n\t\r]/g, "");
      createLogConfigParam.userLogFormat = curConfig.userLogFormat
        ?.trim()
        .replace(/[\n\t\r]/g, "");
    }

    if (curConfig.logType === LogType.JSON) {
      if (curConfig.jsonSchema) {
        createLogConfigParam.jsonSchema = JSON.stringify(curConfig.jsonSchema);
      }
    } else {
      createLogConfigParam.jsonSchema = undefined;
    }

    try {
      setLoadingUpdate(true);
      if (pageType === PageType.New) {
        const createRes = await appSyncRequestMutation(
          createLogConfigMutation,
          createLogConfigParam
        );
        console.info("createRes:", createRes);
      } else {
        const updateRes = await appSyncRequestMutation(
          updateLogConfigMutation,
          createLogConfigParam
        );
        console.info("updateRes:", updateRes);
      }
      navigate("/resources/log-config");
      setLoadingUpdate(false);
    } catch (error: any) {
      setLoadingUpdate(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  const getLogConfigById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getLogConfig, {
        id: id,
        version: 0,
      });
      const dataLogConfig: ExLogConf = resData.data.getLogConfig;
      if (!dataLogConfig.filterConfigMap) {
        dataLogConfig.filterConfigMap = {
          enabled: false,
          filters: [],
        };
      }
      dataLogConfig.regexKeyList = dataLogConfig.regexFieldSpecs as any;
      if (dataLogConfig.logType === LogType.JSON && dataLogConfig.jsonSchema) {
        dataLogConfig.jsonSchema = JSON.parse(dataLogConfig?.jsonSchema);
      }
      setCurConfig(dataLogConfig);
      setLoadingData(false);
    } catch (error: any) {
      setLoadingData(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  const convertJsonToRegexList = (json: any) => {
    const result: any = [];
    Object.keys(json).forEach((key) => {
      const item = {
        key: key,
        type: json[key].type,
        format: json[key].format,
        value: "",
        loadingCheck: false,
        showError: false,
        showSuccess: false,
        error: "",
      };
      result.push(item);
    });
    return result;
  };

  const updateJsonTimeKey = (json: any, keyName: string) => {
    Object.keys(json).forEach((key) => {
      if (Object.hasOwnProperty.call(json[key], "timeKey")) {
        // 将所有的 timeKey 设置为 false
        json[key].timeKey = false;
      }
    });
    // 如果找到了 keyName，就设置对应的 timeKey 为 true
    if (
      Object.hasOwnProperty.call(json, keyName) &&
      Object.hasOwnProperty.call(json[keyName], "timeKey")
    ) {
      json[keyName].timeKey = true;
    }
  };

  useEffect(() => {
    if (id) {
      getLogConfigById();
    }
  }, [id]);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb
              list={
                pageType === PageType.New ? breadCrumbList : editBreadCrumbList
              }
            />

            {id && loadingData ? (
              <LoadingText />
            ) : (
              <div className="m-w-1024">
                <LogConfigComp
                  sampleLogParsingRef={sampleLogParsingRef}
                  isLoading={false}
                  pageType={pageType}
                  headerTitle={t("resource:config.name")}
                  curConfig={curConfig}
                  showNameRequiredError={showNameRequiredError}
                  showTypeRequiedError={showTypeRequiredError}
                  userLogFormatError={showUserLogFormatError}
                  sampleLogRequiredError={showSampleLogRequiredError}
                  sampleLogInvalid={showSampleLogInvalidError}
                  syslogParserError={sysLogParserError}
                  userLogFormatErrorMsg={userLogFormatValidator.error}
                  regexErrorMsg={regexValidator.error}
                  changeSampleLogInvalid={(invalid) => {
                    setShowSampleLogInvalidError(invalid);
                  }}
                  changeLogConfName={(name: string) => {
                    setShowNameRequiredError(false);
                    setCurConfig((prev: ExLogConf) => {
                      return { ...prev, name };
                    });
                  }}
                  changeLogType={(type: LogType) => {
                    setShowTypeRequiredError(false);
                    setShowUserLogFormatError(false);
                    setShowSampleLogRequiredError(false);
                    setCurConfig((prev: ExLogConf) => {
                      return {
                        ...prev,
                        userLogFormat: "",
                        regex:
                          type === LogType.SingleLineText
                            ? DEFAULT_MULTILINE_REGEX
                            : "",
                        multilineLogParser: undefined,
                        syslogParser: undefined,
                        userSampleLog: "",
                        regexFieldSpecs: [],
                        logType: type,
                        timeKey: "",
                        jsonSchema: "",
                      };
                    });
                  }}
                  changeLogParser={(parser) => {
                    setCurConfig((prev: ExLogConf) => {
                      return {
                        ...prev,
                        multilineLogParser: parser,
                        userLogFormat: "",
                        regex:
                          parser === MultiLineLogParser.CUSTOM
                            ? DEFAULT_MULTILINE_REGEX
                            : "",
                        userSampleLog: "",
                        regexFieldSpecs: [],
                      };
                    });
                  }}
                  changeSyslogParser={(parser) => {
                    let tmpSyslogRegex = "";
                    setSysLogParserError(false);
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
                        regex: tmpSyslogRegex,
                        userSampleLog: "",
                        regexFieldSpecs: [],
                      };
                    });
                  }}
                  changeRegExpSpecs={(spec) => {
                    setCurConfig((prev: ExLogConf) => {
                      return { ...prev, regexFieldSpecs: spec };
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
                      return { ...prev, filterConfigMap: filter };
                    });
                  }}
                  changeUserSmapleLog={(log) => {
                    if (log) {
                      setShowSampleLogRequiredError(false);
                    }
                    setCurConfig((prev: ExLogConf) => {
                      return {
                        ...prev,
                        regexFieldSpecs: [],
                        userSampleLog: log,
                      };
                    });
                  }}
                  changeJSONSchema={(schema) => {
                    const tmpRegexList = convertJsonToRegexList(
                      schema.properties
                    );
                    setCurConfig((prev: ExLogConf) => {
                      return {
                        ...prev,
                        jsonSchema: schema,
                        regexKeyList: tmpRegexList,
                      };
                    });
                  }}
                  changeTimeKey={(key) => {
                    if (
                      curConfig.logType === LogType.JSON &&
                      curConfig.jsonSchema
                    ) {
                      //updateJsonTimeKey
                      if (typeof curConfig.jsonSchema === "string") {
                        curConfig.jsonSchema = JSON.parse(curConfig.jsonSchema);
                      }
                      const tmpSchemaProperty = (curConfig.jsonSchema as any)
                        .properties;
                      updateJsonTimeKey(tmpSchemaProperty, key);
                      setCurConfig((prev: ExLogConf) => {
                        return {
                          ...prev,
                          timeKey: key,
                          jsonSchema: curConfig.jsonSchema,
                        };
                      });
                    } else {
                      setCurConfig((prev: ExLogConf) => {
                        return { ...prev, timeKey: key };
                      });
                    }
                  }}
                  changeTimeOffset={(offset) => {
                    setCurConfig((prev: ExLogConf) => {
                      return { ...prev, timeOffset: offset };
                    });
                  }}
                  changeUserLogFormat={(format) => {
                    setShowUserLogFormatError(false);
                    const { tmpExp, tmpTimeExp } =
                      getRegexAndTimeByConfigAndFormat(curConfig, format);
                    if (
                      curConfig.logType === LogType.Nginx ||
                      curConfig.logType === LogType.Apache
                    ) {
                      if (tmpExp === INVALID) {
                        setShowUserLogFormatError(true);
                      } else {
                        setShowUserLogFormatError(false);
                      }
                    }
                    setCurConfig((prev: ExLogConf) => {
                      return {
                        ...prev,
                        timeKey:
                          curConfig.logType === LogType.MultiLineText &&
                          curConfig?.multilineLogParser ===
                            MultiLineLogParser.JAVA_SPRING_BOOT
                            ? "time"
                            : prev.timeKey,
                        userLogFormat: format,
                        regex: tmpExp !== INVALID ? tmpExp : "",
                        timeKeyRegex: tmpTimeExp,
                      };
                    });
                  }}
                />

                <div className="button-action text-right">
                  <Button
                    btnType="text"
                    onClick={() => {
                      if (pageType === PageType.New) {
                        navigate("/resources/log-config");
                      } else {
                        navigate("/resources/log-config/detail/" + id);
                      }
                    }}
                  >
                    {t("button.cancel")}
                  </Button>
                  <Button
                    btnType="primary"
                    loading={loadingUpdate}
                    onClick={() => {
                      mutationLogConfig();
                    }}
                  >
                    {pageType === PageType.New
                      ? t("button.create")
                      : t("button.save")}
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

export default LogConfigEditor;
