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
import { LAMBDA_CONCURRENCY_DOC_LINK } from "assets/js/const";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";
import ExpandableSection from "components/ExpandableSection";
import ExtLink from "components/ExtLink";
import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import LoadingText from "components/LoadingText";
import PagePanel from "components/PagePanel";
import TextInput from "components/TextInput";
import Tiles from "components/Tiles";
import {
  checkOSIAvailability,
  getAccountUnreservedConurrency,
} from "graphql/queries";
import React, { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { InfoBarTypes } from "reducer/appReducer";
import { Actions, RootState } from "reducer/reducers";
import {
  LogProcessorType,
  SelectProcessorActionTypes,
  getRestUnreservedAccountConcurrency,
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
      const concurrencyData: any = await appSyncRequestQuery(
        getAccountUnreservedConurrency
      );
      console.info("concurrencyData:", concurrencyData);
      dispatch({
        type: SelectProcessorActionTypes.CHANGE_UNRESERVED_CONCURRENCY,
        concurrency: concurrencyData.data.getAccountUnreservedConurrency,
      });
      dispatch({
        type: SelectProcessorActionTypes.SET_SERVICE_AVAILABLE_CHECK_LOADING,
        loading: false,
      });
    } catch (error) {
      dispatch({
        type: SelectProcessorActionTypes.SET_SERVICE_AVAILABLE_CHECK_LOADING,
        loading: false,
      });
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
        <>
          {selectProcessor.logProcessorType === LogProcessorType.LAMBDA && (
            <ExpandableSection
              defaultExpanded={true}
              headerText={t("processor.lambdaConcurrency")}
            >
              <>
                <div className="mb-10">
                  {t("processor.accountConcurrency")}
                  <b>
                    {getRestUnreservedAccountConcurrency(
                      selectProcessor.logProcessorConcurrency,
                      selectProcessor.unreservedAccountConcurrency
                    )}
                  </b>
                </div>
                <FormItem
                  optionTitle={t("processor.configConcurrency")}
                  optionDesc={
                    <Trans
                      i18nKey="processor.configConcurrencyDesc"
                      components={[
                        <ExtLink key="1" to={`${LAMBDA_CONCURRENCY_DOC_LINK}`}>
                          1
                        </ExtLink>,
                      ]}
                    />
                  }
                  errorText={t(selectProcessor.logProcessorConcurrencyError)}
                >
                  <TextInput
                    placeholder="0"
                    className="m-w-45p"
                    type="number"
                    value={selectProcessor.logProcessorConcurrency}
                    onChange={(e) => {
                      dispatch({
                        type: SelectProcessorActionTypes.CHANGE_LAMBDA_CONCURRENCY,
                        concurrency: e.target.value,
                      });
                    }}
                  />
                </FormItem>
              </>
            </ExpandableSection>
          )}
        </>
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
