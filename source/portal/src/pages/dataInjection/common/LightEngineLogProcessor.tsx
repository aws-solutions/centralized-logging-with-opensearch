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

import { Schedule, ScheduleType } from "API";
import { buildSchedulerLink, buildStepFunctionLink } from "assets/js/utils";
import ExtLink from "components/ExtLink";
import { TFunction } from "i18next";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import { identity } from "lodash";
import { InfoBarTypes } from "reducer/appReducer";

interface LightEngineLogProcessorProps {
  schedules?: Schedule[];
}

export const getScheduleLabel = (type: ScheduleType, t: TFunction) => {
  switch (type) {
    case ScheduleType.LogProcessor:
      return t("applog:detail.logProcessor.logProcessorTitle");
    case ScheduleType.LogArchive:
      return t("applog:detail.logProcessor.archiverTitle");
    case ScheduleType.LogMerger:
      return t("applog:detail.logProcessor.mergerTitle");
    case ScheduleType.LogArchiveForMetrics:
      return t("applog:detail.logProcessor.metricArchiverTitle");
    case ScheduleType.LogMergerForMetrics:
      return t("applog:detail.logProcessor.metricMergerTitle");
    default:
      return type;
  }
};

export const getScheduleInfo = (type: ScheduleType) => {
  switch (type) {
    case ScheduleType.LogProcessor:
      return InfoBarTypes.LIGHT_ENGINE_LOG_PROCESS_DETAIL;
    case ScheduleType.LogArchive:
      return InfoBarTypes.LIGHT_ENGINE_LOG_ARCHIVE_DETAIL;
    case ScheduleType.LogMerger:
      return InfoBarTypes.LIGHT_ENGINE_LOG_MERGE_DETAIL;
    default:
      return undefined;
  }
};

export const LightEngineLogProcessor = ({
  schedules = [],
}: LightEngineLogProcessorProps) => {
  const { t } = useTranslation();
  const amplifyConfig = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const processorList = schedules.map((schedule) => ({
    headerTitle: getScheduleLabel(schedule.type, t),
    infoType: getScheduleInfo(schedule.type),
    dataList: [
      ...[
        {
          label: t("applog:detail.logProcessor.stepFunction"),
          data: (
            <ExtLink
              to={buildStepFunctionLink(
                amplifyConfig.aws_project_region,
                schedule.stateMachine.arn
              )}
            >
              {schedule.stateMachine.name ?? "-"}
            </ExtLink>
          ),
        },
        {
          label: t("applog:detail.logProcessor.scheduler"),
          data: (
            <ExtLink
              to={buildSchedulerLink(
                amplifyConfig.aws_project_region,
                schedule.scheduler.type,
                schedule.scheduler.group,
                schedule.scheduler.name
              )}
            >
              {schedule.scheduler.name ?? "-"}
            </ExtLink>
          ),
        },
        {
          label: t("applog:detail.logProcessor.scheduleExpression"),
          data: schedule.scheduler.expression ?? "-",
        },
      ],
      ...(schedule.scheduler.age
        ? [
            {
              label: t("applog:detail.logProcessor.lifecycle"),
              data: `${schedule.scheduler.age} ${t(
                "applog:detail.logProcessor.days"
              )}`,
            },
          ]
        : []),
    ],
  }));
  return (
    <>
      {processorList.map((processor, index) => (
        <HeaderWithValueLabel
          key={identity(index)}
          numberOfColumns={4}
          {...processor}
        />
      ))}
    </>
  );
};
