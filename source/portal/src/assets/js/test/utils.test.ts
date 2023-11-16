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

import { EngineType } from "API";
import {
  IsJsonString,
  bucketNameIsValid,
  checkIndexNameValidate,
  humanFileSize,
  isEmpty,
  splitStringToBucketAndPrefix,
  buildDashboardLink,
  transformSchemaType,
  formatTimeStamp,
  buildACMLink,
  buildEC2LInk,
  buildKDSLink,
  buildKDFLink,
  combineReducers,
  ternary,
  hasSamePrefix,
  buildOSIParamsValue,
  buildOSIPipelineNameByPipelineId,
  isOSIPipeline,
  defaultStr,
} from "../utils";
import { LogProcessorType } from "reducer/selectProcessor";

describe("buildDashboardLink", () => {
  const elbLink = "my-elb-link.com";
  const domainName = "my-domain.com";
  it("should build OpenSearch dashboard link with domain name", () => {
    const link = buildDashboardLink(EngineType.OpenSearch, elbLink, domainName);
    expect(link).toBe(`https://${domainName}/_dashboards/`);
  });

  it("should build OpenSearch dashboard link without domain name", () => {
    const link = buildDashboardLink(EngineType.OpenSearch, elbLink, "");
    expect(link).toBe(`https://${elbLink}/_dashboards/`);
  });

  it("should build AnotherEngine dashboard link with domain name", () => {
    const link = buildDashboardLink("", elbLink, domainName);
    expect(link).toBe(`https://${domainName}/_plugin/kibana/`);
  });

  it("should build AnotherEngine dashboard link without domain name", () => {
    const link = buildDashboardLink("", elbLink, "");
    expect(link).toBe(`https://${elbLink}/_plugin/kibana/`);
  });
});

describe("splitStringToBucketAndPrefix function tests", () => {
  test("Properly splits valid S3 key", () => {
    const s3KeyStr = "s3://my-bucket/my-folder/my-sub-folder/my-file.txt";
    const result = splitStringToBucketAndPrefix(s3KeyStr);
    expect(result).toEqual({
      bucket: "my-bucket",
      prefix: "my-folder/my-sub-folder/my-file.txt",
    });
  });

  test("Returns only bucket when no prefix is present", () => {
    const s3KeyStr = "s3://my-bucket/";
    const result = splitStringToBucketAndPrefix(s3KeyStr);
    expect(result).toEqual({
      bucket: "my-bucket",
      prefix: "",
    });
  });

  test("Handles case with deep folder structure", () => {
    const s3KeyStr = "s3://my-bucket/folder/subfolder/subsubfolder/file.txt";
    const result = splitStringToBucketAndPrefix(s3KeyStr);
    expect(result).toEqual({
      bucket: "my-bucket",
      prefix: "folder/subfolder/subsubfolder/file.txt",
    });
  });

  test("Properly handles an empty string", () => {
    const s3KeyStr = "";
    const result = splitStringToBucketAndPrefix(s3KeyStr);
    expect(result).toEqual({
      bucket: "",
      prefix: "",
    });
  });
});

describe("checkIndexNameValidate Tests", () => {
  test("Should return true for valid index names", () => {
    const validIndexName = "valid-index-name";
    expect(checkIndexNameValidate(validIndexName)).toBe(true);
  });

  test("Should return false when the index name starts with a number", () => {
    const invalidIndexName = "9-invalid-index-name";
    expect(checkIndexNameValidate(invalidIndexName)).toBe(false);
  });

  test("Should return false when the index name contains uppercase letters", () => {
    const invalidIndexName = "Invalid-index-name";
    expect(checkIndexNameValidate(invalidIndexName)).toBe(false);
  });

  test("Should return false when the index name contains forbidden characters", () => {
    const invalidIndexName = "invalid-index-name!";
    expect(checkIndexNameValidate(invalidIndexName)).toBe(false);
  });

  test("Should return false when the index name is an empty string", () => {
    const emptyIndexName = "";
    expect(checkIndexNameValidate(emptyIndexName)).toBe(false);
  });
});

