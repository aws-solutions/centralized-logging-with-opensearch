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
import React, { useState } from "react";
import FormItem from "components/FormItem";
import { ExLogConf } from "pages/resources/common/LogConfigComp";
import { useTranslation } from "react-i18next";
import { appSyncRequestMutation } from "assets/js/request";
import {
  LogConfig,
  RefreshAppLogIngestionMutationVariables,
  UpdateAppPipelineMutationVariables,
} from "API";
import Button from "components/Button";
import { refreshAppLogIngestion, updateAppPipeline } from "graphql/mutations";
import { SelectLogConfigRevision } from "../common/SelectLogConfigRevision";

interface LogConfigEditProps {
  logConfig: ExLogConf;
  pipelineId: string;
  onClose?: () => void;
  onRevisionChange?: (newRevision: number) => void;
}

export const LogConfigEdit = ({
  logConfig,
  pipelineId,
  onClose,
  onRevisionChange,
}: LogConfigEditProps) => {
  const { t } = useTranslation();

  const [selectedRevision, setSelectedRevision] = useState(
    `${logConfig.version ?? 0}`
  );
  const [updatingPipeline, setUpdatingPipeline] = useState(false);

  const updatePipeline = async () => {
    try {
      setUpdatingPipeline(true);
      await appSyncRequestMutation(updateAppPipeline, {
        id: pipelineId,
        logConfigId: logConfig.id,
        logConfigVersionNumber: parseInt(selectedRevision, 10),
      } as UpdateAppPipelineMutationVariables);
      await appSyncRequestMutation(refreshAppLogIngestion, {
        appPipelineId: pipelineId,
      } as RefreshAppLogIngestionMutationVariables);
      onRevisionChange && onRevisionChange(parseInt(selectedRevision, 10));
      onClose && onClose();
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setUpdatingPipeline(false);
    }
  };

  return (
    <>
      <FormItem optionTitle={t("ekslog:ingest.detail.configTab.name")}>
        <span>{logConfig.name ?? "-"}</span>
      </FormItem>
      <FormItem optionTitle={t("ekslog:ingest.detail.configTab.revision")}>
        <SelectLogConfigRevision
          logConfig={logConfig as LogConfig}
          onRevisionChange={({ version }) => setSelectedRevision(`${version}`)}
        />
      </FormItem>
      <div className="button-action text-right">
        <Button btnType="text" onClick={onClose}>
          {t("button.cancel")}
        </Button>
        <Button
          btnType="primary"
          loading={updatingPipeline}
          onClick={() => {
            updatePipeline();
          }}
        >
          {t("button.save")}
        </Button>
      </div>
    </>
  );
};
