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
import TextInput from "components/TextInput";
import { Validator } from "pages/comps/Validator";
import { useAutoValidation } from "assets/js/hooks/useAutoValidation";

interface IndexNameProps {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  validator?: Validator;
  error?: string
}

const IndexName: React.FC<IndexNameProps> = (props: IndexNameProps) => {
  const { t } = useTranslation();
  props.validator && useAutoValidation(props.validator, [props.value]);
  return (
    <FormItem
      optionTitle={t("applog:create.ingestSetting.indexName")}
      optionDesc={t("applog:create.ingestSetting.indexNameDesc")}
      errorText={props.validator?.error ?? props.error}
    >
      <TextInput
        className="m-w-75p"
        value={props.value}
        onChange={(event) => {
          props.setValue(event.target.value);
        }}
        placeholder="log-example"
      />
    </FormItem>
  );
};

export default IndexName;
