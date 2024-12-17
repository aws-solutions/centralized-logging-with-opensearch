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
import CloudFrontDesc from "../CloudFrontDesc";
import { DestinationType } from "API";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => {
    return {
      t: (key: any) => key,
      i18n: {
        changeLanguage: jest.fn(),
      },
    };
  },
  initReactI18next: {
    type: "3rdParty",
    init: jest.fn(),
  },
}));

describe("CloudFrontDesc", () => {
  it("renders without error", () => {
    render(
      <CloudFrontDesc
        ingestLogType={DestinationType.S3}
        changeIngestLogType={jest.fn()}
        region="us-example-1"
      />
    );
  });

  it("renders without error", () => {
    render(
      <CloudFrontDesc
        ingestLogType={DestinationType.KDS}
        changeIngestLogType={jest.fn()}
        region="cn-example-1"
      />
    );
  });
});
