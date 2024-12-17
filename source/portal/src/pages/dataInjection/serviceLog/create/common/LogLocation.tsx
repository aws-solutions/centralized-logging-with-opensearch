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

import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import React from "react";
import { useTranslation } from "react-i18next";

interface LogLocationProps {
  manualS3EmptyError?: boolean;
  manualS3PathInvalid?: boolean;
  logLocation: string;
  changeLogPath: (value: string) => void;
}

const LogLocation: React.FC<LogLocationProps> = (props: LogLocationProps) => {
  const { t } = useTranslation();
  const {
    manualS3EmptyError,
    manualS3PathInvalid,
    logLocation,
    changeLogPath,
  } = props;
  return (
    <FormItem
      optionTitle={t("servicelog:create.logLocation")}
      optionDesc={t("servicelog:create.logLocationDesc")}
      errorText={
        (manualS3EmptyError ? t("servicelog:create.logLocationError") : "") ||
        (manualS3PathInvalid
          ? t("servicelog:create.logLocationInvalidError")
          : "")
      }
    >
      <TextInput
        className="m-w-75p"
        value={logLocation}
        placeholder="s3://bucket/prefix"
        onChange={(event) => {
          changeLogPath(event.target.value);
        }}
      />
    </FormItem>
  );
};

export default LogLocation;
