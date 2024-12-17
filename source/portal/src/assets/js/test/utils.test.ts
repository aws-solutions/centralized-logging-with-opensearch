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

import { EngineType, SchedulerType } from "API";
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
  buildCfnLink,
  buildESLink,
  buildESCloudWatchLink,
  buildVPCLink,
  buildSubnetLink,
  buildVPCPeeringLink,
  buildNaclLink,
  buildRouteTableLink,
  buildSGLink,
  getDirPrefixByPrefixStr,
  buildCreateS3Link,
  buildS3Link,
  buildS3LinkFromS3URI,
  buildTrailLink,
  buildConfigLink,
  buildCloudFrontLink,
  buildLambdaLink,
  buildLambdaLogStreamLink,
  buildRDSLink,
  buildRoleLink,
  buildAlarmLink,
  buildWAFLink,
  buildELBLink,
  buildKeyPairsLink,
  buildEKSLink,
  buildASGLink,
  buildCrossAccountTemplateLink,
  buildSQSLink,
  buildNLBLinkByDNS,
  buildLambdaCWLGroupLink,
  buildGlueTableLink,
  buildGlueDatabaseLink,
  buildSchedulerLink,
  buildStepFunctionExecutionLink,
  generateEc2Permissions,
  getAWSPartition,
  combineReducers,
  ternary,
  hasSamePrefix,
  buildOSIParamsValue,
  buildOSIPipelineNameByPipelineId,
  isOSIPipeline,
  defaultStr,
  domainIsValid,
  buildOSILink,
  containsNonLatinCodepoints,
  downloadFileByLink,
  buildEventRuleLink,
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

describe("buildCfnLink", () => {
  it("should build the CloudFormation link for standard AWS regions", () => {
    const region = "us-example-1";
    const stackName = "myStack";
    const link = buildCfnLink(region, stackName);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${stackName}`
    );
  });

  it("should build the CloudFormation link for China regions", () => {
    const region = "cn-example-1";
    const stackName = "myStack";
    const link = buildCfnLink(region, stackName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${stackName}`
    );
  });
});

describe("buildESLink", () => {
  it("should build the ES link for standard AWS regions", () => {
    const region = "us-example-1";
    const domainName = "myDomain";
    const link = buildESLink(region, domainName);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/aos/home?region=${region}#opensearch/domains/myDomain`
    );
  });

  it("should build the ES link for China regions", () => {
    const region = "cn-example-1";
    const domainName = "myDomain";
    const link = buildESLink(region, domainName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/aos/home?region=${region}#opensearch/domains/myDomain`
    );
  });
});

describe("buildESCloudWatchLink", () => {
  it("should build the ES CloudWatch link for standard AWS regions", () => {
    const region = "us-example-1";
    const domainName = "myDomain";
    const link = buildESCloudWatchLink(region, domainName);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=myDomain`
    );
  });

  it("should build the ES CloudWatch link for China regions", () => {
    const region = "cn-example-1";
    const domainName = "myDomain";
    const link = buildESCloudWatchLink(region, domainName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/cloudwatch/home?region=${region}#dashboards:name=myDomain`
    );
  });
});

describe("buildVPCLink", () => {
  it("should build the VPC link for standard AWS regions", () => {
    const region = "us-example-1";
    const vpcId = "vpc-1234567890abcdef0";
    const link = buildVPCLink(region, vpcId);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#vpcs:VpcId=${vpcId}`
    );
  });

  it("should build the VPC link for China regions", () => {
    const region = "cn-example-1";
    const vpcId = "vpc-1234567890abcdef0";
    const link = buildVPCLink(region, vpcId);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/vpc/home?region=${region}#vpcs:VpcId=${vpcId}`
    );
  });
});

describe("buildSubnetLink", () => {
  it("should build the subnet link for standard AWS regions", () => {
    const region = "us-example-1";
    const subnetId = "subnet-1234567890abcdef0";
    const link = buildSubnetLink(region, subnetId);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#subnets:subnetId=${subnetId}`
    );
  });

  it("should build the subnet link for China regions", () => {
    const region = "cn-example-1";
    const subnetId = "subnet-1234567890abcdef0";
    const link = buildSubnetLink(region, subnetId);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/vpc/home?region=${region}#subnets:subnetId=${subnetId}`
    );
  });
});

