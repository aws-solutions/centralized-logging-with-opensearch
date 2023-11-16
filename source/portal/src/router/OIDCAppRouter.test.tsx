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
import { render, screen, fireEvent } from "@testing-library/react";
import { useAuth } from "react-oidc-context";
import { useDispatch } from "react-redux";
import OIDCAppRouter from "./OIDCAppRouter";

jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
}));

jest.mock("react-oidc-context", () => ({
  useAuth: jest.fn(),
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

describe("<OIDCAppRouter />", () => {
  let mockAuth: any;
  let mockDispatch: any;

  beforeEach(() => {
    mockAuth = {
      isLoading: false,
      isAuthenticated: false,
      signinRedirect: jest.fn(),
      signinSilent: jest.fn(),
      removeUser: jest.fn(),
      user: { profile: { email: "" } },
      error: null,
      events: {
        addAccessTokenExpiring: jest.fn(),
      },
    };

    mockDispatch = jest.fn();
    (useAuth as any).mockClear();
    (useDispatch as any).mockClear();

    // Define mock return values
    (useAuth as any).mockReturnValue(mockAuth);
    (useDispatch as any).mockReturnValue(mockDispatch);
  });

  it("renders loading state", () => {
    mockAuth.isLoading = true;
    render(<OIDCAppRouter />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("renders error message", () => {
    mockAuth.error = { message: "An error occurred" };
    render(<OIDCAppRouter />);
    expect(screen.getByText("Oops... An error occurred")).toBeInTheDocument();
  });

  it("renders sign-in button and initiates redirect on click", () => {
    render(<OIDCAppRouter />);
    const signInButton = screen.getByText("signin.signInToSolution");
    fireEvent.click(signInButton);
    expect(mockAuth.signinRedirect).toHaveBeenCalled();
  });
});
