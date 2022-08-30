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
import React, { useState } from "react";
import Alert from "components/Alert";
import { useTranslation } from "react-i18next";
import Button from "components/Button";
import { LoggingBucket, ResourceType } from "API";
import { appSyncRequestMutation } from "assets/js/request";
import { putResourceLoggingBucket } from "graphql/mutations";

interface AutoEnableProps {
  title: string;
  desc: string;
  resourceType: ResourceType;
  resourceName: string;
  accountId?: string;
  region?: string;
  link?: string;
  changeLogBucketAndPrefix: (
    bucket: string,
    prefix: string,
    enabled: boolean
  ) => void;
  changeEnableStatus: (status: boolean) => void;
  changeLogSource?: (source: string) => void;
}

const AutoEnableLogging: React.FC<AutoEnableProps> = (
  props: AutoEnableProps
) => {
  const { t } = useTranslation();
  const {
    title,
    desc,
    resourceType,
    resourceName,
    accountId,
    changeLogBucketAndPrefix,
    changeEnableStatus,
    changeLogSource,
  } = props;
  const [autoCreating, setAutoCreating] = useState(false);

  const autoCreateBucketLogging = async () => {
    setAutoCreating(true);
    changeEnableStatus(true);
    const putResourceLoggingBucketParams = {
      type: resourceType,
      resourceName: resourceName,
      accountId: accountId,
    };
    try {
      const createRes = await appSyncRequestMutation(
        putResourceLoggingBucket,
        putResourceLoggingBucketParams
      );
      console.info("createRes:", createRes);
      const loggingBucketResData: LoggingBucket =
        createRes.data.putResourceLoggingBucket;
      console.info("loggingBucketResData:", loggingBucketResData);
      setAutoCreating(false);
      changeEnableStatus(false);
      changeLogBucketAndPrefix(
        loggingBucketResData.bucket || "",
        loggingBucketResData.prefix || "",
        loggingBucketResData.enabled || false
      );
      if (changeLogSource) {
        changeLogSource(loggingBucketResData.source || "");
      }
    } catch (error) {
      changeEnableStatus(false);
      setAutoCreating(false);
      console.error(error);
    }
  };

  return (
    <div>
      <Alert
        title={title}
        actions={
          <div>
            <Button
              loading={autoCreating}
              disabled={autoCreating}
              loadingColor="#666"
              onClick={() => {
                autoCreateBucketLogging();
              }}
            >
              {t("button.enable")}
            </Button>
          </div>
        }
        content={desc}
      />
    </div>
  );
};

export default AutoEnableLogging;
