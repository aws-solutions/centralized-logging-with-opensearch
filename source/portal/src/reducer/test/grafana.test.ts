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

import { DomainStatusCheckType } from "API";
import { GrafanaState, grafana, validateGrafanaConnection } from "reducer/grafana";
import configureMockStore, { MockStoreEnhanced } from 'redux-mock-store';
import thunk from 'redux-thunk';

const middlewares = [thunk];
const mockStore = configureMockStore<GrafanaState>(middlewares);

jest.mock("i18n", () => ({
  t: (key: string) => key,
}));

describe("grafana Reducer", () => {
  let initialState: GrafanaState;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let store: MockStoreEnhanced<GrafanaState>;

  beforeEach(() => {
    initialState = {
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
    store = mockStore(initialState);
  });

  it('handles validateGrafanaConnection.fulfilled', () => {
    const actionPayload = {
      status: 'fulfilled',
      details: [
        { name: 'SomeName', status: 'SOME_STATUS' },
      ],
    };

    const action = { type: validateGrafanaConnection.fulfilled.type, payload: actionPayload };
    const newState = grafana.reducer(initialState, action);
    expect(newState.status).toEqual(actionPayload.status);
  });

  it('handles validateGrafanaConnection.pending', () => {
    const action = { type: validateGrafanaConnection.pending.type };

    const newState = grafana.reducer(initialState, action);
    expect(newState.status).toEqual('CHECKING');
  });

  it("name changed", () => {
    const action = grafana.actions.nameChanged("name");
    const newState = grafana.reducer(initialState, action);
    expect(newState.grafanaName).toEqual("name");
  });

  it("name changed name is required", () => {
    const action = grafana.actions.nameChanged("");
    const newState = grafana.reducer(initialState, action);
    expect(newState.grafanaName).toEqual("");
    expect(newState.grafanaNameError).toEqual("lightengine:grafana.noNameError");
  });

  it("url changed", () => {
    const action = grafana.actions.urlChanged("https://example.com");
    const newState = grafana.reducer(initialState, action);
    expect(newState.grafanaUrl).toEqual("https://example.com");
  });

  it("url changed with invalid URL", () => {
    const action = grafana.actions.urlChanged("");
    const newState = grafana.reducer(initialState, action);
    expect(newState.grafanaUrl).toEqual("");
    expect(newState.grafanaUrlError).toEqual("lightengine:grafana.noUrlError");
  });

  it("token changed", () => {
    const action = grafana.actions.tokenChanged("exampleToken123");
    const newState = grafana.reducer(initialState, action);
    expect(newState.grafanaToken).toEqual("exampleToken123");
  });

  it("token changed with invalid token", () => {
    const action = grafana.actions.tokenChanged("");
    const newState = grafana.reducer(initialState, action);
    expect(newState.grafanaToken).toEqual("");
    expect(newState.grafanaTokenError).toEqual("lightengine:grafana.noTokenError");
  });

  it("all changed", () => {
    const action = grafana.actions.validateGrafana();
    grafana.reducer(initialState, action);
  });

  it("change loading", () => {
    const action = grafana.actions.changeLoading(true);
    const newState = grafana.reducer(initialState, action);
    expect(newState.loading).toEqual(true);
  });

  it("initStatus", () => {
    const action = grafana.actions.initStatus();
    const newState = grafana.reducer(initialState, action);
    expect(newState).toEqual(initialState);
  });
});

