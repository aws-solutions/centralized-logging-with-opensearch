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
import { DestinationType } from "API";
import FormItem from "components/FormItem";
import Radio from "components/Radio";
import React from "react";

import { useTranslation } from "react-i18next";

interface CloudTrailDescProps {
  ingestLogType: string;
  changeIngestLogType: (type: string) => void;
  region: string;
}

const CloudTrailDesc: React.FC<CloudTrailDescProps> = (
  props: CloudTrailDescProps
) => {
  const { t } = useTranslation();
  const { ingestLogType, changeIngestLogType, region } = props;

  return (
    <div>
      <div className="ingest-desc-title">
        {t("servicelog:create.service.trail")}
      </div>
      <div className="ingest-desc-desc mb-20">
        {t("servicelog:trail.desc.ingest")}
      </div>
      <div className="mt-10">
        <FormItem
          optionTitle={t("servicelog:create.source")}
          optionDesc={t("servicelog:create.sourceDesc")}
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
              label={t(`servicelog:create.ingestTypeAmazonS3`)}
            />
            {!region.startsWith("cn") && (
              <FormControlLabel
                value={DestinationType.CloudWatch}
                control={<Radio />}
                label={t(
                  `servicelog:create.ingestType${DestinationType.CloudWatch}`
                )}
              />
            )}
          </RadioGroup>
        </FormItem>
      </div>
    </div>
  );
};

export default CloudTrailDesc;
