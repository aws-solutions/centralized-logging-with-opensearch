// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CentralizedTableNameChanged,
  CreateLightEngineActionTypes,
  createLightEngineReducer,
  initState
} from "../createLightEngine";
  
  describe("Table Name Validation in Light Engine Reducer", () => {
    it("should validate empty table name", () => {
      const action: CentralizedTableNameChanged = {
        type: CreateLightEngineActionTypes.CENTRALIZED_TABLE_NAME_CHANGED,
        value: ""
      };
      const newState = createLightEngineReducer(initState, action);
      expect(newState.centralizedTableNameError).toBe(
        "engine.create.errorCentralizedTableNameMissing"
      );
    });
  
    it("should validate valid table names", () => {
      const validNames = [
        "validname",
        "valid_name",
        "valid-name",
        "valid123",
        "UPPERCASE",
        "mixed123Case",
        "valid_name-123"
      ];
  
      validNames.forEach(name => {
        const action: CentralizedTableNameChanged = {
          type: CreateLightEngineActionTypes.CENTRALIZED_TABLE_NAME_CHANGED,
          value: name
        };
        const newState = createLightEngineReducer(initState, action);
        expect(newState.centralizedTableNameError).toBe("");
        expect(newState.centralizedTableName).toBe(name);
      });
    });
  
    it("should validate invalid table names", () => {
      const invalidNames = [
        "table@name",
        "table name",
        "table#name",
        "table$name",
        "table.name",
        "table/name",
        "table%name"
      ];
  
      invalidNames.forEach(name => {
        const action: CentralizedTableNameChanged = {
          type: CreateLightEngineActionTypes.CENTRALIZED_TABLE_NAME_CHANGED,
          value: name
        };
        const newState = createLightEngineReducer(initState, action);
        expect(newState.centralizedTableNameError).toBe(
          "engine.create.errorTableNameValidation"
        );
        expect(newState.centralizedTableName).toBe(name);
      });
    });
  
    it("should maintain state for other fields when table name changes", () => {
      const initialStateWithValues = {
        ...initState,
        grafanaId: "test-grafana",
        centralizedBucketName: "test-bucket"
      };
  
      const action: CentralizedTableNameChanged = {
        type: CreateLightEngineActionTypes.CENTRALIZED_TABLE_NAME_CHANGED,
        value: "valid-table"
      };
  
      const newState = createLightEngineReducer(initialStateWithValues, action);
      expect(newState.grafanaId).toBe("test-grafana");
      expect(newState.centralizedBucketName).toBe("test-bucket");
      expect(newState.centralizedTableName).toBe("valid-table");
      expect(newState.centralizedTableNameError).toBe("");
    });
  });
  