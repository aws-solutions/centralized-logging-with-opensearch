/*
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExecutionStatus,
  GetLightEngineAppPipelineExecutionLogsQuery,
  GetLightEngineAppPipelineExecutionLogsQueryVariables,
  LightEnginePipelineExecutionLogsResponse,
  PipelineType,
  Schedule,
} from "API";
import { SelectType, TablePanel } from "components/TablePanel";
import { Pagination, PaginationItem } from "@material-ui/lab";
import { ApiResponse, appSyncRequestQuery } from "assets/js/request";
import {
  getLightEngineAppPipelineExecutionLogs,
  getLightEngineServicePipelineExecutionLogs,
} from "graphql/queries";
import Button from "components/Button";
import ButtonRefresh from "components/ButtonRefresh";
import Select, { SelectItem } from "components/Select/select";
import TimeRange from "components/TimeRange/TimeRange";
import { makeStyles } from "@material-ui/core";
import moment from "moment";
import Status from "components/Status/Status";
import { useTranslation } from "react-i18next";
import { buildStepFunctionExecutionLink } from "assets/js/utils";
import { useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import ExtLink from "components/ExtLink";

const PAGE_SIZE = 10;
const REQUEST_SIZE = 50;

const useFilterStyles = makeStyles(() => ({
  filters: {
    display: "flex",
    height: "70px",
    "align-items": "start",
  },
}));

const executionStatusOptions = (
  (Object.keys(ExecutionStatus) as (keyof typeof ExecutionStatus)[]).map(
    (k) => ({
      name: `status.${k.toLowerCase()}`,
      value: ExecutionStatus[k],
    })
  ) as SelectItem[]
).concat([
  {
    name: "lightengine:logging.executionStatus.all",
    value: "all",
  },
]);

interface LightEngineLoggingProps {
  schedule?: Schedule;
  key?: string;
  pipelineType?: PipelineType;
  pipelineId: string;
}

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

type ExecutionLog = Exclude<
  ArrayElement<
    Exclude<
      Exclude<
        GetLightEngineAppPipelineExecutionLogsQuery["getLightEngineAppPipelineExecutionLogs"],
        null | undefined
      >["items"],
      null | undefined
    >
  >,
  null | undefined
>;

export const LightEngineLogging = ({
  schedule,
  pipelineId,
  key,
  pipelineType = PipelineType.APP,
}: LightEngineLoggingProps) => {
  const classes = useFilterStyles();
  const { t } = useTranslation();
  const amplifyConfig = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<
    undefined | string | null
  >();
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [allFetched, setAllFetched] = useState(false);
  const [curTimeRangeType, setCurTimeRangeType] = useState("1w");
  const [startDate, setStartDate] = useState(0);
  const [endDate, setEndDate] = useState<number>(0);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [executionStatus, setExecutionStatus] = useState<
    ExecutionStatus | "all"
  >("all");
  const appendExecutionLogs = (log: ExecutionLog[]) =>
    setExecutionLogs([...executionLogs, ...log]);
  const totalPages = useMemo(
    () => Math.ceil(executionLogs.length / PAGE_SIZE),
    [executionLogs.length]
  );
  const clearAll = useCallback(() => {
    setLastEvaluatedKey(undefined);
    setExecutionLogs([]);
    setLoading(false);
    setCurrentPage(1);
    setAllFetched(false);
    setExecutionStatus("all");
    if (curTimeRangeType !== "1w") {
      setStartDate(0);
      setEndDate(0);
      setCurTimeRangeType("1w");
    }
  }, [curTimeRangeType]);

  const clearPagination = useCallback(() => {
    setLastEvaluatedKey(undefined);
    setExecutionLogs([]);
    setLoading(false);
    setCurrentPage(1);
    setAllFetched(false);
  }, []);
  const fetchExecutions = async () => {
    if (currentPage <= totalPages) {
      // only request data when requesting more pages or resting filters
      return;
    }
    setLoading(true);
    try {
      const reqParams: GetLightEngineAppPipelineExecutionLogsQueryVariables = {
        type: schedule!.type,
        pipelineId,
        stateMachineName: schedule!.stateMachine.name,
        lastEvaluatedKey,
        limit: REQUEST_SIZE,
        startTime:
          startDate === 0 ? undefined : moment(startDate * 1000).toISOString(),
        endTime:
          endDate === 0 ? undefined : moment(endDate * 1000).toISOString(),
        status: executionStatus === "all" ? undefined : executionStatus,
      };
      let res: LightEnginePipelineExecutionLogsResponse;
      if (pipelineType === PipelineType.APP) {
        const apiRes: ApiResponse<
          "getLightEngineAppPipelineExecutionLogs",
          LightEnginePipelineExecutionLogsResponse
        > = await appSyncRequestQuery(
          getLightEngineAppPipelineExecutionLogs,
          reqParams
        );
        res = apiRes.data.getLightEngineAppPipelineExecutionLogs;
      } else {
        const apiRes: ApiResponse<
          "getLightEngineServicePipelineExecutionLogs",
          LightEnginePipelineExecutionLogsResponse
        > = await appSyncRequestQuery(
          getLightEngineServicePipelineExecutionLogs,
          reqParams
        );
        res = apiRes.data.getLightEngineServicePipelineExecutionLogs;
      }
      if (!res.items?.length || res.items.length < REQUEST_SIZE) {
        setAllFetched(true);
      }
      appendExecutionLogs(res.items as any);
      setLastEvaluatedKey(res.lastEvaluatedKey);
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!schedule || !startDate) {
      return;
    }
    fetchExecutions();
  }, [
    currentPage,
    schedule,
    startDate,
    endDate,
    executionStatus,
    refreshCounter,
  ]);

  const renderName = (name?: string | null, arn?: string | null) => {
    return (
      <ExtLink
        to={buildStepFunctionExecutionLink(
          amplifyConfig.aws_project_region,
          arn ?? ""
        )}
      >
        {name}
      </ExtLink>
    );
  };

  const renderStatus = (status?: ExecutionStatus | null) => {
    return <Status status={status ?? ""} />;
  };

  return (
    <div className="table-data" key={key}>
      <TablePanel
        hideTitle
        trackId="LightEngineLogging"
        loading={loading}
        actions={<></>}
        pagination={
          <div className={classes.filters}>
            <Button
              disabled={loading}
              btnType="icon"
              onClick={() => {
                clearAll();
                setRefreshCounter(refreshCounter + 1);
              }}
            >
              <ButtonRefresh loading={loading} fontSize="small" />
            </Button>
            <Pagination
              disabled={loading}
              count={totalPages}
              page={currentPage}
              onChange={(_, value) => {
                setCurrentPage(value);
              }}
              renderItem={(pageProps) => (
                <>
                  <PaginationItem
                    {...pageProps}
                    disabled={
                      pageProps.type === "next" &&
                      pageProps.page === totalPages + 1 &&
                      !allFetched
                        ? false
                        : pageProps.disabled
                    }
                  />
                  {!allFetched &&
                    pageProps.page === totalPages &&
                    pageProps.type === "page" && (
                      <>
                        <PaginationItem
                          {...pageProps}
                          page={pageProps.page + 1}
                          selected={false}
                          onClick={() => setCurrentPage(pageProps.page + 1)}
                        />
                        ...
                      </>
                    )}
                </>
              )}
              size="small"
            />
          </div>
        }
        items={executionLogs.slice(
          (currentPage - 1) * PAGE_SIZE,
          currentPage * PAGE_SIZE
        )}
        changeSelected={() => {}}
        columnDefinitions={[
          {
            id: "name",
            header: t("lightengine:logging.name"),
            cell: ({ executionName, executionArn }: ExecutionLog) =>
              renderName(executionName, executionArn),
          },
          {
            id: "status",
            header: t("lightengine:logging.status"),
            cell: ({ status }: ExecutionLog) => renderStatus(status),
          },
          {
            id: "start",
            header: t("lightengine:logging.started"),
            cell: ({ startTime }: ExecutionLog) =>
              startTime ? moment(startTime).format("yyyy-MM-DD HH:mm:ss") : "",
          },
          {
            id: "end",
            header: t("lightengine:logging.endTime"),
            cell: ({ endTime }: ExecutionLog) =>
              endTime ? moment(endTime).format("yyyy-MM-DD HH:mm:ss") : "",
          },
        ]}
        selectType={SelectType.NONE}
        filter={
          <div className={classes.filters}>
            <Select
              disabled={loading}
              isI18N
              className="m-w-75p flex-1"
              optionList={executionStatusOptions}
              value={executionStatus}
              onChange={(e) => {
                setExecutionStatus(e.target.value);
                clearPagination();
              }}
              placeholder="hello"
              allowEmpty
            />
            <TimeRange
              curTimeRangeType={curTimeRangeType}
              startTime={""}
              endTime={""}
              changeTimeRange={(range) => {
                console.info("range:", range);
                setStartDate(range[0]);
                if (curTimeRangeType === "Custom") {
                  setEndDate(range[1]);
                } else {
                  setEndDate(0);
                }
                clearPagination();
              }}
              changeRangeType={(type) => {
                setCurTimeRangeType(type);
              }}
            />
          </div>
        }
      ></TablePanel>
    </div>
  );
};
