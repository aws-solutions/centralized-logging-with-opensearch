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

import React from "react";
import AlarmTable from "../AlarmTable";
import { PipelineType } from "API";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("AlarmTable", () => {
  it("renders without errors", () => {
    renderWithProviders(
      <MemoryRouter>
        <AlarmTable
          headerText=""
          type={PipelineType.APP}
          pipelineId="test"
          alarmList={[]}
          refreshCount={0}
        />
      </MemoryRouter>
    );
  });
});
