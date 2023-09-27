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
import React from "react";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import { useTranslation } from "react-i18next";
import Select from "components/Select/select";

import TextInput from "components/TextInput";
import { PROTOCOL_LIST } from "assets/js/const";
import LoadingText from "components/LoadingText";
import { IngestionFromSysLogPropsType } from "../CreateSyslog";
import Button from "components/Button";

interface IngestSettingProps {
  ingestionInfo: IngestionFromSysLogPropsType;
  loadingProtocol: boolean;
  protocolRequireError: boolean;
  portConfictError: boolean;
  portOutofRangeError: boolean;
  changeSyslogProtocol: (protocol: string) => void;
  enableCustomPort: (enable: boolean) => void;
  changeSyslogPort: (port: string) => void;
}

const StepChooseSyslogSource: React.FC<IngestSettingProps> = (
  props: IngestSettingProps
) => {
  const {
    loadingProtocol,
    ingestionInfo,
    protocolRequireError,
    portConfictError,
    portOutofRangeError,
    changeSyslogProtocol,
    enableCustomPort,
    changeSyslogPort,
  } = props;

  const { t } = useTranslation();
  return (
    <div>
      <HeaderPanel title={t("applog:ingestion.syslog.settings")}>
        <div>
          <FormItem
            optionTitle={t("applog:ingestion.syslog.protocol")}
            optionDesc={t("applog:ingestion.syslog.protocolDesc")}
            errorText={
              protocolRequireError
                ? t("applog:ingestion.syslog.protocolRequire")
                : ""
            }
          >
            <Select
              className="m-w-45p"
              optionList={PROTOCOL_LIST}
              value={ingestionInfo.syslogProtocol}
              onChange={(event) => {
                changeSyslogProtocol(event.target.value);
              }}
              placeholder={t("applog:ingestion.syslog.chooseProtocol")}
            />
          </FormItem>

          <FormItem
            optionTitle={t("applog:ingestion.syslog.port")}
            optionDesc={t("applog:ingestion.syslog.portDesc")}
            errorText={
              (portConfictError
                ? t("applog:ingestion.syslog.portConflict")
                : "") ||
              (portOutofRangeError
                ? t("applog:ingestion.syslog.portOutofRange")
                : "")
            }
          >
            {loadingProtocol ? (
              <LoadingText />
            ) : (
              <div className="flex align-center">
                <div>
                  <TextInput
                    placeholder="500 ~ 20000"
                    readonly={!ingestionInfo.syslogPortEnable}
                    type="number"
                    value={ingestionInfo.syslogPort}
                    onChange={(event) => {
                      changeSyslogPort(event.target.value);
                    }}
                  />
                </div>
                <div className="pl-10">
                  {ingestionInfo.syslogProtocol &&
                    !ingestionInfo.syslogPortEnable && (
                      <Button
                        onClick={() => {
                          enableCustomPort(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                </div>
              </div>
            )}
          </FormItem>
        </div>
      </HeaderPanel>
    </div>
  );
};

export default StepChooseSyslogSource;
