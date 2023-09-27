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
import React, { useState } from "react";
import Alert from "components/Alert";
import { useTranslation } from "react-i18next";
import Button from "components/Button";
import {
  DestinationType,
  LoggingBucket,
  ResourceLogConf,
  ResourceType,
} from "API";
import { appSyncRequestMutation } from "assets/js/request";
import {
  putResourceLogConfig,
  putResourceLoggingBucket,
} from "graphql/mutations";
import ExtLink from "components/ExtLink";
import { SelectItem } from "components/Select/select";
import { splitStringToBucketAndPrefix } from "assets/js/utils";
import { AlertType } from "components/Alert/alert";

interface AutoEnableProps {
  title: string;
  desc: string;
  resourceType: ResourceType;
  resourceName: string;
  accountId?: string;
  region?: string;
  link?: string;
  destName?: string;
  destType?: DestinationType;
  learnMoreLink?: string;
  alertType?: AlertType;
  changeLogBucketAndPrefix: (
    bucket: string,
    prefix: string,
    enabled: boolean
  ) => void;
  changeEnableStatus: (status: boolean) => void;
  changeLogSource?: (source: string) => void;
  changeEnableTmpFlowList?: (list: SelectItem[], logFormat: string) => void;
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
    destName,
    destType,
    learnMoreLink,
    changeLogBucketAndPrefix,
    changeEnableStatus,
    changeLogSource,
    changeEnableTmpFlowList,
    alertType,
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

  const autoCreateConfigLogging = async () => {
    setAutoCreating(true);
    changeEnableStatus(true);
    const putResourceLoggingBucketParams = {
      destinationName: destName,
      destinationType: destType,
      type: resourceType,
      resourceName: resourceName,
      accountId: accountId,
      region: "",
      LogFormat: "",
    };
    try {
      const createRes = await appSyncRequestMutation(
        putResourceLogConfig,
        putResourceLoggingBucketParams
      );
      console.info("createRes:", createRes);
      const createConfigRes: ResourceLogConf =
        createRes.data.putResourceLogConfig;
      if (createRes) {
        if (createConfigRes.destinationType === DestinationType.S3) {
          const { bucket, prefix } = splitStringToBucketAndPrefix(
            createConfigRes.destinationName
          );
          changeLogBucketAndPrefix(bucket, prefix, true);
        }
        changeEnableTmpFlowList &&
          changeEnableTmpFlowList(
            [
              {
                name: createConfigRes.name || "",
                value: createConfigRes.destinationName || "",
                optTitle: createConfigRes.region || "",
              },
            ],
            createConfigRes.logFormat || ""
          );
      }
      setAutoCreating(false);
      changeEnableStatus(false);
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
        type={alertType}
        actions={
          <div>
            <Button
              loading={autoCreating}
              disabled={autoCreating}
              loadingColor="#666"
              onClick={() => {
                if (
                  resourceType === ResourceType.VPC ||
                  resourceType === ResourceType.Trail ||
                  resourceType === ResourceType.WAF
                ) {
                  autoCreateConfigLogging();
                } else {
                  autoCreateBucketLogging();
                }
              }}
            >
              {resourceType === ResourceType.VPC ||
              resourceType === ResourceType.Distribution ||
              resourceType === ResourceType.Trail
                ? t("button.create")
                : t("button.enable")}
            </Button>
          </div>
        }
        content={
          <div>
            {desc}
            {learnMoreLink ? (
              <ExtLink to={learnMoreLink}>{t("learnMore")}</ExtLink>
            ) : (
              ""
            )}
          </div>
        }
      />
    </div>
  );
};

export default AutoEnableLogging;
