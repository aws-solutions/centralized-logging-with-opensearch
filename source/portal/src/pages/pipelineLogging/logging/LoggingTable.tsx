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
import React, { useEffect, useState } from "react";
import Button from "components/Button";
import { useTranslation } from "react-i18next";
import { TablePanel, SelectType } from "components/TablePanel";
import { Pagination } from "@material-ui/lab";
import TextInput from "components/TextInput";
import { listLogStreams } from "graphql/queries";
import { LogStream, PipelineType } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { Link } from "react-router-dom";
import { LoggingProps } from "../Logging";
import { formatTimeStamp } from "assets/js/utils";
import ButtonRefresh from "components/ButtonRefresh";

const PAGE_SIZE = 10;

interface LoggingTableProps extends LoggingProps {
  lambdaFunName?: string | null;
}

const LoggingTable: React.FC<LoggingTableProps> = (
  props: LoggingTableProps
) => {
  const { t } = useTranslation();
  const { pipelineInfo, type, servicePipeline, lambdaFunName } = props;
  const [loadingData, setLoadingData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [logPrefix, setLogPrefix] = useState("");
  const [logStreamList, setLogStreamList] = useState<LogStream[]>([]);

  const getLambdaLogStreamList = async () => {
    try {
      setLoadingData(true);
      setLogStreamList([]);
      const resData: any = await appSyncRequestQuery(listLogStreams, {
        logGroupName: lambdaFunName,
        logStreamNamePrefix: logPrefix,
        page: currentPage,
        count: PAGE_SIZE,
      });
      const tmpProcessorLogStreamList: LogStream[] =
        resData?.data?.listLogStreams?.logStreams || [];
      setLogStreamList(tmpProcessorLogStreamList);
      setTotalCount(resData?.data?.listLogStreams?.total || 0);
      setLoadingData(false);
    } catch (error) {
      console.error(error);
    }
  };

  const buildLogEventsLink = (streamName: string, startTime: string) => {
    let pipeId = pipelineInfo?.pipelineId;
    if (type === PipelineType.SERVICE) {
      pipeId = servicePipeline?.id;
    }
    return `/log-pipeline/log-events/detail/${type}/${pipeId}/${encodeURIComponent(
      lambdaFunName ?? ""
    )}/${encodeURIComponent(streamName)}?startTime=${startTime}`;
  };

  const handlePageChange = (event: any, value: number) => {
    setCurrentPage(value);
  };

  useEffect(() => {
    getLambdaLogStreamList();
  }, [currentPage]);

  const renderStreamName = (data: LogStream) => {
    return (
      <Link
        target="_blank"
        to={buildLogEventsLink(
          data.logStreamName ?? "",
          data.firstEventTimestamp ?? ""
        )}
      >
        {data.logStreamName}
      </Link>
    );
  };

  return (
    <div>
      <TablePanel
        trackId="logStreamName"
        noPadding
        loading={loadingData}
        changeSelected={(e) => {
          console.info(e);
        }}
        selectType={SelectType.NONE}
        columnDefinitions={[
          {
            id: "logStream",
            header: t("common:logging.logStream"),
            cell: (e: LogStream) => renderStreamName(e),
          },
          {
            id: "creationTime",
            header: t("common:logging.creationTime"),
            cell: (e: LogStream) => {
              return formatTimeStamp(parseInt(e?.creationTime || ""));
            },
          },
          {
            id: "lastEventTime",
            header: t("common:logging.lastEventTime"),
            cell: (e: LogStream) => {
              return formatTimeStamp(parseInt(e?.lastEventTimestamp || ""));
            },
          },
        ]}
        title={
          <div style={{ fontSize: "14px", fontWeight: "normal" }}>
            {t("common:logging.logStreams")}
          </div>
        }
        actions={
          <div>
            <Button
              btnType="icon"
              disabled={loadingData}
              onClick={() => {
                if (currentPage === 1) {
                  getLambdaLogStreamList();
                } else {
                  setCurrentPage(1);
                }
              }}
            >
              <ButtonRefresh loading={loadingData} fontSize="small" />
            </Button>
          </div>
        }
        filter={
          <div>
            <TextInput
              value={logPrefix}
              isSearch={true}
              placeholder={t("common:logging.filterPlaceHolder")}
              onChange={(event) => {
                setLogPrefix(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  getLambdaLogStreamList();
                }
              }}
            />
          </div>
        }
        pagination={
          <Pagination
            count={Math.ceil(totalCount / PAGE_SIZE)}
            page={currentPage}
            onChange={handlePageChange}
            size="small"
          />
        }
        items={logStreamList}
      />
    </div>
  );
};

export default LoggingTable;
