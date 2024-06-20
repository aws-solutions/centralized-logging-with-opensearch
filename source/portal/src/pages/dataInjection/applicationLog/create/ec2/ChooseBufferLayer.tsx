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
import { AnalyticEngineTypes, ApplicationLogType } from "types";
import SelectBuffer, { BufferType } from "../steps/SelectBuffer";
import BufferKDS from "pages/comps/buffer/BufferKDS";
import BufferS3 from "pages/comps/buffer/BufferS3";
import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";
import FormItem from "components/FormItem";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Dispatch } from "redux";
import { Actions } from "reducer/reducers";
import {
  LogProcessorType,
  SelectProcessorActionTypes,
} from "reducer/selectProcessor";

interface ChooseBufferLayerProps {
  notConfirmNetworkError: boolean;
  engineType?: AnalyticEngineTypes;
  applicationLog: ApplicationLogType;
  setApplicationLog: React.Dispatch<React.SetStateAction<ApplicationLogType>>;
}

const ChooseBufferLayer = (props: ChooseBufferLayerProps) => {
  const {
    applicationLog,
    setApplicationLog,
    engineType = AnalyticEngineTypes.OPENSEARCH,
  } = props;
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<Actions>>();

  return (
    <>
      <SelectBuffer
        engineType={engineType}
        currentBufferLayer={applicationLog.bufferType}
        changeActiveLayer={(type) => {
          // Update processor type to lambda when change buffer type
          dispatch({
            type: SelectProcessorActionTypes.CHANGE_PROCESSOR_TYPE,
            processorType: LogProcessorType.LAMBDA,
          });
          setApplicationLog((prev) => {
            return {
              ...prev,
              bufferType: type,
            };
          });
        }}
      />
      {applicationLog.bufferType === BufferType.KDS && <BufferKDS />}
      {applicationLog.bufferType === BufferType.S3 && (
        <BufferS3 engineType={engineType} />
      )}
      {applicationLog.bufferType === BufferType.NONE && (
        <FormItem
          errorText={
            props.notConfirmNetworkError
              ? t("applog:create.ingestSetting.bufferNoneNotCheckError")
              : ""
          }
        >
          <Alert
            noMargin
            hasConfirmCheck
            confirmed={applicationLog.confirmNetworkChecked}
            type={AlertType.Warning}
            title={t("applog:create.ingestSetting.bufferNoneNetworkTitle")}
            content={t("applog:create.ingestSetting.bufferNoneNetworkDesc")}
            confirmText={t("applog:create.ingestSetting.bufferNoneConfirm")}
            changeConfirmed={(confirm) => {
              setApplicationLog((prev) => {
                return {
                  ...prev,
                  confirmNetworkChecked: confirm,
                };
              });
            }}
          />
        </FormItem>
      )}
    </>
  );
};

export default ChooseBufferLayer;
