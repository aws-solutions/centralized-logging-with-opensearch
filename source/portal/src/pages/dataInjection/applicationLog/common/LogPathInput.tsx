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
import FormItem from "components/FormItem";
import React from "react";
import { useTranslation } from "react-i18next";
import { InfoBarTypes } from "reducer/appReducer";
import TextInput from "components/TextInput";
import { LogSourceType } from "API";
import { Validator } from "pages/comps/Validator";
import { useAutoValidation } from "assets/js/hooks/useAutoValidation";

interface LogPathInputProps {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  validator: Validator;
  logSourceType?: LogSourceType;
}

export default function LogPathInput(props: LogPathInputProps) {
  useAutoValidation(props.validator, [props.value]);
  const { t } = useTranslation();
  return (
    <div className="mt-20">
      <FormItem
        infoType={
          props.logSourceType === LogSourceType.EKSCluster
            ? InfoBarTypes.LOG_CONFIG_PATH_EKS
            : InfoBarTypes.LOG_CONFIG_PATH
        }
        optionTitle={t("applog:list.logPath")}
        optionDesc={
          props.logSourceType === LogSourceType.EKSCluster
            ? t("resource:config.common.logPathDescEKS")
            : t("applog:logSourceDesc.ec2.step2.logPathDesc")
        }
        errorText={props.validator.error}
      >
        <div className="flex align-center m-w-75p">
          <div style={{ flex: 1 }}>
            <TextInput
              value={props.value}
              placeholder={
                props.logSourceType === LogSourceType.EKSCluster
                  ? "/var/log/containers/<application_name>-*_<namespace>_<container_name>-*"
                  : "/var/log/app1/*.log, /var/log/app2/*.log"
              }
              onChange={(e) => {
                props.setValue(e.target.value);
              }}
            />
          </div>
        </div>
      </FormItem>
    </div>
  );
}
