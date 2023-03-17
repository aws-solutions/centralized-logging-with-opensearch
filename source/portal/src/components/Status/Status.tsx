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
import React from "react";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import RemoveCircleOutlineIcon from "@material-ui/icons/RemoveCircleOutline";
import { useTranslation } from "react-i18next";

export enum StatusType {
  Unknown = "Unknown",
  Active = "Active",
  Created = "Created",
  Creating = "Creating",
  Inactive = "Inactive",
  Error = "Error",
  Green = "Green",
  Red = "Red",
  Yellow = "Yellow",
  Deleting = "Deleting",
  Online = "Online",
  Offline = "Offline",
  Installing = "Installing",
}

interface StatusProps {
  status: string;
}

const Status: React.FC<StatusProps> = (props: StatusProps) => {
  const { status } = props;
  const { t } = useTranslation();
  return (
    <div className="inline-block gsui-status">
      <span className={"status-text " + status.toLocaleLowerCase()}>
        {status.toLocaleUpperCase() ===
          StatusType.Green.toLocaleUpperCase() && (
          <i>
            <CheckCircleOutlineIcon fontSize="small" />
          </i>
        )}
        {status.toLocaleUpperCase() ===
          StatusType.Active.toLocaleUpperCase() && (
          <i>
            <CheckCircleOutlineIcon fontSize="small" />
          </i>
        )}
        {status.toLocaleUpperCase() ===
          StatusType.Created.toLocaleUpperCase() && (
          <i>
            <CheckCircleOutlineIcon fontSize="small" />
          </i>
        )}
        {status.toLocaleUpperCase() ===
          StatusType.Online.toLocaleUpperCase() && (
          <i>
            <CheckCircleOutlineIcon fontSize="small" />
          </i>
        )}
        {status.toLocaleUpperCase() ===
          StatusType.Creating.toLocaleUpperCase() && (
          <i>
            <AccessTimeIcon fontSize="small" />
          </i>
        )}
        {status.toLocaleUpperCase() ===
          StatusType.Installing.toLocaleUpperCase() && (
          <i>
            <AccessTimeIcon fontSize="small" />
          </i>
        )}
        {status.toLocaleUpperCase() ===
          StatusType.Inactive.toLocaleUpperCase() && (
          <i>
            <RemoveCircleOutlineIcon fontSize="small" />
          </i>
        )}
        {status.toLocaleUpperCase() ===
          StatusType.Deleting.toLocaleUpperCase() && (
          <i>
            <RemoveCircleOutlineIcon fontSize="small" />
          </i>
        )}

        {status.toLocaleUpperCase() ===
          StatusType.Unknown.toLocaleUpperCase() && (
          <i>
            <RemoveCircleOutlineIcon fontSize="small" />
          </i>
        )}
        {status.toLocaleUpperCase() ===
          StatusType.Yellow.toLocaleUpperCase() && (
          <i>
            <ErrorOutlineIcon fontSize="small" />
          </i>
        )}
        {status.toLocaleUpperCase() ===
          StatusType.Offline.toLocaleUpperCase() && (
          <i>
            <HighlightOffIcon fontSize="small" />
          </i>
        )}
        {status.toLocaleUpperCase() ===
          StatusType.Error.toLocaleUpperCase() && (
          <i>
            <HighlightOffIcon fontSize="small" />
          </i>
        )}
        {status.toLocaleUpperCase() === StatusType.Red.toLocaleUpperCase() && (
          <i>
            <HighlightOffIcon fontSize="small" />
          </i>
        )}
        {t("status." + status.toLocaleLowerCase())}
      </span>
    </div>
  );
};

export default Status;
