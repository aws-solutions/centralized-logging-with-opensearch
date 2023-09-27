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
import { IngestionMode } from "API";
import { useTranslation } from "react-i18next";
import FormItem from "components/FormItem";
import { FormControlLabel, RadioGroup } from "@material-ui/core";
import Radio from "components/Radio";

interface IngestionModeSelectorProps {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}
export function IngestionModeSelector(props: IngestionModeSelectorProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!props.value) {
      props.setValue(IngestionMode.ON_GOING.toString());
    }
  }, []);

  return (
    <FormItem
      optionTitle={t("applog:logSourceDesc.s3.step1.title3")}
      optionDesc={t("applog:logSourceDesc.s3.step1.desc3")}
    >
      <RadioGroup
        value={props.value}
        onChange={(e) => {
          props.setValue(e.target.value);
        }}
      >
        <FormControlLabel
          value={IngestionMode.ON_GOING.toString()}
          control={<Radio />}
          label={
            <div>
              <div className="radio-title">
                {t("applog:logSourceDesc.s3.step1.onGoing")}
              </div>
              <div className="radio-desc">
                {t("applog:logSourceDesc.s3.step1.onGoingDesc")}
              </div>
            </div>
          }
        />
        <FormControlLabel
          value={IngestionMode.ONE_TIME.toString()}
          control={<Radio />}
          label={
            <div>
              <div className="radio-title">
                {t("applog:logSourceDesc.s3.step1.oneTimeLoad")}
              </div>
              <div className="radio-desc">
                {t("applog:logSourceDesc.s3.step1.oneTimeLoadDesc")}
              </div>
            </div>
          }
        />
      </RadioGroup>
    </FormItem>
  );
}