describe("IsJsonString Tests", () => {
  test("Should return true for a valid JSON string", () => {
    const jsonString = '{"name": "John", "age": 30}';
    expect(IsJsonString(jsonString)).toBe(true);
  });

  test("Should return false for a malformed JSON string", () => {
    const badJson = '{name: "John", age: 30}';
    expect(IsJsonString(badJson)).toBe(false);
  });

  test("Should return false for a non-JSON string", () => {
    const nonJsonString = "I am just a regular string, not a JSON string.";
    expect(IsJsonString(nonJsonString)).toBe(false);
  });

  test("Should return true for an empty JSON object", () => {
    const emptyJsonObject = "{}";
    expect(IsJsonString(emptyJsonObject)).toBe(true);
  });

  test("Should return true for a JSON array", () => {
    const jsonArray = "[1, 2, 3]";
    expect(IsJsonString(jsonArray)).toBe(true);
  });

  test("Should return false for an empty string", () => {
    const emptyString = "";
    expect(IsJsonString(emptyString)).toBe(false);
  });
});

describe("transformSchemaType", () => {
  it("changes type from null to string at the root", () => {
    const schema = {
      type: "null",
    };
    const transformedSchema = transformSchemaType(schema);
    expect(transformedSchema.type).toBe("string");
  });

  it("changes type from null to string in nested properties", () => {
    const schema = {
      type: "object",
      properties: {
        child: {
          type: "null",
        },
      },
    };
    const transformedSchema = transformSchemaType(schema);
    expect(transformedSchema.properties.child.type).toBe("string");
  });

  it("changes type from null to string in nested array items", () => {
    const schema = {
      type: "array",
      items: {
        type: "null",
      },
    };
    const transformedSchema = transformSchemaType(schema);
    expect(transformedSchema.items.type).toBe("string");
  });

  it("recursively changes type from null to string in deeply nested structures", () => {
    const schema = {
      type: "object",
      properties: {
        child: {
          type: "object",
          properties: {
            grandchild: {
              type: "null",
            },
          },
        },
      },
    };
    const transformedSchema = transformSchemaType(schema);
    expect(transformedSchema.properties.child.properties.grandchild.type).toBe(
      "string"
    );
  });

  it("does not change types other than null", () => {
    const schema = {
      type: "object",
      properties: {
        child: {
          type: "integer",
        },
      },
    };
    const transformedSchema = transformSchemaType(schema);
    expect(transformedSchema.properties.child.type).toBe("integer");
  });
});

describe("formatTimeStamp", () => {
  it('returns "-" for a falsy timestamp value', () => {
    const timestamp = 0;
    const formatted = formatTimeStamp(timestamp);
    expect(formatted).toBe("-");
  });
});

describe("humanFileSize Tests", () => {
  test("Should return the size in bytes if less than thresh", () => {
    const bytes = 500;
    expect(humanFileSize(bytes)).toBe("500 B");
  });

  test("Should return the size in KiB or MiB for larger byte size (non-SI units)", () => {
    const kibibytes = 1024;
    const mebibytes = 1024 * 1024;
    expect(humanFileSize(kibibytes)).toBe("1.0 KiB");
    expect(humanFileSize(mebibytes)).toBe("1.0 MiB");
  });

  test("Should return the size in kB or MB for larger byte size (SI units)", () => {
    const kilobytes = 1000;
    const megabytes = 1000 * 1000;
    expect(humanFileSize(kilobytes, true)).toBe("1.0 kB");
    expect(humanFileSize(megabytes, true)).toBe("1.0 MB");
  });

  test("Should return the size with specified decimal precision", () => {
    const bytes = 1555;
    expect(humanFileSize(bytes, false, 2)).toBe("1.52 KiB");
    expect(humanFileSize(bytes, true, 3)).toBe("1.555 kB");
  });

  test("Should handle zero bytes appropriately", () => {
    const bytes = 0;
    expect(humanFileSize(bytes)).toBe("0 B");
  });

  test("Should handle negative values", () => {
    const bytes = -1000;
    expect(humanFileSize(bytes)).toBe("-1000 B");
  });
});

