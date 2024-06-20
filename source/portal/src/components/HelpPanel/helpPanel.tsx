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
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import CloseIcon from "@material-ui/icons/Close";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import { ActionType, InfoBarTitleMap, InfoBarTypes } from "reducer/appReducer";
import Alarms from "help/Alarms";
import AccessProxy from "help/AccessProxy";
import CreationMethodNetwork from "help/CreationMethodNetwork";
import LogProcessing from "help/LogProcessing";
import LogProcessingNetwork from "help/LogProcessingNetwork";
import IngestionCreationMethod from "help/IngestionCreationMethod";
import SampleDashboard from "help/SampleDashboard";
import LogLifeCycle from "help/LogLifecycle";
import NginxLogFormat from "help/NginxLogFormat";
import NginxSampleLogParsing from "help/NginxSampleLogParsing";
import LogConfigPath from "help/LogConfigPath";
import LogConfigPathEKS from "help/LogConfigPathEKS";
import ApacheLogFormat from "help/ApacheLogFormat";
import ApacheSampleLogParsing from "help/ApacheSampleLogParsing";
import RegExLogFormat from "help/RegExLogFormat";
import InstanceGroupCreationMethod from "help/InstanceGroupCreationMethod";
import { useTranslation } from "react-i18next";
import S3FileType from "help/S3FileType";
import EKSPattern from "help/EKSPattern";
import EKSIAMRole from "help/EKSIAMRole";
import ConfigTimeFormat from "help/ConfigTimeFormat";
import ConfigFilter from "help/ConfigFilter";
import ProxyInstance from "help/ProxyInstance";
import PipelineAlarms from "help/PipelineAlarms";
import { RootState } from "reducer/reducers";
import OSIPipeline from "help/OSIPipeline";
import { LightEngineSampleDashboard } from "help/LightEngineSampleDashboard";
import { LightEngineTableName } from "help/LightEngineTableName";
import { GeneralHelp, GeneralHelpProps } from "help/GeneralHelp";
import { defaultStr } from "assets/js/utils";
import LogConfigPathWindows from "help/LogConfigPathWindows";

interface HelpPanelProps {
  className?: string;
}

const GeneralHelpTypes: Record<string, GeneralHelpProps> = {
  [InfoBarTypes.LIGHT_ENGINE_LOG_PROCESS]: {
    tips: [
      "info:lightEngineLogProcess.tip1",
      "info:lightEngineLogProcess.tip2",
    ],
  },
  [InfoBarTypes.LIGHT_ENGINE_LOG_MERGE]: {
    tips: ["info:lightEngineLogMerge.tip1", "info:lightEngineLogMerge.tip2"],
  },
  [InfoBarTypes.LIGHT_ENGINE_LOG_ARCHIVE]: {
    tips: [
      "info:lightEngineLogArchive.tip1",
      "info:lightEngineLogArchive.tip2",
    ],
  },
  [InfoBarTypes.LIGHT_ENGINE_LOG_PROCESS_DETAIL]: {
    tips: ["info:lightEngineLogProcess.tip2"],
  },
  [InfoBarTypes.LIGHT_ENGINE_LOG_MERGE_DETAIL]: {
    tips: ["info:lightEngineLogMerge.tip2"],
  },
  [InfoBarTypes.LIGHT_ENGINE_LOG_ARCHIVE_DETAIL]: {
    tips: ["info:lightEngineLogArchive.tip2"],
  },
};

