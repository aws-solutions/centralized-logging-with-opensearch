/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React, { useState, useEffect } from "react";

import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import Alert from "components/Alert";
import AutoComplete from "components/AutoComplete";
import FormItem from "components/FormItem";
import { appSyncRequestQuery } from "assets/js/request";
import { Resource, ResourceType } from "API";
import { SelectItem } from "components/Select/select";
import { listResources } from "graphql/queries";
import { OptionType } from "components/AutoComplete/autoComplete";
import { LambdaTaskProps } from "../CreateLambda";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";
import { buildLambdaLink } from "assets/js/utils";
import { useTranslation } from "react-i18next";

interface SpecifySettingsProps {
  LambdaTask: LambdaTaskProps;
  changeLambdaObj: (lambda: OptionType) => void;
  lambdaEmptyError: boolean;
}

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const { t } = useTranslation();
  const { LambdaTask, changeLambdaObj, lambdaEmptyError } = props;
  const [lambda, setLambda] = useState<OptionType | null>(
    LambdaTask.params.curLambdaObj
  );
  const [lambdaOptionList, setLambdaOptionList] = useState<SelectItem[]>([]);
  const [loadingLambda, setLoadingLambda] = useState(false);

  const getLambdaFunctionList = async () => {
    try {
      setLoadingLambda(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.Lambda,
      });
      console.info("domainNames:", resData.data);
      const dataList: Resource[] = resData.data.listResources;
      const tmpOptionList: SelectItem[] = [];
      dataList.forEach((element) => {
        tmpOptionList.push({
          name: `${element.name}`,
          value: element.id,
        });
      });
      setLambdaOptionList(tmpOptionList);
      setLoadingLambda(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getLambdaFunctionList();
  }, []);

  return (
    <div>
      <PagePanel title={t("servicelog:create.step.specifySetting")}>
        <div>
          <HeaderPanel title={t("servicelog:create.service.lambda")}>
            <div>
              <Alert content={t("servicelog:lambda.alert")} />
              <div className="pb-50">
                <FormItem
                  optionTitle={t("servicelog:lambda.name")}
                  optionDesc={
                    <div>
                      {t("servicelog:lambda.nameDesc")}
                      <ExtLink
                        to={buildLambdaLink(
                          "",
                          amplifyConfig.aws_project_region
                        )}
                      >
                        {t("servicelog:lambda.curAccount")}
                      </ExtLink>
                      .
                    </div>
                  }
                  errorText={
                    lambdaEmptyError ? t("servicelog:lambda.lambdaError") : ""
                  }
                >
                  <AutoComplete
                    className="m-w-75p"
                    placeholder={t("servicelog:lambda.selectLambda")}
                    loading={loadingLambda}
                    optionList={lambdaOptionList}
                    value={lambda}
                    onChange={(
                      event: React.ChangeEvent<HTMLInputElement>,
                      data
                    ) => {
                      setLambda(data);
                      changeLambdaObj(data);
                    }}
                  />
                </FormItem>
              </div>
            </div>
          </HeaderPanel>
        </div>
      </PagePanel>
    </div>
  );
};

export default SpecifySettings;
