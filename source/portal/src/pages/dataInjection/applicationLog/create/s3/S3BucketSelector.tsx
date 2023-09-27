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

import React, { useState, useEffect } from "react";
import { appSyncRequestQuery } from "assets/js/request";
import { Resource, ResourceType } from "API";
import AutoComplete, { OptionType } from "components/AutoComplete/autoComplete";
import { useTranslation } from "react-i18next";
import { listResources } from "graphql/queries";
import FormItem from "components/FormItem";
import { Validator } from "pages/comps/Validator";
import { useAutoValidation } from "assets/js/hooks/useAutoValidation";

interface S3BucketSelectorProps {
  value: OptionType | null;
  setValue: React.Dispatch<React.SetStateAction<OptionType | null>>;
  validator: Validator;
}
export const S3BucketSelector: React.FC<S3BucketSelectorProps> = (
  props: S3BucketSelectorProps
) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [buckets, setBuckets] = useState<Resource[]>([]);

  const listBuckets = async (accountId: string): Promise<Resource[]> => {
    const resp = await appSyncRequestQuery(listResources, {
      type: ResourceType.S3Bucket,
      accountId: accountId,
    });
    return resp.data.listResources;
  };

  useEffect(() => {
    (async () => {
      setBuckets(await listBuckets(""));
      setIsLoading(false);
    })().catch(console.error);
  }, []);
  useAutoValidation(props.validator, [props.value]);

  return (
    <FormItem
      optionTitle={t("applog:ingestion.s3.specifySource.s3")}
      optionDesc={t("applog:logSourceDesc.s3.step1.desc")}
      errorText={props.validator.error}
    >
      <AutoComplete
        outerLoading
        className="m-w-75p"
        placeholder={t("servicelog:s3.selectBucket")}
        loading={isLoading}
        optionList={buckets.map((each) => ({
          name: each.name,
          value: each.id,
        }))}
        value={props.value}
        onChange={(_, data) => props.setValue(data)}
      />
    </FormItem>
  );
};
