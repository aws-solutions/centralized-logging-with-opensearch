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

import React from "react";
import { useTranslation } from "react-i18next";
import FormItem from "components/FormItem";
import TextArea from "components/TextArea";
import { InfoBarTypes } from "reducer/appReducer";
import { Validator } from "pages/comps/Validator";
import { useAutoValidation } from "assets/js/hooks/useAutoValidation";

interface FilePathPrefixFilterProps {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  validator: Validator;
}
export const FilePathPrefixFilter: React.FC<FilePathPrefixFilterProps> = (
  props: FilePathPrefixFilterProps
) => {
  const { t } = useTranslation();
  useAutoValidation(props.validator, [props.value]);
  return (
    <div className="m-w-75p">
      <FormItem
        optionTitle={t("applog:logSourceDesc.s3.step1.title2")}
        optionDesc={t("applog:logSourceDesc.s3.step1.desc2")}
        infoType={InfoBarTypes.S3_PREFIX_FILTER}
        errorText={props.validator.error}
      >
        <TextArea
          value={props.value}
          placeholder="AWSLogs/000000000000/CloudTrail/ap-northeast-1/"
          rows={1}
          onChange={(event) => props.setValue(event.target.value)}
        />
        <div className="input-tip"></div>
      </FormItem>
    </div>
  );
};
