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
import BufferS3 from "../BufferS3";
import { renderWithProviders } from "test-utils";
import { MemoryRouter } from "react-router-dom";
import { AppStoreMockData } from "test/store.mock";
import { CompressionType } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { fireEvent } from "@testing-library/react";
import { AnalyticEngineTypes } from "types";

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

const mockS3BufferData = {
  s3BufferBucketObj: null,
  // for validation
  logBucketError: "",
  logBucketPrefixError: "",
  bufferSizeError: "",
  bufferIntervalError: "",
  data: {
    logBucketName: "",
    logBucketPrefix: "",
    logBucketSuffix: "",
    defaultCmkArn: "",
    maxFileSize: "", // buffer size
    uploadTimeout: "", // buffer interval
    compressionType: CompressionType.GZIP,
    s3StorageClass: "",
  },
};

jest.mock("assets/js/request", () => ({
  appSyncRequestQuery: jest.fn(),
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("BufferS3", () => {
  it("renders without errors", () => {
    (appSyncRequestQuery as any).mockResolvedValue({
      data: {
        listResources: [
          {
            id: "1",
            name: "bucket1",
          },
          {
            id: "2",
            name: "bucket2",
          },
        ],
      },
    });
    const { getByPlaceholderText } = renderWithProviders(
      <MemoryRouter>
        <BufferS3 />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
          s3Buffer: mockS3BufferData,
        },
      }
    );

    expect(getByPlaceholderText("50")).toBeInTheDocument();
    fireEvent.change(getByPlaceholderText("50"), { target: { value: "2" } });

    expect(getByPlaceholderText("60")).toBeInTheDocument();
    fireEvent.change(getByPlaceholderText("60"), { target: { value: "3" } });
  });

  it("renders without errors", () => {
    renderWithProviders(
      <MemoryRouter>
        <BufferS3 engineType={AnalyticEngineTypes.LIGHT_ENGINE} />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
          s3Buffer: mockS3BufferData,
        },
      }
    );
  });
});
