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

import HeaderPanel from "components/HeaderPanel";
import PagePanel from "components/PagePanel";
import Alert from "components/Alert";
import AutoComplete from "components/AutoComplete";
import FormItem from "components/FormItem";
import { appSyncRequestQuery } from "assets/js/request";
import { LoggingBucket, Resource, ResourceType } from "API";
import { SelectItem } from "components/Select/select";
import { getResourceLoggingBucket, listResources } from "graphql/queries";
import { OptionType } from "components/AutoComplete/autoComplete";
import { LambdaTaskProps } from "../CreateLambda";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { buildLambdaLink } from "assets/js/utils";
import { useTranslation } from "react-i18next";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import { RootState } from "reducer/reducers";

interface SpecifySettingsProps {
  lambdaTask: LambdaTaskProps;
  changeLambdaObj: (lambda: OptionType | null) => void;
  lambdaEmptyError: boolean;
  changeCrossAccount: (id: string) => void;
  changeLambdaBucket: (bucket: string, prefix: string) => void;
  setISChanging: (changing: boolean) => void;
}

const SpecifySettings: React.FC<SpecifySettingsProps> = (
  props: SpecifySettingsProps
) => {
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const { t } = useTranslation();
  const {
    lambdaTask,
    changeLambdaObj,
    changeLambdaBucket,
    setISChanging,
    lambdaEmptyError,
    changeCrossAccount,
  } = props;

  const [lambdaOptionList, setLambdaOptionList] = useState<SelectItem[]>([]);
  const [loadingLambda, setLoadingLambda] = useState(false);
  const [disableLambda, setDisableLambda] = useState(false);

  const getLambdaBucketPrefix = async (lambdaId: string) => {
    setISChanging(true);
    const resData: any = await appSyncRequestQuery(getResourceLoggingBucket, {
      type: ResourceType.Lambda,
      resourceName: lambdaId,
      accountId: lambdaTask.logSourceAccountId,
      region: amplifyConfig.aws_project_region,
    });
    const logginBucket: LoggingBucket = resData?.data?.getResourceLoggingBucket;
    changeLambdaBucket(logginBucket?.bucket || "", logginBucket.prefix || "");
    setISChanging(false);
  };

  const getLambdaFunctionList = async (accountId: string) => {
    try {
      setLambdaOptionList([]);
      setLoadingLambda(true);
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.Lambda,
        accountId: accountId,
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
    getLambdaFunctionList(lambdaTask.logSourceAccountId);
  }, [lambdaTask.logSourceAccountId]);

  useEffect(() => {
    if (lambdaTask.params.curLambdaObj?.value) {
      // get lambda bucket info
      getLambdaBucketPrefix(lambdaTask.params.curLambdaObj.value);
    }
  }, [lambdaTask.params.curLambdaObj]);

  return (
    <div>
      <PagePanel title={t("servicelog:create.step.specifySetting")}>
        <div>
          <HeaderPanel title={t("servicelog:create.service.lambda")}>
            <div>
              <Alert content={t("servicelog:lambda.alert")} />
              <div className="pb-50">
                <CrossAccountSelect
                  disabled={loadingLambda}
                  accountId={lambdaTask.logSourceAccountId}
                  changeAccount={(id) => {
                    changeCrossAccount(id);
                    changeLambdaObj(null);
                  }}
                  loadingAccount={(loading) => {
                    setDisableLambda(loading);
                  }}
                />
                <FormItem
                  optionTitle={t("servicelog:lambda.name")}
                  optionDesc={
                    <div>
                      {t("servicelog:lambda.nameDesc")}
                      <ExtLink
                        to={buildLambdaLink(
                          amplifyConfig.aws_project_region,
                          ""
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
                    outerLoading
                    disabled={disableLambda || loadingLambda}
                    className="m-w-75p"
                    placeholder={t("servicelog:lambda.selectLambda")}
                    loading={loadingLambda}
                    optionList={lambdaOptionList}
                    value={lambdaTask.params.curLambdaObj}
                    onChange={(
                      event: React.ChangeEvent<HTMLInputElement>,
                      data
                    ) => {
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
