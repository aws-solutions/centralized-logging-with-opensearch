Deploying this solution with the default parameters builds the following environment in the AWS Cloud.

[![arch]][arch]
Figure 1: Log Hub on AWS architecture

This solution deploys the AWS CloudFormation template in your AWS Cloud account and completes the following settings.

1. [Amazon CloudFront](https://aws.amazon.com/cloudfront) distributes the frontend web UI assets hosted in [Amazon S3](https://aws.amazon.com/s3/) bucket.

2. [Amazon Cognito user pool](https://aws.amazon.com/cognito) or OpenID Connector (OIDC) can be used for authentication.

3. [AWS AppSync](https://aws.amazon.com/appsync) provides the backend GraphQL APIs.

4. [Amazon DynamoDB](https://aws.amazon.com/dynamodb) stores the solution related information as backend database.

5. [AWS Lambda](https://aws.amazon.com/lambda) interacts with other AWS Services to process core logic of managing log pipelines or log agents, and obtains information updated in DynamoDB tables.

6. [AWS Step Functions](https://aws.amazon.com/step-functions) orchestrates on-demand [AWS CloudFormation](https://aws.amazon.com/cloudformation) deployment of a set of predefined stacks for log pipeline management. The log pipeline stacks deploy separate AWS resources and are used to collect and process logs and ingest them into [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service) for further analysis and visualization.

7. [Service Log Pipeline](#service-log-analytics-pipeline) or [Application Log Pipeline](#application-log-analytics-pipeline) are provisioned on demand via Log Hub console.

8. [AWS Systems Manager](https://aws.amazon.com/systems-manager) and [Amazon EventBridge](https://aws.amazon.com/eventbridge) manage log agents for collecting logs from Application Servers, such as installing log agents (Fluent Bit) for Application servers and monitoring the health status of the agents.

9. [Amazon EC2](https://aws.amazon.com/ec2/) or [Amazon EKS](https://aws.amazon.com/eks/) installs Fluent Bit agents, and uploads log data to Application Log Pipeline.

10. Application Log Pipelines read, parse, process application logs and ingest them into Amazon OpenSearch.

11. Service Log Pipelines read, parse, process AWS service logs and ingest them into Amazon OpenSearch.

This solution supports two types of log pipelines: **Service Log Analytics Pipeline** and **Application Log Analytics Pipeline**.

## Service Log Analytics Pipeline

Log Hub supports log analysis for AWS services, such as Amazon S3 access logs, and Application Load Balancer access logs. For a complete list of supported AWS services, refer to [Supported AWS Services](./aws-services/index.md#supported-aws-services).

AWS services output logs to different destinations, including Amazon S3 bucket, CloudWatch log groups, Kinesis Data Streams, and Kinesis Firehose. The solution ingests those logs using different workflows.

!!! note "Note"
    Log Hub supports [cross-account log ingestion](./link-account/index.md). If you want to ingest the logs from another AWS account, the resources in the **Sources** group in the architecture diagram will be in another account.

### Logs in Amazon S3

Some AWS services use Amazon S3 as the destination, and the logs in Amazon S3 are generally not for real-time analysis. 

[![arch-service-pipeline-s3]][arch-service-pipeline-s3]
Figure 2: Amazon S3 based service log pipeline architecture

The log pipeline runs the following workflow:

1. AWS services store logs in Amazon S3 bucket (Log Bucket).

2. An [S3 Event Notification][s3-events] is sent to Amazon SQS when a new log file is created.

3. Amazon SQS triggers the Lambda (Log Processor) to run.

4. The log processor reads and processes the log files.

5. The log processor ingest the logs into the Amazon OpenSearch Service.

6. The logs failed to be processed are exported to Amazon S3 bucket (Backup Bucket).

For cross-account ingestion, the AWS Services store logs in Amazon S3 bucket in the member account, and other resources remain in Log Hub.

### Logs in Amazon CloudWatch

Some services use Amazon CloudWatch log group as the destination. 

[![arch-service-pipeline-cw]][arch-service-pipeline-cw]
Figure 3: Amazon CloudWatch based service log pipeline architecture

The log pipeline runs the following workflow:

1. AWS Services store logs in Amazon CloudWatch log group.

2. The CloudWatch logs is streaming to Amazon Kinesis Data Firehose via subscription.

3. Amazon Kinesis Data Firehose saves logs to the Amazon S3 bucket (Log Bucket).

4. Notifications are sent to Amazon SQS via [S3 Event Notifications][s3-events].

5. SQS triggers the Lambda (Log Processor) to run.

6. The log processor reads and processes the log files.

7. The log processor ingest the logs into the Amazon OpenSearch Service.

8. The logs failed to be processed are exported to Amazon S3 bucket (Backup Bucket).

For cross-account ingestion, the AWS Services store logs on Amazon CloudWatch log group in the member account, and other resources remain in Log Hub.

## Application Log Analytics Pipeline

Log Hub supports log analysis for application logs, such as Nginx/Apache HTTP Server logs or custom application logs. 

!!! note "Note"
    Log Hub supports [cross-account log ingestion](./link-account/index.md). If you want to ingest logs from the same account, the resources in the **Sources** group will be in the same account as your Log Hub account.
    Otherwise, they will be in another AWS account.

### Logs from Amazon EC2 / Amazon EKS

[![arch-app-log-pipeline]][arch-app-log-pipeline]
Figure 4: Application log pipeline architecture for EC2

The log pipeline runs the following workflow:

1. [Fluent Bit](https://fluentbit.io/) works as the underlying log agent to collect logs from application servers and send them to an optional [Log Buffer](./applications/index.md#log-buffer), or ingest into OpenSearch domain directly. 

2. The Log Buffer triggers the Lambda (Log Processor) to run.

3. The log processor reads and processes the log records and ingests the logs into the OpenSearch domain.

4. The logs failed to be processed are exported to an Amazon S3 bucket (Backup Bucket).

### Logs from Syslog Client

!!! important "Important"

    1. Please make sure your Syslog generator/sender's subnet is connected to Log Hub' **two** private subnets so that log can be ingested, you need to use VPC [Peering Connection][peering-connection] or [Transit Gateway][tgw] to connect these VPCs.
    2. The NLB together with the ECS containers in the architecture diagram will be only provisioned when you create a syslog ingestion and be automated deleted when there is no syslog ingestion.

[![arch-syslog-pipeline]][arch-syslog-pipeline]     
Figure 5: Application log pipeline architecture for Syslog

1. Syslog client (like [Rsyslog][rsyslog]) send logs to a Network Load Balancer (NLB) in Log Hub's private subnets, and NLB routes to the ECS containers running Syslog servers.

2. [Fluent Bit](https://fluentbit.io/) works as the underlying log agent in the ECS Service to parse logs, and send them to an optional [Log Buffer](./applications/index.md#log-buffer), or ingest into OpenSearch domain directly.

3. The Log Buffer triggers the Lambda (Log Processor) to run.

4. The log processor reads and processes the log records and ingests the logs into the OpenSearch domain.

5. The logs failed to be processed are exported to an Amazon S3 bucket (Backup Bucket).

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
[arch]: ../images/architecture/arch.svg
[arch-service-pipeline-s3]: ../images/architecture/service-pipeline-s3.svg
[arch-service-pipeline-cw]: ../images/architecture/service-pipeline-cw.svg
[arch-eks-pipeline]: ../images/architecture/eks-pipeline.svg
[arch-syslog-pipeline]: ../images/architecture/syslog-pipeline.svg
[arch-app-log-pipeline]: ../images/architecture/app-log-pipeline-ec2-eks.svg
[arch-eks-aos-pipeline]: ../images/architecture/eks-aos-pipeline.svg
[arch-syslog-pipeline]: ../images/architecture/app-log-pipeline-syslog.svg
[peering-connection]: https://docs.aws.amazon.com/vpc/latest/peering/working-with-vpc-peering.html
[tgw]: https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
[rsyslog]: https://www.rsyslog.com/