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
import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import LogConfigComp, {
  ExLogConf,
  PageType,
} from "pages/resources/common/LogConfigComp";
import { useTranslation } from "react-i18next";
import { LogConf, LogType } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { getLogConf, listLogConfs } from "graphql/queries";
import Select, { SelectItem } from "components/Select/select";
import { IngestionFromS3PropsType } from "../CreateS3Ingestion";
import ExtLink from "components/ExtLink";
import { S3_FILE_TYPE_LIST } from "assets/js/const";

interface SpecifyLogConfigProp {
  s3IngestionInfo: IngestionFromS3PropsType;
  changeLogConfig: (configId: string) => void;
  showLogConfigError: boolean;
}

const SpecifyLogConfig: React.FC<SpecifyLogConfigProp> = (
  props: SpecifyLogConfigProp
) => {
  const { t } = useTranslation();
  const { s3IngestionInfo, changeLogConfig, showLogConfigError } = props;
  const [curConfig, setCurConfig] = useState<LogConf>();
  const [loadingData, setLoadingData] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [logConfigOptionList, setLogConfigOptionList] = useState<SelectItem[]>(
    []
  );
  const [selectedConfig, setSelectedConfig] = useState(
    s3IngestionInfo.logConfigId
  );

  const getLogConfigById = async (confId: string) => {
    try {
      setLoadingConfig(true);
      const resData: any = await appSyncRequestQuery(getLogConf, {
        id: confId,
      });
      console.info("resData:", resData);
      const dataLogConfig: ExLogConf = resData.data.getLogConf;
      setCurConfig(dataLogConfig);
      setLoadingConfig(false);
    } catch (error) {
      setLoadingConfig(false);
      console.error(error);
    }
  };

  // Get Instance Group List
  const getLogConfigList = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(listLogConfs, {
        page: 1,
        count: 9999,
      });
      console.info("resData:", resData);
      const dataLogConfList: ExLogConf[] = resData.data.listLogConfs.logConfs;
      const tmpConfigOptList: SelectItem[] = [];
      if (dataLogConfList && dataLogConfList.length > 0) {
        dataLogConfList.forEach((element) => {
          if (
            s3IngestionInfo.fileType === "json" &&
            element.logType === LogType.JSON
          ) {
            tmpConfigOptList.push({
              name: element.confName || "",
              value: element.id,
            });
          }
          if (
            s3IngestionInfo.fileType === "text" &&
            element.logType === LogType.SingleLineText
          ) {
            tmpConfigOptList.push({
              name: element.confName || "",
              value: element.id,
            });
          }
        });
      }
      setLogConfigOptionList(tmpConfigOptList);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    console.info("selectedConfig:", selectedConfig);
    if (selectedConfig) {
      changeLogConfig(selectedConfig);
      getLogConfigById(selectedConfig);
    }
  }, [selectedConfig]);

  useEffect(() => {
    getLogConfigList();
  }, []);

  return (
    <div>
      <PagePanel title={t("applog:ingestion.s3.step.specifyConfig")}>
        <HeaderPanel title={t("applog:ingestion.s3.specifyConfig.logConfig")}>
          <FormItem
            optionTitle={t("applog:ingestion.s3.specifyConfig.logConfig")}
            optionDesc={
              <div>
                {`${t("applog:ingestion.s3.specifyConfig.configDesc")}${
                  S3_FILE_TYPE_LIST.find(
                    (ele) => ele.value === s3IngestionInfo.fileType
                  )?.name
                }${t("applog:ingestion.s3.specifyConfig.configDesc2")} `}
                <ExtLink to="/resources/log-config">
                  {t("applog:ingestion.s3.specifyConfig.logConfig")}
                </ExtLink>
              </div>
            }
            errorText={
              showLogConfigError
                ? t("applog:ingestion.applyConfig.configRequiredError")
                : ""
            }
          >
            <div className="pr">
              <Select
                loading={loadingData}
                className="m-w-45p"
                optionList={logConfigOptionList}
                value={selectedConfig}
                onChange={(event) => {
                  console.info("event:", event);
                  setSelectedConfig(event.target.value);
                }}
                placeholder={t("applog:ingestion.applyConfig.chooseConfig")}
                hasRefresh
                clickRefresh={() => {
                  getLogConfigList();
                }}
              />
            </div>
          </FormItem>
        </HeaderPanel>
        <LogConfigComp
          sampleLogInvalid={false}
          isLoading={loadingConfig}
          pageType={PageType.Edit}
          headerTitle={t("applog:ingestion.applyConfig.config")}
          inputDisable={true}
          curConfig={curConfig}
        />
      </PagePanel>
    </div>
  );
};

export default SpecifyLogConfig;
