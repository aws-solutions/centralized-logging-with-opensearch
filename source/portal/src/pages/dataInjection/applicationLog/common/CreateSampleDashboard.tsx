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
import { LogType } from "API";
import FormItem from "components/FormItem";
import React from "react";
import { useTranslation } from "react-i18next";
import { InfoBarTypes } from "reducer/appReducer";
import { YesNo } from "types";

interface CreateSampleDashboardProps {
  logType: LogType | null | undefined;
  createDashboard: string;
  changeSampleDashboard: (yesNo: string) => void;
}

const CreateSampleDashboard: React.FC<CreateSampleDashboardProps> = (
  props: CreateSampleDashboardProps
) => {
  const { logType, createDashboard, changeSampleDashboard } = props;
  const { t } = useTranslation();

  return (
    <div>
      {logType === LogType.Nginx || logType === LogType.Apache ? (
        <>
          <hr />
          <FormItem
            infoType={
              logType === LogType.Apache
                ? InfoBarTypes.APACHE_SAMPLE_DASHBOARD
                : InfoBarTypes.SAMPLE_DASHBAORD
            }
            optionTitle={t("servicelog:cluster.sampleDashboard")}
            optionDesc={t("servicelog:cluster.sampleDashboardDesc")}
          >
            {Object.values(YesNo).map((key) => {
              return (
                <div key={key}>
                  <label>
                    <input
                      value={createDashboard}
                      onChange={(event) => {
                        console.info(event);
                      }}
                      onClick={() => {
                        console.info(key);
                        changeSampleDashboard(key);
                      }}
                      checked={createDashboard === key}
                      name="sampleDashboard"
                      type="radio"
                    />{" "}
                    {t(key.toLocaleLowerCase())}
                  </label>
                </div>
              );
            })}
          </FormItem>
        </>
      ) : (
        ""
      )}
    </div>
  );
};

export default CreateSampleDashboard;
