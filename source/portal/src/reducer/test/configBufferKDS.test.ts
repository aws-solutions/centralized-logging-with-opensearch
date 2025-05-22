// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { LogType } from "API";
import {
  validateMinCapacity,
  validateMaxCapacity,
  validateKDSBufferParams,
  KDSBufferState,
  kdsBufferSlice,
  convertKDSBufferParameters,
  INIT_KDS_BUFFER_DATA,
} from "../configBufferKDS";
import { YesNo } from "types";

jest.mock("i18n", () => ({
  t: (key: string) => key,
}));

describe("configBufferKDS", () => {
  let initialState: KDSBufferState;
  beforeEach(() => {
    initialState = {
      minCapacityError: "",
      maxCapacityError: "",
      data: {
        enableAutoScaling: "false",
        shardCount: "1",
        minCapacity: "1",
        maxCapacity: "1",
      },
    };
  });

  describe("convertKDSBufferParameters", () => {
    it("sets createDashboard to Yes when shouldCreateDashboard is provided and logType is Nginx", () => {
      const state = { ...initialState };
      const result = convertKDSBufferParameters(state, LogType.Nginx, "Yes");
      const createDashboardObject = result.find(
        (item) => item.paramKey === "createDashboard"
      );
      expect(createDashboardObject?.paramValue).toBe("Yes");
    });

    it("sets createDashboard to No when shouldCreateDashboard is provided but logType is not Nginx or Apache", () => {
      const state = { ...initialState };
      const result = convertKDSBufferParameters(state, LogType.JSON, "Yes");
      const createDashboardObject = result.find(
        (item) => item.paramKey === "createDashboard"
      );
      expect(createDashboardObject?.paramValue).toBe(YesNo.No);
    });

    it("sets createDashboard to No when shouldCreateDashboard is not provided", () => {
      const state = { ...initialState };
      const result = convertKDSBufferParameters(state, LogType.Nginx);
      const createDashboardObject = result.find(
        (item) => item.paramKey === "createDashboard"
      );
      expect(createDashboardObject?.paramValue).toBe(YesNo.No);
    });
  });

  describe("validateMinCapacity", () => {
    it("should validate min capacity correctly", () => {
      const validStr = validateMinCapacity(initialState);
      expect(validStr).toEqual("");
    });
    it("should validate min capacity not correctly", () => {
      const newState = {
        ...initialState,
        data: {
          ...initialState.data,
          minCapacity: "-1",
        },
      };
      const validStr = validateMinCapacity(newState);
      expect(validStr).toEqual("applog:create.ingestSetting.shardNumError");
    });
  });

  describe("validateMaxCapacity", () => {
    it("should validate max capacity correctly", () => {
      const validStr = validateMaxCapacity(initialState);
      expect(validStr).toEqual("");
    });

    it("should validate max capacity not correctly", () => {
      const newState = {
        ...initialState,
        data: {
          ...initialState.data,
          enableAutoScaling: "true",
          minCapacity: "2",
          maxCapacity: "1",
        },
      };
      const validStr = validateMaxCapacity(newState);
      expect(validStr).toEqual("applog:create.ingestSetting.maxShardNumError");
    });
  });

  describe("validateKDSBufferParams", () => {
    it("should validate KDS buffer parameters correctly", () => {
      const validStr = validateKDSBufferParams(initialState);
      expect(validStr).toEqual(true);
    });
  });

  describe("kdsBufferSlice", () => {
    it("should reset KDS buffer state correctly", () => {
      const action = kdsBufferSlice.actions.resetKDSBuffer();
      const result = kdsBufferSlice.reducer(initialState, action);
      expect(result).toEqual(INIT_KDS_BUFFER_DATA);
    });

    it("should handle min capacity changed correctly", () => {
      const action = kdsBufferSlice.actions.minCapacityChanged("2");
      const result = kdsBufferSlice.reducer(initialState, action);
      expect(result.data.minCapacity).toBe("2");
      expect(result.data.shardCount).toBe("2");
      expect(result.minCapacityError).toBe("");
      expect(result.maxCapacityError).toBe("");
    });

    it("should handle enable auto scaling changed correctly", () => {
      const action = kdsBufferSlice.actions.enableAutoScalingChanged("true");
      const result = kdsBufferSlice.reducer(initialState, action);
      expect(result.data.enableAutoScaling).toBe("true");
    });

    it("should handle max capacity changed correctly", () => {
      const action = kdsBufferSlice.actions.maxCapacityChanged("2");
      const result = kdsBufferSlice.reducer(initialState, action);
      expect(result.data.maxCapacity).toBe("2");
    });

    it("should validate KDS buffer correctly", () => {
      const action = kdsBufferSlice.actions.validateKDSBuffer();
      const result = kdsBufferSlice.reducer(initialState, action);
      expect(result.maxCapacityError).toBe("");
      expect(result.minCapacityError).toBe("");
    });
  });
});
