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
import React, { ReactElement } from "react";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import RemoveCircleOutlineIcon from "@material-ui/icons/RemoveCircleOutline";
import LoadingText from "components/LoadingText";

export interface StatusIndicatorProps {
  type: "success" | "error" | "loading" | "normal" | "pending" | "warning";
  children: ReactElement | string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = (
  props: StatusIndicatorProps
) => {
  const { type: tmpType, children } = props;
  const type = tmpType.toLocaleLowerCase();
  return (
    <div className="gsui-status-indicator">
      <span className={"flex status-text " + type}>
        {type === "passed" && (
          <i data-testid="success-icon">
            <CheckCircleOutlineIcon fontSize="small" />
          </i>
        )}
        {type === "success" && (
          <i data-testid="success-icon">
            <CheckCircleOutlineIcon fontSize="small" />
          </i>
        )}
        {type === "normal" && (
          <i data-testid="normal-icon">
            <AccessTimeIcon fontSize="small" />
          </i>
        )}
        {type === "pending" && (
          <i data-testid="pending-icon">
            <RemoveCircleOutlineIcon fontSize="small" />
          </i>
        )}
        {type === "error" && (
          <i data-testid="error-icon">
            <HighlightOffIcon fontSize="small" />
          </i>
        )}
        {type === "warning" && (
          <i data-testid="warning-icon">
            <ErrorOutlineIcon fontSize="small" />
          </i>
        )}
        {type === "loading" && (
          <i data-testid="loading-icon">
            <LoadingText />
          </i>
        )}
        <span>{children}</span>
      </span>
    </div>
  );
};

export default StatusIndicator;
