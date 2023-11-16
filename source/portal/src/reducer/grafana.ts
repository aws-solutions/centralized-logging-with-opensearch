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

import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  CheckGrafanaQueryVariables,
  DomainStatusCheckType,
  GrafanaStatusCheckResponse,
} from "API";
import { ApiResponse, appSyncRequestQuery } from "assets/js/request";
import {
  pipFieldValidator,
  validateRequiredText,
} from "assets/js/utils";
import { checkGrafana } from "graphql/queries";
import i18n from "i18n";

export type GrafanaState = {
  loading: boolean;
  status: DomainStatusCheckType;
  grafanaName: string;
  grafanaNameError: string;
  grafanaUrl: string;
  grafanaUrlError: string;
  grafanaToken: string;
  grafanaTokenError: string;
  grafanaURLConnectivity: DomainStatusCheckType;
  grafanaTokenValidity: DomainStatusCheckType;
  grafanaHasInstalledAthenaPlugin: DomainStatusCheckType;
  grafanaDataSourcePermission: DomainStatusCheckType;
  grafanaFolderPermission: DomainStatusCheckType;
  grafanaDashboardsPermission: DomainStatusCheckType;
};

export type validateGrafanaConnectionInput = {
  url?: string;
  token?: string;
  id?: string;
};

export type validateGrafanaTextInput = {
  text: string;
  validateResult: string;
};

export type validateGrafanaTextValidateInput = {
  validateGrafanaNameInput: string;
  validateGrafanaUrlInput: string;
  validateGrafanaTokenInput: string;
};

const initialState: GrafanaState = {
  loading: false,
  status: DomainStatusCheckType.NOT_STARTED,
  grafanaName: "",
  grafanaNameError: "",
  grafanaUrl: "",
  grafanaUrlError: "",
  grafanaToken: "",
  grafanaTokenError: "",
  grafanaURLConnectivity: DomainStatusCheckType.NOT_STARTED,
  grafanaTokenValidity: DomainStatusCheckType.NOT_STARTED,
  grafanaHasInstalledAthenaPlugin: DomainStatusCheckType.NOT_STARTED,
  grafanaDataSourcePermission: DomainStatusCheckType.NOT_STARTED,
  grafanaFolderPermission: DomainStatusCheckType.NOT_STARTED,
  grafanaDashboardsPermission: DomainStatusCheckType.NOT_STARTED,
};

const checkArray = [
  "grafanaURLConnectivity",
  "grafanaTokenValidity",
  "grafanaHasInstalledAthenaPlugin",
  "grafanaDataSourcePermission",
  "grafanaFolderPermission",
  "grafanaDashboardsPermission",
] as const;

export const validateGrafanaConnection = createAsyncThunk(
  "grafana/ValidateGrafanaConnection",
  async (body: validateGrafanaConnectionInput, { dispatch }) => {
    dispatch(grafana.actions.changeLoading(true));
    const checkGrafanaParams: CheckGrafanaQueryVariables = {
      url: body.url,
      token: body.token,
      id: body.id,
    };
    const result: ApiResponse<"checkGrafana", GrafanaStatusCheckResponse> =
      await appSyncRequestQuery(checkGrafana, checkGrafanaParams);
    return result.data.checkGrafana;
  }
);

export const validateGrafanaName = pipFieldValidator(
  validateRequiredText(() => i18n.t("lightengine:grafana.noNameError"))
);

export const validateGrafanaToken = pipFieldValidator(
  validateRequiredText(() => i18n.t("lightengine:grafana.noTokenError"))
);

export const validateGrafanaUrl = pipFieldValidator(
  validateRequiredText(() => i18n.t("lightengine:grafana.noUrlError")),
);

export const grafana = createSlice({
  name: "grafana",
  initialState: initialState,
  reducers: {
    nameChanged: (state, { payload }: PayloadAction<string>) => {
      state.grafanaName = payload;
      state.grafanaNameError = validateGrafanaName(payload);
      state.status = DomainStatusCheckType.NOT_STARTED;
    },
    urlChanged: (state, { payload }: PayloadAction<string>) => {
      state.grafanaUrl = payload;
      state.grafanaUrlError = validateGrafanaUrl(payload);
      state.status = DomainStatusCheckType.NOT_STARTED;
    },
    tokenChanged: (state, { payload }: PayloadAction<string>) => {
      state.grafanaToken = payload;
      state.grafanaTokenError = validateGrafanaToken(payload);
      state.status = DomainStatusCheckType.NOT_STARTED;
    },
    validateGrafana: (state) => {
      state.grafanaNameError = validateGrafanaName(state.grafanaName);
      state.grafanaUrlError = validateGrafanaUrl(state.grafanaUrl);
      state.grafanaTokenError = validateGrafanaToken(state.grafanaToken);
    },
    changeLoading: (state, { payload }: PayloadAction<boolean>) => {
      state.loading = payload;
    },
    initStatus: () => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(validateGrafanaConnection.fulfilled, (state, action) => {
      state.status = action.payload.status ?? DomainStatusCheckType.FAILED;

      for (const key of checkArray) {
        const detailItem = action.payload.details?.find(
          (detail) => detail?.name?.toLowerCase() === key.toLowerCase()
        );
        if (detailItem) {
          state[key] = detailItem.status ?? DomainStatusCheckType.FAILED;
        }
      }
      state.loading = false;
    });
    builder.addCase(validateGrafanaConnection.pending, (state) => {
      state.status = DomainStatusCheckType.CHECKING;
      for (const key of checkArray) {
        state[key] = DomainStatusCheckType.CHECKING;
      }
      state.loading = true;
    });
  },
});