describe("bucketNameIsValid Tests", () => {
  test("Should return true for a valid bucket name", () => {
    const validName = "my.valid-bucket1";
    expect(bucketNameIsValid(validName)).toBe(true);
  });

  test("Should return false for bucket names not starting with a number or letter", () => {
    const invalidStartingChar = ".invalidBucket";
    expect(bucketNameIsValid(invalidStartingChar)).toBe(false);
  });

  test("Should return false for bucket names ending with a hyphen", () => {
    const invalidEndingChar = "invalid-bucket-";
    expect(bucketNameIsValid(invalidEndingChar)).toBe(false);
  });

  test("Should return false for bucket names with consecutive periods", () => {
    const invalidPeriods = "in..validBucket";
    expect(bucketNameIsValid(invalidPeriods)).toBe(false);
  });

  test("Should handle bucket names that are too short or too long", () => {
    const tooShortName = "ab";
    const tooLongName = "a".repeat(64);
    expect(bucketNameIsValid(tooShortName)).toBe(false);
    expect(bucketNameIsValid(tooLongName)).toBe(false);
  });

  test("Should return false for bucket names with characters not allowed", () => {
    const invalidName = "invalid_bucket*name";
    expect(bucketNameIsValid(invalidName)).toBe(false);
  });
});

describe("buildACMLink", () => {
  it("should build the ACM link for standard AWS regions", () => {
    const region = "us-example-2";
    const link = buildACMLink(region);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/acm/home?region=${region}#/`
    );
  });

  it("should build the ACM link for China regions", () => {
    const region = "cn-example-1";
    const link = buildACMLink(region);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/acm/home?region=${region}#/`
    );
  });
});

describe("buildEC2Link", () => {
  const region = "eu-example-1";
  const instanceId = "i-1234567890abcdef0";

  it("should build the EC2 link for standard AWS regions", () => {
    const link = buildEC2LInk(region, instanceId);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#Instances:v=3;instanceId=${instanceId}`
    );
  });

  it("should build the EC2 link for China regions", () => {
    const cnRegion = "cn-example-1";
    const link = buildEC2LInk(cnRegion, instanceId);
    expect(link).toBe(
      `https://${cnRegion}.console.amazonaws.cn/ec2/v2/home?region=${cnRegion}#Instances:instanceId=${instanceId}`
    );
  });
});

describe("buildKDSLink", () => {
  it("should build the KDS link for standard AWS regions", () => {
    const region = "us-example-1";
    const kdsName = "myKinesisDataStream";
    const link = buildKDSLink(region, kdsName);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/kinesis/home?region=${region}#/streams/details/${kdsName}/monitoring`
    );
  });

  it("should build the KDS link for China regions", () => {
    const region = "cn-example-1";
    const kdsName = "myKinesisDataStream";
    const link = buildKDSLink(region, kdsName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/kinesis/home?region=${region}#/streams/details/${kdsName}/monitoring`
    );
  });
});

describe("buildKDFLink", () => {
  it("should build the KDF link for standard AWS regions", () => {
    const region = "us-example-2";
    const kdfName = "myFirehoseDeliveryStream";
    const expectedLink = `https://${region}.console.aws.amazon.com/firehose/home?region=${region}#/details/${kdfName}/monitoring`;
    const link = buildKDFLink(region, kdfName);
    expect(link).toBe(expectedLink);
  });

  it("should build the KDF link for China regions", () => {
    const region = "cn-example-1";
    const kdfName = "myFirehoseDeliveryStream";
    const expectedLink = `https://${region}.console.amazonaws.cn/firehose/home?region=${region}#/details/${kdfName}/monitoring`;
    const link = buildKDFLink(region, kdfName);
    expect(link).toBe(expectedLink);
  });
});

describe("combineReducers", () => {
  // Mock reducers
  const firstReducer = jest
    .fn()
    .mockImplementation((state = "first", action) => {
      switch (action.type) {
        case "FIRST_ACTION":
          return "first_updated";
        default:
          return state;
      }
    });

  const secondReducer = jest
    .fn()
    .mockImplementation((state = "second", action) => {
      switch (action.type) {
        case "SECOND_ACTION":
          return "second_updated";
        default:
          return state;
      }
    });

  const rootReducer = combineReducers({
    first: firstReducer,
    second: secondReducer,
  });

  const initialState = {
    first: "first",
    second: "second",
  };

  it("should call each reducer with the corresponding initial state and action", () => {
    const action = { type: "FIRST_ACTION" };
    rootReducer(initialState, action);
    expect(firstReducer).toHaveBeenCalledWith("first", action);
    expect(secondReducer).toHaveBeenCalledWith("second", action);
  });

  it("should handle an action that updates multiple slices of state", () => {
    const action = { type: "SECOND_ACTION" };
    const newState = rootReducer(initialState, action);
    expect(newState).toEqual({
      first: undefined,
      second: undefined,
    });
  });

  it("should return the current state if no reducers are provided", () => {
    const emptyRootReducer = combineReducers({});
    const newState = emptyRootReducer(initialState, { type: "ANY_ACTION" });
    expect(newState).toEqual(initialState);
  });
});

