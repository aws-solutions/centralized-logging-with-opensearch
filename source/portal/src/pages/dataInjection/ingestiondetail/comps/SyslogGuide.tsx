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
import HeaderPanel from "components/HeaderPanel";
import { useTranslation } from "react-i18next";
import { AppLogIngestion, LogSource, ProtocolType } from "API";
import { getSourceInfoValueByKey } from "assets/js/applog";
import CopyText from "components/CopyText";
import Alert from "components/Alert";

interface SyslogGuideProps {
  ingestion: AppLogIngestion | undefined;
  sourceData: LogSource | undefined;
}

const SyslogGuide: React.FC<SyslogGuideProps> = (props: SyslogGuideProps) => {
  const { sourceData } = props;
  const { t } = useTranslation();

  const [nlbName, setNlbName] = useState("");
  const [protocol, setProtocol] = useState("");
  const [port, setPort] = useState("");

  useEffect(() => {
    if (sourceData && sourceData.sourceInfo) {
      const nlbNameRes = getSourceInfoValueByKey(
        "syslogNlbDNSName",
        sourceData.sourceInfo
      );
      const protocolRes = getSourceInfoValueByKey(
        "syslogProtocol",
        sourceData.sourceInfo
      );
      const portRes = getSourceInfoValueByKey(
        "syslogPort",
        sourceData?.sourceInfo
      );
      setNlbName(nlbNameRes);
      setProtocol(protocolRes);
      setPort(portRes);
    }
  }, [sourceData]);

  return (
    <div>
      <HeaderPanel title={t("applog:ingestion.syslogConfig")}>
        <>
          <Alert content={t("applog:ingestion.syslog.guide.alert")} />
          <div className="syslog-guide">
            <div className="deploy-desc">
              {t("applog:ingestion.syslog.guide.title")}
            </div>
            <div className="deploy-steps">
              <div>{t("applog:ingestion.syslog.guide.step1Title")}</div>
              <div className="step-desc">
                {t("applog:ingestion.syslog.guide.step2Desc1")}
                <code className="guide-code">/etc/rsyslog.conf</code>
              </div>
              <div className="mt-10">
                {t("applog:ingestion.syslog.guide.step2Title")}
              </div>
              <div className="step-desc">
                <CopyText
                  text={`*.* ${
                    protocol === ProtocolType.TCP ? "@@" : "@"
                  }${nlbName}:${port}`}
                >
                  <code className="guide-code">
                    {`*.* ${
                      protocol === ProtocolType.TCP ? "@@" : "@"
                    }${nlbName}:${port}`}
                  </code>
                </CopyText>
              </div>
              <div className="mt-10">
                {t("applog:ingestion.syslog.guide.step3Title")}
              </div>
              <div className="step-desc">
                {t("applog:ingestion.syslog.guide.step3Desc1")}
                <code className="guide-code">service rsyslog restart</code>,
                <code className="guide-code">
                  /etc/init.d/syslog-ng restart
                </code>{" "}
                {t("applog:ingestion.syslog.guide.step3Desc2")}
                <code className="guide-code">systemctl restart rsyslog</code>
                {t("applog:ingestion.syslog.guide.step3Desc3")}
              </div>
              <div className="mt-10">
                {t("applog:ingestion.syslog.guide.step4Title")}
              </div>
              <div className="step-desc">
                {t("applog:ingestion.syslog.guide.step4Desc1")}
                <code className="guide-code">logger hello world!</code>
                {t("applog:ingestion.syslog.guide.step4Desc2")}
              </div>
              <div className="mt-10">
                {t("applog:ingestion.syslog.guide.step5Title")}
              </div>
              <div className="step-desc">
                {t("applog:ingestion.syslog.guide.step5Desc1")}
                <code className="guide-code">/var/log/messages</code>
                {t("applog:ingestion.syslog.guide.step5Desc2")}
                <code className="guide-code">vim</code>{" "}
                {t("applog:ingestion.syslog.guide.step5Desc3")}
                <code className="guide-code">tail</code>
                {t("applog:ingestion.syslog.guide.step5Desc4")}
              </div>
            </div>
          </div>
        </>
      </HeaderPanel>
    </div>
  );
};

export default SyslogGuide;
