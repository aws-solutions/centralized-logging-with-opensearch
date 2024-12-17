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
import React, { useState, useEffect, useMemo } from "react";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import { useTranslation } from "react-i18next";
import Select from "components/Select";
import {
  COMPRESS_TYPE,
  S3_BUFFER_PREFIX,
  S3_STORAGE_CLASS_LINK,
} from "assets/js/const";
import AutoComplete from "components/AutoComplete";
import { appSyncRequestQuery } from "assets/js/request";
import { listResources } from "graphql/queries";
import { Resource, ResourceType } from "API";
import { SelectItem } from "components/Select/select";
import ExtLink from "components/ExtLink";
import {
  AmplifyConfigType,
  S3_STORAGE_CLASS_OPTIONS,
  AnalyticEngineTypes,
} from "types";
import ExtButton from "components/ExtButton";
import { useDispatch, useSelector } from "react-redux";
import { buildCreateS3Link, displayI18NMessage } from "assets/js/utils";
import { RootState } from "reducer/reducers";
import ExpandableSection from "components/ExpandableSection";
import { AppDispatch } from "reducer/store";
import {
  bufferIntervalChanged,
  bufferSizeChanged,
  bufferCompressionTypeChanged,
  logBucketChanged,
  logBucketPrefixChanged,
  s3StorageClassChanged,
} from "reducer/configBufferS3";

interface BufferS3Props {
  engineType?: AnalyticEngineTypes;
}

const BufferS3: React.FC<BufferS3Props> = (props: BufferS3Props) => {
  const { t } = useTranslation();
  const { engineType = AnalyticEngineTypes.OPENSEARCH } = props;
  const s3Buffer = useSelector((state: RootState) => state.s3Buffer);
  const dispatch = useDispatch<AppDispatch>();
  const [loadingS3List, setLoadingS3List] = useState(false);
  const [s3BucketOptionList, setS3BucketOptionList] = useState<SelectItem[]>(
    []
  );

  const getS3List = async () => {
    try {
      setLoadingS3List(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.S3Bucket,
        accountId: "",
      });
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

  const isLightEngine = useMemo(
    () => engineType === AnalyticEngineTypes.LIGHT_ENGINE,
    [engineType]
  );

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  return (
    <div>
      <FormItem
        optionTitle={t("applog:create.ingestSetting.s3Bucket")}
        optionDesc={t("applog:create.ingestSetting.s3BucketDesc")}
        errorText={displayI18NMessage(s3Buffer.logBucketError)}
      >
        <div className="flex m-w-75p">
          <div className="flex-1">
            <AutoComplete
              outerLoading
              disabled={loadingS3List}
              placeholder={t("servicelog:s3.selectBucket") || ""}
              loading={loadingS3List}
              optionList={s3BucketOptionList}
              value={s3Buffer.s3BufferBucketObj}
              onChange={(event: React.ChangeEvent<HTMLInputElement>, data) => {
                dispatch(logBucketChanged(data));
              }}
            />
          </div>
          <div className="ml-10">
            <ExtButton to={buildCreateS3Link(amplifyConfig.aws_project_region)}>
              {t("applog:create.ingestSetting.create")}
            </ExtButton>
          </div>
        </div>
      </FormItem>

      <div>
        <ExpandableSection
          defaultExpanded={false}
          headerText={t("servicelog:cluster.additionalSetting")}
        >
          <div>
            {!isLightEngine && (
              <FormItem
                optionTitle={t("applog:create.ingestSetting.s3BucketPrefix")}
                optionDesc={t("applog:create.ingestSetting.s3BucketPrefixDesc")}
                errorText={displayI18NMessage(s3Buffer.logBucketPrefixError)}
              >
                <TextInput
                  placeholder={S3_BUFFER_PREFIX}
                  className="m-w-75p"
                  value={s3Buffer.data.logBucketPrefix}
                  onChange={(event) => {
                    dispatch(logBucketPrefixChanged(event.target.value));
                  }}
                />
              </FormItem>
            )}

            <FormItem
              optionTitle={t("applog:create.ingestSetting.bufferSize")}
              optionDesc={t("applog:create.ingestSetting.bufferSizeDesc")}
              errorText={displayI18NMessage(s3Buffer.bufferSizeError)}
            >
              <TextInput
                className="m-w-75p"
                type="number"
                placeholder="50"
                value={s3Buffer.data.maxFileSize}
                onChange={(event) => {
                  dispatch(bufferSizeChanged(event.target.value));
                }}
              />
            </FormItem>

            <FormItem
              optionTitle={t("applog:create.ingestSetting.bufferInt")}
              optionDesc={t("applog:create.ingestSetting.bufferIntDesc")}
              errorText={displayI18NMessage(s3Buffer.bufferIntervalError)}
            >
              <TextInput
                className="m-w-75p"
                type="number"
                placeholder="60"
                value={s3Buffer.data.uploadTimeout}
                onChange={(event) => {
                  dispatch(bufferIntervalChanged(event.target.value));
                }}
              />
            </FormItem>

            <FormItem
              optionTitle={t("applog:create.ingestSetting.s3StorageClass")}
              optionDesc={
                <div>
                  {t("applog:create.ingestSetting.s3StorageClassDesc")}
                  <ExtLink to={S3_STORAGE_CLASS_LINK}>{t("learnMore")}</ExtLink>
                </div>
              }
            >
              <Select
                className="m-w-75p"
                optionList={S3_STORAGE_CLASS_OPTIONS}
                value={s3Buffer.data.s3StorageClass}
                onChange={(event) => {
                  dispatch(s3StorageClassChanged(event.target.value));
                }}
              />
            </FormItem>

            <FormItem
              optionTitle={t("applog:create.ingestSetting.compressType")}
              optionDesc={t("applog:create.ingestSetting.compressTypeDesc")}
            >
              <Select
                allowEmpty
                placeholder={t("applog:create.ingestSetting.compressChoose")}
                className="m-w-75p"
                optionList={COMPRESS_TYPE}
                value={s3Buffer.data.compressionType}
                onChange={(event) => {
                  dispatch(bufferCompressionTypeChanged(event.target.value));
                }}
              />
            </FormItem>
          </div>
        </ExpandableSection>
      </div>
    </div>
  );
};

export default BufferS3;
