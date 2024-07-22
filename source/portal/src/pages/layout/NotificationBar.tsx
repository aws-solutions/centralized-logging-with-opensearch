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

import React, { useEffect, useState } from "react";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import CloseIcon from "@material-ui/icons/Close";
import Button from "components/Button";
import { useTranslation } from "react-i18next";
import { buildSolutionDocsLink } from "assets/js/const";
import { appSyncRequestQuery } from "assets/js/request";
import { latestVersion } from "graphql/queries";
import { useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import { AmplifyConfigType } from "types";

interface VersionProps {
  version: string;
}

const NotificationBar: React.FC = () => {
  const { t } = useTranslation();
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [latestVersionNumber, setLatestVersionNumber] = useState("");
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const getLatestVersion = async () => {
    try {
      const resData: any = await appSyncRequestQuery(latestVersion, {});
      const versionData: VersionProps = JSON.parse(resData.data.latestVersion);
      setLatestVersionNumber(versionData.version);
      if (
        versionData.version !== amplifyConfig.solution_version &&
        versionData.version !== "unknown"
      ) {
        setHasNewVersion(true);
      } else {
        setHasNewVersion(false);
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  useEffect(() => {
    getLatestVersion();
  }, []);

  if (hasNewVersion)
    return (
      <div className="clo-notification-bar">
        <div className="clo-notification-bar-content">
          <div className="clo-notification-bar-content-text">
            <ErrorOutlineIcon fontSize="small" />
            <span>
              {t("newVersion", {
                latestVersionNumber: latestVersionNumber,
              })}
            </span>
          </div>
          <div className="clo-notification-bar-content-button">
            <Button
              onClick={() => {
                window.open(buildSolutionDocsLink("revisions.html"), "_blank");
              }}
            >
              {t("learnMore")}
            </Button>
            <button
              className="clo-notification-bar-content-button-dismiss"
              onClick={() => setHasNewVersion(false)}
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      </div>
    );

  return <></>;
};

export default NotificationBar;
