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
import Alert from "components/Alert";
import PagePanel from "components/PagePanel";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import { AmplifyConfigType, CreationMethod } from "types";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { AppStateProps } from "reducer/appReducer";
import ExtLink from "components/ExtLink";
import AutoComplete from "components/AutoComplete";
import { OptionType } from "components/AutoComplete/autoComplete";
import ValueWithLabel from "components/ValueWithLabel";
import { EksIngestionPropsType } from "../EksLogIngest";
import { appSyncRequestQuery } from "assets/js/request";
import { listAppPipelines } from "graphql/queries";
import { AppPipeline, BufferType, PipelineStatus } from "API";
import {
  buildESLink,
  buildKDSLink,
  buildS3Link,
  formatLocalTime,
} from "assets/js/utils";
import LoadingText from "components/LoadingText";
import { getParamValueByKey } from "assets/js/applog";

interface SpecifySettingProps {
  eksIngestionInfo: EksIngestionPropsType;
  changeExistsPipeline: (pipeline: OptionType) => void;
}

const SpecifySettings: React.FC<SpecifySettingProps> = (
  props: SpecifySettingProps
) => {
  const { t } = useTranslation();
  const { eksIngestionInfo, changeExistsPipeline } = props;
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );

  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [pipelineOptionList, setPipelineOptionList] = useState<OptionType[]>(
    []
  );
  const [pipelineIdMap, setPipelineIdMap] = useState<any>();

  // Get Application Log List
  const getApplicationLogList = async () => {
    try {
      setLoadingPipeline(true);
      const resData: any = await appSyncRequestQuery(listAppPipelines, {
        page: 1,
        count: 999,
      });
      console.info("resData:", resData);
      const tmpOptionList: OptionType[] = [];
      const appPipelineArr: AppPipeline[] =
        resData.data.listAppPipelines.appPipelines;
      const tmpPipelineIdMap: any = {};

      appPipelineArr.forEach((element) => {
        if (
          element.aosParams?.domainName ===
            eksIngestionInfo.aosParams.domainName &&
          element.status === PipelineStatus.ACTIVE
        ) {
          tmpOptionList.push({
            name: `[${element.bufferType}] ${element.id}(${element.aosParams.indexPrefix})`,
            value: element.id,
            description: element.bufferAccessRoleArn || "",
            bufferType: element.bufferType || "",
          });
          tmpPipelineIdMap[element.id] = element;
        }
      });
      setPipelineOptionList(tmpOptionList);
      setPipelineIdMap(tmpPipelineIdMap);
      setLoadingPipeline(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (eksIngestionInfo.createMethod === CreationMethod.Exists) {
      getApplicationLogList();
    }
  }, [eksIngestionInfo.createMethod]);

  return (
    <div>
      <PagePanel title={t("ekslog:ingest.step.specifyPipeline")}>
        <Alert
          content={
            <div>
              {t("ekslog:ingest.specifyPipeline.alert")}{" "}
              <b>{eksIngestionInfo.aosParams.domainName}</b>
            </div>
          }
        />
      </PagePanel>

      {eksIngestionInfo.createMethod === CreationMethod.Exists && (
        <>
          <HeaderPanel
            title={t("ekslog:ingest.specifyPipeline.choosePipeline")}
          >
            <FormItem
              optionTitle={t("ekslog:ingest.specifyPipeline.pipeline")}
              optionDesc={t("ekslog:ingest.specifyPipeline.filterPipeline")}
              errorText={
                eksIngestionInfo.pipelineRequiredError
                  ? t("ekslog:ingest.specifyPipeline.pipelineRequiredError")
                  : ""
              }
            >
              <AutoComplete
                outerLoading
                className="m-w-75p"
                placeholder={t("ekslog:ingest.specifyPipeline.selectPipeline")}
                loading={loadingPipeline}
                optionList={pipelineOptionList}
                value={eksIngestionInfo.existsPipeline}
                onChange={(
                  event: React.ChangeEvent<HTMLInputElement>,
                  data
                ) => {
                  console.info(event, data);
                  changeExistsPipeline(data);
                }}
              />
            </FormItem>
          </HeaderPanel>
          {eksIngestionInfo.existsPipeline?.value && (
            <HeaderPanel
              title={t("ekslog:ingest.specifyPipeline.pipelineConfig")}
            >
              <>
                {loadingPipeline ? (
                  <LoadingText />
                ) : (
                  <div className="flex value-label-span">
                    <div className="flex-1">
                      <ValueWithLabel
                        label={t("ekslog:ingest.specifyPipeline.osIndexPrefix")}
                      >
                        {
                          pipelineIdMap?.[eksIngestionInfo.existsPipeline.value]
                            ?.aosParams.indexPrefix
                        }
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel
                        label={`${t("ekslog:ingest.detail.bufferLayer")}(${
                          pipelineIdMap?.[eksIngestionInfo.existsPipeline.value]
                            ?.bufferType
                        })`}
                      >
                        <>
                          {pipelineIdMap?.[
                            eksIngestionInfo.existsPipeline.value
                          ]?.bufferType === BufferType.KDS && (
                            <div>
                              <ExtLink
                                to={buildKDSLink(
                                  amplifyConfig.aws_project_region,
                                  pipelineIdMap?.[
                                    eksIngestionInfo.existsPipeline.value
                                  ].bufferResourceName || "-"
                                )}
                              >
                                {pipelineIdMap?.[
                                  eksIngestionInfo.existsPipeline.value
                                ].bufferResourceName || "-"}
                              </ExtLink>
                              {getParamValueByKey(
                                "enableAutoScaling",
                                pipelineIdMap?.[
                                  eksIngestionInfo.existsPipeline.value
                                ]?.bufferParams
                              ) === "true"
                                ? t("applog:detail.autoScaling")
                                : ""}
                            </div>
                          )}
                          {pipelineIdMap?.[
                            eksIngestionInfo.existsPipeline.value
                          ]?.bufferType === BufferType.S3 && (
                            <>
                              <ExtLink
                                to={buildS3Link(
                                  amplifyConfig.aws_project_region,
                                  getParamValueByKey(
                                    "logBucketName",
                                    pipelineIdMap?.[
                                      eksIngestionInfo.existsPipeline.value
                                    ]?.bufferParams
                                  ) || ""
                                )}
                              >
                                {getParamValueByKey(
                                  "logBucketName",
                                  pipelineIdMap?.[
                                    eksIngestionInfo.existsPipeline.value
                                  ]?.bufferParams
                                ) || "-"}
                              </ExtLink>
                            </>
                          )}
                          {pipelineIdMap?.[
                            eksIngestionInfo.existsPipeline.value
                          ]?.bufferType === BufferType.None && (
                            <div>{t("none")}</div>
                          )}
                        </>
                      </ValueWithLabel>
                    </div>
                    <div className="flex-1 border-left-c">
                      <ValueWithLabel
                        label={t("ekslog:ingest.specifyPipeline.aos")}
                      >
                        <ExtLink
                          to={buildESLink(
                            amplifyConfig.aws_project_region,
                            pipelineIdMap?.[
                              eksIngestionInfo.existsPipeline.value
                            ]?.aosParams?.domainName || ""
                          )}
                        >
                          {
                            pipelineIdMap?.[
                              eksIngestionInfo.existsPipeline.value
                            ]?.aosParams?.domainName
                          }
                        </ExtLink>
                      </ValueWithLabel>
                    </div>

                    <div className="flex-1 border-left-c">
                      <ValueWithLabel
                        label={t("ekslog:ingest.specifyPipeline.created")}
                      >
                        <div>
                          {formatLocalTime(
                            pipelineIdMap?.[
                              eksIngestionInfo.existsPipeline.value
                            ]?.createdDt || ""
                          )}
                        </div>
                      </ValueWithLabel>
                    </div>
                  </div>
                )}
              </>
            </HeaderPanel>
          )}
        </>
      )}
    </div>
  );
};

export default SpecifySettings;
