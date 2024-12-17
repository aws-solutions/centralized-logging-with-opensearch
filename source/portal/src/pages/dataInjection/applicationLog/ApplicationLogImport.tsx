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

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "components/Button";
import CommonLayout from "pages/layout/CommonLayout";
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import { UploadButton } from "components/UploadButton";
import CodePreview from "components/CodePreview";
import {
  ApiResponse,
  appSyncRequestMutation,
  appSyncRequestQuery,
} from "assets/js/request";
import { batchImportAppPipelinesAnalyzer } from "graphql/queries";
import { createAppLogIngestion, createAppPipeline } from "graphql/mutations";
import {
  BatchImportAppPipelinesAnalyzerFindingType,
  BatchImportAppPipelinesAnalyzerQueryVariables,
  BatchImportAppPipelinesAnalyzerResponse,
  CreateAppLogIngestionMutationVariables,
  CreateAppPipelineMutationVariables,
  Resolver,
} from "API";
import { AntTabs } from "components/Tab";
import CancelOutlinedIcon from "@material-ui/icons/CancelOutlined";
import ReportProblemOutlinedIcon from "@material-ui/icons/ReportProblemOutlined";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import { getColoredTab } from "components/Tab/tab";
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  makeStyles,
} from "@material-ui/core";
import { chunk } from "lodash";
import { InfoBarTypes } from "reducer/appReducer";

const ErrorTab = getColoredTab("#d13212");
const WarningTab = getColoredTab("#fa7d17");
const InfoTab = getColoredTab("#0073bb");

const useCodePreviewStyle = makeStyles(() => ({
  codePreview: {
    maxHeight: "60vh",
    overflow: "auto",
  },
}));

type IngestionPrams = {
  operationName: "CreateAppLogIngestion";
  variables: CreateAppLogIngestionMutationVariables;
};

export type AppPipelineVariables = CreateAppPipelineMutationVariables & {
  logSources: IngestionPrams[];
};

const importAppPipeline = async (resolver: Resolver | null) => {
  const { operationName, variables } = resolver ?? {};
  if (operationName !== "CreateAppPipeline" || !variables) {
    throw new Error(`Unsupported actions: ${operationName}`);
  }
  const resolvedVariables: AppPipelineVariables = JSON.parse(variables);
  const { logSources, ...createAppPipelineVariables } = resolvedVariables;
  const res: ApiResponse<"createAppPipeline", string> =
    await appSyncRequestMutation(createAppPipeline, createAppPipelineVariables);
  await Promise.all(
    logSources.map(async ({ operationName, variables }) => {
      if (operationName !== "CreateAppLogIngestion") {
        throw new Error(`Unsupported actions: ${operationName}`);
      }
      variables.appPipelineId = res.data.createAppPipeline;
      await appSyncRequestMutation(createAppLogIngestion, variables);
    })
  );
};

