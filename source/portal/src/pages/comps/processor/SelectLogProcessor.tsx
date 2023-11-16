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
import { appSyncRequestMutation } from "assets/js/request";
import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";
import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import LoadingText from "components/LoadingText";
import PagePanel from "components/PagePanel";
import TextInput from "components/TextInput";
import Tiles from "components/Tiles";
import { checkOSIAvailability } from "graphql/queries";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { InfoBarTypes } from "reducer/appReducer";
import { Actions, RootState } from "reducer/reducers";
import {
  LogProcessorType,
  SelectProcessorActionTypes,
} from "reducer/selectProcessor";
import { Dispatch } from "redux";

interface SelectProcessorProps {
  supportOSI: boolean;
  enablePlugins?: boolean;
}

const SelectLogProcessor: React.FC<SelectProcessorProps> = (
  props: SelectProcessorProps
) => {
  const { t } = useTranslation();
  const { supportOSI, enablePlugins } = props;
  const selectProcessor = useSelector(
    (state: RootState) => state.selectProcessor
  );
  const dispatch = useDispatch<Dispatch<Actions>>();
  const checkOSIServiceAvailable = async () => {
    try {
      dispatch({
        type: SelectProcessorActionTypes.SET_SERVICE_AVAILABLE_CHECK_LOADING,
        loading: true,
      });
      const resData: any = await appSyncRequestMutation(checkOSIAvailability, {
        maxResults: 1,
        nextToken: "",
      });
      const available: boolean = resData.data.checkOSIAvailability;
      dispatch({
        type: SelectProcessorActionTypes.SET_SERVICE_AVAILABLE_CHECK,
        available: available,
      });
      dispatch({
        type: SelectProcessorActionTypes.SET_SERVICE_AVAILABLE_CHECK_LOADING,
        loading: false,
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!selectProcessor.serviceAvailableChecked) {
      checkOSIServiceAvailable();
    }
  }, [selectProcessor.serviceAvailableChecked]);

  if (selectProcessor.serviceAvailableCheckedLoading) {
    return (
      <PagePanel title={t("processor.selectLogProcessor")}>
        <HeaderPanel title={t("processor.logProcessorSettings")}>
          <LoadingText />
        </HeaderPanel>
      </PagePanel>
    );
  }

  return (
    <PagePanel title={t("processor.selectLogProcessor")}>
      <HeaderPanel title={t("processor.logProcessorSettings")}>
        <FormItem optionTitle={t("processor.logProcessorType")}>
          <Tiles
            onChange={(e) => {
              dispatch({
                type: SelectProcessorActionTypes.CHANGE_PROCESSOR_TYPE,
                processorType: e.target.value,
              });
            }}
            value={selectProcessor.logProcessorType}
            items={[
              {
                label: "Lambda",
                description: t("processor.lambdaDesc"),
                value: LogProcessorType.LAMBDA,
              },
              ...(supportOSI && selectProcessor.serviceAvailable
                ? [
                    {
                      label: "OSI",
                      description: t("processor.osiDesc"),
                      value: LogProcessorType.OSI,
                      infoSpanType: InfoBarTypes.OSI_PIPELINE,
                    },
                  ]
                : []),
            ]}
          />
        </FormItem>
      </HeaderPanel>
      <>
        {selectProcessor.logProcessorType === LogProcessorType.OSI && (
          <>
            <HeaderPanel
              title={t("processor.pipelineCapacity")}
              desc={t("processor.pipelineCapacityDesc")}
            >
              <FormItem
                optionTitle={t("processor.min")}
                errorText={t(selectProcessor.minOCUError)}
              >
                <TextInput
                  placeholder="1"
                  className="m-w-45p"
                  type="number"
                  value={selectProcessor.minOCU}
                  onChange={(e) => {
                    dispatch({
                      type: SelectProcessorActionTypes.CHANGE_MIN_OCU,
                      minOCU: e.target.value,
                    });
                  }}
                />
              </FormItem>

              <FormItem
                optionTitle={t("processor.max")}
                errorText={t(selectProcessor.maxOCUError)}
              >
                <TextInput
                  placeholder="4"
                  className="m-w-45p"
                  type="number"
                  value={selectProcessor.maxOCU}
                  onChange={(e) => {
                    dispatch({
                      type: SelectProcessorActionTypes.CHANGE_MAX_OCU,
                      maxOCU: e.target.value,
                    });
                  }}
                />
              </FormItem>

              <Alert content={t("processor.minMaxTips")} />
            </HeaderPanel>
            {enablePlugins && (
              <div className="mt-m10">
                <Alert
                  type={AlertType.Warning}
                  content={t("processor.disabledEnrich")}
                />
              </div>
            )}
          </>
        )}
      </>
    </PagePanel>
  );
};

export default SelectLogProcessor;
