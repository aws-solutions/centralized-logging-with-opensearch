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

import { encodeParams, decodeResData } from "../xss";

describe("encodeParams", () => {
  it("encodes parameters that require encoding", () => {
    const params = {
      stackId: "Stack&123",
      key: "Value/456",
      value: "Value?789",
    };

    const encodedParams = encodeParams(
      "mutation CreateAppLogIngestion (",
      params
    );
    expect(encodedParams.value).toBe(encodeURIComponent("Value?789"));
  });

  it("handles nested objects", () => {
    const nestedParams = {
      nested: {
        key: "NestedValue/123",
        value: "NestedValue?456",
      },
    };

    const encodedNestedParams = encodeParams(
      "mutation CreateAppLogIngestion (",
      nestedParams
    );

    expect(encodedNestedParams.nested.value).toBe(
      encodeURIComponent("NestedValue?456")
    );
  });
});

describe("decodeResData", () => {
  it("decodes response data that require decoding", () => {
    const resData = {
      confName: "Name+Plus",
      logPath: "Path%2FWith%2FSlashes",
      key: "Key%3DWith%3DEquals",
      value: "Value%26With%26Ampersands",
    };
    const decodedResData = decodeResData("query GetAppLogIngestion (", resData);
    expect(decodedResData.confName).toBe("Name Plus");
  });

  it("handles nested response objects", () => {
    const nestedResData = {
      nested: {
        key: "Key%3DWith%3DEquals",
        value: "Value+With+Pluses",
      },
    };
    const decodedNestedResData = decodeResData(
      "query GetAppLogIngestion (",
      nestedResData
    );
    expect(decodedNestedResData.nested.value).toBe("Value With Pluses");
  });
});

describe("encoding and decoding round trip", () => {
  it("returns to original state after encoding followed by decoding", () => {
    const originalValue = "Value With Spaces & Special Characters /";
    const params = {
      value: originalValue,
    };

    const encodedParams = encodeParams(
      "mutation CreateAppLogIngestion (",
      params
    );
    const decodedParams = decodeResData("query GetAppLogIngestion (", {
      value: encodedParams.value,
    });

    expect(decodedParams.value).toBe(originalValue.replace(/\+/g, " "));
  });
});

describe("encodeParams with special cases and non-string values", () => {
  it("does not encode non-string values", () => {
    const params = {
      number: 123,
      boolean: true,
      string: "testValue",
    };

    const encodedParams = encodeParams("mutation SomeMutationName (", params);
    expect(encodedParams.number).toBe(123);
    expect(encodedParams.boolean).toBe(true);
    expect(encodedParams.string).toBe("testValue");
  });

  it("does not encode if mutation name is not found", () => {
    const params = {
      key: "ValueToEncode",
    };

    const encodedParams = encodeParams(
      "mutation NonExistentMutation (",
      params
    );
    expect(encodedParams.key).toBe("ValueToEncode");
  });
});
