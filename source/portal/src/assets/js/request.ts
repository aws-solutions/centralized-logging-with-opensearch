// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Alert } from "assets/js/alert";

import { createAuthLink } from "aws-appsync-auth-link";
import { createSubscriptionHandshakeLink } from "aws-appsync-subscription-link";
import { User } from "oidc-client-ts";

import { ApolloLink } from "apollo-link";
import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client";
import gql from "graphql-tag";
import { AMPLIFY_CONFIG_JSON } from "./const";
import { Auth } from "aws-amplify";
import { AmplifyConfigType, AppSyncAuthType } from "types";
import { ErrorCode } from "API";
import cloneDeep from "lodash.clonedeep";
import { decodeResData, encodeParams } from "./xss";
import i18n from "i18n";

const IGNORE_ERROR_CODE: string[] = [
  ErrorCode.AccountNotFound,
  ErrorCode.DUPLICATED_INDEX_PREFIX,
  ErrorCode.DUPLICATED_WITH_INACTIVE_INDEX_PREFIX,
  ErrorCode.OVERLAP_INDEX_PREFIX,
  ErrorCode.OVERLAP_WITH_INACTIVE_INDEX_PREFIX,
];

// Remove Error Code From Error Message
export const refineErrorMessage = (message: string) => {
  let errorCode = "";

  // Regular expression to match square brackets content
  const squareBracketRegex = new RegExp(`${"\\[(\\S+)\\]"}`);
  const messageRegex = new RegExp(`${"\\[\\S+\\]"}`);
  if (message.trim().startsWith("[")) {
    const groups = message.match(squareBracketRegex);
    errorCode = groups && groups.length >= 2 ? groups[1] : "";
    message = message.replace(messageRegex, "");
  }

  // Regular expression to match placeholders
  const placeholderRegex = new RegExp(`${"\\$\\{(\\S+)\\}"}`, "g");
  message = message.replace(placeholderRegex, (m, placeholder) => {
    return i18n.t(placeholder);
  });

  return {
    errorCode,
    message,
  };
};

const buildAppsyncLink = () => {
  const configJSONObj: AmplifyConfigType = localStorage.getItem(
    AMPLIFY_CONFIG_JSON
  )
    ? JSON.parse(localStorage.getItem(AMPLIFY_CONFIG_JSON) || "")
    : {};

  function getOIDCUser() {
    const oidcStorage = localStorage.getItem(
      `oidc.user:${configJSONObj.aws_oidc_provider}:${configJSONObj.aws_oidc_client_id}`
    );
    if (!oidcStorage) {
      return null;
    }
    return User.fromStorageString(oidcStorage);
  }

  const url: string = configJSONObj.aws_appsync_graphqlEndpoint;
  const region: string = configJSONObj.aws_appsync_region;
  const authType = configJSONObj.aws_appsync_authenticationType;

  const auth: any = {
    type: configJSONObj.aws_appsync_authenticationType,
    jwtToken:
      authType === AppSyncAuthType.OPEN_ID
        ? getOIDCUser()?.id_token
        : async () => (await Auth.currentSession()).getIdToken().getJwtToken(),
  };

  const httpLink: any = createHttpLink({ uri: url });

  const link = ApolloLink.from([
    createAuthLink({ url, region, auth }) as any,
    createSubscriptionHandshakeLink(
      { url, region, auth } as any,
      httpLink
    ) as any,
  ]);
  return link;
};

export const appSyncRequestQuery = (query: any, params?: any): any => {
  const requestLink: any = buildAppsyncLink();
  const client = new ApolloClient({
    link: requestLink,
    cache: new InMemoryCache({
      addTypename: false,
    }),
  });

  return new Promise(async (resolve, reject) => {
    try {
      const result: any = await client.query({
        query: gql(query),
        variables: params,
        fetchPolicy: "no-cache",
      });
      const decodedResData = decodeResData(query, result);
      resolve(decodedResData);
    } catch (error) {
      const showError: any = error;
      const headerElement = document.getElementById("cloSignedHeader");
      // exclude GetMetricHistoryData for 401 error
      const r = /query\s(\w+)\s*\(/g;
      const res: any = r.exec(query);
      if (
        res?.[1] !== "GetMetricHistoryData" &&
        headerElement &&
        showError?.networkError?.statusCode === 401
      ) {
        Alert(
          i18n.t("signin.reSignInDesc"),
          i18n.t("signin.reSignIn"),
          "warning",
          true
        );
        return;
      }
      const { errorCode, message } = refineErrorMessage(
        showError.message || showError.errors?.[0].message
      );
      if (!IGNORE_ERROR_CODE.includes(errorCode)) {
        Alert(message);
      }
      reject(error);
    }
  });
};

export const appSyncRequestMutation = (mutation: any, params?: any): any => {
  const requestLink: any = buildAppsyncLink();
  const client = new ApolloClient({
    link: requestLink,
    cache: new InMemoryCache({
      addTypename: false,
    }),
  });

  params = JSON.parse(
    JSON.stringify(cloneDeep(params), (name, val) => {
      if (name === "__typename") {
        delete val[name];
      } else {
        return val;
      }
    })
  );

  return new Promise(async (resolve, reject) => {
    try {
      // encode params string value
      const encodedParams = encodeParams(mutation, params);
      const result: any = await client.mutate({
        mutation: gql(mutation),
        variables: encodedParams,
        fetchPolicy: "no-cache",
      });
      resolve(result);
    } catch (error) {
      const showError: any = error;
      const { errorCode, message } = refineErrorMessage(
        showError.message || showError.errors?.[0].message
      );
      if (!IGNORE_ERROR_CODE.includes(errorCode)) {
        Alert(message);
      }
      reject(error);
    }
  });
};

export type ApiResponse<K extends string, V> = Record<"data", Record<K, V>>;
