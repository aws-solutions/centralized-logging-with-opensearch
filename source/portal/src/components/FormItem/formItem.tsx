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
import ReportProblemOutlinedIcon from "@material-ui/icons/ReportProblemOutlined";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";

import classNames from "classnames";
import { InfoBarTypes } from "reducer/appReducer";
import InfoSpan from "components/InfoSpan";
interface FormItemProps {
  infoType?: InfoBarTypes;
  optionTitle: string;
  optionDesc: ReactElement | string;
  showRequiredError?: boolean;
  requiredErrorMsg?: string;
  showFormatError?: boolean;
  formatErrorMsg?: string;
  children?: React.ReactChild | React.ReactChild[];
  errorText?: string;
  infoText?: string;
  successText?: string;
  warningText?: string;
}

const FormItem: React.FC<FormItemProps> = (props: FormItemProps) => {
  const {
    infoType,
    optionTitle,
    optionDesc,
    children,
    errorText,
    infoText,
    successText,
    warningText,
  } = props;
  return (
    <div
      className={classNames({ "gsui-formitem-wrap": true, invalid: errorText })}
    >
      <div className="formitem-title">
        {optionTitle} {infoType && <InfoSpan spanType={infoType} />}
      </div>
      <div className="formitem-desc">{optionDesc}</div>
      {children}
      {errorText && (
        <div className="form-text error-text">
          <i className="icon">
            <ReportProblemOutlinedIcon fontSize="small" />
          </i>
          {errorText}
        </div>
      )}
      {warningText && (
        <div className="form-text warning-text">
          <i className="icon">
            <ErrorOutlineIcon fontSize="small" className="reverse" />
          </i>
          {warningText}
        </div>
      )}
      {infoText && (
        <div className="form-text info-text">
          <i className="icon">
            <ErrorOutlineIcon fontSize="small" className="reverse" />
          </i>
          {infoText}
        </div>
      )}
      {successText && (
        <div className="form-text success-text">
          <i className="icon">
            <CheckCircleOutlineIcon fontSize="small" />
          </i>
          {successText}
        </div>
      )}
    </div>
  );
};

export default FormItem;
