import React from "react";
import { useTranslation } from "react-i18next";
import HeaderPanel from "components/HeaderPanel";
import ValueWithLabel from "components/ValueWithLabel";
import { AppLogIngestion, LogSource } from "API";
import { formatLocalTime } from "assets/js/utils";

interface Props {
  sourceInfo: LogSource;
  appIngestionData: AppLogIngestion;
}

export function S3SourceDetail(props: Props) {
  const { t } = useTranslation();
  return (
    <HeaderPanel title={t("details")}>
      <div className="flex value-label-span">
        <div className="flex-1">
          <ValueWithLabel label={t("applog:detail.ingestion.prefixFilter")}>
            <>
              {(props.sourceInfo.s3?.keyPrefix || "") +
                (props.sourceInfo.s3?.keySuffix
                  ? "*" + props.sourceInfo.s3?.keySuffix
                  : "")}
            </>
          </ValueWithLabel>
        </div>
        <div className="flex-1 border-left-c">
          <ValueWithLabel label={t("applog:detail.ingestion.compression")}>
            <>{props.sourceInfo.s3?.compressionType}</>
          </ValueWithLabel>
        </div>
        <div className="flex-1 border-left-c">
          <ValueWithLabel label={t("ekslog:ingest.detail.created")}>
            <div>{formatLocalTime(props.appIngestionData.createdAt || "")}</div>
          </ValueWithLabel>
        </div>
      </div>
    </HeaderPanel>
  );
}
