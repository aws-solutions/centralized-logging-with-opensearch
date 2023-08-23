import { AppPipeline, BufferType } from "API";
import { buildKDSLink, buildS3Link, formatLocalTime } from "assets/js/utils";
import ExtLink from "components/ExtLink";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import React from "react";
import { AmplifyConfigType, S3_STORAGE_CLASS_OPTIONS } from "types";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { getParamValueByKey } from "assets/js/applog";
import { RootState } from "reducer/reducers";

interface BufferLayerDetailsProps {
  pipelineInfo: AppPipeline | undefined;
}

export default function BufferLayerDetails(props: BufferLayerDetailsProps) {
  const curPipeline = props.pipelineInfo;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  return (
    <HeaderPanel title={t("applog:detail.tab.bufferLayer")}>
      <div className="flex value-label-span">
        <div className="flex-1">
          <ValueWithLabel label={t("resource:config.detail.type")}>
            <div>{curPipeline?.bufferType}</div>
          </ValueWithLabel>
        </div>
        <div className="flex-1 border-left-c">
          {curPipeline?.bufferType === BufferType.S3 && (
            <ValueWithLabel label={t("applog:detail.bucket")}>
              <ExtLink
                to={buildS3Link(
                  amplifyConfig.aws_project_region,
                  curPipeline.bufferResourceName || "-"
                )}
              >
                {curPipeline.bufferResourceName || "-"}
              </ExtLink>
            </ValueWithLabel>
          )}
          {curPipeline?.bufferType === BufferType.KDS && (
            <ValueWithLabel label={t("applog:detail.kds")}>
              <ExtLink
                to={buildKDSLink(
                  amplifyConfig.aws_project_region,
                  curPipeline.bufferResourceName || "-"
                )}
              >
                {curPipeline.bufferResourceName || "-"}
              </ExtLink>
            </ValueWithLabel>
          )}
          {curPipeline?.bufferType === BufferType.None && (
            <ValueWithLabel label={t("applog:detail.noneBuffer")}>
              <div>{t("none")}</div>
            </ValueWithLabel>
          )}
        </div>
        <div className="flex-1 border-left-c">
          <ValueWithLabel label={t("applog:detail.created")}>
            <div>{formatLocalTime(curPipeline?.createdAt || "-")}</div>
          </ValueWithLabel>
        </div>
      </div>
      <>
        {curPipeline?.bufferType === BufferType.S3 && (
          <>
            <div className="flex value-label-span">
              <div className="flex-1">
                <ValueWithLabel
                  label={t("applog:create.ingestSetting.s3BucketPrefix")}
                >
                  <div>
                    {getParamValueByKey(
                      "logBucketPrefix",
                      curPipeline?.bufferParams
                    ) || "-"}
                  </div>
                </ValueWithLabel>
              </div>
              <div className="flex-1 border-left-c">
                <ValueWithLabel
                  label={t("applog:create.ingestSetting.s3StorageClass")}
                >
                  <div>
                    {
                      S3_STORAGE_CLASS_OPTIONS.find((element) => {
                        return (
                          getParamValueByKey(
                            "s3StorageClass",
                            curPipeline?.bufferParams
                          ) === element.value
                        );
                      })?.name
                    }
                  </div>
                </ValueWithLabel>
              </div>
              <div className="flex-1 border-left-c">
                <ValueWithLabel
                  label={t("applog:create.ingestSetting.bufferInt")}
                >
                  {getParamValueByKey(
                    "uploadTimeout",
                    curPipeline?.bufferParams
                  ) + " seconds" || "-"}
                </ValueWithLabel>
              </div>
            </div>
            <div className="flex value-label-span">
              <div className="flex-1">
                <ValueWithLabel
                  label={t("applog:create.ingestSetting.bufferSize")}
                >
                  {getParamValueByKey(
                    "maxFileSize",
                    curPipeline?.bufferParams
                  ) + " MB" || "-"}
                </ValueWithLabel>
              </div>
              <div className="flex-1 border-left-c">
                <ValueWithLabel
                  label={t("applog:create.ingestSetting.compressionMethod")}
                >
                  {getParamValueByKey(
                    "compressionType",
                    curPipeline?.bufferParams
                  )}
                </ValueWithLabel>
              </div>
              <div className="flex-1 border-left-c"></div>
            </div>
          </>
        )}
        {curPipeline?.bufferType === BufferType.KDS && (
          <div className="flex value-label-span">
            <div className="flex-1">
              <ValueWithLabel label={t("applog:detail.shardNumber")}>
                <div>
                  {getParamValueByKey(
                    "OpenShardCount",
                    curPipeline?.bufferParams
                  ) || "-"}
                </div>
              </ValueWithLabel>
            </div>
            <div className="flex-1 border-left-c">
              <ValueWithLabel label={t("applog:detail.enabledAutoScaling")}>
                <div>
                  {getParamValueByKey(
                    "enableAutoScaling",
                    curPipeline?.bufferParams
                  ) || "-"}
                </div>
              </ValueWithLabel>
            </div>
            <div className="flex-1 border-left-c">
              <ValueWithLabel label={t("applog:detail.maxShardNum")}>
                <div>
                  {getParamValueByKey(
                    "maxCapacity",
                    curPipeline?.bufferParams
                  ) || "-"}
                </div>
              </ValueWithLabel>
            </div>
          </div>
        )}
      </>
    </HeaderPanel>
  );
}
