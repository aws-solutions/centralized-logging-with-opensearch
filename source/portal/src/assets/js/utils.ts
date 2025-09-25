// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { AppPipeline, EngineType, SchedulerType, SubAccountLink } from "API";
import { format, parseISO } from "date-fns";
import { formatWithOptions } from "date-fns/fp";
import i18n from "i18n";
import { ServiceLogDetailProps } from "pages/dataInjection/serviceLog/ServiceLogDetail";
import { LogProcessorType, SelectProcessorType } from "reducer/selectProcessor";

const stackPrefix = "CL";

// Build Dashboard Link
export const buildDashboardLink = (
  engine: string,
  elbLink: string,
  domainName: string
) => {
  if (domainName) {
    if (engine === EngineType.OpenSearch) {
      return `https://${domainName}/_dashboards/`;
    } else {
      return `https://${domainName}/_plugin/kibana/`;
    }
  } else {
    if (engine === EngineType.OpenSearch) {
      return `https://${elbLink}/_dashboards/`;
    } else {
      return `https://${elbLink}/_plugin/kibana/`;
    }
  }
};

// Split S3 Key String into bucket name and prefix
const getPosition = (string: string, subString: string, index: number) => {
  return string.split(subString, index).join(subString).length;
};

interface BucketAndPrefix {
  bucket: string;
  prefix: string;
}

export const splitStringToBucketAndPrefix = (
  s3KeyStr: string
): BucketAndPrefix => {
  const tmpBucketObj: BucketAndPrefix = {
    bucket: "",
    prefix: "",
  };
  const prefixIndex = getPosition(s3KeyStr, "/", 3);
  let tmpLogBucket = "";
  let tmpLogPath = "";
  const p1 = s3KeyStr.slice(0, prefixIndex);
  const p2 = s3KeyStr.slice(prefixIndex + 1);
  const s3BucketArr = p1.split("//");
  if (s3BucketArr && s3BucketArr.length > 1) {
    tmpLogBucket = s3BucketArr[1];
  }
  tmpLogPath = p2;
  tmpBucketObj.bucket = tmpLogBucket;
  tmpBucketObj.prefix = tmpLogPath;
  return tmpBucketObj;
};

export const bucketNameIsValid = (bucketName: string): boolean => {
  if (!bucketName) {
    return false;
  }

  const REG1 = new RegExp(`${"^[a-z\\d.-]*$"}`).test(bucketName);
  const REG2 = new RegExp(`${"^[a-z\\d]"}`).test(bucketName);
  const REG3 = bucketName.endsWith("-") === false;
  const REG4 = new RegExp(`${"\\.\\.+"}`).test(bucketName) === false;
  const REG5 = new RegExp(`${"-+\\.$"}`).test(bucketName) === false;
  const REG6 =
    new RegExp(
      `${"^(?:(?:^|\\.)(?:2(?:5[0-5]|[0-4]\\d)|1?\\d?\\d)){4}$"}`
    ).test(bucketName) === false;
  const REG7 = bucketName.length >= 3 && bucketName.length <= 63;

  return REG1 && REG2 && REG3 && REG4 && REG5 && REG6 && REG7;
};

// check index name is valid
export const checkIndexNameValidate = (indexName: string): boolean => {
  const IndexRegEx = /^[a-z][a-z0-9_-]*$/;
  return IndexRegEx.test(indexName);
};

// check string is json format
export const IsJsonString = (str: string): boolean => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

// Transform JSON Schema
export const transformSchemaType = (schema: any) => {
  // when 'type' is 'null', change to 'string'
  if (schema.type === "null") {
    schema.type = "string";
  }

  // if has child properties
  if (schema.properties) {
    Object.values(schema.properties).forEach(transformSchemaType);
  }

  // if is array and has items
  if (schema.type === "array" && schema.items) {
    transformSchemaType(schema.items);
  }

  return schema;
};

