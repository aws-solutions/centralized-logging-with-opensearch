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
import { render } from "@testing-library/react";
import LoadingText from "./loadingText";

test("renders LoadingText correctly", () => {
  const { getByTestId, rerender } = render(<LoadingText />);

  expect(getByTestId("gsui-loading")).not.toHaveTextContent("Loading");

  rerender(<LoadingText text="Loading..." />);
  expect(getByTestId("gsui-loading")).toHaveTextContent("Loading...");

  rerender(<LoadingText text={null} />);
  expect(getByTestId("gsui-loading")).not.toHaveTextContent("Loading");
});
