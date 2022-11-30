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
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import { useTranslation } from "react-i18next";
import Select from "components/Select";
import { COMPRESS_TYPE, S3_BUFFER_PREFIX } from "assets/js/const";
import { ApplicationLogType } from "../../dataInjection/applicationLog/create/CreatePipeline";
import AutoComplete from "components/AutoComplete";
import { appSyncRequestQuery } from "assets/js/request";
import { listResources } from "graphql/queries";
import { Resource, ResourceType } from "API";
import { SelectItem } from "components/Select/select";
import { OptionType } from "components/AutoComplete/autoComplete";

interface BufferS3Props {
  applicationLog: ApplicationLogType;
  s3BucketEmptyError: boolean;
  s3PrefixError: boolean;
  bufferSizeError: boolean;
  bufferIntervalError: boolean;
  changeS3BufferBucket: (bucket: OptionType | null) => void;
  changeS3BufferPrefix: (prefix: string) => void;
  changeS3BufferBufferSize: (size: string) => void;
  changeS3BufferTimeout: (timeout: string) => void;
  changeS3CompressionType: (type: string) => void;
}

const BufferS3: React.FC<BufferS3Props> = (props: BufferS3Props) => {
  const { t } = useTranslation();
  const {
    applicationLog,
    s3BucketEmptyError,
    s3PrefixError,
    bufferSizeError,
    bufferIntervalError,
    changeS3BufferBucket,
    changeS3BufferPrefix,
    changeS3BufferBufferSize,
    changeS3BufferTimeout,
    changeS3CompressionType,
  } = props;
  const [showAdvanceSetting, setShowAdvanceSetting] = useState(false);
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

  return (
    <div>
      <FormItem
        optionTitle={t("applog:create.ingestSetting.s3Bucket")}
        optionDesc={t("applog:create.ingestSetting.s3BucketDesc")}
        errorText={
          s3BucketEmptyError
            ? t("applog:create.ingestSetting.selectS3Bucket")
            : ""
        }
      >
        <AutoComplete
          outerLoading
          disabled={loadingS3List}
          className="m-w-75p"
          placeholder={t("servicelog:s3.selectBucket")}
          loading={loadingS3List}
          optionList={s3BucketOptionList}
          value={applicationLog.s3BufferBucketObj}
          onChange={(event: React.ChangeEvent<HTMLInputElement>, data) => {
            changeS3BufferBucket(data);
          }}
        />
      </FormItem>

      <div>
        <div
          className="addtional-settings"
          onClick={() => {
            setShowAdvanceSetting(!showAdvanceSetting);
          }}
        >
          <i className="icon">
            {showAdvanceSetting && <ArrowDropDownIcon fontSize="large" />}
            {!showAdvanceSetting && (
              <ArrowDropDownIcon className="reverse-90" fontSize="large" />
            )}
          </i>
          {t("servicelog:cluster.additionalSetting")}
        </div>
        <div className={showAdvanceSetting ? "" : "hide"}>
          <FormItem
            optionTitle={t("applog:create.ingestSetting.s3BucketPrefix")}
            optionDesc={
              t("applog:create.ingestSetting.s3BucketPrefixDesc1") +
              S3_BUFFER_PREFIX +
              t("applog:create.ingestSetting.s3BucketPrefixDesc2")
            }
            errorText={
              s3PrefixError
                ? t("applog:create.ingestSetting.s3PrefixInvalid")
                : ""
            }
          >
            <TextInput
              placeholder={S3_BUFFER_PREFIX}
              className="m-w-45p"
              value={applicationLog.s3BufferParams.logBucketPrefix}
              onChange={(event) => {
                changeS3BufferPrefix(event.target.value);
              }}
            />
          </FormItem>

          <FormItem
            optionTitle={t("applog:create.ingestSetting.bufferSize")}
            optionDesc={t("applog:create.ingestSetting.bufferSizeDesc")}
            errorText={
              bufferSizeError
                ? t("applog:create.ingestSetting.bufferSizeError")
                : ""
            }
          >
            <div className="flex">
              <div>
                <TextInput
                  type="number"
                  placeholder="50"
                  value={applicationLog.s3BufferParams.maxFileSize}
                  onChange={(event) => {
                    changeS3BufferBufferSize(event.target.value);
                  }}
                />
              </div>
              <div className="ml-10">MiB</div>
            </div>
          </FormItem>

          <FormItem
            optionTitle={t("applog:create.ingestSetting.bufferInt")}
            optionDesc={t("applog:create.ingestSetting.bufferIntDesc")}
            errorText={
              bufferIntervalError
                ? t("applog:create.ingestSetting.bufferIntError")
                : ""
            }
          >
            <div className="flex">
              <div>
                <TextInput
                  type="number"
                  placeholder="60"
                  value={applicationLog.s3BufferParams.uploadTimeout}
                  onChange={(event) => {
                    changeS3BufferTimeout(event.target.value);
                  }}
                />
              </div>
              <div className="ml-10">{t("seconds")}</div>
            </div>
          </FormItem>

          <FormItem
            optionTitle={t("applog:create.ingestSetting.compressType")}
            optionDesc={t("applog:create.ingestSetting.compressTypeDesc")}
          >
            <Select
              allowEmpty
              placeholder={t("applog:create.ingestSetting.compressChoose")}
              className="m-w-45p"
              optionList={COMPRESS_TYPE}
              value={applicationLog.s3BufferParams.compressionType}
              onChange={(event) => {
                changeS3CompressionType(event.target.value);
              }}
            />
          </FormItem>
        </div>
      </div>
    </div>
  );
};

export default BufferS3;