// format event timestamp
export const formatLogEventTimestamp = (timestamp: number): string => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatString = `yyyy-MM-dd'T'HH:mm:ss.SSSxxx`;
  const options: any = { timeZone };
  return formatWithOptions(options, formatString, new Date(timestamp));
};

// format timeStamp
export const formatTimeStamp = (timestamp: number): string => {
  if (timestamp) {
    return format(new Date(timestamp), "yyyy-MM-dd HH:mm:ss");
  }
  return "-";
};

// format date
export const formatLocalTime = (time: string): string => {
  if (time && time.trim() !== "" && time !== "-") {
    return format(new Date(parseISO(time)), "yyyy-MM-dd HH:mm:ss");
  }
  return "-";
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const humanFileSize = (bytes: any, si = false, dp = 1) => {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }

  const units = si
    ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  );

  return bytes.toFixed(dp) + " " + units[u];
};

export const domainIsValid = (domain: string): boolean => {
  const reg = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/; 
  return reg.test(String(domain).toLowerCase());
};

export const emailIsValid = (email: string): boolean => {
  const re = /\w[-\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\.)+[A-Za-z]{2,14}/; //NOSONAR
  return re.test(String(email).toLowerCase());
};

export const buildACMLink = (region: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/acm/home?region=${region}#/`;
  }
  return `https://${region}.console.aws.amazon.com/acm/home?region=${region}#/`;
};

export const buildEC2LInk = (region: string, instanceId: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/ec2/v2/home?region=${region}#Instances:instanceId=${instanceId}`;
  }
  return `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#Instances:v=3;instanceId=${instanceId}`;
};

export const buildKDSLink = (region: string, kdsName: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/kinesis/home?region=${region}#/streams/details/${kdsName}/monitoring`;
  }
  return `https://${region}.console.aws.amazon.com/kinesis/home?region=${region}#/streams/details/${kdsName}/monitoring`;
};

export const buildKDFLink = (region: string, kdfName: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/firehose/home?region=${region}#/details/${kdfName}/monitoring`;
  }
  return `https://${region}.console.aws.amazon.com/firehose/home?region=${region}#/details/${kdfName}/monitoring`;
};

export const buildCfnLink = (region: string, stackArn: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${encodeURIComponent(
      stackArn
    )}`;
  }
  return `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${encodeURIComponent(
    stackArn
  )}`;
};

export const buildESLink = (region: string, domainName: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/aos/home?region=${region}#opensearch/domains/${domainName}`;
  }
  return `https://${region}.console.aws.amazon.com/aos/home?region=${region}#opensearch/domains/${domainName}`;
};

export const buildESCloudWatchLink = (
  region: string,
  domainName: string
): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/cloudwatch/home?region=${region}#dashboards:name=${domainName}`;
  }
  return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=${domainName}`;
};

export const buildVPCLink = (region: string, vpcId: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/vpc/home?region=${region}#vpcs:VpcId=${vpcId}`;
  }
  return `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#vpcs:VpcId=${vpcId}`;
};

export const buildSubnetLink = (region: string, subnetId: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/vpc/home?region=${region}#subnets:subnetId=${subnetId}`;
  }
  return `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#subnets:subnetId=${subnetId}`;
};

export const buildVPCPeeringLink = (
  region: string,
  vpcPeeringId: string
): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/vpc/home?region=${region}#PeeringConnectionDetails:VpcPeeringConnectionId=${vpcPeeringId}`;
  }
  return `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#PeeringConnectionDetails:VpcPeeringConnectionId=${vpcPeeringId}`;
};

export const buildNaclLink = (region: string, naclId: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/vpc/home?region=${region}#NetworkAclDetails:networkAclId=${naclId}`;
  }
  return `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#NetworkAclDetails:networkAclId=${naclId}`;
};

export const buildRouteTableLink = (
  region: string,
  routeTableId: string
): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/vpc/home?region=${region}#RouteTableDetails:RouteTableId=${routeTableId}`;
  }
  return `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#RouteTableDetails:RouteTableId=${routeTableId}`;
};

