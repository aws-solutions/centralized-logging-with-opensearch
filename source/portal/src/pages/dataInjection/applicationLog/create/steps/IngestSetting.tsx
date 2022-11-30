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
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import { ApplicationLogType } from "../CreatePipeline";
import TextInput from "components/TextInput";
import { useTranslation } from "react-i18next";
import SelectBuffer, { BufferType } from "./SelectBuffer";
import BufferKDS from "pages/comps/buffer/BufferKDS";
import BufferS3 from "pages/comps/buffer/BufferS3";
import { OptionType } from "components/AutoComplete/autoComplete";

interface IngestSettingProps {
  applicationLog: ApplicationLogType;
  changeIndexPrefix: (index: string) => void;
  changeShardNumber: (shardNum: string) => void;
  changeMaxShardNum: (shardNum: string) => void;
  changeEnableAS: (enable: string) => void;
  changeBufferType: (bufferType: string) => void;
  changeS3BufferBucket: (bucket: OptionType | null) => void;
  changeS3BufferPrefix: (prefix: string) => void;
  changeS3BufferBufferSize: (size: string) => void;
  changeS3BufferTimeout: (timeout: string) => void;
  changeS3CompressionType: (type: string) => void;
  disableSelect?: boolean;
  indexEmptyError: boolean;
  indexFormatError: boolean;
  indexDuplicatedError: boolean;
  shardNumInvalidError?: boolean;
  maxShardNumInvalidError?: boolean;
  s3BucketEmptyError: boolean;
  s3PrefixError: boolean;
  bufferSizeError: boolean;
  bufferIntervalError: boolean;
}

const IngestSetting: React.FC<IngestSettingProps> = (
  props: IngestSettingProps
) => {
  const {
    applicationLog,
    changeIndexPrefix,
    changeShardNumber,
    changeEnableAS,
    changeMaxShardNum,
    changeBufferType,
    changeS3BufferBucket,
    changeS3BufferPrefix,
    changeS3BufferBufferSize,
    changeS3BufferTimeout,
    changeS3CompressionType,
    indexEmptyError,
    indexFormatError,
    indexDuplicatedError,
    shardNumInvalidError,
    maxShardNumInvalidError,
    s3BucketEmptyError,
    s3PrefixError,
    bufferSizeError,
    bufferIntervalError,
  } = props;
  const { t } = useTranslation();

  return (
    <div>
      <HeaderPanel title={t("applog:create.ingestSetting.index")}>
        <div>
          <FormItem
            optionTitle={t("applog:create.ingestSetting.indexName")}
            optionDesc={t("applog:create.ingestSetting.indexNameDesc")}
            errorText={
              indexEmptyError
                ? t("applog:create.ingestSetting.indexNameError")
                : indexFormatError
                ? t("applog:create.ingestSetting.indexNameFormatError")
                : indexDuplicatedError
                ? t("applog:create.ingestSetting.indexNameDuplicated")
                : ""
            }
          >
            <TextInput
              className="m-w-75p"
              value={applicationLog.aosParams.indexPrefix}
              onChange={(event) => {
                changeIndexPrefix(event.target.value);
              }}
              placeholder="log-example"
            />
          </FormItem>
        </div>
      </HeaderPanel>

      <HeaderPanel title={t("applog:create.ingestSetting.buffer")}>
        <>
          <SelectBuffer
            currentBufferLayer={applicationLog.bufferType}
            changeActiveLayer={(layer) => {
              changeBufferType(layer);
            }}
          />
          {applicationLog.bufferType === BufferType.KDS && (
            <BufferKDS
              shardNumInvalidError={shardNumInvalidError}
              maxShardNumInvalidError={maxShardNumInvalidError}
              applicationLog={applicationLog}
              changeShardNumber={(number) => {
                changeShardNumber(number);
              }}
              changeEnableAS={(enable) => {
                changeEnableAS(enable);
              }}
              changeMaxShardNum={(number) => {
                changeMaxShardNum(number);
              }}
            />
          )}
          {applicationLog.bufferType === BufferType.S3 && (
            <BufferS3
              applicationLog={applicationLog}
              s3BucketEmptyError={s3BucketEmptyError}
              s3PrefixError={s3PrefixError}
              bufferSizeError={bufferSizeError}
              bufferIntervalError={bufferIntervalError}
              changeS3BufferBucket={(bucket) => {
                changeS3BufferBucket(bucket);
              }}
              changeS3BufferPrefix={(prefix) => {
                changeS3BufferPrefix(prefix);
              }}
              changeS3BufferBufferSize={(size) => {
                changeS3BufferBufferSize(size);
              }}
              changeS3BufferTimeout={(timeout) => {
                changeS3BufferTimeout(timeout);
              }}
              changeS3CompressionType={(type) => {
                changeS3CompressionType(type);
              }}
            />
          )}
        </>
      </HeaderPanel>
    </div>
  );
};

export default IngestSetting;
