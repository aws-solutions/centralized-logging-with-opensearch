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
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import RemoveCircleOutlineIcon from "@material-ui/icons/RemoveCircleOutline";
import LoadingText from "components/LoadingText";

export interface StatusIndicatorProps {
  type: "success" | "error" | "loading" | "normal" | "pending";
  children: ReactElement | string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = (
  props: StatusIndicatorProps
) => {
  const { type, children } = props;
  return (
    <div className="gsui-status-indicator">
      <span className={"flex status-text " + type}>
        {type === "success" && (
          <i>
            <CheckCircleOutlineIcon fontSize="small" />
          </i>
        )}
        {type === "normal" && (
          <i>
            <AccessTimeIcon fontSize="small" />
          </i>
        )}
        {type === "pending" && (
          <i>
            <RemoveCircleOutlineIcon fontSize="small" />
          </i>
        )}
        {type === "error" && (
          <i>
            <HighlightOffIcon fontSize="small" />
          </i>
        )}
        {type === "loading" && (
          <i>
            <LoadingText />
          </i>
        )}
        <span>{children}</span>
      </span>
    </div>
  );
};

export default StatusIndicator;
