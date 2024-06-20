# Service log analytics pipeline

Centralized Logging with OpenSearch supports log analysis for AWS services, such as Amazon S3 access logs, and Application Load Balancer access logs. For a complete list of supported AWS services, refer to [Supported AWS Services](../aws-services/index.md#supported-aws-services).

This solution ingests different AWS service logs using different workflows.

!!! note "Note"
    Centralized Logging with OpenSearch supports [cross-account log ingestion](../link-account/index.md). If you want to ingest the logs from another AWS account, the resources in the **Sources** group in the architecture diagram will be in the member account.

## Logs through Amazon S3

Many AWS services support delivers logs to Amazon S3 directly, or through other services. The workflow supports three scenarios:

### Scenario 1: Logs to Amazon S3 directly (OpenSearch Engine)

In this scenario, the service directly sends logs to Amazon S3. This architecture is applicable to the following log sources:

- Amazon S3 access logs
- Amazon CloudFront standard logs
- AWS CloudTrail logs (delivers to Amazon S3)
- Application Load Balancing access logs
- AWS WAF logs
- VPC Flow logs (delivers to Amazon S3)
- AWS Config logs


[![arch-service-pipeline-s3]][arch-service-pipeline-s3]
_Amazon S3 based service log pipeline architecture_

### Scenario 2: Logs to Amazon S3 via Kinesis Data Firehose (OpenSearch Engine)

In this scenario, the service cannot directly put their logs to Amazon S3. The logs are sent to Amazon CloudWatch, and Kinesis Data Firehose ([KDF]) is used to subscribe the logs from CloudWatch Log Group and then put logs into Amazon S3. This architecture is applicable to the following log sources:

- Amazon RDS/Aurora logs
- AWS Lambda logs

[![arch-service-pipeline-kdf-to-s3]][arch-service-pipeline-kdf-to-s3]
_Amazon S3 (via KDF) based service log pipeline architecture_

The log pipeline runs the following workflow:

1. AWS services logs are stored in Amazon S3 bucket (Log Bucket).

2. An event notification is sent to Amazon SQS using [S3 Event Notifications][s3-events] when a new log file is created.

3. Amazon SQS initiates the Log Processor Lambda to run.

4. The log processor reads and processes the log files.

5. The log processor ingests the logs into the Amazon OpenSearch Service.

6. Logs that fail to be processed are exported to Amazon S3 bucket (Backup Bucket).

For cross-account ingestion, the AWS Services store logs in Amazon S3 bucket in the member account, and other resources remain in central logging account.

### Scenario 3: Logs to Amazon S3 directly (Light Engine)

In this scenario, the service directly sends logs to Amazon S3. This architecture is applicable to the following log sources:

- Amazon CloudTrail logs (delivers to Amazon S3)
- Amazon RDS/Aurora logs
- Amazon CloudFront standard logs
- AWS WAF logs (delivers to Amazon S3)
- Application Load Balancing logs
- VPC Flow logs (delivers to Amazon S3)

[![arch-service-pipeline-s3-lightengine]][arch-service-pipeline-s3-lightengine]
_Amazon S3 based service log pipeline architecture_

The log pipeline runs the following workflow:

1. AWS service logs are stored in an Amazon S3 bucket (Log Bucket).
2. An event notification is sent to Amazon SQS using S3 Event Notifications when a new log file is created.
3. Amazon SQS initiates AWS Lambda.
4. AWS Lambda copies objects from the log bucket to the staging bucket.
5. The Log Processor, AWS Step Functions, processes raw log files stored in the staging bucket in batches. It converts them into Apache Parquet format and automatically partitions all incoming data based on criteria including time and region.

## Logs through Amazon Kinesis Data Streams

Some AWS services support delivering logs to Amazon Kinesis Data Streams. The workflow supports two scenarios:

### Scenario 1: Logs to Kinesis Data Streams directly (OpenSearch Engine)

In this scenario, the service directly streams logs to Amazon Kinesis Data Streams. This architecture is applicable to the following log sources:

- Amazon CloudFront real-time logs

[![arch-service-pipeline-kds]][arch-service-pipeline-kds]
_Amazon KDS based service log pipeline architecture_

!!! important "Warning"

    This solution does not support cross-account ingestion for CloudFront real-time logs.

### Scenario 2: Logs to Kinesis Data Streams via subscription (OpenSearch Engine)

In this scenario, the service delivers the logs to CloudWatch Log Group, and then CloudWatch Logs stream the logs in real-time to Kinesis Data Streams as the subscription destination. This architecture is applicable to the following log sources:

- AWS CloudTrail logs (delivers to CloudWatch Log Group)
- VPC Flow logs (delivers to CloudWatch Log Group)

[![arch-service-pipeline-cwl-to-kds]][arch-service-pipeline-cwl-to-kds]
_Kinesis Data Streams (via subscription) based service log pipeline architecture_

The log pipeline runs the following workflow:

1. AWS Services logs are streamed to Kinesis Data Stream.

2. KDS initiates the Log Processor Lambda to run.

3. The log processor processes and ingests the logs into the Amazon OpenSearch Service.

4. Logs that fail to be processed are exported to Amazon S3 bucket (Backup Bucket).

For cross-account ingestion, the AWS Services store logs on Amazon CloudWatch log group in the member account, and other resources remain in central logging account.


[s3log]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html
[alblog]: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html
[s3]: https://aws.amazon.com/s3/
[s3-events]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/NotificationHowTo.html
[cloudfront]: https://aws.amazon.com/cloudfront/
[cognito]: https://aws.amazon.com/cognito/
[appsync]: https://aws.amazon.com/appsync/
[lambda]: https://aws.amazon.com/lambda/
[dynamodb]: https://aws.amazon.com/dynamodb/
[systemsmanager]: https://aws.amazon.com/systemmanager/
[stepfunction]: https://aws.amazon.com/stepfunctions/
[kds]: https://aws.amazon.com/kinesis/data-streams/
[kdf]: https://aws.amazon.com/kinesis/data-firehose/
[arch]: ../../images/architecture/arch.png
[arch-service-pipeline-s3]: ../../images/architecture/service-pipeline-s3.svg
[arch-service-pipeline-s3-lightengine]: ../../images/architecture/logs-in-s3-light-engine.drawio.svg
[arch-service-pipeline-kdf-to-s3]: ../../images/architecture/service-pipeline-kdf-to-s3.svg
[arch-service-pipeline-cw]: ../../images/architecture/service-pipeline-cw.svg
[arch-service-pipeline-kds]: ../../images/architecture/service-pipeline-kds.svg
[arch-service-pipeline-cwl-to-kds]: ../../images/architecture/service-pipeline-cwl-to-kds.svg
[arch-app-log-pipeline]: ../../images/architecture/app-log-pipeline-ec2-eks.svg
[arch-app-log-pipeline-lighengine]: ../../images/architecture/logs-from-amazon-ec2-eks-light-engine.drawio.png
[arch-syslog-pipeline]: ../../images/architecture/app-log-pipeline-syslog.svg
[arch-syslog-pipeline-lightengine]: ../../images/architecture/syslog_arch_light_engine.png
[peering-connection]: https://docs.aws.amazon.com/vpc/latest/peering/working-with-vpc-peering.html
[tgw]: https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
[rsyslog]: https://www.rsyslog.com/
