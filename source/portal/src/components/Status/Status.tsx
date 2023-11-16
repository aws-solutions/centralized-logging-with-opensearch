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
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import RemoveCircleOutlineIcon from "@material-ui/icons/RemoveCircleOutline";
import { useTranslation } from "react-i18next";
import LoadingText from "components/LoadingText";
import classNames from "classnames";

export enum StatusType {
  Unknown = "Unknown",
  Active = "Active",
  Created = "Created",
  Updated = "Updated",
  InSufficient_Data = "InSufficient_Data",
  Creating = "Creating",
  Inactive = "Inactive",
  Error = "Error",
  Alarm = "Alarm",
  Green = "Green",
  OK = "OK",
  Red = "Red",
  Yellow = "Yellow",
  Deleting = "Deleting",
  Deleted = "Deleted",
  Reversed = "Reversed",
  Unchanged = "Unchanged",
  Online = "Online",
  Offline = "Offline",
  Installing = "Installing",
  Distributing = "Distributing",
}

interface StatusProps {
  isLink?: boolean;
  status: string;
}
const iconMap: any = {
  green: <CheckCircleOutlineIcon fontSize="small" />,
  active: <CheckCircleOutlineIcon fontSize="small" />,
  created: <CheckCircleOutlineIcon fontSize="small" />,
  updated: <CheckCircleOutlineIcon fontSize="small" />,
  online: <CheckCircleOutlineIcon fontSize="small" />,
  ok: <CheckCircleOutlineIcon fontSize="small" />,
  succeeded: <CheckCircleOutlineIcon fontSize="small" />,
  creating: <AccessTimeIcon fontSize="small" />,
  installing: <AccessTimeIcon fontSize="small" />,
  running: <AccessTimeIcon fontSize="small" />,
  distributing: <AccessTimeIcon fontSize="small" />,
  insufficient_data: <RemoveCircleOutlineIcon fontSize="small" />,
  inactive: <RemoveCircleOutlineIcon fontSize="small" />,
  deleted: <RemoveCircleOutlineIcon fontSize="small" />,
  reversed: <RemoveCircleOutlineIcon fontSize="small" />,
  unchanged: <RemoveCircleOutlineIcon fontSize="small" />,
  deleting: <RemoveCircleOutlineIcon fontSize="small" />,
  unknown: <RemoveCircleOutlineIcon fontSize="small" />,
  failed: <RemoveCircleOutlineIcon fontSize="small" />,
  yellow: <ErrorOutlineIcon fontSize="small" />,
  timed_out: <ErrorOutlineIcon fontSize="small" />,
  offline: <HighlightOffIcon fontSize="small" />,
  aborted: <HighlightOffIcon fontSize="small" />,
  error: <HighlightOffIcon fontSize="small" />,
  alarm: <HighlightOffIcon color="error" fontSize="small" />,
  red: <HighlightOffIcon fontSize="small" />,
};

const Status: React.FC<StatusProps> = (props: StatusProps) => {
  const { isLink, status } = props;
  const { t } = useTranslation();
  if (status.toLocaleLowerCase() === "loading") {
    return <LoadingText />;
  }
  return (
    <div
      className={classNames({ "flex gsui-status": true, "is-link": isLink })}
    >
      <span className={"status-text " + status.toLocaleLowerCase()}>
        <i>{iconMap[status.toLocaleLowerCase()]}</i>
        {t("status." + status.toLocaleLowerCase())}
      </span>
    </div>
  );
};

export default Status;