describe("buildVPCPeeringLink", () => {
  it("should build the VPC peering link for standard AWS regions", () => {
    const region = "us-example-1";
    const vpcPeeringId = "pcx-1234567890abcdef0";
    const link = buildVPCPeeringLink(region, vpcPeeringId);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#PeeringConnectionDetails:VpcPeeringConnectionId=${vpcPeeringId}`
    );
  });

  it("should build the VPC peering link for China regions", () => {
    const region = "cn-example-1";
    const vpcPeeringId = "pcx-1234567890abcdef0";
    const link = buildVPCPeeringLink(region, vpcPeeringId);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/vpc/home?region=${region}#PeeringConnectionDetails:VpcPeeringConnectionId=${vpcPeeringId}`
    );
  });
});

describe("buildNaclLink", () => {
  it("should build the NACL link for standard AWS regions", () => {
    const region = "us-example-1";
    const naclId = "acl-1234567890abcdef0";
    const link = buildNaclLink(region, naclId);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#NetworkAclDetails:networkAclId=${naclId}`
    );
  });

  it("should build the NACL link for China regions", () => {
    const region = "cn-example-1";
    const naclId = "acl-1234567890abcdef0";
    const link = buildNaclLink(region, naclId);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/vpc/home?region=${region}#NetworkAclDetails:networkAclId=${naclId}`
    );
  });
});

describe("buildRouteTableLink", () => {
  it("should build the route table link for standard AWS regions", () => {
    const region = "us-example-1";
    const routeTableId = "rtb-1234567890abcdef0";
    const link = buildRouteTableLink(region, routeTableId);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#RouteTableDetails:RouteTableId=${routeTableId}`
    );
  });

  it("should build the route table link for China regions", () => {
    const region = "cn-example-1";
    const routeTableId = "rtb-1234567890abcdef0";
    const link = buildRouteTableLink(region, routeTableId);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/vpc/home?region=${region}#RouteTableDetails:RouteTableId=${routeTableId}`
    );
  });
});

describe("buildSGLink", () => {
  it("should build the security group link for standard AWS regions", () => {
    const region = "us-example-1";
    const sgId = "sg-1234567890abcdef0";
    const link = buildSGLink(region, sgId);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#SecurityGroup:securityGroupId=${sgId}`
    );
  });

  it("should build the security group link for China regions", () => {
    const region = "cn-example-1";
    const sgId = "sg-1234567890abcdef0";
    const link = buildSGLink(region, sgId);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/ec2/v2/home?region=${region}#SecurityGroup:securityGroupId=${sgId}`
    );
  });
});

describe("getDirPrefixByPrefixStr", () => {
  it("should return the correct directory prefix for a simple prefix", () => {
    const prefix = "my-folder/my-sub-folder";
    const dirPrefix = getDirPrefixByPrefixStr(prefix);
    expect(dirPrefix).toBe("my-folder/");
  });

  it("should return the correct directory prefix for a prefix with a trailing slash", () => {
    const prefix = "my-folder/my-sub-folder/";
    const dirPrefix = getDirPrefixByPrefixStr(prefix);
    expect(dirPrefix).toBe("my-folder/my-sub-folder/");
  });

  it("should return an empty string for an empty prefix", () => {
    const prefix = "";
    const dirPrefix = getDirPrefixByPrefixStr(prefix);
    expect(dirPrefix).toBe("");
  });
});

describe("buildCreateS3Link", () => {
  it("should build the S3 link for standard AWS regions", () => {
    const region = "us-example-1";
    const link = buildCreateS3Link(region);
    expect(link).toBe(
      `https://s3.console.aws.amazon.com/s3/bucket/create?region=${region}`
    );
  });

  it("should build the S3 link for China regions", () => {
    const region = "cn-example-1";
    const link = buildCreateS3Link(region);
    expect(link).toBe(
      `https://cn-example-1.console.amazonaws.cn/s3/bucket/create?region=${region}`
    );
  });
});