export const buildSGLink = (region: string, sgId: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/ec2/v2/home?region=${region}#SecurityGroup:securityGroupId=${sgId}`;
  }
  return `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#SecurityGroup:securityGroupId=${sgId}`;
};

export const getDirPrefixByPrefixStr = (prefix: string) => {
  if (prefix && prefix.indexOf("/") >= 0) {
    const slashPos = prefix.lastIndexOf("/");
    prefix = prefix.slice(0, slashPos + 1);
  }
  return prefix;
};

export function buildCreateS3Link(region: string) {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/s3/bucket/create?region=${region}`;
  }
  return `https://s3.console.aws.amazon.com/s3/bucket/create?region=${region}`;
}

export const buildS3Link = (
  region: string,
  bucketName: string,
  prefix?: string
): string => {
  if (region?.startsWith("cn")) {
    if (prefix) {
      const resPrefix = getDirPrefixByPrefixStr(prefix);
      if (resPrefix.endsWith("/")) {
        return `https://console.amazonaws.cn/s3/buckets/${bucketName}?region=${region}&prefix=${resPrefix}`;
      }
    }
    return `https://console.amazonaws.cn/s3/buckets/${bucketName}`;
  }
  if (prefix) {
    const resPrefix = getDirPrefixByPrefixStr(prefix);
    if (resPrefix.endsWith("/")) {
      return `https://s3.console.aws.amazon.com/s3/buckets/${bucketName}?region=${region}&prefix=${resPrefix}`;
    }
  }
  return `https://s3.console.aws.amazon.com/s3/buckets/${bucketName}`;
};

export const buildS3LinkFromS3URI = (region: string, uri?: string): string => {
  if (!uri) {
    return "";
  }
  const bucketAndPrefix = uri.startsWith("s3://") ? uri.split("s3://")[1] : uri;
  const bucketName = bucketAndPrefix.split("/")[0];
  const prefix = bucketAndPrefix.substring(bucketName.length + 1);
  const postfix = prefix.endsWith("/") ? "" : "/";
  if (region?.startsWith("cn")) {
    return `https://console.amazonaws.cn/s3/buckets/${bucketName}?region=${region}&prefix=${prefix}${postfix}`;
  }
  return `https://s3.console.aws.amazon.com/s3/buckets/${bucketName}?region=${region}&prefix=${prefix}${postfix}`;
};

export const buildTrailLink = (region: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/cloudtrail/home?region=${region}#/trails`;
  }
  return `https://${region}.console.aws.amazon.com/cloudtrail/home?region=${region}#/trails`;
};

export const buildConfigLink = (region: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/config/home?region=${region}#/dashboard`;
  }
  return `https://${region}.console.aws.amazon.com/config/home?region=${region}#/dashboard`;
};

export const buildCloudFrontLink = (
  region: string,
  cloudFrontId: string
): string => {
  if (region?.startsWith("cn")) {
    return `https://console.amazonaws.cn/cloudfront/v3/home?region=${region}#/distributions/${cloudFrontId}`;
  }
  return `https://console.aws.amazon.com/cloudfront/v3/home?region=${region}#/distributions/${cloudFrontId}`;
};

export const buildLambdaLink = (
  region: string,
  functionName: string
): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/lambda/home?region=${region}#/functions/${functionName}?tab=code`;
  }
  return `https://${region}.console.aws.amazon.com/lambda/home?region=${region}#/functions/${functionName}?tab=code`;
};

export const buildLambdaLogStreamLink = (
  region: string,
  functionName: string,
  logStreamName: string
): string => {
  const funcUri = functionName;
  const logStreamUri = logStreamName;
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${funcUri}/log-events/${logStreamUri}`;
  }
  return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${funcUri}/log-events/${logStreamUri}`;
};

export const buildRDSLink = (region: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/rds/home?region=${region}#databases:`;
  }
  return `https://${region}.console.aws.amazon.com/rds/home?region=${region}#databases:`;
};

