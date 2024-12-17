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
import { FormControlLabel, RadioGroup } from "@material-ui/core";
import FormItem from "components/FormItem";
import Radio from "components/Radio";
import React from "react";
import { useTranslation } from "react-i18next";
import { RDSIngestOption } from "types";

export interface RDSDescProps {
  ingestLogType: string;
  changeIngestLogType: (ingestLogType: string) => void;
}

const RDSDesc: React.FC<RDSDescProps> = (props: RDSDescProps) => {
  const { t } = useTranslation();
  const { ingestLogType, changeIngestLogType } = props;
  return (
    <div>
      <div className="ingest-desc-title">
        {t("servicelog:create.service.rds")}
      </div>
      <div className="ingest-desc-desc">{t("servicelog:rds.desc.ingest")}</div>
      <div className="mt-10">
        <FormItem
          optionTitle={t("servicelog:create.ingestLogType")}
          optionDesc={t("servicelog:create.ingestLogTypeDesc")}
        >
          <RadioGroup
            className="radio-group"
            value={ingestLogType}
            onChange={(e) => {
              changeIngestLogType(e.target.value);
            }}
          >
            <FormControlLabel
              value={RDSIngestOption.MySQL}
              control={<Radio />}
              label={t(`servicelog:create.ingestType${RDSIngestOption.MySQL}`)}
            />
            <FormControlLabel
              value={RDSIngestOption.PostgreSQL}
              control={<Radio />}
              label={t(
                `servicelog:create.ingestType${RDSIngestOption.PostgreSQL}`
              )}
            />
          </RadioGroup>
        </FormItem>
      </div>
    </div>
  );
};

export default RDSDesc;