describe("buildS3Link", () => {
  it("should build the S3 link for standard AWS regions", () => {
    const region = "us-example-1";
    const bucketName = "my-bucket";
    const link = buildS3Link(region, bucketName);
    expect(link).toBe(
      `https://s3.console.aws.amazon.com/s3/buckets/${bucketName}`
    );
  });

  it("should build the S3 link for China regions", () => {
    const region = "cn-example-1";
    const bucketName = "my-bucket";
    const link = buildS3Link(region, bucketName);
    expect(link).toBe(`https://console.amazonaws.cn/s3/buckets/${bucketName}`);
  });

  it("should build the S3 link with a prefix for standard regeions", () => {
    const region = "us-example-1";
    const bucketName = "my-bucket";
    const prefix = "my-folder/my-sub-folder";
    const link = buildS3Link(region, bucketName, prefix);
    expect(link).toBe(
      `https://s3.console.aws.amazon.com/s3/buckets/${bucketName}?region=${region}&prefix=my-folder/`
    );
  });

  it("should build the S3 link with a prefix for China regions", () => {
    const region = "cn-example-1";
    const bucketName = "my-bucket";
    const prefix = "my-folder/my-sub-folder";
    const link = buildS3Link(region, bucketName, prefix);
    expect(link).toBe(
      `https://console.amazonaws.cn/s3/buckets/${bucketName}?region=${region}&prefix=my-folder/`
    );
  });
});

describe("buildS3LinkFromS3URI", () => {
  it("should return an empty string for an empty S3 URI", () => {
    const region = "us-example-1";
    const bucketName = "";
    const link = buildS3LinkFromS3URI(region, bucketName);
    expect(link).toBe("");
  });

  it("should build the S3 link for standard AWS regions", () => {
    const region = "us-example-1";
    const bucketName = "my-bucket";
    const link = buildS3LinkFromS3URI(region, bucketName);
    expect(link).toBe(
      `https://s3.console.aws.amazon.com/s3/buckets/${bucketName}?region=${region}&prefix=/`
    );
  });

  it("should build the S3 link for China regions", () => {
    const region = "cn-example-1";
    const bucketName = "my-bucket";
    const link = buildS3LinkFromS3URI(region, bucketName);
    expect(link).toBe(
      `https://console.amazonaws.cn/s3/buckets/${bucketName}?region=${region}&prefix=/`
    );
  });
});

describe("buildTrailLink", () => {
  it("should build the CloudTrail link for standard AWS regions", () => {
    const region = "us-example-1";
    const link = buildTrailLink(region);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/cloudtrail/home?region=${region}#/trails`
    );
  });

  it("should build the CloudTrail link for China regions", () => {
    const region = "cn-example-1";
    const link = buildTrailLink(region);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/cloudtrail/home?region=${region}#/trails`
    );
  });
});

describe("buildConfigLink", () => {
  it("should build the Config link for standard AWS regions", () => {
    const region = "us-example-1";
    const link = buildConfigLink(region);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/config/home?region=${region}#/dashboard`
    );
  });

  it("should build the Config link for China regions", () => {
    const region = "cn-example-1";
    const link = buildConfigLink(region);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/config/home?region=${region}#/dashboard`
    );
  });
});

describe("buildCloudFrontLink", () => {
  it("should build the CloudFront link for standard AWS regions", () => {
    const region = "us-example-1";
    const distributionId = "E1234567890ABC";
    const link = buildCloudFrontLink(region, distributionId);
    expect(link).toBe(
      `https://console.aws.amazon.com/cloudfront/v3/home?region=${region}#/distributions/${distributionId}`
    );
  });

  it("should build the CloudFront link for China regions", () => {
    const region = "cn-example-1";
    const distributionId = "E1234567890ABC";
    const link = buildCloudFrontLink(region, distributionId);
    expect(link).toBe(
      `https://console.amazonaws.cn/cloudfront/v3/home?region=${region}#/distributions/${distributionId}`
    );
  });
});