export const ApplicationLogImport = () => {
  const { t } = useTranslation();
  const { codePreview } = useCodePreviewStyle();
  const [templateFile, setTemplateFile] = React.useState<string>("");
  const [validateLoading, setValidateLoading] = React.useState(false);
  const [importLoading, setImportLoading] = React.useState(false);
  const [importRes, setImportRes] =
    React.useState<BatchImportAppPipelinesAnalyzerResponse | null>(null);

  const [activeTab, setActiveTab] = useState(
    BatchImportAppPipelinesAnalyzerFindingType.ERROR
  );

  const navigate = useNavigate();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("applog:name"),
      link: "/log-pipeline/application-log",
    },
    {
      name: t("applog:import.import"),
    },
  ];

  const onFileChange = async (files: FileList | null) => {
    if (!files || !files[0]) {
      return;
    }
    const file = files[0];
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(buffer);

    try {
      setValidateLoading(true);
      const res: ApiResponse<
        "batchImportAppPipelinesAnalyzer",
        BatchImportAppPipelinesAnalyzerResponse
      > = await appSyncRequestQuery(batchImportAppPipelinesAnalyzer, {
        contentString: btoa(text),
      } as BatchImportAppPipelinesAnalyzerQueryVariables);
      setTemplateFile(text);
      setImportRes(res.data.batchImportAppPipelinesAnalyzer);
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setValidateLoading(false);
    }
  };

  const findingsList = useMemo(() => {
    if (!importRes?.findings?.length) {
      return [];
    }
    return importRes.findings.filter(
      (finding) => finding?.findingType === activeTab
    );
  }, [importRes, activeTab]);

  const errorListLength = useMemo(() => {
    if (!importRes?.findings?.length) {
      return 0;
    }
    return importRes.findings.filter(
      (finding) =>
        finding?.findingType ===
        BatchImportAppPipelinesAnalyzerFindingType.ERROR
    ).length;
  }, [importRes]);

  const warningListLength = useMemo(() => {
    if (!importRes?.findings?.length) {
      return 0;
    }
    return importRes.findings.filter(
      (finding) =>
        finding?.findingType ===
        BatchImportAppPipelinesAnalyzerFindingType.WARNING
    ).length;
  }, [importRes]);

  const suggestionListLength = useMemo(() => {
    if (!importRes?.findings?.length) {
      return 0;
    }
    return importRes.findings.filter(
      (finding) =>
        finding?.findingType ===
        BatchImportAppPipelinesAnalyzerFindingType.SUGGESTION
    ).length;
  }, [importRes]);

  const templateErrorMessage = useMemo(
    () => (errorListLength ? t("applog:import.templateErrorMessage") : ""),
    [errorListLength, t]
  );

  const importPipelines = async () => {
    if (!importRes?.resolvers) {
      return;
    }
    setImportLoading(true);
    try {
      await chunk(importRes.resolvers, 5).reduce(async (prev, cur) => {
        await prev;
        await Promise.allSettled(cur.map(importAppPipeline));
      }, Promise.resolve());
      navigate("/log-pipeline/application-log");
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="create-wrapper">
        <div className="create-content m-w-1024">
          <HeaderPanel title={t("applog:import.importTemplate")} infoType={InfoBarTypes.APP_PIPELINE_IMPORT}>
            <FormItem errorText={templateErrorMessage}>
              {(templateFile as any) && (
                <>
                  <div className={codePreview}>
                    <CodePreview language="yaml" code={templateFile} />
                  </div>
                  <AntTabs
                    variant="scrollable"
                    scrollButtons="auto"
                    value={activeTab}
                    onChange={(event, newTab) => {
                      setActiveTab(newTab);
                    }}
                  >
                    <ErrorTab
                      icon={
                        <span>
                          <CancelOutlinedIcon width="10" fontSize={"medium"} />
                          {`${t("applog:import.errors")} (${errorListLength})`}
                        </span>
                      }
                      value={BatchImportAppPipelinesAnalyzerFindingType.ERROR}
                    />
                    <WarningTab
                      icon={
                        <span>
                          <ReportProblemOutlinedIcon
                            width="10"
                            fontSize={"medium"}
                          />
                          {`${t(
                            "applog:import.warnings"
                          )} (${warningListLength})`}
                        </span>
                      }
                      value={BatchImportAppPipelinesAnalyzerFindingType.WARNING}
                    />
                    <InfoTab
                      icon={
                        <span>
                          <InfoOutlinedIcon width="10" fontSize={"medium"} />
                          {`${t(
                            "applog:import.Suggestions"
                          )} (${suggestionListLength})`}
                        </span>
                      }
                      value={
                        BatchImportAppPipelinesAnalyzerFindingType.SUGGESTION
                      }
                    />
                  </AntTabs>
                  <List dense>
                    {findingsList.map((finding, index) => (
                      <ListItem key={`${finding?.location?.path}-${finding?.issueCode}-${finding?.findingDetails}`}>
                        <ListItemIcon>{index + 1}</ListItemIcon>
                        <ListItemText
                          primary={finding?.findingDetails}
                          secondary={finding?.location?.path}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </FormItem>
            <FormItem
              optionTitle={t("applog:import.templateFile")}
              optionDesc={t("applog:import.templateFileDesc")}
            >
              <UploadButton
                accept=".yaml,.yml"
                onFileChange={onFileChange}
                loading={validateLoading}
                disabled={importLoading}
                loadingColor="black"
              >
                {t("common:button.chooseFile")}
              </UploadButton>
            </FormItem>
          </HeaderPanel>
          <div className="button-action text-right">
            <Button
              btnType="text"
              onClick={() => {
                navigate("/log-pipeline/application-log");
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              btnType="primary"
              loading={importLoading}
              disabled={!templateFile || templateErrorMessage !== ""}
              onClick={importPipelines}
            >
              {t("applog:import.import")}
            </Button>
          </div>
        </div>
      </div>
    </CommonLayout>
  );
};
