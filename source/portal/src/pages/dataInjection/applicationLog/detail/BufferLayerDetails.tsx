import { AnalyticEngineType, AppPipeline, BufferType } from "API";
import { buildKDSLink, buildS3Link, defaultStr } from "assets/js/utils";
import ExtLink from "components/ExtLink";
import React, { useMemo } from "react";
import { AmplifyConfigType, S3_STORAGE_CLASS_OPTIONS } from "types";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { getParamValueByKey } from "assets/js/applog";
import { RootState } from "reducer/reducers";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import HeaderPanel from "components/HeaderPanel";
import Alert from "components/Alert";

interface BufferLayerDetailsProps {
  pipelineInfo: AppPipeline | undefined;
}

const BufferLayerDetails: React.FC<BufferLayerDetailsProps> = (
  props: BufferLayerDetailsProps
) => {
  const curPipeline = props.pipelineInfo;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const isLightEngine = useMemo(
    () => curPipeline?.engineType === AnalyticEngineType.LightEngine,
    [curPipeline]
  );

  if (curPipeline?.bufferType === BufferType.S3) {
    return (
      <HeaderWithValueLabel
        numberOfColumns={3}
        headerTitle={t("applog:detail.tab.bufferLayer")}
        dataList={[
          {
            label: t("resource:config.detail.type"),
            data: t("applog:create.ingestSetting.bufferS3"),
          },
          {
            label: t("pipeline.detail.resource"),
            data: (
              <ExtLink
                to={buildS3Link(
                  amplifyConfig.aws_project_region,
                  defaultStr(curPipeline.bufferResourceName)
                )}
              >
                {defaultStr(curPipeline.bufferResourceName, "-")}
              </ExtLink>
            ),
          },
          {
            label: t("pipeline.detail.bucketPrefix"),
            data:
              getParamValueByKey(
                "logBucketPrefix",
                curPipeline?.bufferParams
              ) || "-",
          },
          {
            label: t("applog:create.ingestSetting.s3StorageClass"),
            data: S3_STORAGE_CLASS_OPTIONS.find((element) => {
              return (
                getParamValueByKey(
                  "s3StorageClass",
                  curPipeline?.bufferParams
                ) === element.value
              );
            })?.name,
          },
          ...(isLightEngine
            ? []
            : [
                {
                  label: t("applog:create.ingestSetting.compressionMethod"),
                  data: getParamValueByKey(
                    "compressionType",
                    curPipeline?.bufferParams
                  ),
                },
                {
                  label: t("applog:create.ingestSetting.bufferInt"),
                  data:
                    getParamValueByKey(
                      "uploadTimeout",
                      curPipeline?.bufferParams
                    ) || "-",
                },
                {
                  label: t("applog:create.ingestSetting.bufferSize"),
                  data:
                    getParamValueByKey(
                      "maxFileSize",
                      curPipeline?.bufferParams
                    ) || "-",
                },
              ]),
        ]}
      />
    );
  }

  if (curPipeline?.bufferType === BufferType.KDS) {
    return (
      <HeaderWithValueLabel
        headerTitle={t("applog:detail.tab.bufferLayer")}
        dataList={[
          {
            label: t("resource:config.detail.type"),
            data: t("applog:create.ingestSetting.bufferKDS"),
          },
          {
            label: t("pipeline.detail.resource"),
            data: (
              <ExtLink
                to={buildKDSLink(
                  amplifyConfig.aws_project_region,
                  defaultStr(curPipeline.bufferResourceName)
                )}
              >
                {defaultStr(curPipeline.bufferResourceName, "-")}
              </ExtLink>
            ),
          },
          {
            label: t("applog:detail.shardNumber"),
            data:
              getParamValueByKey("OpenShardCount", curPipeline?.bufferParams) ||
              "-",
          },
          {
            label: t("applog:detail.enabledAutoScaling"),
            data:
              getParamValueByKey(
                "enableAutoScaling",
                curPipeline?.bufferParams
              ) || "-",
          },
          {
            label: t("applog:detail.maxShardNum"),
            data:
              getParamValueByKey("maxCapacity", curPipeline?.bufferParams) ||
              "-",
          },
        ]}
      />
    );
  }

  if (curPipeline?.bufferType === BufferType.None) {
    return (
      <HeaderPanel title={t("applog:detail.tab.bufferLayer")}>
        <Alert
          title={t("applog:detail.noBuffer")}
          content={t("applog:detail.noBufferDesc")}
        />
      </HeaderPanel>
    );
  }
};

export default BufferLayerDetails;
