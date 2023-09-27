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
import { buildLambdaCWLGroupLink, formatLocalTime } from "assets/js/utils";
import ExtLink from "components/ExtLink";
import ValueWithLabel from "components/ValueWithLabel";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { AmplifyConfigType } from "types";
import { LoggingProps } from "../Logging";
import { RootState } from "reducer/reducers";

interface LoggingHeaderProps extends LoggingProps {
  processorLambdaName?: string | null;
}

const LoggingHeader: React.FC<LoggingHeaderProps> = (
  props: LoggingHeaderProps
) => {
  const { pipelineInfo, servicePipeline, processorLambdaName } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  return (
    <div className="flex value-label-span">
      <div className="flex-1">
        <ValueWithLabel label={t("common:logging.logGroupName")}>
          <ExtLink
            to={buildLambdaCWLGroupLink(
              amplifyConfig.aws_project_region,
              processorLambdaName || ""
            )}
          >
            {processorLambdaName}
          </ExtLink>
        </ValueWithLabel>
      </div>
      <div className="flex-1 border-left-c">
        <ValueWithLabel label={t("common:logging.creationTime")}>
          <div>
            {formatLocalTime(
              pipelineInfo?.createdAt || servicePipeline?.createTime || ""
            )}
          </div>
        </ValueWithLabel>
      </div>
    </div>
  );
};

export default LoggingHeader;
