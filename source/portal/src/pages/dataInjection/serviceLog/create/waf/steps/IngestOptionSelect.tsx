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
import React, { useMemo, ReactElement } from "react";
import FormItem from "components/FormItem";
import Select from "components/Select";
import { useTranslation } from "react-i18next";

export enum IngestOption {
  FullRequest = "FullRequest",
  SampledRequest = "SampledRequest",
}

export const IngestOptionSampledList = [
  {
    name: "servicelog:waf.sampledRequest",
    value: IngestOption.SampledRequest,
  },
];

export const IngestOptionFullRequestList = [
  {
    name: "servicelog:waf.fullRequest",
    value: IngestOption.FullRequest,
  },
];

export const IngestOptionList = [
  ...IngestOptionSampledList,
  {
    name: "servicelog:waf.fullRequest",
    value: IngestOption.FullRequest,
  },
];

interface IngestOptionSelectProps {
  disabled?: boolean;
  onlySampled?: boolean;
  onlyFullRequest?: boolean;
  ingestOption: string;
  changeIngestOption: (option: string) => void;
  errorText?: string | null;
  successText?: string | null;
  warningText?: string | ReactElement | null;
}

const IngestOptionSelect: React.FC<IngestOptionSelectProps> = (
  props: IngestOptionSelectProps
) => {
  const {
    disabled,
    onlySampled,
    onlyFullRequest,
    ingestOption,
    changeIngestOption,
    errorText,
    successText,
    warningText,
  } = props;
  const { t } = useTranslation();

  const optionList = useMemo(() => {
    if (onlySampled) {
      return IngestOptionSampledList;
    }
    if (onlyFullRequest) {
      return IngestOptionFullRequestList;
    }
    return IngestOptionList;
  }, [onlySampled, onlyFullRequest]);

  return (
    <>
      <FormItem
        optionTitle={t("servicelog:waf.ingestOption")}
        optionDesc={t("servicelog:waf.ingestOptionDesc")}
        errorText={errorText}
        successText={successText}
        warningText={warningText}
      >
        <Select
          disabled={disabled}
          isI18N
          className="m-w-75p"
          optionList={optionList}
          value={ingestOption}
          onChange={(event) => {
            changeIngestOption(event.target.value);
          }}
        />
      </FormItem>
    </>
  );
};

export default IngestOptionSelect;
