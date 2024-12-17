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
import { render, fireEvent } from "@testing-library/react";
import SignOut from "../SignOut";
import { Auth } from "aws-amplify";

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

describe("SignOut", () => {
  it("renders without crashing", () => {
    render(<SignOut />);
  });

  it("calls the signOut function when clicked", () => {
    const signOutMock = jest.fn();
    jest.spyOn(Auth, "signOut").mockImplementation(signOutMock);
    const { getByText } = render(<SignOut />);
    const signOutButton = getByText("header.logout");
    fireEvent.click(signOutButton);
    expect(signOutMock).toHaveBeenCalled();
  });
});
