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

import {
  INIT_OPENSEARCH_DATA,
  OpenSearchState,
  appIndexSuffixChanged,
  convertOpenSearchStateToAppLogOpenSearchParam,
  createDashboardChanged,
  enableRolloverByCapacityChanged,
  indexPrefixChanged,
  indexSuffixChanged,
  isIndexDuplicated,
  isIndexPrefixOverlap,
  openSearchClusterChanged,
  openSearchSlice,
  resetOpenSearch,
  rolloverAndLogLifecycleTransformData,
  shardNumbersChanged,
  validateOpenSearchParams,
} from "../createOpenSearch";
import { Codec, EngineType, ErrorCode, StorageType } from "API";
import { WarmTransitionType } from "types";

jest.mock("i18n", () => ({
  t: (key: string) => key,
}));

describe("createOpenSearch Reducer", () => {
  let initialState: OpenSearchState;
  beforeEach(() => {
    initialState = INIT_OPENSEARCH_DATA;
  });

  it("should reset the openSearch state", () => {
    const action = resetOpenSearch();
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState).toEqual(initialState);
  });

  it("should domain loading changed", () => {
    const action = openSearchSlice.actions.domainLoadingChanged(true);
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.domainLoading).toEqual(true);
  });

  it("should check domain status changed", () => {
    const action = openSearchSlice.actions.domainCheckStatusChanged({
      __typename: "DomainStatusCheckResponse",
      multiAZWithStandbyEnabled: true,
    });
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.replicaNumbers).toEqual("2");
    const actionDisableMultiAZ =
      openSearchSlice.actions.domainCheckStatusChanged({
        __typename: "DomainStatusCheckResponse",
        multiAZWithStandbyEnabled: false,
      });
    const newStateDisableMultiAZ = openSearchSlice.reducer(
      initialState,
      actionDisableMultiAZ
    );
    expect(newStateDisableMultiAZ.replicaNumbers).toEqual("1");
  });

  it("should OpenSearch cluster changed", () => {
    const action = openSearchClusterChanged({
      domainName: "test",
      __typename: "DomainDetails",
      id: "",
      domainArn: "",
      version: "",
      endpoint: "",
      storageType: StorageType.EBS,
    });
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.domainName).toEqual("test");

    const actionNotSupported = openSearchClusterChanged({
      engine: EngineType.Elasticsearch,
      domainName: "",
      __typename: "DomainDetails",
      id: "",
      domainArn: "",
      version: "",
      endpoint: "",
      storageType: StorageType.EBS,
    });
    const newStateActionNotSupported = openSearchSlice.reducer(
      initialState,
      actionNotSupported
    );
    expect(newStateActionNotSupported.rolloverSize).toEqual("");
  });

  it("should index prefix changed", () => {
    const action = indexPrefixChanged("test");
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.indexPrefix).toEqual("test");
  });

  it("should app index suffix changed", () => {
    const action = appIndexSuffixChanged("YY-MM-DD");
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.appIndexSuffix).toEqual("YY-MM-DD");
  });

  it("should index suffix changed", () => {
    const action = indexSuffixChanged("YY-MM-DD");
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.indexSuffix).toEqual("YY-MM-DD");
  });

  it("should create dashboard changed", () => {
    const action = createDashboardChanged("No");
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.createDashboard).toEqual("No");
  });

  it("should shard number changed", () => {
    const action = shardNumbersChanged("2");
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.shardNumbers).toEqual("2");
  });

  it("should replica number changed", () => {
    const action = openSearchSlice.actions.replicaNumbersChanged("2");
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.replicaNumbers).toEqual("2");
  });

  it("should enable rollover capacity changed", () => {
    const action = enableRolloverByCapacityChanged(false);
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.enableRolloverByCapacity).toEqual(false);
  });

  it("should rollover size changed", () => {
    const action = openSearchSlice.actions.rolloverSizeChanged("2");
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.rolloverSize).toEqual("2");
  });

  it("should compression type changed", () => {
    const action = openSearchSlice.actions.compressionTypeChanged(
      Codec.default
    );
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.codec).toEqual("default");
  });

  it("should warm transition type changed", () => {
    const action = openSearchSlice.actions.warmTransitionTypeChanged(
      WarmTransitionType.BY_DAYS
    );
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.warmTransitionType).toEqual("BY_DAYS");
  });

  it("should warm age changed", () => {
    const action = openSearchSlice.actions.warmAgeChanged("2");
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.warmAge).toEqual("2");
  });

  it("should cold age changed", () => {
    const action = openSearchSlice.actions.coldAgeChanged("2");
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.coldAge).toEqual("2");
  });

  it("should retain age changed", () => {
    const action = openSearchSlice.actions.retainAgeChanged("2");
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.retainAge).toEqual("2");
  });

  it("should validate openSearch", () => {
    const action = openSearchSlice.actions.validateOpenSearch();
    // update index prefix
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.indexPrefixError).toEqual(
      "applog:create.ingestSetting.indexNameError"
    );
    expect(newState.shardsError).toEqual("");
    expect(newState.capacityError).toEqual("");
    expect(newState.warmLogError).toEqual("");
    expect(newState.coldLogError).toEqual("");
    expect(newState.retentionLogError).toEqual("");
  });

  it("validate index prefix", () => {
    const action = openSearchSlice.actions.validateOpenSearch();

    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.indexPrefixError).toEqual(
      "applog:create.ingestSetting.indexNameError"
    );
    const updatedState = {
      ...initialState,
      indexPrefix: "test",
    };
    const updatedIndexState = openSearchSlice.reducer(updatedState, action);
    expect(updatedIndexState.indexPrefixError).toEqual("");

    const indexFormatInvalidState = {
      ...initialState,
      indexPrefix: "111",
    };
    const updatedIndexInvalidState = openSearchSlice.reducer(
      indexFormatInvalidState,
      action
    );
    expect(updatedIndexInvalidState.indexPrefixError).toEqual(
      "applog:create.ingestSetting.indexNameFormatError"
    );
  });

  it("validate shard numbers", () => {
    const action = openSearchSlice.actions.validateOpenSearch();
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.shardsError).toEqual("");
    const invalidShardState = {
      ...initialState,
      shardNumbers: "0",
    };
    const updatedInvalidShardState = openSearchSlice.reducer(
      invalidShardState,
      action
    );
    expect(updatedInvalidShardState.shardsError).toEqual(
      "servicelog:cluster.shardNumError"
    );
  });

  it("validate rollover size", () => {
    const action = openSearchSlice.actions.validateOpenSearch();
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.capacityError).toEqual("");
    const invalidCapacityState = {
      ...initialState,
      rolloverSize: "0",
    };
    const updatedInvalidCapacityState = openSearchSlice.reducer(
      invalidCapacityState,
      action
    );
    expect(updatedInvalidCapacityState.capacityError).toEqual(
      "servicelog:cluster.rolloverError"
    );
  });

  it("validate warm age", () => {
    const action = openSearchSlice.actions.validateOpenSearch();
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.warmLogError).toEqual("");
    const invalidWarmAgeState = { ...initialState, warmAge: "-1" };
    const updatedInvalidWarmAgeState = openSearchSlice.reducer(
      invalidWarmAgeState,
      action
    );
    expect(updatedInvalidWarmAgeState.warmLogError).toEqual(
      "applog:create.specifyOS.warmLogInvalid"
    );
  });

  it("validate cold age", () => {
    const action = openSearchSlice.actions.validateOpenSearch();
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.coldLogError).toEqual("");
    const invalidColdAgeState = { ...initialState, coldAge: "-1" };
    const updatedInvalidColdAgeState = openSearchSlice.reducer(
      invalidColdAgeState,
      action
    );
    expect(updatedInvalidColdAgeState.coldLogError).toEqual(
      "applog:create.specifyOS.coldLogInvalid"
    );
    const invalidColdAgeState2 = {
      ...initialState,
      warmTransitionType: WarmTransitionType.BY_DAYS,
      warmEnable: true,
      coldEnable: true,
      warmAge: "2",
      coldAge: "1",
    };
    const updatedInvalidColdAgeState2 = openSearchSlice.reducer(
      invalidColdAgeState2,
      action
    );
    expect(updatedInvalidColdAgeState2.coldLogError).toEqual(
      "applog:create.specifyOS.coldLogMustThanWarm"
    );
  });

  it("validate retention age", () => {
    const action = openSearchSlice.actions.validateOpenSearch();
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.retentionLogError).toEqual("");
    const invalidRetentionAgeState = { ...initialState, retainAge: "-1" };
    const updatedInvalidRetentionAgeState = openSearchSlice.reducer(
      invalidRetentionAgeState,
      action
    );
    expect(updatedInvalidRetentionAgeState.retentionLogError).toEqual(
      "applog:create.specifyOS.logRetentionError"
    );
  });

  it("validate retention age less than warm age", () => {
    const action = openSearchSlice.actions.validateOpenSearch();
    const newState = openSearchSlice.reducer(initialState, action);
    expect(newState.retentionLogError).toEqual("");
    const invalidRetentionAgeState = {
      ...initialState,
      warmTransitionType: WarmTransitionType.BY_DAYS,
      warmEnable: true,
      coldEnable: true,
      warmAge: "1",
      coldAge: "2",
      retainAge: "0",
    };
    const updatedInvalidRetentionAgeState = openSearchSlice.reducer(
      invalidRetentionAgeState,
      action
    );
    expect(updatedInvalidRetentionAgeState.retentionLogError).toEqual(
      "applog:create.specifyOS.logRetentionMustLargeThanCodeAndWarm"
    );
  });

  it("returns empty values when no settings are enabled", () => {
    const openSearch = {
      ...initialState,
      enableRolloverByCapacity: false,
      warmEnable: false,
      coldEnable: false,
      retainAge: "0",
    };

    const result = rolloverAndLogLifecycleTransformData(openSearch);
    expect(result).toEqual({
      rolloverSize: "",
      warmLogTransition: "",
      coldLogTransition: "",
      logRetention: "",
    });
  });

  it("returns correct rolloverSize when enableRolloverByCapacity is true", () => {
    const openSearch = {
      ...initialState,
      enableRolloverByCapacity: true,
      rolloverSize: "50",
    };
    const result = rolloverAndLogLifecycleTransformData(openSearch);
    expect(result.rolloverSize).toBe("50gb");
  });

  it("returns warm translation type is immediately", () => {
    const openSearch = {
      ...initialState,
      enableRolloverByCapacity: false,
      warmEnable: true,
      warmTransitionType: WarmTransitionType.IMMEDIATELY,
    };
    const result = rolloverAndLogLifecycleTransformData(openSearch);
    expect(result.warmLogTransition).toBe("1s");
  });

  it('return warm translation type is "days"', () => {
    const openSearch = {
      ...initialState,
      enableRolloverByCapacity: false,
      warmEnable: true,
      warmTransitionType: WarmTransitionType.BY_DAYS,
      warmAge: "1",
    };
    const result = rolloverAndLogLifecycleTransformData(openSearch);
    expect(result.warmLogTransition).toBe("1d");
  });

  it('return code translation type is "days"', () => {
    const openSearch = {
      ...initialState,
      enableRolloverByCapacity: false,
      coldEnable: true,
      coldAge: "1",
    };
    const result = rolloverAndLogLifecycleTransformData(openSearch);
    expect(result.coldLogTransition).toBe("1d");
  });

  it("return convert opensearch state with lifecycle", () => {
    const openSearch = {
      ...initialState,
      warmEnable: true,
      codeEnable: true,
      warmAge: "1",
      coldAge: "2",
      retainAge: "3",
    };
    const expectedResult = {
      codec: "best_compression",
      coldLogTransition: "",
      domainName: "",
      engine: "",
      indexPrefix: "",
      indexSuffix: "yyyy_MM_dd",
      logRetention: "3d",
      opensearchArn: "",
      opensearchEndpoint: "",
      refreshInterval: "1s",
      replicaNumbers: "1",
      rolloverSize: "30gb",
      shardNumbers: "1",
      vpc: {
        privateSubnetIds: "",
        publicSubnetIds: "",
        securityGroupId: "",
        vpcId: "",
      },
      warmLogTransition: "1s",
    };
    const result = convertOpenSearchStateToAppLogOpenSearchParam(openSearch);
    expect(result).toEqual(expectedResult);
  });

  it("returns true for OVERLAP_WITH_INACTIVE_INDEX_PREFIX error code", () => {
    const errorCode = ErrorCode.OVERLAP_WITH_INACTIVE_INDEX_PREFIX;
    expect(isIndexPrefixOverlap(errorCode)).toBe(true);
  });

  it("returns true for OVERLAP_INDEX_PREFIX error code", () => {
    const errorCode = ErrorCode.OVERLAP_INDEX_PREFIX;
    expect(isIndexPrefixOverlap(errorCode)).toBe(true);
  });

  it("returns true for DUPLICATED_WITH_INACTIVE_INDEX_PREFIX error code", () => {
    const errorCode = ErrorCode.DUPLICATED_WITH_INACTIVE_INDEX_PREFIX;
    expect(isIndexDuplicated(errorCode)).toBe(true);
  });

  it("returns true for DUPLICATED_INDEX_PREFIX error code", () => {
    const errorCode = ErrorCode.DUPLICATED_INDEX_PREFIX;
    expect(isIndexDuplicated(errorCode)).toBe(true);
  });

  it("returns false for any other error code", () => {
    const someOtherErrorCode = "SOME_OTHER_ERROR";
    expect(isIndexPrefixOverlap(someOtherErrorCode)).toBe(false);
  });

  it("returns false init state with validate opensearch params", () => {
    const validRes = validateOpenSearchParams(initialState);
    expect(validRes).toEqual(false);
  });
});
