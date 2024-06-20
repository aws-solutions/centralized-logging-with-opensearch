
# Application log analytics pipeline

Centralized Logging with OpenSearch supports log analysis for application logs, such as Nginx/Apache HTTP Server logs or custom application logs.

!!! note "Note"
    Centralized Logging with OpenSearch supports [cross-account log ingestion](../link-account/index.md). If you want to ingest logs from the same account, the resources in the **Sources** group will be in the same account as your Centralized Logging with OpenSearch account. Otherwise, they will be in the member account.

## Logs from Amazon EC2 / Amazon EKS

Centralized Logging with OpenSearch supports collecting logs from Amazon EC2 instances or Amazon EKS clusters. The workflow supports two scenarios.

### Scenario 1: Using OpenSearch Engine

[![arch-app-log-pipeline]][arch-app-log-pipeline]
_Application log pipeline architecture for EC2/EKS_

The log pipeline runs the following workflow:

1. [Fluent Bit](https://fluentbit.io/) works as the underlying log agent to collect logs from application servers and send them to an optional [Log Buffer](../applications/index.md#log-buffer), or ingest into OpenSearch domain directly.

2. The Log Buffer triggers the Lambda (Log Processor) to run.

3. The log processor reads and processes the log records and ingests the logs into the OpenSearch domain.

4. Logs that fail to be processed are exported to an Amazon S3 bucket (Backup Bucket).


### Scenario 2: Using Light Engine

[![arch-app-log-pipeline-lighengine]][arch-app-log-pipeline-lighengine]
_Application log pipeline architecture for EC2/EKS_

The log pipeline runs the following workflow:

1. Fluent Bit works as the underlying log agent to collect logs from application servers and send them to an optional Log Buffer.
2. The Log Buffer triggers the Lambda to copy objects from log bucket to staging bucket.
3. Log Processor, AWS Step Functions, processes raw log files stored in the staging bucket in batches, converts them to Apache Parquet, and automatically partitions all incoming data by criteria including time and region.

## Logs from Amazon S3

Centralized Logging with OpenSearch supports collecting logs from Amazon S3 buckets. The workflow supports three scenarios.

### Scenario 1: Using OpenSearch Engine (On-going)

[![arch-app-log-s3-on-going-pipeline]][arch-app-log-s3-on-going-pipeline]
_Application log pipeline architecture for S3_

The log pipeline runs the following workflow:

1. User uploads logs to an Amazon S3 bucket (Log Bucket).

2. An event notification is sent to Amazon SQS using S3 Event Notifications when a new log file is created.

3. Amazon SQS initiates AWS Lambda.

4. AWS Lambda copies objects from the log bucket to the staging bucket.

5. The log processor reads and processes the log records and ingests the logs into the OpenSearch domain.

6. Logs that fail to be processed are exported to an Amazon S3 bucket (Backup Bucket).

### Scenario 2: Using OpenSearch Engine (One-time)

[![arch-app-log-s3-one-time-pipeline]][arch-app-log-s3-one-time-pipeline]
_Application log pipeline architecture for S3_

The log pipeline runs the following workflow:

1. User uploads logs to an Amazon S3 bucket (Log Bucket).

2. Amazon ECS Task iterates logs in the log bucket

3. Amazon ECS Task send the log location to a Amazon SQS queue

4. Amazon SQS initiates AWS Lambda.

5. AWS Lambda copies objects from the log bucket to the staging bucket.

6. The log processor reads and processes the log records and ingests the logs into the OpenSearch domain.

7. Logs that fail to be processed are exported to an Amazon S3 bucket (Backup Bucket).


### Scenario 3: Using Light Engine (On-going)

[![arch-app-log-s3-pipeline-lightengine]][arch-app-log-s3-pipeline-lightengine]
_Application log pipeline architecture for S3_

The log pipeline runs the following workflow:

1. User uploads logs to an Amazon S3 bucket (Log Bucket).
2. An event notification is sent to Amazon SQS using S3 Event Notifications when a new log file is created.
3. Amazon SQS initiates AWS Lambda.
4. AWS Lambda copies objects from the log bucket to the staging bucket.
6. (5. 6. 7.)The Log Processor, AWS Step Functions, processes raw log files stored in the staging bucket in batches. It converts them into Apache Parquet format and automatically partitions all incoming data based on criteria including time and region.

## Logs from Syslog Client

!!! important "Important"

    1. Make sure your Syslog generator/sender's subnet is connected to Centralized Logging with OpenSearch' **two** private subnets. You need to use VPC [Peering Connection][peering-connection] or [Transit Gateway][tgw] to connect these VPCs.
    2. The NLB together with the ECS containers in the architecture diagram will be provisioned only when you create a Syslog ingestion and be automated deleted when there is no Syslog ingestion.

### Scenario 1: Using OpenSearch Engine

[![arch-syslog-pipeline]][arch-syslog-pipeline]
_Application log pipeline architecture for Syslog_

The log pipeline runs the following workflow:

1. Syslog client (like [Rsyslog][rsyslog]) send logs to a Network Load Balancer (NLB) in Centralized Logging with OpenSearch's private subnets, and NLB routes to the ECS containers running Syslog servers.
2. [Fluent Bit](https://fluentbit.io/) works as the underlying log agent in the ECS Service to parse logs, and send them to an optional [Log Buffer](../applications/index.md#log-buffer), or ingest into OpenSearch domain directly.
3. The Log Buffer triggers the Lambda (Log Processor) to run.
4. The log processor reads and processes the log records and ingests the logs into the OpenSearch domain.
5. Logs that fail to be processed are exported to an Amazon S3 bucket (Backup Bucket).

### Scenario 2: Using Light Engine

[![arch-syslog-pipeline-lightengine]][arch-syslog-pipeline-lightengine]
_Application log pipeline architecture for Syslog_

The log pipeline runs the following workflow:

1. Syslog client (like [Rsyslog][rsyslog]) send logs to a Network Load Balancer (NLB) in Centralized Logging with OpenSearch's private subnets, and NLB routes to the ECS containers running Syslog servers.
2. [Fluent Bit](https://fluentbit.io/) works as the underlying log agent in the ECS Service to parse logs, and send them to an [Log Buffer](../applications/index.md#log-buffer).
3. An event notification is sent to Amazon SQS using S3 Event Notifications when a new log file is created.
4. Amazon SQS initiates AWS Lambda.
5. AWS Lambda copies objects from the log bucket to the staging bucket.
6. (6. 7. 8.)The Log Processor, AWS Step Functions, processes raw log files stored in the staging bucket in batches. It converts them into Apache Parquet format and automatically partitions all incoming data based on criteria including time and region.



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
[arch-app-log-s3-on-going-pipeline]: ../../images/architecture/s3-source-on-going.svg
[arch-app-log-s3-one-time-pipeline]: ../../images/architecture/s3-source-one-time.svg
[arch-app-log-s3-pipeline-lightengine]: ../../images/architecture/s3-source-on-going-light-engine.png
[arch-syslog-pipeline]: ../../images/architecture/app-log-pipeline-syslog.svg
[arch-syslog-pipeline-lightengine]: ../../images/architecture/syslog_arch_light_engine.png
[peering-connection]: https://docs.aws.amazon.com/vpc/latest/peering/working-with-vpc-peering.html
[tgw]: https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
[rsyslog]: https://www.rsyslog.com/
