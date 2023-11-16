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

import { MetricName } from "API";

export const LightEngineLambdaMetrics = [
  {
    title: MetricName.ReplicationFnError,
    graphTitle: MetricName.ReplicationFnError,
    yUnit: "Count",
  },
  {
    title: MetricName.ReplicationFnConcurrentExecutions,
    graphTitle: MetricName.ReplicationFnConcurrentExecutions,
    yUnit: "Count",
  },
  {
    title: MetricName.ReplicationFnDuration,
    graphTitle: MetricName.ReplicationFnDuration,
    yUnit: "Millisecond",
  },
  {
    title: MetricName.ReplicationFnThrottles,
    graphTitle: MetricName.ReplicationFnThrottles,
    yUnit: "Count",
  },
  {
    title: MetricName.ReplicationFnInvocations,
    graphTitle: MetricName.ReplicationFnInvocations,
    yUnit: "Count",
  },
];