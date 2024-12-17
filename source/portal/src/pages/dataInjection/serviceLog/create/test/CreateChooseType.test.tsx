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
import { renderWithProviders } from "test-utils";
import { AppStoreMockData } from "test/store.mock";
import { MemoryRouter } from "react-router-dom";
import CreateChooseType from "../CreateChooseType";
import { screen, fireEvent } from "@testing-library/react";

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

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
  jest.spyOn(console, "warn").mockImplementation(jest.fn());
});

describe("CreateChooseType", () => {
  it("renders without errors", () => {
    const { getByText } = renderWithProviders(
      <MemoryRouter>
        <CreateChooseType />
      </MemoryRouter>,
      {
        preloadedState: {
          app: {
            ...AppStoreMockData,
          },
        },
      }
    );
    expect(getByText(/servicelog:create.awsServices/i)).toBeInTheDocument();

    // click s3 and next
    const s3Button = screen.getByTestId("engine-type-Amazon_S3");
    expect(s3Button).toBeInTheDocument();
    fireEvent.click(s3Button);

    // click next button
    const nextButton = screen.getByTestId("next-button");
    expect(nextButton).toBeInTheDocument();
    fireEvent.click(nextButton);

    // click cancel button
    const cancelButton = screen.getByTestId("cancel-button");
    expect(cancelButton).toBeInTheDocument();
    fireEvent.click(cancelButton);
  });
});
