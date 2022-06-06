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
import React, { useEffect, useState } from "react";
import HeaderPanel from "components/HeaderPanel";
import { useTranslation } from "react-i18next";
import { EKSClusterLogSource } from "API";
import Alert from "components/Alert";
import FormItem from "components/FormItem";
import { appSyncRequestQuery } from "assets/js/request";
import { getEKSDaemonSetConfig } from "graphql/queries";
import CodeCopy from "components/CodeCopy";

const KUBECTL_COMMAND = "kubectl apply -f ~/fluent-bit-logging.yaml";

interface DaemonsetGuideProps {
  eksLogSourceInfo: EKSClusterLogSource | undefined;
}

const DaemonsetGuide: React.FC<DaemonsetGuideProps> = (
  props: DaemonsetGuideProps
) => {
  const { eksLogSourceInfo } = props;
  const { t } = useTranslation();
  const [guide, setGuide] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDaemonsetGuide();
  }, []);

  const getDaemonsetGuide = async () => {
    setLoading(true);
    try {
      const res = await appSyncRequestQuery(getEKSDaemonSetConfig, {
        eksClusterId: eksLogSourceInfo?.id,
      });
      setGuide(res.data.getEKSDaemonSetConfig);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getDaemonsetGuide();
  }, []);

  return (
    <div>
      <HeaderPanel title={t("ekslog:detail.tab.daemonsetGuide")}>
        <div>
          <div>
            <Alert
              title={t("ekslog:detail.daemonsetGuide.alert")}
              content={<div>{t("ekslog:detail.daemonsetGuide.alertDesc")}</div>}
            ></Alert>
          </div>
          <div className="mt-20">
            <FormItem
              optionTitle={`1. ${t("ekslog:detail.daemonsetGuide.step1")}`}
              optionDesc=""
            >
              <CodeCopy loading={loading} code={guide} />
            </FormItem>
          </div>
          <div className="mt-20">
            <FormItem
              optionTitle={`2. ${t("ekslog:detail.daemonsetGuide.step2")}`}
              optionDesc=""
            >
              <CodeCopy code={KUBECTL_COMMAND} />
            </FormItem>
          </div>
        </div>
      </HeaderPanel>
    </div>
  );
};

export default DaemonsetGuide;
