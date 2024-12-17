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
import { ListLogConfigVersionsQueryVariables, LogConfig } from "API";
import { ApiResponse, appSyncRequestQuery } from "assets/js/request";
import { useAsyncData } from "assets/js/useAsyncData";
import ExtButton from "components/ExtButton";
import FormItem from "components/FormItem";
import Select from "components/Select";
import { listLogConfigVersions } from "graphql/queries";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface SelectLogConfigRevisionProps {
  logConfig: LogConfig;
  onRevisionChange: (logConfig: LogConfig) => void;
}

export const SelectLogConfigRevision = ({
  logConfig,
  onRevisionChange,
}: SelectLogConfigRevisionProps) => {
  const { t } = useTranslation();
  const [selectedRevision, setSelectedRevision] = useState(
    `${logConfig.version ?? 0}`
  );

  console.log(logConfig.id);

  const {
    data: revisions,
    isLoadingData: loadingRevision,
    reloadData: reloadRevisions,
    clearData,
  } = useAsyncData<ApiResponse<"listLogConfigVersions", LogConfig[]>>(
    () =>
      logConfig
        ? appSyncRequestQuery(listLogConfigVersions, {
            id: logConfig.id,
          } as ListLogConfigVersionsQueryVariables)
        : [],
    [logConfig.id],
    {
      cleanData: true,
    }
  );

  const revisionsList = useMemo(
    () =>
      revisions?.data?.listLogConfigVersions?.map(
        ({ version, description }) => ({
          name: `${t("ekslog:ingest.detail.configTab.revision")} ${version}`,
          value: `${version}`,
          description: description || "",
        })
      ),
    [revisions]
  );

  useEffect(() => {
    clearData();
    if (logConfig?.version) {
      setSelectedRevision(`${logConfig.version}`);
    }
  }, [logConfig.id]);

  useEffect(() => {
    const selectedRevisionNumber = parseInt(selectedRevision);
    const selectedLogConfig = revisions?.data?.listLogConfigVersions?.find(
      (logConfig) => logConfig.version === selectedRevisionNumber
    );
    if (selectedLogConfig) {
      onRevisionChange(selectedLogConfig);
    }
  }, [selectedRevision, revisions]);

  return (
    <FormItem
      optionTitle={t("resource:config.detail.revision")}
      optionDesc={t("resource:config.detail.revisionDesc")}
    >
      <div className="flex m-w-75p" data-testid="log-conf-revision-select">
        <Select
          className="flex-1"
          loading={loadingRevision}
          disabled={loadingRevision}
          hasRefresh
          optionList={revisionsList ?? []}
          value={selectedRevision}
          clickRefresh={reloadRevisions}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSelectedRevision(e.target.value);
          }}
        />
        <div className="ml-10">
          <ExtButton
            to={`/resources/log-config/detail/${logConfig?.id}/revision/${selectedRevision}/edit`}
            style={{ verticalAlign: "bottom" }}
          >
            {t("common:button.createNew")}
          </ExtButton>
        </div>
      </div>
    </FormItem>
  );
};