export const buildRoleLink = (roleId: string, region: string): string => {
  if (region?.startsWith("cn")) {
    return `https://console.amazonaws.cn/iam/home?#/roles/${roleId}`;
  }
  return `https://console.aws.amazon.com/iam/home?#/roles/${roleId}`;
};

export const buildAlarmLink = (region: string): string => {
  if (region?.startsWith("cn")) {
    return `https://console.amazonaws.cn/cloudwatch/home?region=${region}#alarmsV2:`;
  }
  return `https://console.aws.amazon.com/cloudwatch/home?region=${region}#alarmsV2:`;
};

export const buildWAFLink = (region: string, webACLScope?: string): string => {
  if (region?.startsWith("cn")) {
    return `https://console.amazonaws.cn/wafv2/homev2/web-acls?region=${region}`;
  } else {
    if (webACLScope === "CLOUDFRONT") {
      return `https://console.aws.amazon.com/wafv2/homev2/web-acls?region=global`;
    } else {
      return `https://console.aws.amazon.com/wafv2/homev2/web-acls?region=${region}`;
    }
  }
};

export const buildELBLink = (region: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/ec2/v2/home?region=${region}#LoadBalancers`;
  }
  return `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#LoadBalancers`;
};

export const buildKeyPairsLink = (region: string) => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/ec2/v2/home?region=${region}#KeyPairs:`;
  }
  return `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#KeyPairs:`;
};

export const buildEKSLink = (
  region: string,
  clusterName?: string | null | undefined
): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/eks/home?region=${region}#/clusters${
      clusterName ? "/" + clusterName : ""
    }`;
  }
  return `https://${region}.console.aws.amazon.com/eks/home?region=${region}#/clusters${
    clusterName ? "/" + clusterName : ""
  }`;
};

export const buildASGLink = (region: string, groupName: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/ec2/home?region=${region}#AutoScalingGroupDetails:id=${groupName}`;
  }
  return `https://${region}.console.aws.amazon.com/ec2/home?region=${region}#AutoScalingGroupDetails:id=${groupName}`;
};

export const buildCrossAccountTemplateLink = (
  solutionVersion: string,
  solutionName: string,
  templateBaseUrl: string
): string => {
  return `${templateBaseUrl}/${solutionName}/${solutionVersion}/CrossAccount.template`;
};

export const buildSQSLink = (region: string, queueName: string): string => {
  const uri = `https://sqs.${region}.amazonaws.com.cn/`;
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/sqs/v3/home?region=${region}#/queues/${encodeURIComponent(
      uri
    )}${queueName}`;
  }
  return `https://${region}.console.aws.amazon.com/sqs/v3/home?region=${region}#/queues/${encodeURIComponent(
    uri
  )}${queueName}`;
};

export const buildEventRuleLink = (
  region: string,
  ruleName: string
): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/events/home?region=${region}#/eventbus/default/rules/${ruleName}`;
  }
  return `https://${region}.console.aws.amazon.com/events/home?region=${region}#/eventbus/default/rules/${ruleName}`;
};

export const buildNLBLinkByDNS = (region: string, dnsName: string): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/ec2/home?region=${region}#LoadBalancers:dnsName=${dnsName}`;
  }
  return `https://${region}.console.aws.amazon.com/ec2/home?region=${region}#LoadBalancers:dnsName=${dnsName}`;
};

export const buildLambdaCWLGroupLink = (
  region: string,
  groupName: string
): string => {
  if (region?.startsWith("cn")) {
    return `https://${region}.console.amazonaws.cn/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${groupName.replace(
      /\//g,
      decodeURIComponent("%24252F")
    )}`;
  }
  return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${groupName.replace(
    /\//g,
    decodeURIComponent("%24252F")
  )}
    `;
};

export const buildGlueTableLink = (
  region: string,
  database = "",
  table = ""
): string => {
  return `https://${region}.${
    region?.startsWith("cn") ? "console.amazonaws.cn" : "console.aws.amazon.com"
  }/glue/home?region=${region}#/v2/data-catalog/tables/view/${table}?database=${database}`;
};