export const HelpPanel: React.FC<HelpPanelProps> = (props: HelpPanelProps) => {
  const { className } = props;
  const { showInfoBar, infoBarType } = useSelector(
    (state: RootState) => state.app
  );
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return (
    <div
      className={`${className} lh-helper`}
      style={{ marginRight: showInfoBar ? undefined : -240 }}
    >
      <div className="gsui-help-panel-title">
        {!showInfoBar && (
          <div className="collapse-menu">
            <ErrorOutlineIcon className="reverse menu-icon" />
          </div>
        )}
        {showInfoBar && (
          <div className="flex-1">
            <div>
              <CloseIcon
                onClick={() => {
                  dispatch({ type: ActionType.CLOSE_INFO_BAR });
                }}
                className="close-icon"
              />
              <div className="head-title">
                {t(InfoBarTitleMap[defaultStr(infoBarType)])}
              </div>
            </div>
          </div>
        )}
      </div>
      {showInfoBar && (
        <div>
          {infoBarType === InfoBarTypes.ALARMS && <Alarms />}
          {infoBarType === InfoBarTypes.ACCESS_PROXY && <AccessProxy />}
          {infoBarType === InfoBarTypes.LOG_PROCESSING && <LogProcessing />}
          {infoBarType === InfoBarTypes.CREATION_METHOD_NETWORK && (
            <CreationMethodNetwork />
          )}
          {infoBarType === InfoBarTypes.LOG_PROCESSING_NETWORK && (
            <LogProcessingNetwork />
          )}
          {infoBarType === InfoBarTypes.INGESTION_CREATION_METHOD && (
            <IngestionCreationMethod />
          )}
          {infoBarType === InfoBarTypes.INSTANCE_GROUP_CREATION_METHOD && (
            <InstanceGroupCreationMethod />
          )}
          {infoBarType === InfoBarTypes.SAMPLE_DASHBAORD && <SampleDashboard />}
          {infoBarType === InfoBarTypes.LIGHT_ENGINE_SAMPLE_DASHBOARD && (
            <LightEngineSampleDashboard />
          )}
          {infoBarType === InfoBarTypes.APACHE_SAMPLE_DASHBOARD && (
            <SampleDashboard
              content={
                <a href="https://aws-solutions.github.io/centralized-logging-with-opensearch/zh/implementation-guide/applications/apache/">
                  &nbsp;
                  https://aws-solutions.github.io/centralized-logging-with-opensearch/zh/implementation-guide/applications/apache/
                </a>
              }
            />
          )}
          {infoBarType === InfoBarTypes.LOG_LIFECYCLE && <LogLifeCycle />}
          {infoBarType === InfoBarTypes.NGINX_LOG_FORMAT && <NginxLogFormat />}
          {infoBarType === InfoBarTypes.APACHE_LOG_FORMAT && (
            <ApacheLogFormat />
          )}
          {infoBarType === InfoBarTypes.REGEX_LOG_FORMAT && <RegExLogFormat />}
          {infoBarType === InfoBarTypes.NGINX_SAMPLE_LOG_PARSING && (
            <NginxSampleLogParsing />
          )}
          {infoBarType === InfoBarTypes.APACHE_SAMPLE_LOG_PARSING && (
            <ApacheSampleLogParsing />
          )}
          {infoBarType === InfoBarTypes.LOG_CONFIG_PATH && <LogConfigPath />}
          {infoBarType === InfoBarTypes.LOG_CONFIG_PATH_WINDOWS && (
            <LogConfigPathWindows />
          )}
          {infoBarType === InfoBarTypes.LOG_CONFIG_PATH_EKS && (
            <LogConfigPathEKS />
          )}
          {infoBarType === InfoBarTypes.S3_FILE_TYPE && <S3FileType />}
          {infoBarType === InfoBarTypes.EKS_PATTERN && <EKSPattern />}
          {infoBarType === InfoBarTypes.EKS_IAM_ROLE && <EKSIAMRole />}
          {infoBarType === InfoBarTypes.CONFIG_TIME_FORMAT && (
            <ConfigTimeFormat />
          )}
          {infoBarType === InfoBarTypes.CONFIG_FILTER && <ConfigFilter />}
          {infoBarType === InfoBarTypes.PROXY_INSTANCE && <ProxyInstance />}
          {infoBarType === InfoBarTypes.S3_PREFIX_FILTER && (
            <div className="gsui-help-container">
              <div className="gsui-help-content">
                <p>{t("info:s3PrefixFilter.desc")}</p>
                <ul>
                  <li>{t("info:s3PrefixFilter.li1")}</li>
                  <li>{t("info:s3PrefixFilter.li2")}</li>
                </ul>
              </div>
            </div>
          )}
          {infoBarType === InfoBarTypes.BUFFER_LAYER && (
            <div className="gsui-help-container">
              <div className="gsui-help-content">
                <p>{t("info:bufferLayer.desc")}</p>
              </div>
            </div>
          )}
          {infoBarType === InfoBarTypes.PIPELINE_ALARM && <PipelineAlarms />}
          {infoBarType === InfoBarTypes.OSI_PIPELINE && <OSIPipeline />}
          {infoBarType === InfoBarTypes.LIGHT_ENGINE_TABLE_NAME && (
            <LightEngineTableName />
          )}
          {Object.keys(GeneralHelpTypes).includes(infoBarType as string) && (
            <GeneralHelp {...GeneralHelpTypes[infoBarType as string]} />
          )}
        </div>
      )}
    </div>
  );
};

HelpPanel.defaultProps = {
  className: "",
};

export default HelpPanel;
