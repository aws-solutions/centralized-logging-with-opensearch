// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Key prefixes used by Amplify Auth (Cognito) and oidc-client-ts for stored sign-in tokens
const AUTH_TOKEN_KEY_PREFIXES = ["CognitoIdentityServiceProvider.", "oidc.user:"];

/**
 * Removes sign-in tokens from local storage. The console keeps tokens in
 * session storage, so any token found in local storage was written by an
 * earlier version and would otherwise stay there until it expires.
 */
export const removeAuthTokensFromLocalStorage = (
  storage: Storage = globalThis.localStorage
): void => {
  const tokenKeys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index)
  ).filter(
    (key): key is string =>
      key !== null &&
      AUTH_TOKEN_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
  tokenKeys.forEach((key) => storage.removeItem(key));
};
