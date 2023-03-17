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
import React, { ReactElement } from "react";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import ReportProblemOutlinedIcon from "@material-ui/icons/ReportProblemOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";

export enum AlertType {
  Normal = "Normal",
  Error = "Error",
  Warning = "Warning",
}
interface AlertProps {
  type?: AlertType;
  title?: string;
  content: string | JSX.Element;
  actions?: ReactElement;
  noMargin?: boolean;
}

const Alert: React.FC<AlertProps> = (props: AlertProps) => {
  const { type, title, content, actions, noMargin } = props;
  return (
    <div
      className={`gsui-alert-wrap ${
        !noMargin ? "margin" : ""
      } ${type?.toLowerCase()}`}
    >
      <div className="icon">
        {type === AlertType.Warning && (
          <ReportProblemOutlinedIcon className="error-text" fontSize="medium" />
        )}
        {type === AlertType.Error && (
          <HighlightOffIcon fontSize="medium" className="error-text" />
        )}
        {(!type || type === AlertType.Normal) && (
          <ErrorOutlineIcon className="reverse" />
        )}
      </div>
      <div className="text">
        {actions ? (
          <div className="space-between">
            <div className="text-title">{title}</div>
            <div className="actions">{actions}</div>
          </div>
        ) : (
          title && <div className="text-title">{title}</div>
        )}
        <div className="text-content">{content}</div>
      </div>
    </div>
  );
};

export default Alert;
