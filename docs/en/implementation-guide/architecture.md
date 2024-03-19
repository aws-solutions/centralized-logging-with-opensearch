Deploying this solution with the default parameters builds the following environment in the AWS Cloud.

[![arch]][arch]
**_Centralized Logging with OpenSearch architecture_**

This solution deploys the AWS CloudFormation template in your AWS Cloud account and completes the following settings.

1. [Amazon CloudFront](https://aws.amazon.com/cloudfront) distributes the frontend web UI assets hosted in [Amazon S3](https://aws.amazon.com/s3/) bucket.

2. [Amazon Cognito user pool](https://aws.amazon.com/cognito) or OpenID Connector (OIDC) can be used for authentication.

3. [AWS AppSync](https://aws.amazon.com/appsync) provides the backend GraphQL APIs.

4. [Amazon DynamoDB](https://aws.amazon.com/dynamodb) stores the solution related information as backend database.

5. [AWS Lambda](https://aws.amazon.com/lambda) interacts with other AWS Services to process core logic of managing log pipelines or log agents, and obtains information updated in DynamoDB tables.

6. [AWS Step Functions](https://aws.amazon.com/step-functions) orchestrates on-demand [AWS CloudFormation](https://aws.amazon.com/cloudformation) deployment of a set of predefined stacks for log pipeline management. The log pipeline stacks deploy separate AWS resources and are used to collect and process logs and ingest them into [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service) for further analysis and visualization.

7. [Service Log Pipeline](#service-log-analytics-pipeline) or [Application Log Pipeline](#application-log-analytics-pipeline) are provisioned on demand via Centralized Logging with OpenSearch console.

8. [AWS Systems Manager](https://aws.amazon.com/systems-manager) and [Amazon EventBridge](https://aws.amazon.com/eventbridge) manage log agents for collecting logs from application servers, such as installing log agents (Fluent Bit) for application servers and monitoring the health status of the agents.

9. [Amazon EC2](https://aws.amazon.com/ec2/) or [Amazon EKS](https://aws.amazon.com/eks/) installs Fluent Bit agents, and uploads log data to application log pipeline.

10. Application log pipelines read, parse, process application logs and ingest them into Amazon OpenSearch domains or Light Engine.

11. Service log pipelines read, parse, process AWS service logs and ingest them into Amazon OpenSearch domains or Light Engine.

After deploying the solution, you can use [AWS WAF](https://aws.amazon.com/waf/) to protect CloudFront or AppSync. Moreover, you can follow this [guide](https://docs.aws.amazon.com/appsync/latest/devguide/WAF-Integration.html) to configure your WAF settings to prevent GraphQL schema introspection.

This solution supports two types of log pipelines: **Service Log Analytics Pipeline** and **Application Log Analytics Pipeline**.

## Service log analytics pipeline

Centralized Logging with OpenSearch supports log analysis for AWS services, such as Amazon S3 access logs, and Application Load Balancer access logs. For a complete list of supported AWS services, refer to [Supported AWS Services](./aws-services/index.md#supported-aws-services).

This solution ingests different AWS service logs using different workflows.

!!! note "Note"
    Centralized Logging with OpenSearch supports [cross-account log ingestion](./link-account/index.md). If you want to ingest the logs from another AWS account, the resources in the **Sources** group in the architecture diagram will be in another account.
### Logs through Amazon S3

This section is applicable to Amazon S3 access logs, CloudFront standard logs, CloudTrail logs (S3), Application Load Balancing access logs, WAF logs, VPC Flow logs (S3), AWS Config logs, Amazon RDS/Aurora logs, and AWS Lambda Logs.

The workflow supports two scenarios:

- **Logs to Amazon S3 directly（OpenSearch as log processor）**


    In this scenario, the service directly sends logs to Amazon S3.

    [![arch-service-pipeline-s3]][arch-service-pipeline-s3]
    **_Amazon S3 based service log pipeline architecture_**



- **Logs to Amazon S3 via Kinesis Data Firehose（OpenSearch as log processor）**

    In this scenario, the service cannot directly put their logs to Amazon S3. The logs are sent to Amazon CloudWatch, and Kinesis Data Firehose ([KDF]) is used to subscribe the logs from CloudWatch Log Group and then put logs into Amazon S3.

    [![arch-service-pipeline-kdf-to-s3]][arch-service-pipeline-kdf-to-s3]
    **_Amazon S3 (via KDF) based service log pipeline architecture_**

The log pipeline runs the following workflow:

1. AWS services logs are stored in Amazon S3 bucket (Log Bucket).

2. An event notification is sent to Amazon SQS using [S3 Event Notifications][s3-events] when a new log file is created.

3. Amazon SQS initiates the Log Processor Lambda to run.

4. The log processor reads and processes the log files.

5. The log processor ingests the logs into the Amazon OpenSearch Service.

6. Logs that fail to be processed are exported to Amazon S3 bucket (Backup Bucket).

For cross-account ingestion, the AWS Services store logs in Amazon S3 bucket in the member account, and other resources remain in central logging account.

- **Logs to Amazon S3 directly（Light Engine as log processor）**


    In this scenario, the service directly sends logs to Amazon S3.

    [![arch-service-pipeline-s3-lightengine]][arch-service-pipeline-s3-lightengine]
    **_Amazon S3 based service log pipeline architecture_**

The log pipeline runs the following workflow:

1. AWS service logs are stored in an Amazon S3 bucket (Log Bucket).
2. An event notification is sent to Amazon SQS using S3 Event Notifications when a new log file is created.
3. Amazon SQS initiates AWS Lambda.
4. AWS Lambda get objects from the Amazon S3 log bucket.
5. AWS Lambda put objects to the staging bucket.
6. The Log Processor, AWS Step Functions, processes raw log files stored in the staging bucket in batches. 
7. The Log Processor, AWS Step Functions, converts log data into Apache Parquet format and automatically partitions all incoming data based on criteria including time and region.

### Logs through Amazon Kinesis Data Streams

This section is applicable to CloudFront real-time logs, CloudTrail logs (CloudWatch), and VPC Flow logs (CloudWatch).

The workflow supports two scenarios:

- **Logs to KDS directly**

    In this scenario, the service directly streams logs to Amazon Kinesis Data Streams ([KDS]).

    [![arch-service-pipeline-kds]][arch-service-pipeline-kds]
    **_Amazon KDS based service log pipeline architecture_**

- **Logs to KDS via subscription**

    In this scenario, the service delivers the logs to CloudWatch Log Group, and then CloudWatch Logs stream the logs in real-time to [KDS] as the subscription destination.

    [![arch-service-pipeline-cwl-to-kds]][arch-service-pipeline-cwl-to-kds]
    **_Amazon KDS (via subscription) based service log pipeline architecture_**

The log pipeline runs the following workflow:

1. AWS Services logs are streamed to Kinesis Data Stream.

2. KDS initiates the Log Processor Lambda to run.

3. The log processor processes and ingests the logs into the Amazon OpenSearch Service.

4. Logs that fail to be processed are exported to Amazon S3 bucket (Backup Bucket).

For cross-account ingestion, the AWS Services store logs on Amazon CloudWatch log group in the member account, and other resources remain in central logging account.

!!! important "Warning"

    This solution does not support cross-account ingestion for CloudFront real-time logs.


## Application log analytics pipeline

Centralized Logging with OpenSearch supports log analysis for application logs, such as Nginx/Apache HTTP Server logs or custom application logs.

!!! note "Note"
    Centralized Logging with OpenSearch supports [cross-account log ingestion](./link-account/index.md). If you want to ingest logs from the same account, the resources in the **Sources** group will be in the same account as your Centralized Logging with OpenSearch account.
    Otherwise, they will be in another AWS account.

### Logs from Amazon EC2 / Amazon EKS

- **Logs from Amazon EC2/ Amazon EKS(OpenSearch as log processor)**
[![arch-app-log-pipeline]][arch-app-log-pipeline]
**_Application log pipeline architecture for EC2/EKS_**

The log pipeline runs the following workflow:

1. [Fluent Bit](https://fluentbit.io/) works as the underlying log agent to collect logs from application servers and send them to an optional [Log Buffer](./applications/index.md#log-buffer), or ingest into OpenSearch domain directly.
2. The Log Buffer triggers the Lambda (Log Processor) to run.

3. The log processor reads and processes the log records and ingests the logs into the OpenSearch domain.

4. Logs that fail to be processed are exported to an Amazon S3 bucket (Backup Bucket)

<br/>

- **Logs from Amazon EC2/ Amazon EKS(Light Engine as log processor)**

[![arch-app-log-pipeline-lighengine]][arch-app-log-pipeline-lighengine]
**_Application log pipeline architecture for EC2/EKS_**

The log pipeline runs the following workflow:

1. [Fluent Bit](https://fluentbit.io/) works as the underlying log agent to collect logs from application servers and send them to an optional [Log Buffer](./applications/index.md#log-buffer), or ingest into OpenSearch domain directly.

2. An event notification is sent to Amazon SQS using S3 Event Notifications when a new log file is created.

3. Amazon SQS initiates AWS Lambda.

4. AWS Lambda gets objects from the Amazon S3 log bucket.

5. AWS Lambda puts objects to the staging bucket.

6. The Log Processor, AWS Step Functions, processes raw log files stored in the staging bucket in batches.

7. The Log Processor, AWS Step Functions, converts log data into Apache Parquet format and automatically partitions all incoming data based on criteria including time and region .




### Logs from Syslog Client

!!! important "Important"

    1. Make sure your Syslog generator/sender's subnet is connected to Centralized Logging with OpenSearch' **two** private subnets. You need to use VPC [Peering Connection][peering-connection] or [Transit Gateway][tgw] to connect these VPCs.
    2. The NLB together with the ECS containers in the architecture diagram will be provisioned only when you create a Syslog ingestion and be automated deleted when there is no Syslog ingestion.

[![arch-syslog-pipeline]][arch-syslog-pipeline]
**_Application log pipeline architecture for Syslog_**

1. Syslog client (like [Rsyslog][rsyslog]) send logs to a Network Load Balancer (NLB) in Centralized Logging with OpenSearch's private subnets, and NLB routes to the ECS containers running Syslog servers.

2. [Fluent Bit](https://fluentbit.io/) works as the underlying log agent in the ECS Service to parse logs, and send them to an optional [Log Buffer](./applications/index.md#log-buffer), or ingest into OpenSearch domain directly.

3. The Log Buffer triggers the Lambda (Log Processor) to run.

4. The log processor reads and processes the log records and ingests the logs into the OpenSearch domain.

5. Logs that fail to be processed are exported to an Amazon S3 bucket (Backup Bucket).

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
[arch]: ../images/architecture/arch.png
[arch-service-pipeline-s3]: ../images/architecture/service-pipeline-s3.svg
[arch-service-pipeline-s3-lightengine]: ../images/architecture/logs-in-s3-light-engine.drawio.png
[arch-service-pipeline-kdf-to-s3]: ../images/architecture/service-pipeline-kdf-to-s3.svg
[arch-service-pipeline-cw]: ../images/architecture/service-pipeline-cw.svg
[arch-service-pipeline-kds]: ../images/architecture/service-pipeline-kds.svg
[arch-service-pipeline-cwl-to-kds]: ../images/architecture/service-pipeline-cwl-to-kds.svg
[arch-app-log-pipeline]: ../images/architecture/app-log-pipeline-ec2-eks.svg
[arch-app-log-pipeline-lighengine]: ../images/architecture/logs-from-amazon-ec2-eks-light-engine.drawio.png
[arch-syslog-pipeline]: ../images/architecture/app-log-pipeline-syslog.svg
[peering-connection]: https://docs.aws.amazon.com/vpc/latest/peering/working-with-vpc-peering.html
[tgw]: https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
[rsyslog]: https://www.rsyslog.com/