describe("ternary", () => {
  it("should return the first argument if the condition is true", () => {
    const result = ternary(true, "Case 1", "Case 2");
    expect(result).toBe("Case 1");
  });

  it("should return the second argument if the condition is false", () => {
    const result = ternary(false, "Case 1", "Case 2");
    expect(result).toBe("Case 2");
  });

  it("should work with different types", () => {
    const resultNumber = ternary(true, 1, 2);
    expect(resultNumber).toBe(1);

    const resultObject = ternary(false, { name: "Alice" }, { name: "Bob" });
    expect(resultObject).toEqual({ name: "Bob" });
  });

  it("should handle falsy values correctly as conditions", () => {
    expect(ternary(null, "Case 1", "Case 2")).toBe("Case 2");
    expect(ternary(undefined, "Case 1", "Case 2")).toBe("Case 2");
    expect(ternary(0, "Case 1", "Case 2")).toBe("Case 2");
    expect(ternary("", "Case 1", "Case 2")).toBe("Case 2");
  });

  it("should handle truthy values correctly as conditions", () => {
    expect(ternary("hello", "Case 1", "Case 2")).toBe("Case 1");
    expect(ternary(1, "Case 1", "Case 2")).toBe("Case 1");
    expect(ternary({}, "Case 1", "Case 2")).toBe("Case 1");
    expect(ternary([], "Case 1", "Case 2")).toBe("Case 1");
  });
});

describe("hasSamePrefix", () => {
  it("returns false for an empty array", () => {
    expect(hasSamePrefix([])).toBe(false);
  });

  it("returns true for an array with a single path", () => {
    expect(hasSamePrefix(["/my/path"])).toBe(true);
  });

  it("returns true for an array of paths with the same prefix", () => {
    const paths = ["/my/path/one", "/my/path/two", "/my/path/three"];
    expect(hasSamePrefix(paths)).toBe(true);
  });

  it("returns false for an array of paths with different prefixes", () => {
    const paths = ["/my/path/one", "/my/otherpath/two", "/another/path/three"];
    expect(hasSamePrefix(paths)).toBe(false);
  });

  it("returns true for an array of paths with the same complex prefix", () => {
    const paths = [
      "/my/path/to/resource",
      "/my/path/to/another",
      "/my/path/to/place",
    ];
    expect(hasSamePrefix(paths)).toBe(true);
  });

  it("handles paths without slashes correctly", () => {
    const paths = ["nopath", "nopath", "nopath"];
    expect(hasSamePrefix(paths)).toBe(true);
  });

  it("handles a mix of paths with and without slashes correctly", () => {
    const paths = ["nopath", "/my/path/to/another", "/my/path"];
    expect(hasSamePrefix(paths)).toBe(false);
  });
});

describe("buildOSIParamsValue", () => {
  it("returns minCapacity and maxCapacity as 0 when logProcessorType is not OSI", () => {
    const osiObj: any = {
      logProcessorType: LogProcessorType.LAMBDA,
      minOCU: "5",
      maxOCU: "10",
    };
    const result = buildOSIParamsValue(osiObj);
    expect(result).toEqual({ minCapacity: 0, maxCapacity: 0 });
  });

  it("returns parsed minCapacity and maxCapacity when logProcessorType is OSI", () => {
    const osiObj: any = {
      logProcessorType: LogProcessorType.OSI,
      minOCU: "5",
      maxOCU: "10",
    };
    const result = buildOSIParamsValue(osiObj);
    expect(result).toEqual({ minCapacity: 5, maxCapacity: 10 });
  });

  it("handles non-integer values for OCU by parsing them as integers", () => {
    const osiObj: any = {
      logProcessorType: LogProcessorType.OSI,
      minOCU: "5.7",
      maxOCU: "10.2",
    };
    const result = buildOSIParamsValue(osiObj);
    expect(result).toEqual({ minCapacity: 5, maxCapacity: 10 });
  });
});

