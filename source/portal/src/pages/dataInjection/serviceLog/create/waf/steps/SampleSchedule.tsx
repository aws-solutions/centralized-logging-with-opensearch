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
import FormItem from "components/FormItem";
import TextInput from "components/TextInput";
import { useTranslation } from "react-i18next";

interface SampleScheduleProps {
  interval: string;
  changeScheduleInterval: (interval: string) => void;
  errorText?: string | null | any;
}

const SampleSchedule: React.FC<SampleScheduleProps> = (
  props: SampleScheduleProps
) => {
  const { t } = useTranslation();
  const { interval, errorText, changeScheduleInterval } = props;
  return (
    <>
      <FormItem
        optionTitle={t("servicelog:waf.sampleSchedule")}
        optionDesc={t("servicelog:waf.sampleScheduleDesc")}
        errorText={errorText}
      >
        <TextInput
          type="number"
          className="m-w-75p"
          placeholder=""
          value={interval}
          onChange={(event) => {
            changeScheduleInterval(event.target.value);
          }}
        />
      </FormItem>
    </>
  );
};

export default SampleSchedule;