describe("buildLambdaLink", () => {
  it("should build the Lambda link for standard AWS regions", () => {
    const region = "us-example-1";
    const functionName = "myLambdaFunction";
    const link = buildLambdaLink(region, functionName);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/lambda/home?region=${region}#/functions/${functionName}?tab=code`
    );
  });

  it("should build the Lambda link for China regions", () => {
    const region = "cn-example-1";
    const functionName = "myLambdaFunction";
    const link = buildLambdaLink(region, functionName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/lambda/home?region=${region}#/functions/${functionName}?tab=code`
    );
  });
});

describe("buildLambdaLogStreamLink", () => {
  it("should build the Lambda log stream link for standard AWS regions", () => {
    const region = "us-example-1";
    const functionName = "myLambdaFunction";
    const streamName = "myLogStream";
    const link = buildLambdaLogStreamLink(region, functionName, streamName);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${functionName}/log-events/${streamName}`
    );
  });

  it("should build the Lambda log stream link for China regions", () => {
    const region = "cn-example-1";
    const functionName = "myLambdaFunction";
    const streamName = "myLogStream";
    const link = buildLambdaLogStreamLink(region, functionName, streamName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${functionName}/log-events/${streamName}`
    );
  });
});

describe("buildRDSLink", () => {
  it("should build the RDS link for standard AWS regions", () => {
    const region = "us-example-1";
    const link = buildRDSLink(region);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/rds/home?region=${region}#databases:`
    );
  });

  it("should build the RDS link for China regions", () => {
    const region = "cn-example-1";
    const link = buildRDSLink(region);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/rds/home?region=${region}#databases:`
    );
  });
});

describe("buildRoleLink", () => {
  it("should build the IAM role link for standard AWS regions", () => {
    const region = "us-example-1";
    const roleName = "myRole";
    const link = buildRoleLink(roleName, region);
    expect(link).toBe(
      `https://console.aws.amazon.com/iam/home?#/roles/${roleName}`
    );
  });

  it("should build the IAM role link for China regions", () => {
    const region = "cn-example-1";
    const roleName = "myRole";
    const link = buildRoleLink(roleName, region);
    expect(link).toBe(
      `https://console.amazonaws.cn/iam/home?#/roles/${roleName}`
    );
  });
});

describe("buildAlarmLink", () => {
  it("should build the CloudWatch alarm link for standard AWS regions", () => {
    const region = "us-example-1";
    const link = buildAlarmLink(region);
    expect(link).toBe(
      `https://console.aws.amazon.com/cloudwatch/home?region=${region}#alarmsV2:`
    );
  });

  it("should build the CloudWatch alarm link for China regions", () => {
    const region = "cn-example-1";
    const link = buildAlarmLink(region);
    expect(link).toBe(
      `https://console.amazonaws.cn/cloudwatch/home?region=${region}#alarmsV2:`
    );
  });
});

describe("buildWAFLink", () => {
  it("should build the WAF link for standard AWS regions", () => {
    const region = "us-example-1";
    const link = buildWAFLink(region);
    expect(link).toBe(
      `https://console.aws.amazon.com/wafv2/homev2/web-acls?region=${region}`
    );
  });

  it("should build the WAF link when webACLScope is CLOUDFRONT", () => {
    const region = "us-example-1";
    const link = buildWAFLink(region, "CLOUDFRONT");
    expect(link).toBe(
      `https://console.aws.amazon.com/wafv2/homev2/web-acls?region=global`
    );
  });

  it("should build the WAF link for China regions", () => {
    const region = "cn-example-1";
    const link = buildWAFLink(region);
    expect(link).toBe(
      `https://console.amazonaws.cn/wafv2/homev2/web-acls?region=${region}`
    );
  });
});

describe("buildELBLink", () => {
  it("should build the ELB link for standard AWS regions", () => {
    const region = "us-example-1";
    const link = buildELBLink(region);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#LoadBalancers`
    );
  });

  it("should build the ELB link for China regions", () => {
    const region = "cn-example-1";
    const link = buildELBLink(region);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/ec2/v2/home?region=${region}#LoadBalancers`
    );
  });
});

