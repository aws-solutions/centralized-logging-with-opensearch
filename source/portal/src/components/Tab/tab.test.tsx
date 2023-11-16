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
import { render, screen } from "@testing-library/react";
import { AntTabs, AntTab, TabPanel } from "./tab";

describe("Tabs Component", () => {
  test("renders AntTabs and AntTab correctly", () => {
    render(
      <AntTabs value={0}>
        <AntTab label="Tab 1" />
        <AntTab label="Tab 2" />
      </AntTabs>
    );
    expect(screen.getByText("Tab 1")).toBeInTheDocument();
    expect(screen.getByText("Tab 2")).toBeInTheDocument();
  });

  test("renders TabPanel correctly", () => {
    render(
      <div>
        <AntTabs value={0}>
          <AntTab label="Tab 1" />
          <AntTab label="Tab 2" />
        </AntTabs>
        <TabPanel value={0} index={0}>
          Content 1
        </TabPanel>
        <TabPanel value={0} index={1}>
          Content 2
        </TabPanel>
      </div>
    );
    expect(screen.getByText("Content 1")).toBeVisible();
    expect(screen.queryByText("Content 2")).not.toBeInTheDocument();
  });
});