export const buildGlueDatabaseLink = (
  region: string,
  database = ""
): string => {
  return `https://${region}.${
    region?.startsWith("cn") ? "console.amazonaws.cn" : "console.aws.amazon.com"
  }/glue/home?region=${region}#/v2/data-catalog/databases/view/${database}`;
};

export const buildStepFunctionLink = (region: string, arn = ""): string => {
  return `https://${region}.${
    region?.startsWith("cn") ? "console.amazonaws.cn" : "console.aws.amazon.com"
  }/states/home?region=${region}#/statemachines/view/${arn}`;
};

export const buildSchedulerLink = (
  region: string,
  type?: SchedulerType,
  group?: string,
  name?: string
): string => {
  const host = region?.startsWith("cn")
    ? "console.amazonaws.cn"
    : "console.aws.amazon.com";
  return type === SchedulerType.EventBridgeScheduler
    ? `https://${region}.${host}/scheduler/home?region=${region}#schedules/${group}/${name}`
    : `https://${region}.${host}/events/home?region=${region}#/eventbus/${group}/rules/${name}`;
};

export const buildStepFunctionExecutionLink = (
  region: string,
  arn = ""
): string => {
  return `https://${region}.${
    region?.startsWith("cn") ? "console.amazonaws.cn" : "console.aws.amazon.com"
  }/states/home?region=${region}#/v2/executions/details/${arn}`;
};

export const buildOSILink = (region: string, osiName: string) => {
  return `https://${region}.${
    region?.startsWith("cn") ? "console.amazonaws.cn" : "console.aws.amazon.com"
  }/aos/home?region=${region}#opensearch/ingestion-pipelines/${osiName}`;
};

export function containsNonLatinCodepoints(str: string) {
  return [...str].some((char) => char.charCodeAt(0) > 127);
}

export function generateEc2Permissions(
  awsPartition: string,
  accountId: string,
  getObjectResources: string[]
): string {
  return JSON.stringify(
    {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "VisualEditor0",
          Effect: "Allow",
          Action: "s3:GetObject",
          Resource: getObjectResources,
        },
        {
          Sid: "AssumeRoleInMainAccount",
          Effect: "Allow",
          Action: "sts:AssumeRole",
          Resource: [
            `arn:${awsPartition}:iam::${accountId}:role/${stackPrefix}-buffer-access*`,
          ],
        },
        {
          Sid: "AssumeRoleInMainAccountCWL",
          Effect: "Allow",
          Action: "sts:AssumeRole",
          Resource: [
            `arn:${awsPartition}:iam::${accountId}:role/${stackPrefix}-cloudwatch-access*`,
          ],
        },
        {
          Effect: "Allow",
          Action: [
            "ssm:DescribeInstanceProperties",
            "ssm:UpdateInstanceInformation",
          ],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: [
            "ec2messages:GetEndpoint",
            "ec2messages:AcknowledgeMessage",
            "ec2messages:SendReply",
            "ec2messages:GetMessages",
          ],
          Resource: "*",
        },
      ],
    },
    null,
    2
  );
}

export const getAWSPartition = (region: string) => {
  return region?.startsWith("cn") ? "aws-cn" : "aws";
};

export type FieldValidator<T> = (param: T) => string;

export const createFieldValidator =
  <T extends any[]>(validator: (...params: T) => boolean) =>
  (errorMessage: string | (() => string)) =>
  (...params: T) => {
    if (!validator(...params)) {
      return typeof errorMessage === "string" ? errorMessage : errorMessage();
    }
    return "";
  };

export const validateRequiredText = createFieldValidator(
  (text?: string | null) => !!text
);

export const validateWithRegex = (reg: RegExp) =>
  createFieldValidator((text: string) => reg.test(text));

export const pipFieldValidator =
  <T extends any[]>(...validators: ((...param: T) => string)[]) =>
  (...param: T) => {
    for (const validator of validators) {
      const res = validator(...param);
      if (res !== "") {
        return res;
      }
    }
    return "";
  };

