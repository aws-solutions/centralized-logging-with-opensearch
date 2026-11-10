// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AMPLIFY_CONFIG_JSON } from "../const";
import { removeAuthTokensFromLocalStorage } from "../authStorage";

describe("removeAuthTokensFromLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes Cognito and OIDC tokens and keeps other console data", () => {
    localStorage.setItem(
      "CognitoIdentityServiceProvider.client.user.idToken",
      "id-token"
    );
    localStorage.setItem(
      "CognitoIdentityServiceProvider.client.LastAuthUser",
      "user"
    );
    localStorage.setItem(
      "oidc.user:https://idp.example.com:client",
      '{"id_token":"id-token"}'
    );
    localStorage.setItem(AMPLIFY_CONFIG_JSON, "{}");
    localStorage.setItem("oidc.state-id", "{}");

    removeAuthTokensFromLocalStorage();

    expect(
      localStorage.getItem("CognitoIdentityServiceProvider.client.user.idToken")
    ).toBeNull();
    expect(
      localStorage.getItem("CognitoIdentityServiceProvider.client.LastAuthUser")
    ).toBeNull();
    expect(
      localStorage.getItem("oidc.user:https://idp.example.com:client")
    ).toBeNull();
    expect(localStorage.getItem(AMPLIFY_CONFIG_JSON)).toBe("{}");
    expect(localStorage.getItem("oidc.state-id")).toBe("{}");
  });

  it("does not touch session storage", () => {
    sessionStorage.setItem(
      "CognitoIdentityServiceProvider.client.user.idToken",
      "id-token"
    );

    removeAuthTokensFromLocalStorage();

    expect(
      sessionStorage.getItem(
        "CognitoIdentityServiceProvider.client.user.idToken"
      )
    ).toBe("id-token");
  });
});
