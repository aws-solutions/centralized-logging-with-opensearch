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

interface SpecifySettingsProps {
  cloudTrailTask: CloudTrailTaskProps;
  changeCloudTrailObj: (trail: OptionType) => void;
  // changeTrail: (trailName: string) => void;
  changeBucket: (bucket: string) => void;
  changeLogPath: (logPath: string) => void;
  trailEmptyError: boolean;
  setISChanging: (changing: boolean) => void;
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
  } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  const [cloudTrail, setCloudTrail] = useState<OptionType | null>(
    cloudTrailTask.params.curTrailObj
  );
  const [cloudTrailOptionList, setCloudTrailOptionList] = useState<
    SelectItem[]
  >([]);
  const [loadingCloudTrail, setLoadingCloudTrail] = useState(false);
  const [loadingBucket, setloadingBucket] = useState(false);

  // const [successText, setSuccessText] = useState("");
  const [showSuccessText, setShowSuccessText] = useState(false);
  const [previewS3Path, setPreviewS3Path] = useState("");

  const getS3List = async () => {
    try {
      setLoadingCloudTrail(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.Trail,
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
    console.info("cloudTrail:", cloudTrail);
    if (cloudTrail && cloudTrail.value) {
      // changeTrail(cloudTrail.name);
      getTrailBucketAndPrefix(cloudTrail.value);
    }
  }, [cloudTrail]);

  useEffect(() => {
    getS3List();
  }, []);

  return (
    <div>
      <PagePanel title={t("servicelog:create.step.specifySetting")}>
        <div>
          <HeaderPanel title={t("servicelog:create.service.trail")}>
            <div>
              <Alert content={t("servicelog:trail.alert")} />
              <div className="pb-50">
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
                    disabled={loadingBucket}
                    className="m-w-75p"
                    placeholder={t("servicelog:trail.selectTrail")}
                    loading={loadingCloudTrail}
                    optionList={cloudTrailOptionList}
                    value={cloudTrail}
                    onChange={(
                      event: React.ChangeEvent<HTMLInputElement>,
                      data
                    ) => {
                      setCloudTrail(data);
                      changeCloudTrailObj(data);
                      // changeLogBucketObj(data.value);
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