describe("buildKeyPairsLink", () => {
  it("should build the key pairs link for standard AWS regions", () => {
    const region = "us-example-1";
    const link = buildKeyPairsLink(region);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#KeyPairs:`
    );
  });

  it("should build the key pairs link for China regions", () => {
    const region = "cn-example-1";
    const link = buildKeyPairsLink(region);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/ec2/v2/home?region=${region}#KeyPairs:`
    );
  });
});

describe("buildEKSLink", () => {
  it("should build the EKS link for standard AWS regions", () => {
    const region = "us-example-1";
    const link = buildEKSLink(region);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/eks/home?region=${region}#/clusters`
    );
  });

  it("should build the EKS link for China regions", () => {
    const region = "cn-example-1";
    const link = buildEKSLink(region);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/eks/home?region=${region}#/clusters`
    );
  });
});

describe("buildASGLink", () => {
  it("should build the ASG link for standard AWS regions", () => {
    const region = "us-example-1";
    const asgName = "myASG";
    const link = buildASGLink(region, asgName);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/ec2/home?region=${region}#AutoScalingGroupDetails:id=${asgName}`
    );
  });

  it("should build the ASG link for China regions", () => {
    const region = "cn-example-1";
    const asgName = "myASG";
    const link = buildASGLink(region, asgName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/ec2/home?region=${region}#AutoScalingGroupDetails:id=${asgName}`
    );
  });
});

describe("buildCrossAccountTemplateLink", () => {
  it("should build the cross account template link for standard AWS regions", () => {
    const region = "us-example-1";
    const solutionVersion = "v1.0.0";
    const templateBucket = "myTemplateBucket";
    const solutionName = "solutionName";
    const link = buildCrossAccountTemplateLink(
      region,
      solutionVersion,
      templateBucket,
      solutionName
    );
    expect(link).toBe(
      `https://${templateBucket}.s3.amazonaws.com/${solutionName}/${solutionVersion}/CrossAccount.template`
    );
  });

  it("should build the cross account template link for China regions", () => {
    const region = "cn-example-1";
    const solutionVersion = "v1.0.1";
    const templateBucket = "myTemplateBucket";
    const solutionName = "myTemplate";
    const link = buildCrossAccountTemplateLink(
      region,
      solutionVersion,
      templateBucket,
      solutionName
    );
    expect(link).toBe(
      `https://${templateBucket}.s3.amazonaws.com/${solutionName}/${solutionVersion}/CrossAccount.template`
    );
  });
});

describe("buildSQSLink", () => {
  it("should build the SQS link for standard AWS regions", () => {
    const region = "us-example-1";
    const sqsName = "mySQS";
    const link = buildSQSLink(region, sqsName);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/sqs/v3/home?region=${region}#/queues/${encodeURIComponent(
        `https://sqs.${region}.amazonaws.com.cn/`
      )}${sqsName}`
    );
  });

  it("should build the SQS link for China regions", () => {
    const region = "cn-example-1";
    const sqsName = "mySQS";
    const link = buildSQSLink(region, sqsName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/sqs/v3/home?region=${region}#/queues/${encodeURIComponent(
        `https://sqs.${region}.amazonaws.com.cn/`
      )}${sqsName}`
    );
  });
});

describe("buildEventRuleLink", () => {
  it("should build the event rule link for standard AWS regions", () => {
    const region = "us-example-1";
    const ruleName = "myRule";
    const link = buildEventRuleLink(region, ruleName);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/events/home?region=${region}#/eventbus/default/rules/${ruleName}`
    );
  });

  it("should build the event rule link for China regions", () => {
    const region = "cn-example-1";
    const ruleName = "myRule";
    const link = buildEventRuleLink(region, ruleName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/events/home?region=${region}#/eventbus/default/rules/${ruleName}`
    );
  });
});

describe("buildNLBLinkByDNS", () => {
  it("should build the NLB link for standard AWS regions", () => {
    const region = "us-example-1";
    const dnsName = "myDNSName";
    const link = buildNLBLinkByDNS(region, dnsName);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/ec2/home?region=${region}#LoadBalancers:dnsName=${dnsName}`
    );
  });

  it("should build the NLB link for China regions", () => {
    const region = "cn-example-1";
    const dnsName = "myDNSName";
    const link = buildNLBLinkByDNS(region, dnsName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/ec2/home?region=${region}#LoadBalancers:dnsName=${dnsName}`
    );
  });
});

