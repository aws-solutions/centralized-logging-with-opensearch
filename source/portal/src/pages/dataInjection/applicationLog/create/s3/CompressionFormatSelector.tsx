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

import React, { useEffect } from "react";
import { CompressionType } from "API";
import Select from "components/Select/select";
import FormItem from "components/FormItem";
import { useTranslation } from "react-i18next";

interface CompressionFormatSelectorProps {
  disabled?: boolean;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}
export function CompressionFormatSelector(
  props: CompressionFormatSelectorProps
) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!props.value) {
      props.setValue(CompressionType.GZIP);
    }
  }, []);

  return (
    <div className="m-w-75p">
      <FormItem
        optionTitle={t("applog:logSourceDesc.s3.step1.title4")}
        optionDesc={t("applog:logSourceDesc.s3.step1.desc4")}
      >
        <Select
          disabled={props.disabled}
          optionList={[
            { name: "Uncompressed", value: CompressionType.NONE },
            { name: "Gzip", value: CompressionType.GZIP },
          ]}
          value={props.value}
          onChange={function (event): void {
            props.setValue(event.target.value);
          }}
        />
      </FormItem>
    </div>
  );
}
