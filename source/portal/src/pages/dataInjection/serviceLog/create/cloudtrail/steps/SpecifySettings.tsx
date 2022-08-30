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
import React, { useState, useEffect } from "react";

import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import Alert from "components/Alert";
import AutoComplete from "components/AutoComplete";
import FormItem from "components/FormItem";
import { appSyncRequestQuery } from "assets/js/request";
import { LoggingBucket, Resource, ResourceType } from "API";
import { SelectItem } from "components/Select/select";
import { getResourceLoggingBucket, listResources } from "graphql/queries";
import { OptionType } from "components/AutoComplete/autoComplete";
import { CloudTrailTaskProps } from "../CreateCloudTrail";
import ExtLink from "components/ExtLink";
import { buildTrailLink } from "assets/js/utils";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { AppStateProps } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";

interface SpecifySettingsProps {
  cloudTrailTask: CloudTrailTaskProps;
  changeCloudTrailObj: (trail: OptionType | null) => void;
  // changeTrail: (trailName: string) => void;
  changeBucket: (bucket: string) => void;
  changeLogPath: (logPath: string) => void;
  trailEmptyError: boolean;
  setISChanging: (changing: boolean) => void;
  changeCrossAccount: (id: string) => void;
}

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const {
    cloudTrailTask,
    changeCloudTrailObj,
    changeBucket,
    changeLogPath,
    trailEmptyError,
    setISChanging,
    changeCrossAccount,
  } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  const [cloudTrailOptionList, setCloudTrailOptionList] = useState<
    SelectItem[]
  >([]);
  const [loadingCloudTrail, setLoadingCloudTrail] = useState(false);
  const [loadingBucket, setloadingBucket] = useState(false);
  const [disableTrail, setDisableTrail] = useState(false);

  // const [successText, setSuccessText] = useState("");
  const [showSuccessText, setShowSuccessText] = useState(false);
  const [previewS3Path, setPreviewS3Path] = useState("");

  const getCloudTrailList = async (accountId: string) => {
    try {
      setLoadingCloudTrail(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.Trail,
        accountId: accountId,
      });
      console.info("domainNames:", resData.data);
      const dataList: Resource[] = resData.data.listResources;
      const tmpOptionList: SelectItem[] = [];
      dataList.forEach((element) => {
        tmpOptionList.push({
          name: `${element.name}`,
          value: element.id,
        });
      });
      setCloudTrailOptionList(tmpOptionList);
      setLoadingCloudTrail(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getTrailBucketAndPrefix = async (trailName: string) => {
    setloadingBucket(true);
    setISChanging(true);
    const resData: any = await appSyncRequestQuery(getResourceLoggingBucket, {
      type: ResourceType.Trail,
      resourceName: trailName,
      accountId: cloudTrailTask.logSourceAccountId,
      region: amplifyConfig.aws_project_region,
    });
    console.info("getTrailBucketAndPrefix:", resData.data);
    const logginBucket: LoggingBucket = resData?.data?.getResourceLoggingBucket;
    setloadingBucket(false);
    setISChanging(false);
    changeBucket(logginBucket.bucket || "");
    changeLogPath(logginBucket.prefix || "");

    setPreviewS3Path(`s3://${logginBucket.bucket}/${logginBucket.prefix}`);
    if (logginBucket.enabled) {
      setShowSuccessText(true);
    } else {
      setShowSuccessText(false);
    }
  };

  useEffect(() => {
    changeBucket("");
    changeLogPath("");
    setShowSuccessText(false);
    if (
      cloudTrailTask.params.curTrailObj &&
      cloudTrailTask.params.curTrailObj.value
    ) {
      // changeTrail(cloudTrail.name);
      getTrailBucketAndPrefix(cloudTrailTask.params.curTrailObj.value);
    }
  }, [cloudTrailTask.params.curTrailObj]);

  useEffect(() => {
    getCloudTrailList(cloudTrailTask.logSourceAccountId);
  }, [cloudTrailTask.logSourceAccountId]);

  return (
    <div>
      <PagePanel title={t("servicelog:create.step.specifySetting")}>
        <div>
          <HeaderPanel title={t("servicelog:create.service.trail")}>
            <div>
              <Alert content={t("servicelog:trail.alert")} />
              <div className="pb-50">
                <CrossAccountSelect
                  accountId={cloudTrailTask.logSourceAccountId}
                  changeAccount={(id) => {
                    changeCrossAccount(id);
                    changeCloudTrailObj(null);
                  }}
                  loadingAccount={(loading) => {
                    setDisableTrail(loading);
                  }}
                />
                <FormItem
                  optionTitle={t("servicelog:trail.trail")}
                  optionDesc={
                    <div>
                      {t("servicelog:trail.select")}
                      <ExtLink
                        to={buildTrailLink(
                          "",
                          amplifyConfig.aws_project_region
                        )}
                      >
                        {t("servicelog:trail.curAccount")}
                      </ExtLink>
                      .
                    </div>
                  }
                  errorText={
                    trailEmptyError ? t("servicelog:trail.trailError") : ""
                  }
                  successText={
                    showSuccessText && previewS3Path
                      ? t("servicelog:trail.savedTips") + previewS3Path
                      : ""
                  }
                >
                  <AutoComplete
                    outerLoading
                    disabled={loadingBucket || disableTrail}
                    className="m-w-75p"
                    placeholder={t("servicelog:trail.selectTrail")}
                    loading={loadingCloudTrail || loadingBucket}
                    optionList={cloudTrailOptionList}
                    value={cloudTrailTask.params.curTrailObj}
                    onChange={(
                      event: React.ChangeEvent<HTMLInputElement>,
                      data
                    ) => {
                      changeCloudTrailObj(data);
                    }}
                  />
                </FormItem>
              </div>
            </div>
          </HeaderPanel>
        </div>
      </PagePanel>
    </div>
  );
};

export default SpecifySettings;