describe("buildLambdaCWLGroupLink", () => {
  it("should build the Lambda CWL group link for China regions", () => {
    const region = "cn-example-1";
    const groupName = "/aws-glue/test";
    const link = buildLambdaCWLGroupLink(region, groupName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/$252Faws-glue$252Ftest`
    );
  });
});

describe("buildGlueTableLink", () => {
  it("should build the Glue table link for standard AWS regions", () => {
    const region = "us-example-1";
    const dbName = "myDB";
    const tableName = "myTable";
    const link = buildGlueTableLink(region, dbName, tableName);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/glue/home?region=${region}#/v2/data-catalog/tables/view/${tableName}?database=${dbName}`
    );
  });

  it("should build the Glue table link for China regions", () => {
    const region = "cn-example-1";
    const dbName = "myDB";
    const tableName = "myTable";
    const link = buildGlueTableLink(region, dbName, tableName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/glue/home?region=${region}#/v2/data-catalog/tables/view/${tableName}?database=${dbName}`
    );
  });
});

describe("buildGlueDatabaseLink", () => {
  it("should build the Glue database link for standard AWS regions", () => {
    const region = "us-example-1";
    const dbName = "myDB";
    const link = buildGlueDatabaseLink(region, dbName);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/glue/home?region=${region}#/v2/data-catalog/databases/view/${dbName}`
    );
  });

  it("should build the Glue database link for China regions", () => {
    const region = "cn-example-1";
    const dbName = "myDB";
    const link = buildGlueDatabaseLink(region, dbName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/glue/home?region=${region}#/v2/data-catalog/databases/view/${dbName}`
    );
  });
});

describe("buildSchedulerLink", () => {
  it("should build the Scheduler link for standard AWS regions", () => {
    const region = "us-example-1";
    const type = SchedulerType.EventBridgeScheduler;
    const group = "myGroup";
    const name = "myName";
    const link = buildSchedulerLink(region, type, group, name);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/scheduler/home?region=${region}#schedules/${group}/${name}`
    );
  });

  it("should build the Scheduler link for China regions", () => {
    const region = "cn-example-1";
    const type = SchedulerType.EventBridgeScheduler;
    const group = "myGroup";
    const name = "myName";
    const link = buildSchedulerLink(region, type, group, name);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/scheduler/home?region=${region}#schedules/${group}/${name}`
    );
  });
});

describe("buildStepFunctionExecutionLink", () => {
  it("should build the Step Function execution link for standard AWS regions", () => {
    const region = "us-example-1";
    const executionArn =
      "arn:aws:states:us-east-1:1234567890:execution:myStateMachine:myExecution";
    const link = buildStepFunctionExecutionLink(region, executionArn);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/states/home?region=${region}#/v2/executions/details/${executionArn}`
    );
  });

  it("should build the Step Function execution link for China regions", () => {
    const region = "cn-example-1";
    const executionArn =
      "arn:aws-cn:states:cn-north-1:1234567890:execution:myStateMachine:myExecution";
    const link = buildStepFunctionExecutionLink(region, executionArn);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/states/home?region=${region}#/v2/executions/details/${executionArn}`
    );
  });
});