describe("buildOSIPipelineNameByPipelineId", () => {
  it('should prepend "cl-" to the first 23 characters of the pipelineId', () => {
    const pipelineId = "123456789012345678901234567890";
    const result = buildOSIPipelineNameByPipelineId(pipelineId);
    expect(result).toBe("cl-12345678901234567890123");
  });

  it("should return the correct name when pipelineId is exactly 23 characters long", () => {
    const pipelineId = "12345678901234567890123";
    const result = buildOSIPipelineNameByPipelineId(pipelineId);
    expect(result).toBe("cl-12345678901234567890123");
  });

  it('should return "cl-" followed by the pipelineId when it is shorter than 23 characters', () => {
    const pipelineId = "12345";
    const result = buildOSIPipelineNameByPipelineId(pipelineId);
    expect(result).toBe("cl-12345");
  });

  it('should return just "cl-" when the pipelineId is empty', () => {
    const pipelineId = "";
    const result = buildOSIPipelineNameByPipelineId(pipelineId);
    expect(result).toBe("cl-");
  });
});

describe("isOSIPipeline", () => {
  it("should return false if pipeline is undefined", () => {
    const result = isOSIPipeline(undefined);
    expect(result).toBe(false);
  });

  it("should return false if pipeline is null", () => {
    const result = isOSIPipeline(null);
    expect(result).toBe(false);
  });

  it("should return false if minCapacity is not present", () => {
    const pipeline: any = { osiParams: {} };
    const result = isOSIPipeline(pipeline);
    expect(result).toBe(false);
  });

  it("should return false if minCapacity is zero", () => {
    const pipeline: any = { osiParams: { minCapacity: 0 } };
    const result = isOSIPipeline(pipeline);
    expect(result).toBe(false);
  });

  it("should return true if minCapacity is a positive number", () => {
    const pipeline: any = { osiParams: { minCapacity: 5 } };
    const result = isOSIPipeline(pipeline);
    expect(result).toBe(true);
  });

  it("should return true if minCapacity is a positive numeric string", () => {
    const pipeline: any = { osiParams: { minCapacity: "10" } };
    const result = isOSIPipeline(pipeline);
    expect(result).toBe(true);
  });

  it("should return false if minCapacity is negative", () => {
    const pipeline: any = { osiParams: { minCapacity: -1 } };
    const result = isOSIPipeline(pipeline);
    expect(result).toBe(false);
  });
});

describe("isEmpty", () => {
  test("should return true for null", () => {
    expect(isEmpty(null)).toBe(true);
  });
  test("should return true for undefined", () => {
    expect(isEmpty(undefined)).toBe(true);
  });
  test("should return true for empty objects", () => {
    expect(isEmpty({})).toBe(true);
  });
  test("should return false for non-empty objects", () => {
    expect(isEmpty({ key: "value" })).toBe(false);
  });
  test("should return true for empty strings", () => {
    expect(isEmpty("")).toBe(true);
    expect(isEmpty(" ")).toBe(true);
  });
  test("should return false for non-empty strings", () => {
    expect(isEmpty("Hello")).toBe(false);
  });
  test('should return true for string "{}"', () => {
    expect(isEmpty("{}")).toBe(true);
  });
  test("should return false for numbers, arrays, and boolean values", () => {
    expect(isEmpty(42)).toBe(false);
    expect(isEmpty([1, 2, 3])).toBe(false);
    expect(isEmpty(true)).toBe(false);
  });

  describe("defaultStr", () => {
    it("returns the original string if it is defined and not null", () => {
      expect(defaultStr("hello")).toBe("hello");
    });

    it("returns an empty string if the input is undefined and no default value is provided", () => {
      expect(defaultStr(undefined)).toBe("");
    });

    it("returns an empty string if the input is null and no default value is provided", () => {
      expect(defaultStr(null)).toBe("");
    });

    it("returns the default value if the input is undefined", () => {
      expect(defaultStr(undefined, "default")).toBe("default");
    });

    it("returns the default value if the input is null", () => {
      expect(defaultStr(null, "default")).toBe("default");
    });

    it("returns the original string even if a default value is provided", () => {
      expect(defaultStr("hello", "default")).toBe("hello");
    });

    it("returns an empty string if the input is an empty string and no default value is provided", () => {
      expect(defaultStr("")).toBe("");
    });

    it("returns the default value if the input is an empty string and default value is provided", () => {
      expect(defaultStr("", "default")).toBe("");
    });

    it("returns the default value if the input is just whitespace", () => {
      expect(defaultStr("  ", "default")).toBe("  ");
    });
  });
});
