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

import { PipelineType, Schedule, ScheduleType } from "API";
import HeaderPanel from "components/HeaderPanel";
import React from "react";
import { useTranslation } from "react-i18next";
import { getScheduleLabel } from "./LightEngineLogProcessor";
import { LightEngineLogging } from "./LightEngineLogging";

interface LightEngineLoggingListProps {
  schedules: Schedule[];
  pipelineType?: PipelineType;
  pipelineId: string;
}

export const LightEngineLoggingList = ({
  schedules,
  pipelineId,
  pipelineType,
}: LightEngineLoggingListProps) => {
  const { t } = useTranslation();
  return (
    <>
      {schedules?.map((schedule) => (
        <HeaderPanel
          title={getScheduleLabel(
            schedule?.type ?? ScheduleType.LogProcessor,
            t
          )}
          key={schedule.scheduler.type}
        >
          <LightEngineLogging
            pipelineId={pipelineId}
            schedule={schedule}
            key={schedule.scheduler.type}
            pipelineType={pipelineType}
          />
        </HeaderPanel>
      ))}
    </>
  );
};