describe("generateEc2Permissions", () => {
  // Common variables
  const awsPartition = "aws";
  const accountId = "123456789012";
  const getObjectResources = ["arn:aws:s3:::example-bucket/*"];

  // Helper function to parse and validate JSON
  const parsePolicy = (policyStr: string) => {
    let policy;
    try {
      policy = JSON.parse(policyStr);
    } catch (error) {
      throw new Error("Returned policy is not valid JSON");
    }
    return policy;
  };

  it("should generate valid JSON policy", () => {
    const policyStr = generateEc2Permissions(
      awsPartition,
      accountId,
      getObjectResources
    );
    const policy = parsePolicy(policyStr);
    expect(policy).toHaveProperty("Version", "2012-10-17");
    expect(policy).toHaveProperty("Statement");
    expect(Array.isArray(policy.Statement)).toBe(true);
  });

  it("should correctly incorporate awsPartition and accountId in ARNs", () => {
    const policyStr = generateEc2Permissions(
      awsPartition,
      accountId,
      getObjectResources
    );
    const policy = parsePolicy(policyStr);
    const assumeRoleStatement = policy.Statement.find(
      (s: any) => s.Sid === "AssumeRoleInMainAccount"
    );
    expect(assumeRoleStatement.Resource[0]).toContain(awsPartition);
    expect(assumeRoleStatement.Resource[0]).toContain(accountId);
  });

  it("should correctly include getObjectResources", () => {
    const policyStr = generateEc2Permissions(
      awsPartition,
      accountId,
      getObjectResources
    );
    const policy = parsePolicy(policyStr);
    const s3GetObjectStatement = policy.Statement.find(
      (s: any) => s.Action === "s3:GetObject"
    );
    expect(s3GetObjectStatement.Resource).toEqual(getObjectResources);
  });
});

describe("getAWSPartition", () => {
  it('should return "aws-cn" for regions starting with "cn"', () => {
    expect(getAWSPartition("cn-north-1")).toBe("aws-cn");
    expect(getAWSPartition("cn-northwest-1")).toBe("aws-cn");
  });

  it('should return "aws" for other regions', () => {
    expect(getAWSPartition("us-east-1")).toBe("aws");
    expect(getAWSPartition("eu-west-1")).toBe("aws");
  });

  it('should return "aws" for empty or undefined inputs', () => {
    expect(getAWSPartition("")).toBe("aws");
  });
});

describe("buildOSILink", () => {
  it("should build the OSI link for standard AWS regions", () => {
    const region = "us-example-1";
    const osiName = "myOSI";
    const link = buildOSILink(region, osiName);
    expect(link).toBe(
      `https://${region}.console.aws.amazon.com/aos/home?region=${region}#opensearch/ingestion-pipelines/myOSI`
    );
  });

  it("should build the OSI link for China regions", () => {
    const region = "cn-example-1";
    const osiName = "myOSI";
    const link = buildOSILink(region, osiName);
    expect(link).toBe(
      `https://${region}.console.amazonaws.cn/aos/home?region=${region}#opensearch/ingestion-pipelines/myOSI`
    );
  });
});

describe("containsNonLatinCodepoints", () => {
  it("should return false for a string with only latin codepoints", () => {
    const str = "Hello world";
    expect(containsNonLatinCodepoints(str)).toBe(false);
  });

  it("should return true for a string with non-latin codepoints", () => {
    const str = "你好世界";
    expect(containsNonLatinCodepoints(str)).toBe(true);
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
    const result = isOSIPipeline();
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
      expect(defaultStr("", "default")).toBe("default");
    });

    it("returns the default value if the input is just whitespace", () => {
      expect(defaultStr("  ", "default")).toBe("  ");
    });
  });

  describe("domainIsValid", () => {
    it("should return true for a valid domain", () => {
      const domain = "www.amazon.com";
      const result = domainIsValid(domain);
      expect(result).toBe(true);
    });
    it("should return false for an invalid domain", () => {
      const domain = "test-error-domain";
      const result = domainIsValid(domain);
      expect(result).toBe(false);
    });
  });

  describe("downloadFileByLink", () => {
    it("should trigger a download when a valid URL is provided", () => {
      document.createElement = jest.fn().mockReturnValue({
        style: {},
        href: "",
        click: jest.fn(),
        parentNode: {
          removeChild: jest.fn(),
        },
      });
      document.body.appendChild = jest.fn().mockReturnValue({});
      const url = "http://example.com/file.pdf";
      downloadFileByLink(url);
      const link = (document.createElement as any).mock.results[0].value;
      expect(document.createElement).toHaveBeenCalledWith("a");
      expect(link.href).toBe(url);
      expect(link.click).toHaveBeenCalled();
    });
  });
});
