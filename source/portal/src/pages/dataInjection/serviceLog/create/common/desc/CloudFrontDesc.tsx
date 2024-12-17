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
import FormControlLabel from "@material-ui/core/FormControlLabel";
import RadioGroup from "@material-ui/core/RadioGroup";
import { DestinationType } from "API";
import FormItem from "components/FormItem";
import Radio from "components/Radio";
import React from "react";

import { useTranslation } from "react-i18next";

export interface CloudFrontDescProps {
  ingestLogType: string;
  changeIngestLogType: (ingestLogType: string) => void;
  region: string;
}

const CloudFrontDesc: React.FC<CloudFrontDescProps> = (
  props: CloudFrontDescProps
) => {
  const { t } = useTranslation();
  const { ingestLogType, changeIngestLogType, region } = props;
  return (
    <div>
      <div className="ingest-desc-title">
        {t("servicelog:create.service.cloudfront")}
      </div>
      <div className="ingest-desc-desc">
        {t("servicelog:cloudfront.desc.ingest")}
      </div>
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
              value={DestinationType.S3}
              control={<Radio />}
              label={t(`servicelog:create.ingestType${DestinationType.S3}`)}
            />
            {!region.startsWith("cn") && (
              <FormControlLabel
                value={DestinationType.KDS}
                control={<Radio />}
                label={t(`servicelog:create.ingestType${DestinationType.KDS}`)}
              />
            )}
          </RadioGroup>
        </FormItem>
      </div>
    </div>
  );
};

export default CloudFrontDesc;
