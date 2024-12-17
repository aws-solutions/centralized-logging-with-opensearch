/* eslint-disable react/display-name */
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
import AutoComplete, { OptionType } from "./autoComplete";
import { StatusType } from "components/Status/Status";

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

jest.mock("@material-ui/lab/Autocomplete", () => (props: any) => (
  <div data-testid="mock-autocomplete">
    <input onChange={props.onChange} {...props.inputProps} />
    {props.loading && props.loadingText}
    {props.options.map((option: any, idx: number) => (
      <div
        role="none"
        key={idx}
        data-testid="option"
        onClick={() => props.onChange({}, option)}
      >
        {props.renderOption(option)}
      </div>
    ))}
  </div>
));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(jest.fn());
});

describe("AutoComplete", () => {
  const optionList: OptionType[] = [
    { name: "Option 1", value: "option1", status: StatusType.Deleted },
    { name: "Option 2", value: "option2", status: StatusType.Online },
    { name: "Option 3", value: "option3", status: StatusType.Yellow },
  ];

  it("renders without errors", () => {
    render(
      <AutoComplete
        hasStatus={true}
        value={{
          name: "Option 2",
          value: "option2",
          status: StatusType.Online,
        }}
        optionList={optionList}
        onChange={() => jest.fn()}
      />
    );
  });
});
