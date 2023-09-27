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
import ExtLink from "components/ExtLink";
import StatusIndicator from "components/StatusIndicator";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import { AmplifyConfigType } from "types";

enum HeaderPanelStatus {
  Loading = "loading",
  Success = "success",
  Error = "error",
  Normal = "normal",
  Pending = "pending",
}

export interface IndicatorWithLinkProps {
  indicatorStatus: HeaderPanelStatus;
  details: string[];
  displayName: string;
  buildLink: (region: string, vpcPeeringId: string) => string;
}

const IndicatorWithLink: React.FC<IndicatorWithLinkProps> = (
  props: IndicatorWithLinkProps
) => {
  /**
   * This component is a wrapper for StatusIndicator component.
   * This component is used to handler the ExtLink and to control the display of StatusIndicator based on the indicatorStatus.
   */
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const { indicatorStatus, details, displayName, buildLink } = props;
  return (
    <div className="mb-10">
      {details.length > 0 && (
        <StatusIndicator type={indicatorStatus}>
          <div className="flex">
            <span>{t(displayName)}</span>
            {details.map((element) => {
              return (
                <div key={element}>
                  <ExtLink
                    to={buildLink(amplifyConfig.aws_project_region, element)}
                  >
                    {`${element}`}
                  </ExtLink>
                </div>
              );
            })}
          </div>
        </StatusIndicator>
      )}
    </div>
  );
};

export default IndicatorWithLink;
