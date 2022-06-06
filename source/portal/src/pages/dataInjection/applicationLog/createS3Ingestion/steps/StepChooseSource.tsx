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
import FormItem from "components/FormItem";
import { IngestionFromS3PropsType } from "../CreateS3Ingestion";
import { AmplifyConfigType } from "types";
import { AppStateProps, InfoBarTypes } from "reducer/appReducer";
import { useTranslation } from "react-i18next";
import AutoComplete from "components/AutoComplete";
import Select, { SelectItem } from "components/Select/select";
import { appSyncRequestQuery } from "assets/js/request";
import { Resource, ResourceType } from "API";
import { listResources } from "graphql/queries";
import { useSelector } from "react-redux";
import TextInput from "components/TextInput";
import { S3_FILE_TYPE_LIST } from "assets/js/const";

interface IngestSettingProps {
  ingestionInfo: IngestionFromS3PropsType;
  changeS3Object: (s3: SelectItem) => void;
  changeIndexPrefix: (index: string) => void;
  changeFileType: (type: string) => void;
  changeIsGzip: (isGzip: boolean) => void;
  showS3RequireError: boolean;
  showFileTypeError: boolean;
}

const StepChooseSource: React.FC<IngestSettingProps> = (
  props: IngestSettingProps
) => {
  // console.info(props);
  const {
    ingestionInfo,
    changeS3Object,
    changeIndexPrefix,
    changeFileType,
    changeIsGzip,
    showS3RequireError,
    showFileTypeError,
  } = props;
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const { t } = useTranslation();
  const [loadingS3List, setLoadingS3List] = useState(false);
  const [s3BucketOptionList, setS3BucketOptionList] = useState<SelectItem[]>(
    []
  );

  const getS3List = async () => {
    try {
      setLoadingS3List(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.S3Bucket,
        region: amplifyConfig.aws_project_region,
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
      setS3BucketOptionList(tmpOptionList);
      setLoadingS3List(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getS3List();
  }, []);

  return (
    <div>
      <HeaderPanel title={t("applog:ingestion.s3.specifySource.fromS3")}>
        <FormItem
          optionTitle={t("applog:ingestion.s3.specifySource.s3")}
          optionDesc={t("applog:ingestion.s3.specifySource.s3Desc")}
          errorText={
            showS3RequireError
              ? t("applog:ingestion.s3.specifySource.selectS3")
              : ""
          }
        >
          <AutoComplete
            className="m-w-45p"
            placeholder={t("applog:ingestion.s3.specifySource.chooseS3")}
            loading={loadingS3List}
            optionList={s3BucketOptionList}
            value={ingestionInfo.s3Object}
            onChange={(event: React.ChangeEvent<HTMLInputElement>, data) => {
              changeS3Object(data);
            }}
          />
        </FormItem>

        <FormItem
          optionTitle={t("applog:ingestion.s3.specifySource.logPrefix")}
          optionDesc={t("applog:ingestion.s3.specifySource.logPrefixDesc")}
        >
          <TextInput
            className="m-w-45p"
            value={ingestionInfo.indexPrefix}
            placeholder="prefix"
            onChange={(event) => {
              changeIndexPrefix(event.target.value);
            }}
          />
        </FormItem>

        <FormItem
          infoType={InfoBarTypes.S3_FILE_TYPE}
          optionTitle={t("applog:ingestion.s3.specifySource.fileType")}
          optionDesc={t("applog:ingestion.s3.specifySource.fileTypeDesc")}
          errorText={
            showFileTypeError
              ? t("applog:ingestion.s3.specifySource.selectFileType")
              : ""
          }
        >
          <Select
            placeholder={t("applog:ingestion.s3.specifySource.chooseFileType")}
            className="m-w-45p"
            optionList={S3_FILE_TYPE_LIST}
            value={ingestionInfo.fileType}
            onChange={(event) => {
              changeFileType(event.target.value);
            }}
          />
        </FormItem>
        <div className="flex">
          <div className="pt-3 pr-5">
            <input
              id="gzip"
              type="checkbox"
              checked={ingestionInfo.isGzip}
              onChange={(event) => {
                changeIsGzip(event.target.checked);
              }}
            />
          </div>
          <div>
            <label htmlFor="gzip">
              <FormItem
                optionTitle="Gzip"
                optionDesc={t("applog:ingestion.s3.specifySource.fileZipped")}
              ></FormItem>
            </label>
          </div>
        </div>
      </HeaderPanel>
    </div>
  );
};

export default StepChooseSource;
