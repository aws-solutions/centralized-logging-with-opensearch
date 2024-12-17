# Overview

This document is intended to provide a comprehensive definition of YAML Schema. The purpose of this document is to clearly outline the structure and validation rules for the YAML file used in our application. By adhering to this schema, you can ensure that your YAML file is properly formatted and meets the required specifications.

The primary purpose of this document is to assist developers in understanding and implementing the YAML Schema correctly. It serves as a guideline to:

- Validate YAML file structure and content.
- Ensure data consistency and integrity across different systems.
- Facilitate seamless integration with our services.

You can download the YAML Schema file from the following link:
[Download YAML Schema](https://aws-gcr-solutions.s3.amazonaws.com/centralized-logging-with-opensearch/capcut_v2.2.0/docs/application-pipeline-schema.json)

By downloading and using this schema, you can validate your YAML file and ensure it adheres to the specified format and rules.

# Example

Import a pipeline to collect all `/data/logs/*-json-*.log` logs from EC2, using KDS as the buffer layer, and write the data into the `aos` domain. The index prefix should be `cl-app-ec2-kds-aos-json`. Logs should be immediately transitioned to warm storage, moved to cold storage after 30 days, and only application logs from the last 60 days should be retained.

```
appPipelines:
- logConfigName: json
  logConfigVersionNumber: 4
  bufferType: KDS
  bufferParams:
    enableAutoScaling: 'true'
    shardCount: '1'
    minCapacity: '1'
    maxCapacity: '2'
    createDashboard: 'false'
  aosParams:
    domainName: aos
    indexPrefix: cl-app-ec2-kds-aos-json
    indexSuffix: yyyy_MM_dd
    rolloverSize: 30gb
    codec: best_compression
    refreshInterval: 1s
    shardNumbers: 1
    replicaNumbers: 1
    warmLogTransition: 1s
    coldLogTransition: 30d
    logRetention: 60d
  monitor:
    pipelineAlarmStatus: 'false'
    snsTopicArn: ''
  logSources:
  - type: EC2
    name: application-instance-group
    accountId: '123456789012'
    logPath: /data/logs/*-json-*.log
    autoAddPermission: true
```

Import a pipeline to collect all `/data/logs/nginx/access*.log` logs from EC2. Use the latest version of the log config, with S3 as the buffer layer, and write the data into the `aos` domain. The index prefix should be `cl-app-ec2-s3-aos-nginx`. Only application logs from the last 60 days should be retained.

```
appPipelines:
- logConfigName: nginx
  bufferType: S3
  bufferParams:
    logBucketName: clo-clloggingbucket-10d9vbxxx
    logBucketPrefix: AppLogs/cl-app-ec2-s3-aos-nginx/year=%Y/month=%m/day=%d/
    maxFileSize: '50'
    uploadTimeout: '60'
    compressionType: GZIP
    s3StorageClass: INTELLIGENT_TIERING
    createDashboard: 'true'
  aosParams:
    domainName: aos
    indexPrefix: cl-app-ec2-s3-aos-nginx
    indexSuffix: yyyy_MM_dd
    rolloverSize: 30gb
    codec: best_compression
    refreshInterval: 1s
    shardNumbers: 1
    replicaNumbers: 1
    warmLogTransition: ''
    coldLogTransition: ''
    logRetention: 60d
  monitor:
    pipelineAlarmStatus: 'false'
    snsTopicArn: ''
  logSources:
  - type: EC2
    name: application-instance-group
    accountId: '123456789012'
    logPath: /data/logs/nginx/access*.log
```

Import a pipeline to collect all `/var/log/containers/*_nginx-*.log` logs from EKS. Use log config version 1, without using a buffer layer, and write the data into the `aos` domain. The index prefix should be `cl-app-eks-none-aos-nginx`. Enable alert notifications, and retain only application logs from the last 60 days.

```
appPipelines:
- logConfigName: nginx
  logConfigVersionNumber: 1
  bufferType: None
  aosParams:
    domainName: aos
    indexPrefix: cl-app-eks-none-aos-nginx
    indexSuffix: yyyy_MM_dd
    rolloverSize: 30gb
    codec: best_compression
    refreshInterval: 1s
    shardNumbers: 1
    replicaNumbers: 1
    warmLogTransition: ''
    coldLogTransition: ''
    logRetention: 60d
  monitor:
    pipelineAlarmStatus: 'true'
    snsTopicArn: 'arn:aws:sns:us-east-1:123456789012:alarm-topic'
  logSources:
  - type: EKSCluster
    name: eks-cluster
    accountId: '123456789012'
    logPath: /var/log/containers/*_nginx-*.log
```

# Schema Definitions

The schema defines the following additional types:

## `appPipelines` (array, required)

The object is an array with all elements of the type `AppPipeline`.

### `AppPipeline` (object)

Properties of the `AppPipeline` object:

#### `logConfigName` (string, required)

The log config name.

#### `logConfigVersionNumber` (integer)

Version number of the log config. If not specified, the latest version will be used.

Default: `1`

Additional restrictions:

- Minimum: `1`

#### `bufferType` (string, enum, required)

Buffer layer is designed for a robust system between the log source and log destination. This layer can decouple the source and destination and accept more log ingestion requests, and also can buffer the logs for retry when log analytics engine has server issue or performance issue.

This element must be one of the following enum values:

- `S3`
- `KDS`
- `None`

Default: `"S3"`

#### `bufferParams` (object)

Properties of the `bufferParams` object:

##### `enableAutoScaling` (boolean)

Enable auto scaling of the Kinesis Data Streams shards?

Default: `false`

##### `shardCount` (integer)

Specify the number of Shards of the Kinesis Data Streams. Each shard can have up to 1,000 records per second and total data write rate of 1MB per second. (\* Kinesis shard adjustment limit per 24 hours)

Default: `1`

Additional restrictions:

- Minimum: `1`

##### `minCapacity` (integer)

Specify minimum number of shards.

Additional restrictions:

- Minimum: `1`

##### `maxCapacity` (integer)

Specify maximum number of shards.

Additional restrictions:

- Minimum: `1`

##### `createDashboard` (boolean)

Create a predefined sample dashboard in OpenSearch Dashboards, only valid for nginx and apache log config.

Default: `false`

##### `logBucketName` (string)

Specify a bucket to store the log data.

##### `logBucketPrefix` (string)

Specify a custom prefix that includes expressions that are evaluated at runtime, you need to modify the \<index-prefix\> to ensure its uniqueness and avoid overlap.

Default: `"AppLogs/<index-prefix>/year=%Y/month=%m/day=%d/"`

##### `maxFileSize` (integer)

Specify the buffer size in your log source before sending to Amazon S3. The higher buffer size may be lower in cost with higher latency. The lower buffer size will be faster in delivery with higher cost. Minimum: 1 MiB, maximum: 50 MiB.

Additional restrictions:

- Minimum: `1`
- Maximum: `50`

##### `uploadTimeout` (string)

The higher interval allows more time to collect data and the size of data may be bigger. The lower interval sends the data more frequently and may be more advantageous when looking at shorter cycles of data activity.

##### `compressionType` (string, enum)

Compression for data records.

This element must be one of the following enum values:

- `GZIP`
- `NONE`

Default: `"GZIP"`

##### `s3StorageClass` (string, enum)

Select a storage class for the prefix that buffer your log data.

This element must be one of the following enum values:

- `STANDARD`
- `STANDARD_IA`
- `ONEZONE_IA`
- `INTELLIGENT_TIERING`

Default: `"INTELLIGENT_TIERING"`

#### `aosParams` (object, required)

Properties of the `aosParams` object:

##### `domainName` (string, required)

Specify the domain name of OpenSearch Cluster.

##### `indexPrefix` (string, required)

A unique prefix used for OpenSearch indices managed by the index set.

##### `indexSuffix` (string, enum)

Specify a suffix to adjust the index rollover time window.

This element must be one of the following enum values:

- `yyyy_MM_dd_HH`
- `yyyy_MM_dd`
- `yyyy_MM`
- `yyyy`

Default: `"yyyy_MM_dd"`

##### `rolloverSize` (string)

The minimum storage size of a single primary shard required to roll over the index.

Default: `"30gb"`

##### `codec` (string, enum)

Specify a compression type to use for this index.

This element must be one of the following enum values:

- `best_compression`
- `default`

Default: `"best_compression"`

##### `refreshInterval` (string)

Specify how often the index should refresh, which publishes the most recent changes and make them available for search. Default is 1 second.

Default: `"1s"`

##### `shardNumbers` (integer)

Specify the number of primary shards for the index. Default is 1. The number of primary shards cannot be changed after the index is created.

Default: `1`

##### `replicaNumbers` (integer)

Specify the number of replicas each primary shard should have. Default is 1.

Default: `1`

##### `warmLogTransition` (string)

Move aged logs from hot storage to warm storage to save cost. You must enable UltraWarm before using this.

Default: `""`

##### `coldLogTransition` (string)

Move aged logs from warm storage to cold storage to save cost. You must enable Cold Storage before using this.

Default: `""`

##### `logRetention` (string)

Delete aged logs from OpenSearch domain.

Default: `"180d"`

#### `monitor` (Monitor, required)

Properties of the `Monitor` object:

##### `pipelineAlarmStatus` (boolean)

The solution will collect metrics to monitor the log pipeline status, and it provides a set of recommended alarms to notify you if any anomaly detected.

Default: `false`

##### `snsTopicArn` (string)

Specify an SNS Topic arn.

Additional restrictions:

- Regex pattern: `^arn:(aws|aws-cn|aws-us-gov):[a-zA-Z0-9-]+:[a-zA-Z0-9-]*:[0-9]{12}:[a-zA-Z0-9-:/._+]*$`

#### `logSources` (array, required)

The object is an array with all elements of the type `LogSource`.

##### `LogSource` (object)

Properties of the `LogSource` object:

###### `type` (string, enum, required)

This element must be one of the following enum values:

- `EC2`
- `EKS`

###### `name` (string, required)

The log source name.

###### `accountId` (string, required)

The account ID where the log source is located.

Additional restrictions:

- Regex pattern: `[0-9]{12}`

###### `logPath` (string, required)

Enter the location of the log files. All files under the specified folder will be included.

###### `autoAddPermission` (boolean)

The instance groups needs permissions to access System Manager, S3, and Kinesis Data Stream services for log collection agent configuration and log transmission. Please select a method to add permissions to the instances.

Default: `true`
