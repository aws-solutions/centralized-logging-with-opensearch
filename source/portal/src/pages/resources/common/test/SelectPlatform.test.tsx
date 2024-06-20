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
import SelectPlatform from "../SelectPlatform";
import { MemoryRouter } from "react-router-dom";
import { EC2GroupPlatform } from "API";
import { fireEvent, render, screen } from "@testing-library/react";

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
});

describe("SelectPlatform", () => {
  it("renders without errors", () => {
    const mockChangePlatform = jest.fn();
    render(
      <MemoryRouter>
        <SelectPlatform
          platform={EC2GroupPlatform.Windows}
          changePlatform={mockChangePlatform}
        />
      </MemoryRouter>
    );
    const inputElement = screen.getByDisplayValue(EC2GroupPlatform.Windows);
    fireEvent.click(inputElement);
  });
});