export const validateS3BucketName = createFieldValidator((text: string) =>
  bucketNameIsValid(text)
);

export const validateContainNonLatin = createFieldValidator((text: string) =>
  containsNonLatinCodepoints(text)
);

export const withI18nErrorMessage =
  <T>(validator: FieldValidator<T>) =>
  (param: T) => {
    const i18nKey = validator(param);
    return i18nKey === "" ? "" : i18n.t(i18nKey);
  };

type Reducer<State, Action> = (state: State, action: Action) => State;

export const combineReducers =
  <State, Action, K extends keyof State = keyof State>(slices: {
    [k in K]: Reducer<State[k], any>;
  }) =>
  (state: State, action: Action) =>
    Object.keys(slices).reduce((acc, prop) => {
      const reducer = slices[prop as K];
      return {
        ...acc,
        [prop as K]: reducer(acc[prop as K], action),
      };
    }, state);

/**
 * The `ternary` function in TypeScript returns `caseOne` if `cond` is true, otherwise it returns
 * `caseTwo`.
 * @param {any} cond - A boolean value that represents the condition to be evaluated.
 * @param {T} caseOne - The `caseOne` parameter is the value that will be returned if the `cond`
 * parameter is `true`.
 * @param {T} caseTwo - The `caseTwo` parameter is the value that will be returned if the `cond`
 * parameter is `false`.
 */
export const ternary = <T>(cond: any, caseOne: T, caseTwo: T) =>
  cond ? caseOne : caseTwo;

export const hasSamePrefix = (paths: string[]) => {
  if (paths.length === 0) {
    return false;
  }
  const prefixes = paths.map((path) => path.slice(0, path.lastIndexOf("/")));
  return prefixes.every((prefix) => prefix === prefixes[0]);
};

export const buildOSIParamsValue = (osiObj: SelectProcessorType) => {
  return {
    minCapacity: ternary(
      osiObj.logProcessorType === LogProcessorType.OSI,
      parseInt(osiObj.minOCU),
      0
    ),
    maxCapacity: ternary(
      osiObj.logProcessorType === LogProcessorType.OSI,
      parseInt(osiObj.maxOCU),
      0
    ),
  };
};

export const buildLambdaConcurrency = (osiObj: SelectProcessorType) => {
  return ternary(
    osiObj.logProcessorType === LogProcessorType.OSI,
    "200",
    osiObj.logProcessorConcurrency
  );
};

export const buildOSIPipelineNameByPipelineId = (pipelineId: string) => {
  return `cl-${pipelineId.substring(0, 23)}`;
};

export const isOSIPipeline = (
  pipeline?: AppPipeline | ServiceLogDetailProps | null
) => {
  return !!(
    pipeline?.osiParams?.minCapacity &&
    parseInt(pipeline.osiParams.minCapacity.toString()) > 0
  );
};

export const isEmpty = (value: any) => {
  if (value === null || value === undefined || value === "{}") {
    return true;
  }
  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  return false;
};

export const defaultStr = (
  expectStr: string | null | undefined,
  defaultValue?: string | null
) => {
  if (expectStr === "") {
    return defaultValue ?? "";
  }
  return expectStr ?? defaultValue ?? "";
};

export const defaultArray = (
  expectArray: any[] | null | undefined,
  defaultArray?: any[] | null
) => {
  if (!expectArray) {
    return [];
  }
  return expectArray ?? defaultArray ?? [];
};

export const displayI18NMessage = (key: string) => {
  if (key) {
    return i18n.t(key);
  }
  return "";
};

export const linkAccountMissingFields = (account: SubAccountLink | null) => {
  return (
    !account?.subAccountFlbConfUploadingEventTopicArn ||
    !account?.windowsAgentConfDoc ||
    !account?.windowsAgentInstallDoc ||
    !account?.agentStatusCheckDoc
  );
};

export function downloadFileByLink(url: string) {
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = url;

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    link?.parentNode?.removeChild(link);
  }, 0);
}

export const formatNumber = (num: string | number) => {
  return Number(num).toLocaleString();
};
