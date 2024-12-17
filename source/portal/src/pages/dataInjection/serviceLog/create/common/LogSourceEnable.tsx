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
import { CreateLogMethod } from "assets/js/const";
import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import Tiles from "components/Tiles";
import React from "react";
import { useTranslation } from "react-i18next";
import { InfoBarTypes } from "reducer/appReducer";

interface LogSourceEnableProps {
  value: string;
  onChange: (value: string) => void;
  disabledManual?: boolean;
}
const LogSourceEnable: React.FC<LogSourceEnableProps> = (
  props: LogSourceEnableProps
) => {
  const { t } = useTranslation();
  const { value, onChange, disabledManual } = props;
  return (
    <HeaderPanel
      infoType={InfoBarTypes.INGESTION_CREATION_METHOD}
      title={t("servicelog:create.logSourceEnable")}
      desc={t("servicelog:create.logSourceEnableDesc")}
    >
      <div>
        <FormItem optionTitle="" optionDesc="">
          <Tiles
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
            }}
            items={[
              {
                label: t("servicelog:create.auto"),
                description: t("servicelog:create.autoDesc"),
                value: CreateLogMethod.Automatic,
              },
              {
                disabled: disabledManual,
                label: t("servicelog:create.manual"),
                description: t("servicelog:create.manualDesc"),
                value: CreateLogMethod.Manual,
              },
            ]}
          />
        </FormItem>
      </div>
    </HeaderPanel>
  );
};

export default LogSourceEnable;
